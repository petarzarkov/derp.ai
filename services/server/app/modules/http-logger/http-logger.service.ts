import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FastifyInstance } from 'fastify';

import { HttpAdapterHost } from '@nestjs/core';
import { REQUEST_ID_HEADER_KEY } from '../../const';

@Injectable()
export class HttpLoggerService implements OnModuleInit {
  private logger = new Logger(this.constructor.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  onModuleInit() {
    const httpAdapter = this.httpAdapterHost.httpAdapter;
    const fastifyInstance = httpAdapter.getInstance<FastifyInstance>();

    fastifyInstance.addHook('onRequest', async (request) => {
      const { method, originalUrl: url, query, body } = request;
      const requestId = request.headers[REQUEST_ID_HEADER_KEY];

      this.logger.log({
        message: `<- ${method} ${url}`,
        requestId,
        request: {
          method: method,
          url,
          ...(!!query && {
            query,
          }),
          ...(!!body && {
            body,
          }),
        },
      });
    });

    fastifyInstance.addHook('onSend', async (request, reply, payload) => {
      const { method, originalUrl: url } = request;
      const { statusCode } = reply;
      const requestId = request.headers[REQUEST_ID_HEADER_KEY];

      this.logger.log({
        message: `-> ${method} ${url} ${statusCode}`,
        requestId,
        payload,
      });
    });
  }
}
