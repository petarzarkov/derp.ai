import { validateConfig } from '../../const';

export type AIProvider = keyof ReturnType<typeof validateConfig>['aiProviders'];
