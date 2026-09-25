import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/** Actions that must always be audited (immutable history). */
export const AUDIT_ACTIONS = [
  'auth.login',
  'auth.login_failed',
  'auth.logout',
  'auth.refresh_reuse_detected',
  'auth.password_reset_request',
  'auth.password_reset_confirm',
  'project.create',
  'project.update',
  'project.lifecycle',
  'plot.create',
  'plot.update',
  'plot.pricing',
  'plot.status',
  'lead.create',
  'lead.stage',
  'customer.create',
  'customer.update',
  'assignment.change',
  'reservation.create',
  'reservation.release',
  'reservation.expire',
  'booking.create',
  'booking.cancel',
  'payment.create',
  'payment.void',
  'payment.adjust',
  'payment.reverse',
  'document.create',
  'document.download',
  'document.visibility',
  'role.change',
  'settings.update',
  'pii.reveal',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number] | string;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append-only audit write. Never throws to callers (best-effort),
   * except when organizationId is required for org-scoped events.
   */
  async log(input: {
    organizationId?: string | null;
    actorId?: string | null;
    action: AuditAction;
    entityType: string;
    entityId?: string | null;
    metaJson?: Prisma.InputJsonValue;
    ip?: string | null;
  }) {
    if (!input.organizationId) return;
    const safeMeta = this.sanitizeMeta(input.metaJson);
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: input.organizationId,
          actorId: input.actorId ?? undefined,
          action: String(input.action),
          entityType: input.entityType,
          entityId: input.entityId ?? undefined,
          metaJson: safeMeta ?? undefined,
          ip: input.ip ?? undefined,
        },
      });
    } catch {
      // never fail the primary request due to audit
    }
  }

  /** Strip secrets / full PII from meta before persistence. */
  sanitizeMeta(meta?: Prisma.InputJsonValue): Prisma.InputJsonValue | undefined {
    if (meta == null) return undefined;
    try {
      const cloned = JSON.parse(JSON.stringify(meta)) as unknown;
      return this.redactDeep(cloned) as Prisma.InputJsonValue;
    } catch {
      return undefined;
    }
  }

  private redactDeep(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((v) => this.redactDeep(v));
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const key = k.toLowerCase();
        if (
          key.includes('password') ||
          key.includes('token') ||
          key.includes('secret') ||
          key.includes('authorization') ||
          key === 'pan' ||
          key === 'aadhaar' ||
          key === 'aadhar' ||
          key.includes('refresh')
        ) {
          out[k] = '[REDACTED]';
        } else {
          out[k] = this.redactDeep(v);
        }
      }
      return out;
    }
    if (typeof value === 'string') {
      // Mask long digit runs that look like PAN/Aadhaar
      if (/^\d{12}$/.test(value)) return 'XXXXXXXX' + value.slice(-4);
      if (/^[A-Z]{5}\d{4}[A-Z]$/i.test(value)) return '[PAN_REDACTED]';
    }
    return value;
  }

  async list(organizationId: string, q: {
    entityType?: string;
    entityId?: string;
    action?: string;
    actorId?: string;
    take?: number;
    cursor?: string;
  } = {}) {
    const take = Math.min(Math.max(q.take ?? 50, 1), 200);
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType: q.entityType,
        entityId: q.entityId,
        action: q.action,
        actorId: q.actorId,
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        actorId: true,
        metaJson: true,
        ip: true,
        createdAt: true,
      },
    });
  }

  async get(organizationId: string, id: string) {
    return this.prisma.auditLog.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        actorId: true,
        metaJson: true,
        ip: true,
        createdAt: true,
      },
    });
  }

  /** Explicitly reject mutate/delete — audit history is immutable. */
  rejectMutation(): never {
    throw new ForbiddenException('Audit history is immutable; modify/delete is not allowed');
  }
}
