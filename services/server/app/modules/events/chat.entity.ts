import { IsNotEmpty, IsString, ArrayNotEmpty, ArrayUnique, IsUUID, IsNumber } from 'class-validator';
import { AIModel } from '../ai/ai.entity';
import { WSPromptMessage } from '@derpai/common';

export class ChatMessage implements WSPromptMessage {
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
  @IsUUID()
  queryId: string;

  @IsNumber()
  time: number;
}
