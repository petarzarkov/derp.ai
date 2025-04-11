import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export interface AuthUser {
  id: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
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
