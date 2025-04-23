import { Socket } from 'socket.io-client';

export interface ClientChatMessage {
  nickname: string;
  message: string;
}

export interface ServerChatMessage extends ClientChatMessage {
  time: number;
}
export interface ServerStatusMessage extends ServerChatMessage {
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
