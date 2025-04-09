import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateConfig, ValidatedConfig } from '../../const';
import { AIProvider } from './ai.entity';

@Injectable()
export class AIService {
  #logger = new Logger(AIService.name);
  #config: ReturnType<typeof validateConfig>['aiProviders'];
  #providers: AIProvider[];

  constructor(private configService: ConfigService<ValidatedConfig, true>) {
    const providers = this.configService.get('aiProviders', { infer: true });
    if (!providers) {
      throw new Error('config aiProviders are not set!');
    }
    this.#config = providers;
    this.#providers = Object.keys(providers) as AIProvider[];
  }

  private async queryProvider(provider: AIProvider, prompt: string): Promise<string | null> {
    const config = this.#config[provider];
    if (!config) {
      this.#logger.warn(`Configuration for provider "${provider}" not found.`);
      return null;
    }

    let requestBody: string;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let targetUrl = `${config.url}`;

    switch (provider) {
      case 'google':
        requestBody = JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        });
        targetUrl = `${config.url}:generateContent?key=${config.apiKey}`;
        break;

      // case 'google/flan-t5-base':
      // case 'facebook/bart-large-cnn':
      //   requestBody = JSON.stringify({
      //     inputs: prompt,
      //     parameters: { max_new_tokens: 250 },
      //   });
      //   headers['Authorization'] = `Bearer ${config.apiKey}`;
      //   break;

      default:
        this.#logger.error(`Unsupported provider type: ${provider}`);
        return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.configService.get('app.aiReqTimeout', { infer: true }));
    try {
      this.#logger.log(`Querying ${provider} with prompt: ${prompt.substring(0, 50)}...`);
      const response = await fetch(targetUrl, {
        method: 'POST',
        body: requestBody,
        headers: headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.#logger.error(`Error response from ${provider} (${response.status}): ${errorBody}`);
        return null;
      }

      const data = await response.json();

      let text: string | null = null;
      switch (provider) {
        case 'google':
          text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
          break;
        // case 'google/flan-t5-base':
        // case 'facebook/bart-large-cnn':
        //   if (Array.isArray(data) && data[0]?.generated_text) {
        //     text = data[0].generated_text;
        //     if (text?.startsWith(prompt)) {
        //       text = text.substring(prompt.length).trim();
        //     }
        //   } else if (typeof data?.generated_text === 'string') {
        //     text = data.generated_text;
        //   }
        //   break;
      }

      if (!text) {
        this.#logger.warn(`Could not extract text from ${provider} response: ${JSON.stringify(data)}`);
      }
      return text;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.#logger.error(`Request to ${provider} timed out: ${error.message}`);
      } else if (error instanceof Error) {
        this.#logger.error(`Network or parsing error with ${provider}: ${error.message}, ${error.stack}`);
      } else {
        this.#logger.error(`Network or parsing error with ${provider}: ${String(error)}`);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getMasterProvider(): AIProvider | null {
    if (this.#config.google) return 'google';
    // if (this.#config['google/flan-t5-base']) return 'google/flan-t5-base';
    return this.#providers[0] ?? null;
  }

  async generateMultiProviderResponse(originalPrompt: string): Promise<string | null> {
    const settledResults = await Promise.allSettled(
      this.#providers.map((provider) => this.queryProvider(provider, originalPrompt)),
    );

    const successfulResponses: string[] = [];
    settledResults.forEach((result, index) => {
      const provider = this.#providers[index];
      if (result.status === 'fulfilled' && result.value) {
        this.#logger.log(`Response from ${provider}:`, result.value);
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

    const masterProvider = this.getMasterProvider();
    if (!masterProvider) {
      this.#logger.error('Could not determine a master provider for synthesis.');
      return successfulResponses[0];
    }

    this.#logger.log(`Using master provider "${masterProvider}" for synthesis.`);

    const synthesisPrompt = `
      Original User Prompt: "${originalPrompt}"

      Multiple AI models provided the following responses:
      ${successfulResponses.map((r, i) => `--- Response ${i + 1} ---\n${r}`).join('\n\n')}

      Synthesize these responses into a single, coherent, accurate, and helpful final answer that directly addresses the original user prompt.
      Do not simply list the responses. Combine the best elements and information into one unified response. Return ONLY the final synthesized answer.
      Final Answer:
    `;

    const finalAnswer = await this.queryProvider(masterProvider, synthesisPrompt);

    if (!finalAnswer) {
      this.#logger.warn(
        `Master provider "${masterProvider}" failed to synthesize. Falling back to the first successful response.`,
      );
      return successfulResponses[0];
    }

    this.#logger.log(`Synthesized response generated by ${masterProvider}.`);
    return finalAnswer;
  }

  async generateResponse(prompt: string): Promise<string | null> {
    return this.generateMultiProviderResponse(prompt);
  }
}
