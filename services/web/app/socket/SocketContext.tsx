import { createContext } from 'react';
import type { MessageProps } from './Chat.types';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface SocketContextState {
  messages: MessageProps[];
  isConnected: boolean;
  isBotThinking: boolean;
  connectionStatus: ConnectionStatus;
  currentStatusMessage: string | null;
  sendMessage: (messageText: string) => void;
}

export const SocketContext = createContext<SocketContextState | undefined>(undefined);
