import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { serializeBigInts } from './bigint-json';

/**
 * Global response transform: no Nest/Express handler may emit raw bigint.
 * Applied at the DTO/response boundary so service-level toString() is optional
 * defense-in-depth rather than the only fix.
 */
@Injectable()
export class BigIntJsonInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // @Res() handlers that already wrote the response (e.g. PDF) yield undefined
        if (data === undefined || data === null) return data;
        return serializeBigInts(data);
      }),
    );
  }
}
