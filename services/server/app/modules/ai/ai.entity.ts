import { validateConfig } from '../../const';

export type AIMasterProvider = ReturnType<typeof validateConfig>['masterAIProvider']['name'];
export type AIProvider = keyof ReturnType<typeof validateConfig>['aiProviders'];

export interface AIProviderConfig {
  url: string;
  model: string;
  apiKey: string;
}
