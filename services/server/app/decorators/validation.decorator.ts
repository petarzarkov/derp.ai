import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { IsString as IsStringFn, IsOptional, IsNumber, Length, IsObject, IsBoolean, IsUUID } from 'class-validator';

export function IsString(minLength: number, maxLength?: number) {
  return applyDecorators(IsStringFn(), Length(minLength, maxLength));
}

export function IsStringOptional(minLength: number, maxLength?: number) {
  return applyDecorators(IsOptional(), IsStringFn(), Length(minLength, maxLength));
}

export function IsNumberOptional() {
  return applyDecorators(IsOptional(), IsNumber());
}

export function IsObjectOptional() {
  return applyDecorators(IsOptional(), IsObject());
}

export function IsBooleanOptional() {
  return applyDecorators(IsOptional(), IsBoolean());
}

/**
 *
 * @param optional optional by default as we don't enforce requestId
 * @param opts {ApiPropertyOptions}
 */
export function IsRequestId(optional = true, opts?: ApiPropertyOptions) {
  const decorators = [
    IsUUID(4),
    ApiProperty({
      ...opts,
      description: 'requestId',
      required: !optional,
      type: 'string',
      format: 'uuid',
      example: '4a9d201e-c0cc-4c84-a570-84c247e96499',
    }),
  ];

  if (optional) {
    decorators.push(IsOptional());
  }

  return applyDecorators(...decorators);
}
