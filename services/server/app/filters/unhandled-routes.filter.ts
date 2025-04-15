import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ContextLogger } from 'nestjs-context-logger';

@Catch(HttpException)
export class UnhandledRoutes implements ExceptionFilter {
  private logger = new ContextLogger(this.constructor.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();

    // We want to log errors not instances of the nestjs HttpException to tell us what we are not handling properly
    if (exception.getStatus() === 404 && !(exception instanceof HttpException)) {
      const path = request.originalUrl;
      this.logger.warn(`Unhandled route ${request.method} ${path}`);
    }

    return response.status(exception.getStatus()).send(exception.getResponse());
  }
}
