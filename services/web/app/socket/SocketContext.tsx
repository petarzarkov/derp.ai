import React, { createContext } from 'react';
import type { MessageProps } from './Chat.types';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface SocketContextState {
  messages: MessageProps[];
  isConnected: boolean;
  isBotThinking: boolean;
  connectionStatus: ConnectionStatus;
  thinkingModels: Record<string, boolean> | null;
  currentStatusMessage: string | null;
  sendMessage: (messageText: string) => void;
  setModelsToQuery: React.Dispatch<React.SetStateAction<string[]>>;
}

export const SocketContext = createContext<SocketContextState | undefined>(undefined);
