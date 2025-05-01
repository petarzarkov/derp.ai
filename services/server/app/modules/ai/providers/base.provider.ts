import { ContextLogger } from 'nestjs-context-logger';
import { EmitToClient } from '../../events/events.gateway';
import { AIConfig, AIModel } from '../ai.entity';

export abstract class BaseProvider {
  logger: ContextLogger;
  protected received = '';
  protected processedBufferIndex = 0; // Add state to track processed buffer index

  constructor(
    protected readonly model: AIModel,
    protected readonly config: AIConfig,
    protected readonly context: string,
    protected readonly emit: EmitToClient,
    protected readonly queryId: string,
    protected readonly nickname: string,
  ) {
    this.logger = new ContextLogger(this.constructor.name);
  }

  abstract prepareRequest(prompt: string): {
    url: string;
    headers: Record<string, string>;
    body: string;
  };

  abstract parseChunk(buffer: string): string;

  async queryProviderStream(prompt: string, timeout = 60_000): Promise<string> {
    const { url, headers, body } = this.prepareRequest(prompt);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    let reader: ReadableStreamDefaultReader<Uint8Array<ArrayBufferLike>> | null = null;
    let buffer = '';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const message = 'Bad response from provider';
        this.logger.error(message, { res, queryId: this.queryId, model: this.model });
        this.emit('streamError', {
          model: this.model,
          provider: this.config.provider,
          nickname: this.nickname,
          queryId: this.queryId,
          error: message,
          time: Date.now(),
        });
        return message;
      }

      reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        try {
          const newlyProcessedText = this.parseChunk(buffer);
          this.received += newlyProcessedText;
        } catch (error) {
          const message = 'Parse error';
          this.logger.error(message, { error, queryId: this.queryId, model: this.model });
          this.emit('streamError', {
            model: this.model,
            provider: this.config.provider,
            nickname: this.nickname,
            queryId: this.queryId,
            error: message,
            time: Date.now(),
          });
          return message;
        }
      }

      this.emit('streamEnd', {
        model: this.model,
        provider: this.config.provider,
        nickname: this.nickname,
        queryId: this.queryId,
        time: Date.now(),
      });
      return this.received;
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const message = isTimeout ? 'Request timed out' : 'Unexpected failure';
      this.logger.error(message, { err, queryId: this.queryId, model: this.model });
      this.emit('streamError', {
        model: this.model,
        provider: this.config.provider,
        nickname: this.nickname,
        queryId: this.queryId,
        error: message,
        time: Date.now(),
      });
      return message;
    } finally {
      clearTimeout(timeoutId);
      reader?.releaseLock();
    }
  }
}
