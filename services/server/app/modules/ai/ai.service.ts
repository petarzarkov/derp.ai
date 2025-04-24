import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateConfig, ValidatedConfig } from '../../const';
import { AIMasterProvider, AIProvider, AIProviderConfig } from './ai.entity';
import { ContextLogger } from 'nestjs-context-logger';
import { EmitToClientCallback } from '../events/events.gateway';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AIService {
  readonly #botName = 'DerpAI';
  #logger = new ContextLogger(AIService.name);
  #context = `Your name is ${this.#botName}. You are a helpful assistant that can answer questions and help with tasks.`;
  #config: ReturnType<typeof validateConfig>['aiProviders'];
  #providers: AIProvider[];
  #masterConfig: ReturnType<typeof validateConfig>['masterAIProvider'];

  constructor(private configService: ConfigService<ValidatedConfig, true>) {
    const providers = this.configService.get('aiProviders', { infer: true });
    const masterProvider = this.configService.get('masterAIProvider', { infer: true });
    if (!providers) {
      throw new Error('config aiProviders are not set!');
    }
    this.#config = providers;
    this.#masterConfig = masterProvider;
    this.#providers = Object.keys(providers) as AIProvider[];
  }

  private async queryProvider(
    provider: AIProvider | AIMasterProvider,
    config: AIProviderConfig,
    prompt: string,
    emitToClient: EmitToClientCallback,
  ): Promise<string | null> {
    const model = config.model;
    if (!config) {
      this.#logger.warn(`Configuration for provider "${provider}" not found.`);
      return null;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let requestBody: string | null = null;
    let targetUrl = `${config.url}`;

    if (provider.startsWith('google')) {
      requestBody = JSON.stringify({
        systemInstruction: {
          parts: [{ text: this.#context }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      });
      targetUrl = `${config.url}/${model}:generateContent?key=${config.apiKey}`;
    }

    if (provider.startsWith('groq') || provider.startsWith('openrouter')) {
      requestBody = JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: this.#context,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
      targetUrl = `${config.url}`;
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const statusId = uuidv4();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.configService.get('app.aiReqTimeout', { infer: true }));
    try {
      this.#logger.log(`Querying ${model} with prompt: ${prompt.substring(0, 50)}...`);
      void emitToClient('statusUpdate', {
        id: statusId,
        message: `Querying ${model} with prompt`,
        nickname: this.#botName,
        status: 'info',
        time: Date.now(),
      });
      const response = await fetch(targetUrl, {
        method: 'POST',
        body: requestBody,
        headers: headers,
        signal: controller.signal,
      });

      void emitToClient('statusUpdate', {
        id: statusId,
        message: `Processing answer from ${model}`,
        status: 'info',
        nickname: this.#botName,
        time: Date.now(),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        this.#logger.error(`Error response from ${model} (${response.status}): ${errorBody}`);
        return null;
      }

      const data = await response.json();

      let text: string | null = null;
      if (provider.startsWith('google')) {
        text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      }

      if (provider.startsWith('groq') || provider.startsWith('openrouter')) {
        text = data?.choices?.[0]?.message?.content ?? null;
      }

      if (!text) {
        this.#logger.warn(`Could not extract text from ${model} response: ${JSON.stringify(data)}`);
      }
      return text;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.#logger.warn(`Request to ${model} timed out: ${error.message}`);
        void emitToClient('statusUpdate', {
          id: statusId,
          message: `${model} took too long to answer`,
          status: 'warning',
          nickname: this.#botName,
          time: Date.now(),
        });
      } else if (error instanceof Error) {
        this.#logger.error(`Network or parsing error with ${model}: ${error.message}, ${error.stack}`);
        void emitToClient('statusUpdate', {
          id: statusId,
          message: `Network error with  ${model}`,
          status: 'error',
          nickname: this.#botName,
          time: Date.now(),
        });
      } else {
        this.#logger.error(`Network or parsing error with ${model}: ${String(error)}`);
        void emitToClient('statusUpdate', {
          id: statusId,
          message: `Network error with ${model}`,
          status: 'error',
          nickname: this.#botName,
          time: Date.now(),
        });
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
      void emitToClient('statusUpdate', {
        id: statusId,
        message: `Processed answer from ${model}`,
        status: 'info',
        nickname: this.#botName,
        time: Date.now(),
      });
    }
  }

  async generateMultiProviderResponse(
    originalPrompt: string,
    emitToClient: EmitToClientCallback,
  ): Promise<string | null> {
    const settledResults = await Promise.allSettled(
      this.#providers.map((provider) =>
        this.queryProvider(provider, this.#config[provider], originalPrompt, emitToClient),
      ),
    );

    const successfulResponses: string[] = [];
    settledResults.forEach((result, index) => {
      const provider = this.#providers[index];
      if (result.status === 'fulfilled' && result.value) {
        this.#logger.log(`Response from ${provider}:`, { response: result.value });
        successfulResponses.push(result.value);
      } else if (result.status === 'rejected') {
        const reason = result.reason instanceof Error ? result.reason.message : result.reason;
        this.#logger.error(`Error querying ${provider}: ${reason}`);
      }
    });

    if (successfulResponses.length === 0) {
      this.#logger.error('No providers returned a successful response.');
      return null;
    }

    // If only one provider succeeded, return its response directly
    if (successfulResponses.length === 1) {
      this.#logger.log('Only one provider succeeded, returning its response.');
      return successfulResponses[0];
    }

    const masterProvider = this.#masterConfig.name;
    this.#logger.log(`Using master provider "${masterProvider}" for synthesis.`);
    const synthesisPrompt = `
      Original User Prompt: "${originalPrompt}"

      Multiple AI models provided the following responses:
      ${successfulResponses.map((r, i) => `--- Response ${i + 1} ---\n${r}`).join('\n\n')}

      Synthesize these responses into a single, coherent, accurate, and helpful final answer that directly addresses the original user prompt.
      Do not simply list the responses. Combine the best elements and information into one unified response. Return ONLY the final synthesized answer.
      Final Answer:
    `;

    const finalAnswer = await this.queryProvider(masterProvider, this.#masterConfig, synthesisPrompt, emitToClient);
    if (!finalAnswer) {
      this.#logger.warn(
        `Master provider "${masterProvider}" failed to synthesize. Falling back to the first successful response.`,
      );
      return successfulResponses[0];
    }

    this.#logger.log(`Synthesized response generated by ${masterProvider}.`);
    return finalAnswer;
  }
}
