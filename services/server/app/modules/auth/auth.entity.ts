import { ApiProperty } from '@nestjs/swagger';
import { SanitizedUser } from '../../db/entities/users/user.entity';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Request } from 'express';

export class RegisterRequest {
  @IsEmail()
  @ApiProperty({ example: 'bob@example.com' })
  email: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'Password123!' })
  password: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  @ApiProperty({ example: 'Bob The Builder', required: false })
  displayName?: string;
}

export class LoginRequest {
  @IsEmail()
  @ApiProperty({ example: 'alice@example.com' })
  email: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'alice_password' })
  password: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
}

export class AuthResponse {
  @ApiProperty()
  accessToken: string;
}

/**
 * Auth strategies attach the user to the request ctx
 */
export type BaseRequest = Request & { user: SanitizedUser };
