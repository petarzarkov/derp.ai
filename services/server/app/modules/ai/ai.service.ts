import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidatedConfig } from '../../const';
import { AIAnswer, AIModel, AIProvidersConfig } from './ai.entity';
import { ContextLogger } from 'nestjs-context-logger';
import { EmitToClient } from '../events/events.gateway';
import { GoogleProvider } from './providers/google.provider';
import { OpenAIProvider } from './providers/openai.provider';

@Injectable()
export class AIService {
  #botName: string;
  #context: string;
  #logger = new ContextLogger(AIService.name);
  #config: AIProvidersConfig;

  constructor(private configService: ConfigService<ValidatedConfig, true>) {
    const providers = this.configService.get('aiProviders', { infer: true });
    if (!providers) {
      throw new Error('config aiProviders not set!');
    }

    const appConfig = this.configService.get('app', { infer: true });
    this.#botName = appConfig.name;
    this.#context = `Your name is ${this.#botName}. You are a helpful assistant that can answer questions and help with tasks.`;
    this.#config = providers;
  }

  createProviderInstance(model: AIModel, emit: EmitToClient, queryId: string) {
    const config = this.#config[model];
    switch (config.apiType) {
      case 'google.api.v1beta':
        return new GoogleProvider(model, config, this.#context, emit, queryId, this.#botName);
      case 'openrouter.api.v1':
      case 'groq.api.v1':
        return new OpenAIProvider(model, config, this.#context, emit, queryId, this.#botName);
      default:
        throw new Error(`Unsupported API model: ${model}`);
    }
  }

  private async queryProviderStream(
    queryId: string,
    model: AIModel,
    prompt: string,
    emitToClient: EmitToClient,
  ): Promise<AIAnswer> {
    const config = this.#config[model];
    const handler = this.createProviderInstance(model, emitToClient, queryId);
    const timeout = this.configService.get('app.aiReqTimeout', { infer: true });

    const receivedText = await handler.queryProviderStream(prompt, timeout);
    return {
      model,
      provider: config.provider,
      text: receivedText,
      time: Date.now(),
    };
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
      const providerInfo = this.#config[model];

      if (result.status === 'fulfilled') {
        this.#logger.log(`Query for ${model} finished. Final text length: ${result.value.text.length}`, { queryId });
        finalResponses.push(result.value);
      } else {
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
