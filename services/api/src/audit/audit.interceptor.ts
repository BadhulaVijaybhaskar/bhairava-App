import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import type { AuthPrincipal } from '../auth/auth.types';

/**
 * Optional route-level interceptor: set metadata via @AuditMutation(...)
 * or call AuditService.log directly from services (preferred for key mutations).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as AuthPrincipal | undefined;
    const method = (req.method || '').toUpperCase();
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }
    const path = String(req.route?.path || req.url || '');
    // Skip auth/health noise; services already log auth explicitly
    if (path.includes('auth') || path.includes('health') || path.includes('ready')) {
      return next.handle();
    }
    return next.handle().pipe(
      tap({
        next: () => {
          if (!user?.organizationId) return;
          void this.audit.log({
            organizationId: user.organizationId,
            actorId: user.userId,
            action: `http.${method.toLowerCase()}`,
            entityType: 'HttpRequest',
            entityId: path,
            metaJson: { path, method, status: 'ok' },
            ip: req.ip,
          });
        },
      }),
    );
  }
}
