import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateConfig, ValidatedConfig } from '../../const';
import { AIAnswer, AIModel } from './ai.entity';
import { ContextLogger } from 'nestjs-context-logger';
import { EmitToClient } from '../events/events.gateway';

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

  private async queryProviderStream(
    queryId: string,
    model: AIModel,
    prompt: string,
    emitToClient: EmitToClient,
  ): Promise<AIAnswer | null> {
    const config = this.#config[model];
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
      targetUrl = `${config.url}/${model}:streamGenerateContent?key=${config.apiKey}&alt=sse`;
    } else if (apiType === 'groq.api.v1' || apiType === 'openrouter.api.v1') {
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
        stream: true,
      });
      targetUrl = `${config.url}`;
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    } else {
      this.#logger.warn(`Unsupported API type "${apiType}" for model "${model}". Cannot stream.`);
      emitToClient('streamError', {
        queryId,
        model,
        error: `Unsupported API type ${apiType}`,
        nickname: this.#botName,
        time: Date.now(),
      });
      emitToClient('streamEnd', { queryId, model, nickname: this.#botName, time: Date.now() });
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.configService.get('app.aiReqTimeout', { infer: true }));
    const sseResponseLineRE = /^data: (.*)(?:\n\n|\r\r|\r\n\r\n)/;
    let receivedText = '';
    let finalAnswer: AIAnswer | null = null;
    try {
      this.#logger.log(`Streaming query to ${model} (${apiType}) with prompt: ${prompt.substring(0, 50)}...`, {
        queryId,
      });

      const response = await fetch(targetUrl, {
        method: 'POST',
        body: requestBody,
        headers: headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.#logger.error(`Error response from ${model} (${apiType}) (${response.status})`, { errorBody, queryId });
        emitToClient('streamError', {
          queryId,
          model,
          error: `API error (${response.status}): ${errorBody.slice(0, 50)}`,
          nickname: this.#botName,
          time: Date.now(),
        });
        emitToClient('streamEnd', { queryId, model, nickname: this.#botName, time: Date.now() });
        return null;
      }

      if (!response.body) {
        this.#logger.error(`Response body is null for ${model} (${apiType})`, { queryId });
        emitToClient('streamError', {
          queryId,
          model,
          error: `Empty response body`,
          nickname: this.#botName,
          time: Date.now(),
        });
        emitToClient('streamEnd', { queryId, model, nickname: this.#botName, time: Date.now() });
        return null;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim().length > 0) {
            throw new Error('Incomplete JSON segment at the end');
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true }); // Decode chunk and add to buffer
        if (apiType === 'groq.api.v1' || apiType === 'openrouter.api.v1') {
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const event of events) {
            if (!event.startsWith('data: ')) {
              continue;
            }
            const jsonString = event.substring('data: '.length);

            if (jsonString === '[DONE]') {
              break;
            }

            try {
              const data = JSON.parse(jsonString);
              const chunk: string | undefined = data?.choices?.[0]?.delta?.content;
              if (chunk) {
                receivedText += chunk;
                emitToClient('streamChunk', {
                  queryId,
                  model,
                  text: chunk,
                  nickname: this.#botName,
                });
              }
            } catch (parseError) {
              this.#logger.error(`Failed to parse stream chunk from ${model} (${apiType}): ${parseError}`, {
                queryId,
                chunk: event.substring(0, 100),
              });
            }
          }
        } else if (apiType === 'google.api.v1beta') {
          let match: RegExpMatchArray | null;
          // Process all complete SSE messages in the buffer
          while ((match = buffer.match(sseResponseLineRE))) {
            const jsonString = match[1]; // Extract the JSON payload

            try {
              const data = JSON.parse(jsonString);
              // Check for embedded errors within the stream chunk itself (like the SDK does)
              if ('error' in data) {
                const errorJson = JSON.parse(JSON.stringify(data['error'])) as Record<string, unknown>;
                const status = errorJson['status'] as string | undefined;
                const code = errorJson['code'] as number | undefined;
                const errorMessage = `Stream error chunk: status=${status}, code=${code}. ${JSON.stringify(data)}`;
                // You might want to throw a specific error type or just a generic one
                this.#logger.error(errorMessage, { queryId });
                // Throwing here will break the stream and trigger the catch block below
                throw new Error(errorMessage);
              }

              // Extract the content from the valid data chunk
              // Note: Google's stream often sends chunks that might not have text initially (e.g., safety ratings)
              // So, we only process chunks that actually contain text parts.
              const chunk: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

              if (chunk) {
                receivedText += chunk;
                emitToClient('streamChunk', {
                  queryId,
                  model,
                  text: chunk,
                  nickname: this.#botName,
                });
              }

              // Remove the processed match from the buffer
              buffer = buffer.slice(match[0].length);
            } catch (parseError: unknown) {
              // Handle errors during parsing or embedded errors
              if (parseError instanceof Error) {
                // If it was an embedded error, it's already logged and we re-throw
                if (parseError.message.startsWith('Stream error chunk:')) {
                  throw parseError;
                }
                // Handle JSON parsing errors
                this.#logger.error(`Failed to parse stream chunk from ${model} (${apiType}): ${parseError.message}`, {
                  queryId,
                  chunk: jsonString.substring(0, 100), // Log the problematic string
                  stack: parseError.stack,
                });
              } else {
                this.#logger.error(`Unknown error parsing stream chunk from ${model} (${apiType})`, {
                  queryId,
                  chunk: jsonString.substring(0, 100),
                  error: parseError,
                });
              }
              throw new Error(`Stream parsing failed for ${model}`);
            }
          }
        }
      }

      finalAnswer = {
        model,
        provider,
        text: receivedText,
        time: Date.now(),
      };

      this.#logger.log(`Stream from ${model} (${apiType}) finished. Total text length: ${receivedText.length}`, {
        queryId,
      });
      emitToClient('streamEnd', { queryId, model, nickname: this.#botName, time: Date.now() });

      return finalAnswer;
    } catch (error: unknown) {
      const errorTime = Date.now();
      if (error instanceof Error && error.name === 'AbortError') {
        this.#logger.warn(`Request to ${model} (${apiType}) timed out: ${error.message}`, { queryId });
        emitToClient('streamError', {
          queryId,
          model,
          error: `${model} took too long to respond`,
          nickname: this.#botName,
          time: errorTime,
        });
      } else if (error instanceof Error) {
        this.#logger.error(`Network, parsing, or stream error with ${model} (${apiType}): ${error.message}`, {
          queryId,
          stack: error.stack,
        });
        emitToClient('streamError', {
          queryId,
          model,
          error: `Communication error with ${model}`,
          nickname: this.#botName,
          time: errorTime,
        });
      } else {
        this.#logger.error(`Unknown error with ${model} (${apiType})`, { error, queryId });
        emitToClient('streamError', {
          queryId,
          model,
          error: `An unexpected error occurred with ${model}`,
          nickname: this.#botName,
          time: errorTime,
        });
      }
      emitToClient('streamEnd', { queryId, model, nickname: this.#botName, time: errorTime });

      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async streamMultiProviderResponse(
    queryId: string,
    originalPrompt: string,
    models: AIModel[],
    emitToClient: EmitToClient,
  ): Promise<AIAnswer[]> {
    const settledResults = await Promise.allSettled(
      models.map((model) => this.queryProviderStream(queryId, model, originalPrompt, emitToClient)),
    );

    const finalResponses: AIAnswer[] = [];
    for (const [index, result] of settledResults.entries()) {
      const model = models[index];
      const providerInfo = this.#config[model] || { provider: 'unknown', apiType: 'unknown' };

      if (result.status === 'fulfilled') {
        if (result.value) {
          this.#logger.log(`Query for ${model} finished. Final text length: ${result.value.text.length}`, { queryId });
          finalResponses.push(result.value);
        } else {
          this.#logger.warn(
            `Query for ${model} fulfilled with null result (likely config error or initial check failed)`,
            { queryId },
          );
          // Add a placeholder or default error if needed, although streamError should cover client view
          finalResponses.push({
            model,
            provider: providerInfo.provider,
            text: 'Sorry, I had trouble getting a final answer.',
            time: Date.now(),
          });
        }
      } else if (result.status === 'rejected') {
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        this.#logger.error(`Promise rejected for ${model}: ${reason}`, { queryId });
        finalResponses.push({
          model,
          provider: providerInfo.provider,
          text: 'Sorry, an unexpected error occurred.',
          time: Date.now(),
        });
      }
    }

    return finalResponses;
  }
}
