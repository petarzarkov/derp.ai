import { validateConfig } from '../../const';

export type AIModel = keyof ReturnType<typeof validateConfig>['aiProviders'];

export interface AIAnswer {
  model: AIModel;
  provider: string;
  text: string;
  time: number;
}
