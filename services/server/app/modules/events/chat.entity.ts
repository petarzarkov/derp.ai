import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ChatMessage {
  @IsNotEmpty()
  @IsString()
  nickname: string;
  @IsNotEmpty()
  @IsString()
  message: string;
}

export class ChatMessageResponse {
  @IsNotEmpty()
  @IsString()
  nickname: string;
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsNotEmpty()
  @IsNumber()
  time: number;
}
