import { Socket } from 'socket.io-client';

export interface ClientChatMessage {
  nickname: string;
  message: string;
}

export interface ServerChatMessage extends ClientChatMessage {
  time: number;
}

export interface MessageProps {
  text: string;
  nickname: 'user' | 'DerpAI' | 'error' | string;
  time: number;
}

export interface SocketExceptionData {
  status: 'error';
  message: string;
}

export type SocketClient = Socket;
