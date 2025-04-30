import { Socket } from 'socket.io-client';

export interface ClientChatMessage {
  nickname: string;
  prompt: string;
  time: number;
  models: string[];
  queryId: string;
}

export interface AIAnswer {
  model: string;
  provider: string;
  status: 'waiting' | 'streaming' | 'complete' | 'error';
  text: string;
  time: number | null;
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

export interface SocketExceptionData {
  status: 'error';
  message: string;
}

export interface ServerChatChunkMessage {
  queryId: string;
  model: string;
  text: string;
  nickname: string;
}

export interface ServerChatEndMessage {
  queryId: string;
  model: string;
  nickname: string;
  time: number;
}

export interface ServerChatErrorMessage {
  queryId: string;
  model: string;
  error: string;
  nickname: string;
  time: number;
}

export type MessageProps =
  | {
      type: 'user';
      text: string;
      nickname: string;
      time: number;
    }
  | {
      type: 'bot';
      queryId: string;
      nickname: string;
      time: number;
      answers: Record<string, AIAnswer>;
    };

export type SocketClient = Socket;
