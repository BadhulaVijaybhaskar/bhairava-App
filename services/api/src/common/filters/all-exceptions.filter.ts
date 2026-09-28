import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { structuredLog } from '../logging/logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let details: unknown;
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') message = body;
      else if (body && typeof body === 'object') {
        const o = body as Record<string, unknown>;
        message = (o.message as string | string[]) || exception.message;
        details = o.error;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    structuredLog('error', 'http_exception', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl?.split('?')[0],
      statusCode: status,
      message,
      // never log stack secrets; stack only in non-prod
      stack: process.env.NODE_ENV === 'production' ? undefined : (exception instanceof Error ? exception.stack : undefined),
    });

    res.status(status).json({
      statusCode: status,
      message,
      error: details,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      path: req.originalUrl?.split('?')[0],
    });
  }
}
