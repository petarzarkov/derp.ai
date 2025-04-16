import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ContextLogger } from 'nestjs-context-logger';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  private readonly logger = new ContextLogger(SessionAuthGuard.name);

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    const isAuthenticated = request.isAuthenticated();
    if (!isAuthenticated) {
      this.logger.debug('Request is not authenticated via session.');
      throw new UnauthorizedException('User session is not authenticated.');
    }

    this.logger.debug(`Request authenticated via session for user: ${request.user?.email}`);
    return true;
  }
}
