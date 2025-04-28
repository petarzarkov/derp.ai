import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateConfig, ValidatedConfig } from '../../const';
import { AIAnswer, AIModel } from './ai.entity';
import { ContextLogger } from 'nestjs-context-logger';
import { EmitToClientCallback } from '../events/events.gateway';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AIService {
  #botName;
  #context;
  #logger = new ContextLogger(AIService.name);
  #config: ReturnType<typeof validateConfig>['aiProviders'];

  constructor(private configService: ConfigService<ValidatedConfig, true>) {
    const providers = this.configService.get('aiProviders', { infer: true });
    const appConfig = this.configService.get('app', { infer: true });
    this.#botName = appConfig.name;
    this.#context = `Your name is ${this.#botName}. You are a helpful assistant that can answer questions and help with tasks.`;

    if (!providers) {
      throw new Error('config aiProviders not set!');
    }
    this.#config = providers;
  }

  private async queryProvider(
    model: AIModel,
    prompt: string,
    emitToClient: EmitToClientCallback,
  ): Promise<AIAnswer | null> {
    const config = this.#config[model];
    if (!config) {
      this.#logger.warn(`Configuration for model "${model}" not found.`);
      return null;
    }

    const { provider, apiType } = config;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let requestBody: string | null = null;
    let targetUrl = `${config.url}`;

    if (apiType === 'google.api.v1beta') {
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

    if (apiType === 'groq.api.v1' || apiType === 'openrouter.api.v1') {
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
      emitToClient('statusUpdate', {
        id: statusId,
        message: `Querying ${model}`,
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

      emitToClient('statusUpdate', {
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
      if (apiType === 'google.api.v1beta') {
        text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      }

      if (apiType === 'groq.api.v1' || apiType === 'openrouter.api.v1') {
        text = data?.choices?.[0]?.message?.content ?? null;
      }

      if (!text) {
        this.#logger.warn(`Could not extract text from ${model} response: ${JSON.stringify(data)}`);
        return null;
      }

      return {
        model,
        provider,
        text,
        time: Date.now(),
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.#logger.warn(`Request to ${model} timed out: ${error.message}`);
        emitToClient('statusUpdate', {
          id: statusId,
          message: `${model} took too long to answer`,
          status: 'warning',
          nickname: this.#botName,
          time: Date.now(),
        });
      } else if (error instanceof Error) {
        this.#logger.error(`Network or parsing error with ${model}: ${error.message}, ${error.stack}`);
        emitToClient('statusUpdate', {
          id: statusId,
          message: `Network error with  ${model}`,
          status: 'error',
          nickname: this.#botName,
          time: Date.now(),
        });
      } else {
        this.#logger.error(`Network or parsing error with ${model}: ${String(error)}`);
        emitToClient('statusUpdate', {
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
        message: `Synthesizing answer from ${model}`,
        status: 'info',
        nickname: this.#botName,
        time: Date.now(),
      });
    }
  }

  async generateMultiProviderResponse(originalPrompt: string, models: AIModel[], emitToClient: EmitToClientCallback) {
    const settledResults = await Promise.allSettled(
      models.map((provider) => this.queryProvider(provider, originalPrompt, emitToClient)),
    );

    const responses: AIAnswer[] = [];
    for (const [index, result] of settledResults.entries()) {
      const model = models[index];
      const { apiType, provider } = this.#config[model];

      if (result.status === 'fulfilled') {
        this.#logger.log(`Response from ${apiType}:`, { response: result });
        responses.push(
          result.value || {
            model,
            provider,
            text: 'Sorry, I had trouble thinking about that.',
            time: Date.now(),
          },
        );
      } else if (result.status === 'rejected') {
        const reason = result.reason instanceof Error ? result.reason.message : result.reason;
        this.#logger.error(`Error querying ${apiType}: ${reason}`);
        responses.push({
          model,
          provider,
          text: 'Sorry, I had trouble thinking about that.',
          time: Date.now(),
        });
      }
    }

    return responses;
  }
}
