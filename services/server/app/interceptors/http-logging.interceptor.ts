import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { REQUEST_ID_HEADER_KEY } from '../const';
import { Request, Response } from 'express';
import { tap } from 'rxjs';
import { ContextLogger } from 'nestjs-context-logger';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  #logger = new ContextLogger(this.constructor.name);

  intercept(context: ExecutionContext, next: CallHandler) {
    const reqStartTime = Date.now();
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request>();
    const resp = httpContext.getResponse<Response>();
    const requestId = (req.headers[REQUEST_ID_HEADER_KEY.toLowerCase()] as string) || '';
    const instance = context.getClass();
    const handler = context.getHandler();

    ContextLogger.updateContext({
      requestId,
      component: instance.name,
      operation: handler.name,
      flow: 'HTTP',
    });

    this.#logger.info('Received Request');

    return next.handle().pipe(
      tap({
        next: (payload) => {
          this.#logger.info('Sent Response', { payload, duration: Date.now() - reqStartTime });
        },
        error: (err: Error & { status?: number; response?: unknown }) => {
          const errorResponse = {
            statusCode: err?.status || resp.statusCode || 500,
            name: err?.name,
            message: err?.message,
            responseBody: err?.response ? err.response : undefined,
          };

          this.#logger.error('Sent Response', err, { errorResponse, duration: Date.now() - reqStartTime });
        },
      }),
    );
  }
}
