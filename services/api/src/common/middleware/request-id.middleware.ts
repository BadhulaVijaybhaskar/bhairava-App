import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { createRequestId, structuredLog } from '../logging/logger';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      correlationId?: string;
    }
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming =
      (req.headers['x-request-id'] as string) ||
      (req.headers['x-correlation-id'] as string) ||
      createRequestId();
    req.requestId = incoming;
    req.correlationId = incoming;
    res.setHeader('x-request-id', incoming);
    res.setHeader('x-correlation-id', incoming);

    const start = Date.now();
    res.on('finish', () => {
      structuredLog('info', 'http_request', {
        requestId: incoming,
        method: req.method,
        path: req.originalUrl?.split('?')[0],
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      });
    });
    next();
  }
}
