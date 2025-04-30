import { validateConfig } from '../../const';

export type AIProvidersConfig = ReturnType<typeof validateConfig>['aiProviders'];
export type AIModel = keyof AIProvidersConfig;
export type AIConfig = AIProvidersConfig[AIModel];
export type APIType = AIConfig['apiType'];

export interface AIAnswer {
  model: AIModel;
  provider: string;
  text: string;
  time: number;
}
