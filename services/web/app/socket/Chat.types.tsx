import { Socket } from 'socket.io-client';

export interface ClientChatMessage {
  nickname: string;
  message: string;
  time: number;
  models: string[];
}

export interface AIAnswer {
  model: string;
  provider: string;
  text: string;
  time: number;
}

export interface ServerInitMessage {
  nickname: string;
  message: string;
  time: number;
}

export interface ServerChatMessage {
  nickname: string;
  answers: AIAnswer[];
  time: number;
}

export interface ChatHistoryItem {
  question: ClientChatMessage;
  answer: ServerChatMessage;
}

export interface ServerStatusMessage {
  id: string;
  nickname: string;
  message: string;
  time: number;
  status: 'error' | 'info' | 'warning' | 'success' | 'loading';
}

export interface MessageFromUserProps {
  type: 'user' | 'system';
  text: string;
  nickname: string;
  time: number;
}

export interface MessageFromAIProps {
  type: 'bot';
  answers: AIAnswer[];
  nickname: 'system' | 'error' | string;
  time: number;
}

export type MessageProps = MessageFromUserProps | MessageFromAIProps;

export interface SocketExceptionData {
  status: 'error';
  message: string;
}

export type SocketClient = Socket;
