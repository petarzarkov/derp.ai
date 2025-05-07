import { AIAnswer } from './ai.types';

export interface WSInitMessage {
  nickname: string;
  message: string;
  time: number;
}

export interface WSPromptMessage {
  nickname: string;
  prompt: string;
  time: number;
  models: string[];
  queryId: string;
}

export interface WSChunkMessage {
  queryId: string;
  model: string;
  provider: string;
  text: string;
  nickname: string;
}

export interface WSEndMessage {
  queryId: string;
  model: string;
  provider: string;
  nickname: string;
  time: number;
}

export interface WSErrorMessage {
  queryId: string;
  model: string;
  provider: string;
  error: string;
  nickname: string;
  time: number;
}

export interface WSExceptionMessage {
  status: 'error';
  message: string;
}

export class WsPromptResponse {
  nickname: string;
  answers: AIAnswer[];
  time: number;
}

export class ChatHistoryItem {
  question: WSPromptMessage;
  answer: WsPromptResponse;
}
