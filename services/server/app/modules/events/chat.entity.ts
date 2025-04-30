import { IsNotEmpty, IsString, ArrayNotEmpty, ArrayUnique, IsOptional, IsUUID } from 'class-validator';
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

  @IsString()
  @IsOptional()
  @IsUUID()
  queryId?: string;
}

export class ChatInitReply {
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

export interface ChatChunkReply {
  queryId: string;
  model: string;
  text: string;
  nickname: string;
}

export interface ChatEndReply {
  queryId: string;
  model: string;
  nickname: string;
  time: number;
}

export interface ChatErrorReply {
  queryId: string;
  model: string;
  error: string;
  nickname: string;
  time: number;
}
