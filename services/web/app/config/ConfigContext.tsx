import { createContext } from 'react';

export interface ConfigState {
  appEnv: string;
  appName: string;
  supportEmail: string;
  swaggerDocsUrl: string;
  serverUrl: string;
  isLoading: boolean;
}

export const initialConfigState: ConfigState = {
  appEnv: 'unknown',
  serverUrl:
    window.location.host.includes('localhost') || window.location.host.includes('127.0.0.1')
      ? 'http://localhost:3033'
      : window.location.origin,
  appName: 'DerpAI',
  supportEmail: 'unknown',
  swaggerDocsUrl: 'http://localhost:3033/api',
  isLoading: true,
};

export const ConfigContext = createContext<ConfigState>(initialConfigState);
