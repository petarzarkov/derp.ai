import { Socket } from 'socket.io-client';

export interface ClientChatMessage {
  nickname: string;
  message: string;
  time: number;
}

export type ServerChatMessage = ClientChatMessage;

export interface ChatHistoryItem {
  question: ClientChatMessage;
  answer: ServerChatMessage;
}

export interface ServerStatusMessage extends ServerChatMessage {
  id: string;
  status: 'error' | 'info' | 'warning' | 'success' | 'loading';
}

export interface MessageProps {
  text: string;
  nickname: 'system' | 'error' | string;
  time: number;
}

export interface SocketExceptionData {
  status: 'error';
  message: string;
}

export type SocketClient = Socket;
