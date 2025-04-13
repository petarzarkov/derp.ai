import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { SanitizedUser } from '../../../db/entities/users/user.entity';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<FastifyRequest & { user?: SanitizedUser }>();
  return request.user;
});
