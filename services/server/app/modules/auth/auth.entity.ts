import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { FastifyRequest } from 'fastify';

export interface JWTPayload {
  sub: string;
  username: string;
  createdAt: Date;
}

export class LoginRequest {
  @IsString()
  @MinLength(2)
  @ApiProperty({
    example: 'alice',
  })
  username: string;

  @IsString()
  @MinLength(2)
  @ApiProperty({
    example: 'alice',
  })
  password: string;
}

export class LoginResponse {
  @ApiProperty()
  accessToken: string;
}

export type BaseRequest = FastifyRequest & { user: JWTPayload };
