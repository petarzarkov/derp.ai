import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { REQUEST_ID_HEADER_KEY } from '../const'; // Adjust path
import { Response } from 'express';
import { BaseRequest } from '../modules/auth/auth.entity';
import { tap } from 'rxjs';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  #sensitiveKeys = new Set(['password', 'passwordhash', 'token', 'clientsecret', 'secret']);

  #filterPlaceholder = '***';

  filterSensitiveData(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object' || Buffer.isBuffer(obj)) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.filterSensitiveData(item));
    }

    const filteredObj: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const lowerCaseKey = key.toLowerCase();
        if (this.#sensitiveKeys.has(lowerCaseKey)) {
          filteredObj[key] = this.#filterPlaceholder;
        } else {
          filteredObj[key] = this.filterSensitiveData((obj as Record<string, unknown>)[key]);
        }
      }
    }

    return filteredObj;
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    const reqStartTime = Date.now();
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<BaseRequest>();
    const resp = httpContext.getResponse<Response>();
    const requestId = (req.headers[REQUEST_ID_HEADER_KEY.toLowerCase()] as string) || '';
    const instance = context.getClass();
    const handler = context.getHandler();
    const codeContext = `${instance.name}/${handler.name}`;
    const logger = new Logger(codeContext, { timestamp: true });

    const baseLog = {
      requestId,
      context: 'API',
      codeClass: instance.name,
      operation: handler.name,
    };

    const requestHeaders = {
      agent: req.headers['user-agent'],
      referer: req.headers.referer,
      host: req.headers.host,
      origin: req.headers.origin,
      forwarded: req.headers.forwarded,
    };

    logger.log({
      event: `<- ${req.method} ${req.originalUrl}`,
      ...baseLog,
      data: {
        request: {
          body: this.filterSensitiveData(req.body),
          query: req.query,
          headers: requestHeaders,
        },
      },
    });

    return next.handle().pipe(
      tap({
        next: (response: unknown) => {
          logger.log({
            event: `-> ${req.method} ${req.originalUrl}`,
            ...baseLog,
            duration: Date.now() - reqStartTime,
            data: {
              request: {
                body: this.filterSensitiveData(req.body),
                query: req.query,
              },
              statusCode: resp.statusCode,
              response: {
                payload: this.filterSensitiveData(response),
              },
            },
          });
        },
        error: (err: Error & { status?: number; response?: unknown }) => {
          const errorResponse = {
            statusCode: err?.status || resp.statusCode || 500,
            name: err?.name,
            message: err?.message,
            responseBody: err?.response ? this.filterSensitiveData(err.response) : undefined,
          };

          logger.error({
            event: `-> ${req.method} ${req.originalUrl} ERROR`,
            ...baseLog,
            duration: Date.now() - reqStartTime,
            error: errorResponse,
            stack: err?.stack,
            data: {
              request: {
                body: this.filterSensitiveData(req.body),
                query: req.query,
              },
            },
          });
        },
      }),
    );
  }
}
