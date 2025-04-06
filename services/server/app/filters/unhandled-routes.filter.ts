import { REQUEST_ID_HEADER_KEY } from '../const';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch(HttpException)
export class UnhandledRoutes implements ExceptionFilter {
  private logger = new Logger(this.constructor.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<FastifyRequest>();
    const response = host.switchToHttp().getResponse<FastifyReply>();

    // We want to log errors not instances of the nestjs HttpException to tell us what we are not handling properly
    if (exception.getStatus() === 404 && !(exception instanceof HttpException)) {
      const path = request.originalUrl;
      this.logger.warn({
        message: `Unhandled route ${request.method} ${path}`,
        requestId: request.headers[REQUEST_ID_HEADER_KEY],
        request: {
          method: request.method,
          path,
          headers: request.headers,
          request: request.body,
        },
      });
    }

    return response.status(exception.getStatus()).send(exception.getResponse());
  }
}
