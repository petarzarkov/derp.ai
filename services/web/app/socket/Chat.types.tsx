import { AIAnswer } from '@derpai/common';
import { Socket } from 'socket.io-client';

export class ClientAIAnswer extends AIAnswer {
  status: 'waiting' | 'streaming' | 'complete' | 'error';
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
      answers: Record<string, ClientAIAnswer>;
    };

export type SocketClient = Socket;
