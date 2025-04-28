import { IsNotEmpty, IsString, ArrayNotEmpty, ArrayUnique } from 'class-validator';
import { AIAnswer, AIModel } from '../ai/ai.entity';

export class ChatMessage {
  @IsNotEmpty()
  @IsString()
  nickname: string;

  @IsNotEmpty()
  @IsString()
  prompt: string;

  @IsString({ each: true })
  @ArrayNotEmpty()
  @ArrayUnique()
  models: AIModel[];
}

export class ChatMessageReply {
  nickname: string;
  message: string;
  time: number;
}

export class ChatAnswersReply {
  nickname: string;
  answers: AIAnswer[];
  time: number;
}

export class StatusMessageReply {
  id: string;
  nickname: string;
  message: string;
  time: number;
  status?: 'error' | 'info' | 'warning' | 'success' | 'loading';
}

export class ChatHistoryItem {
  question: ChatMessage;
  answer: ChatAnswersReply;
}
