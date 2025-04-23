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
  status?: 'error' | 'info' | 'warning' | 'success' | 'loading';
}
