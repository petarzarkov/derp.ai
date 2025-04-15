import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { SanitizedUser } from '../../../db/entities/users/user.entity';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: SanitizedUser }>();
  return request.user;
});
