import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { REQUEST_ID_HEADER_KEY } from '../const'; // Adjust path
import { Response } from 'express';
import { BaseRequest } from '../modules/auth/auth.entity';
import { Observable } from 'rxjs';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  #logger = new Logger('HTTP');

  intercept(context: ExecutionContext, callHandler: CallHandler) {
    const reqStartTime = Date.now();
    const [req, resp] = context.getArgs<[BaseRequest, Response]>();
    const requestId = (req.headers[REQUEST_ID_HEADER_KEY] as string) || '';
    const instance = context.getClass();
    const handler = context.getHandler();
    const codeContext = `${instance.name}/${handler.name}`;
    this.#logger = new Logger(codeContext, {
      timestamp: true,
    });

    return new Observable((observer) => {
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

      this.#logger.log({
        event: `<- ${req.method} ${req.originalUrl}`,
        ...baseLog,
        data: {
          request: {
            body: req.body,
            query: req.query,
            headers: requestHeaders,
          },
        },
      });

      const subscription = callHandler.handle().subscribe({
        next: (response: Record<string, unknown>) => {
          this.#logger.log({
            event: `-> ${req.method} ${req.originalUrl}`,
            ...baseLog,
            duration: Date.now() - reqStartTime,
            data: {
              request: {
                body: req.body,
                query: req.query,
              },
              statusCode: resp.statusCode,
              response: {
                payload: response,
              },
            },
          });

          return observer.next(response);
        },
        error: (err: Error) => {
          this.#logger.error({
            event: `-> ${req.method} ${req.originalUrl}`,
            ...baseLog,
            duration: Date.now() - reqStartTime,
            err,
            stack: err.stack,
            data: {
              request: {
                body: req.body,
                query: req.query,
              },
            },
          });

          return observer.error(err);
        },
        complete: () => observer.complete(),
      });

      return () => subscription.unsubscribe();
    });
  }
}
