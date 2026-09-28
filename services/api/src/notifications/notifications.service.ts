import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth.types';
import {
  StubEmailProvider,
  StubPushProvider,
  StubSmsProvider,
  StubWhatsAppProvider,
  type EmailProvider,
  type NotifyPayload,
  type PushProvider,
  type SmsProvider,
  type WhatsAppProvider,
} from './providers/notification-provider';

@Injectable()
export class NotificationsService {
  readonly email: EmailProvider = new StubEmailProvider();
  readonly sms: SmsProvider = new StubSmsProvider();
  readonly whatsapp: WhatsAppProvider = new StubWhatsAppProvider();
  readonly push: PushProvider = new StubPushProvider();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listMine(actor: AuthPrincipal, q: { unreadOnly?: boolean; take?: number } = {}) {
    const take = Math.min(Math.max(q.take ?? 50, 1), 100);
    return this.prisma.notification.findMany({
      where: {
        organizationId: actor.organizationId,
        userId: actor.userId,
        ...(q.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true, channel: true, title: true, body: true,
        payloadJson: true, readAt: true, sentAt: true, createdAt: true,
      },
    });
  }

  async markRead(actor: AuthPrincipal, id: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id, organizationId: actor.organizationId, userId: actor.userId },
    });
    if (!row) throw new NotFoundException('Notification not found');
    if (row.readAt) return row;
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(actor: AuthPrincipal) {
    const result = await this.prisma.notification.updateMany({
      where: { organizationId: actor.organizationId, userId: actor.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  /**
   * Create in-app notification and optionally fan-out to stub providers.
   */
  async notify(input: {
    organizationId: string;
    userId?: string;
    title: string;
    body: string;
    payloadJson?: Prisma.InputJsonValue;
    channels?: Array<'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH'>;
    toAddress?: string;
    actorId?: string;
  }) {
    const channels = input.channels?.length ? input.channels : ['IN_APP'];
    const created: Array<{ channel: string; id?: string; provider?: unknown }> = [];

    if (channels.includes('IN_APP')) {
      const row = await this.prisma.notification.create({
        data: {
          organizationId: input.organizationId,
          userId: input.userId,
          channel: NotificationChannel.IN_APP,
          title: input.title,
          body: input.body,
          payloadJson: input.payloadJson,
          sentAt: new Date(),
        },
      });
      created.push({ channel: 'IN_APP', id: row.id });
    }

    const payload: NotifyPayload = {
      toUserId: input.userId,
      toAddress: input.toAddress,
      title: input.title,
      body: input.body,
      payloadJson: input.payloadJson as Record<string, unknown> | undefined,
    };

    if (channels.includes('EMAIL')) {
      created.push({ channel: 'EMAIL', provider: await this.email.send(payload) });
    }
    if (channels.includes('SMS')) {
      created.push({ channel: 'SMS', provider: await this.sms.send(payload) });
    }
    if (channels.includes('WHATSAPP')) {
      // WhatsApp not in Prisma enum yet — treat as SMS stub + log
      created.push({ channel: 'WHATSAPP', provider: await this.whatsapp.send(payload) });
    }
    if (channels.includes('PUSH')) {
      created.push({ channel: 'PUSH', provider: await this.push.send(payload) });
      if (!channels.includes('IN_APP')) {
        // also persist a PUSH row when enum supports it
        await this.prisma.notification.create({
          data: {
            organizationId: input.organizationId,
            userId: input.userId,
            channel: NotificationChannel.PUSH,
            title: input.title,
            body: input.body,
            payloadJson: input.payloadJson,
            sentAt: new Date(),
          },
        });
      }
    }

    await this.audit.log({
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: 'notification.dispatch',
      entityType: 'Notification',
      entityId: input.userId,
      metaJson: { channels, title: input.title },
    });

    return { created };
  }
}
