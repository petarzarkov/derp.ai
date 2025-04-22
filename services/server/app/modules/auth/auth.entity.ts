import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

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
