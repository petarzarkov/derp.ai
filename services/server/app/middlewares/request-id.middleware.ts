import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { v4 } from 'uuid';
import { REQUEST_ID_HEADER_KEY } from '../const';
import { ContextLogger } from 'nestjs-context-logger';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = v4();

    req.headers[REQUEST_ID_HEADER_KEY] = req.headers[REQUEST_ID_HEADER_KEY] || requestId;
    res.setHeader(REQUEST_ID_HEADER_KEY, requestId);
    req.id = requestId;
    ContextLogger.updateContext({ requestId });

    next();
  }
}
