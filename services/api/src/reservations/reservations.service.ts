import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlotStatus, ReservationState, Prisma, StatusChangeSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthPrincipal } from '../auth/auth.types';
import { DEFAULT_RESERVATION_HOURS, isTransitionAllowed } from '@bhairava/domain';

export type CreateReservationInput = {
  plotId: string;
  customerId: string;
  agentId?: string;
  leadId?: string;
  holdHours?: number;
  notes?: string;
};

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Concurrent-safe reserve: SELECT â€¦ FOR UPDATE on plot row inside a transaction.
   * Exactly one concurrent winner; others get 409.
   */
  async reserve(actor: AuthPrincipal, input: CreateReservationInput) {
    const holdHours = input.holdHours ?? DEFAULT_RESERVATION_HOURS;

    let resolvedAgentId = input.agentId;
    if (actor.roleCode === 'AGENT') {
      const agent = await this.prisma.agentProfile.findFirst({
        where: { userId: actor.userId, organizationId: actor.organizationId },
      });
      if (!agent) throw new BadRequestException('Agent profile required to reserve');
      resolvedAgentId = agent.id;
    }

    let result;
    try {
    result = await this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<
          Array<{ id: string; status: PlotStatus; organizationId: string; projectId: string }>
        >`
          SELECT id, status, "organizationId", "projectId"
          FROM plots
          WHERE id = ${input.plotId}
          FOR UPDATE
        `;
        const plot = rows[0];
        if (!plot) throw new NotFoundException('Plot not found');
        if (plot.organizationId !== actor.organizationId) {
          throw new NotFoundException('Plot not found');
        }
        if (plot.status !== PlotStatus.AVAILABLE && plot.status !== PlotStatus.RESALE_AVAILABLE) {
          throw new ConflictException(`Plot is ${plot.status}, cannot reserve`);
        }
        if (!isTransitionAllowed(plot.status, PlotStatus.RESERVED)) {
          throw new BadRequestException(`Transition ${plot.status} → RESERVED not allowed`);
        }

        const customer = await tx.customer.findFirst({
          where: { id: input.customerId, organizationId: actor.organizationId },
        });
        if (!customer) throw new NotFoundException('Customer not found');

        if (actor.roleCode === 'AGENT' && customer.agentId && customer.agentId !== resolvedAgentId) {
          throw new NotFoundException('Customer not found');
        }
        if (!resolvedAgentId) {
          resolvedAgentId = customer.agentId ?? undefined;
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + holdHours * 3600 * 1000);

        const reservation = await tx.reservation.create({
          data: {
            organizationId: actor.organizationId,
            projectId: plot.projectId,
            plotId: plot.id,
            customerId: customer.id,
            agentId: resolvedAgentId,
            leadId: input.leadId,
            state: ReservationState.ACTIVE,
            reservedAt: now,
            expiresAt,
            notes: input.notes,
          },
        });

        await tx.plot.update({
          where: { id: plot.id },
          data: { status: PlotStatus.RESERVED },
        });

        await tx.plotStatusHistory.create({
          data: {
            plotId: plot.id,
            fromStatus: plot.status,
            toStatus: PlotStatus.RESERVED,
            reason: 'Reservation created',
            source: StatusChangeSource.SALES_FLOW,
            actorId: actor.userId,
          },
        });

        return reservation;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    } catch (err: any) {
      if (err instanceof ConflictException || err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      const code = err?.code;
      const msg = String(err?.message ?? err);
      if (code === 'P2034' || code === 'P2002' || /could not serialize|deadlock|unique constraint/i.test(msg)) {
        throw new ConflictException('Plot is no longer available (concurrent conflict)');
      }
      throw err;
    }

    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'reservation.create',
      entityType: 'Reservation',
      entityId: result.id,
      metaJson: { plotId: input.plotId, customerId: input.customerId },
    });
    
    const cust = await this.prisma.customer.findUnique({ where: { id: input.customerId }, select: { userId: true } });
    if (cust?.userId) {
      await this.notifications.notify({
        organizationId: actor.organizationId,
        userId: cust.userId,
        title: 'Reservation created',
        body: 'A plot was reserved for you. It expires at ' + result.expiresAt.toISOString() + '.',
        payloadJson: { kind: 'reservation_created', reservationId: result.id, plotId: input.plotId, href: '/reservations' },
        actorId: actor.userId,
      });
    }
    await this.notifications.notify({
      organizationId: actor.organizationId,
      userId: actor.userId,
      title: 'Reservation created',
      body: 'Reservation ' + result.id + ' held until ' + result.expiresAt.toISOString() + '.',
      payloadJson: { kind: 'reservation_created', reservationId: result.id, plotId: input.plotId, href: '/reservations' },
      actorId: actor.userId,
    });

    return {
      ...result,
      amountPaise: result.amountPaise != null ? result.amountPaise.toString() : null,
    };
  }

  
  async list(actor: AuthPrincipal, q: { projectId?: string; state?: string } = {}) {
    let myAgentId: string | null = null;
    let allAgentsAccess = false;
    if (actor.roleCode === 'AGENT') {
      const agent = await this.prisma.agentProfile.findFirst({
        where: { userId: actor.userId, organizationId: actor.organizationId },
      });
      if (!agent) return [];
      myAgentId = agent.id;
      allAgentsAccess = agent.allAgentsAccess;
    }

    const rows = await this.prisma.reservation.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(q.projectId ? { projectId: q.projectId } : {}),
        ...(q.state ? { state: q.state as any } : {}),
        ...(actor.roleCode === 'CUSTOMER'
          ? { customer: { userId: actor.userId } }
          : {}),
        ...(actor.roleCode === 'AGENT' && myAgentId && !allAgentsAccess
          ? {
              OR: [
                { agentId: myAgentId },
                { customer: { agentId: myAgentId } },
              ],
            }
          : {}),
      },
      orderBy: { reservedAt: 'desc' },
      take: 200,
      include: {
        plot: { select: { id: true, number: true, status: true } },
        customer: {
          select: {
            id: true, name: true, phone: true, email: true, city: true, agentId: true,
          },
        },
        agent: { select: { id: true, code: true, name: true } },
      },
    });

    return rows.map((r) => {
      const owns =
        actor.roleCode !== 'AGENT' ||
        allAgentsAccess ||
        r.agentId === myAgentId ||
        r.customer.agentId === myAgentId;
      // Agents without ownership should not see this row (filtered above); redact defensively
      const customer = owns
        ? {
            id: r.customer.id,
            name: r.customer.name,
            phone: r.customer.phone,
            email: r.customer.email,
            city: r.customer.city,
            agentId: r.customer.agentId,
            redacted: false,
          }
        : {
            id: r.customer.id,
            name: null,
            phone: null,
            email: null,
            city: null,
            agentId: r.customer.agentId,
            redacted: true,
            reason: 'Agent may not view unrelated customer PII',
          };
      return {
        ...r,
        amountPaise: r.amountPaise != null ? r.amountPaise.toString() : null,
        customer,
        agent: r.agent,
        responsibleAgent: r.agent,
      };
    });
  }

  async releaseExpired(limit = 50) {
    const now = new Date();
    const due = await this.prisma.reservation.findMany({
      where: { state: ReservationState.ACTIVE, expiresAt: { lte: now } },
      take: limit,
      orderBy: { expiresAt: 'asc' },
    });
    const released: string[] = [];
    for (const r of due) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const rows = await tx.$queryRaw<Array<{ id: string; status: PlotStatus }>>`
            SELECT id, status FROM plots WHERE id = ${r.plotId} FOR UPDATE
          `;
          const plot = rows[0];
          const fresh = await tx.reservation.findUnique({ where: { id: r.id } });
          if (!fresh || fresh.state !== ReservationState.ACTIVE) return;
          if (fresh.expiresAt.getTime() > Date.now()) return;

          await tx.reservation.update({
            where: { id: r.id },
            data: { state: ReservationState.EXPIRED },
          });
          if (plot && plot.status === PlotStatus.RESERVED) {
            await tx.plot.update({
              where: { id: plot.id },
              data: { status: PlotStatus.AVAILABLE },
            });
            await tx.plotStatusHistory.create({
              data: {
                plotId: plot.id,
                fromStatus: PlotStatus.RESERVED,
                toStatus: PlotStatus.AVAILABLE,
                reason: 'Reservation expired (48h)',
                source: StatusChangeSource.SYSTEM,
                actorId: null,
              },
            });
          }
          released.push(r.id);
        });
      } catch {
        // race with booking â€” skip
      }
    }
    return { releasedCount: released.length, released };
  }

  async requestCancel(actor: AuthPrincipal, id: string, reason?: string) {
    const row = await this.prisma.reservation.findFirst({
      where: { id, organizationId: actor.organizationId },
      include: { customer: { select: { userId: true, name: true, agentId: true } } },
    });
    if (!row) throw new NotFoundException('Reservation not found');

    if (actor.roleCode === 'CUSTOMER') {
      if (!row.customer?.userId || row.customer.userId !== actor.userId) {
        throw new NotFoundException('Reservation not found');
      }
    }
    if (actor.roleCode === 'AGENT') {
      const agent = await this.prisma.agentProfile.findFirst({
        where: { userId: actor.userId, organizationId: actor.organizationId },
      });
      if (!agent) throw new NotFoundException('Reservation not found');
      if (
        !agent.allAgentsAccess &&
        row.agentId !== agent.id &&
        row.customer?.agentId !== agent.id
      ) {
        throw new NotFoundException('Reservation not found');
      }
    }

    if (row.state !== ReservationState.ACTIVE) throw new BadRequestException('Reservation is not active');
    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        cancelRequestStatus: 'PENDING' as any,
        cancelReason: reason || 'Customer/agent requested cancellation',
      },
    });
    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'reservation.cancel_request',
      entityType: 'Reservation',
      entityId: id,
      metaJson: { reason: reason || null },
    });
    const targets = new Set<string>()
    if (row.customer?.userId) targets.add(row.customer.userId);
    targets.add(actor.userId);
    for (const uid of targets) {
      await this.notifications.notify({
        organizationId: actor.organizationId,
        userId: uid,
        title: 'Cancellation requested',
        body: 'Cancellation requested for reservation ' + id + '.',
        payloadJson: { kind: 'cancellation_request', reservationId: id, href: '/reservations' },
        actorId: actor.userId,
      });
    }
    return {
      ...updated,
      amountPaise: updated.amountPaise != null ? updated.amountPaise.toString() : null,
    };
  }
}


