import { createContext } from 'react';

export interface ConfigState {
  appEnv: string;
  appName: string;
  supportEmail: string;
  swaggerDocsUrl: string;
  serverUrl: string;
  isLoading: boolean;
  models: string[];
}

const initServerUrl =
  window.location.host.includes('localhost') || window.location.host.includes('127.0.0.1')
    ? 'http://localhost:3033'
    : window.location.origin;

export const initialConfigState: ConfigState = {
  appEnv: 'unknown',
  serverUrl: initServerUrl,
  appName: 'DerpAI',
  supportEmail: 'unknown',
  swaggerDocsUrl: `${initServerUrl}/api`,
  isLoading: true,
  models: ['gemini-2.0-flash'],
};

export const ConfigContext = createContext<ConfigState>(initialConfigState);
