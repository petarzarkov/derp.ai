import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { FastifyRequest } from 'fastify';
import { User } from '../../../db/entities/users/user.entity';

@Injectable()
export class JwtAuthGuard {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: User }>();
    const authHeader = request.headers?.authorization;

    // If no auth header is present, allow the request to proceed
    if (!authHeader) {
      return true;
    }

    // Extract token from Authorization header
    const token = authHeader.split(' ')?.[1];
    if (!token) {
      return true;
    }

    const user = await this.authService.validateToken(token);
    request.user = user;
    return true;
  }
}
