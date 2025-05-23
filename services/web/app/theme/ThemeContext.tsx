import React from 'react';
import { Expand } from '@derpai/common';
import { ColorTheme } from '@theme';

export interface ContextSettings {
  theme: ColorTheme;
}

export type ProviderBase = Expand<
  {
    colors: Record<string, string>;
    isLoading: boolean;
  } & ContextSettings
>;

export type ContextState = Expand<
  ProviderBase & {
    setTheme: (theme: ColorTheme) => void;
  }
>;

export const Context = React.createContext<ContextState | undefined>(undefined);
