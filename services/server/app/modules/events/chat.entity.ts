import { IsNotEmpty, IsString } from 'class-validator';

export class ChatMessage {
  @IsNotEmpty()
  @IsString()
  nickname: string;
  @IsNotEmpty()
  @IsString()
  message: string;
}

export class ChatMessageReply {
  nickname: string;
  message: string;
  time: number;
}

export class StatusMessageReply extends ChatMessageReply {
  id: string;
  status?: 'error' | 'info' | 'warning' | 'success' | 'loading';
}

export class ChatHistoryItem {
  question: ChatMessage;
  answer: ChatMessageReply;
}
