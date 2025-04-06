import { Injectable, NestMiddleware } from '@nestjs/common';
import type { FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import { v4 } from 'uuid';
import { ServerResponse } from 'http';
import { REQUEST_ID_HEADER_KEY } from '../const';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: FastifyRequest, res: ServerResponse, next: HookHandlerDoneFunction) {
    const requestId = req?.id || v4();

    req.headers[REQUEST_ID_HEADER_KEY] = req.headers[REQUEST_ID_HEADER_KEY] || requestId;
    res.setHeader(REQUEST_ID_HEADER_KEY, requestId);

    next();
  }
}
