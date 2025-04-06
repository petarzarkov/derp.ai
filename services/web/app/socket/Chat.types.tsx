import { Socket } from 'socket.io-client';

export interface ClientChatMessage {
  nickname: string;
  message: string;
}

export interface ServerChatMessage extends ClientChatMessage {
  time: number;
}

export interface MessageProps {
  text: string; // We'll map server 'message' to 'text' for the UI component
  nickname: 'user' | 'bot' | 'error' | string; // Allow specific + general strings
  time: number;
}

export interface SocketExceptionData {
  status: 'error';
  message: string;
}

export type SocketClient = Socket;
