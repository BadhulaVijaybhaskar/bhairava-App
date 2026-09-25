import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingState, PlotStatus, Prisma, ReservationState, StatusChangeSource } from '@prisma/client';
import { projectCustomerPii } from '@bhairava/domain';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthPrincipal } from '../auth/auth.types';
import { isTransitionAllowed } from '@bhairava/domain';

export type CreateBookingInput = {
  plotId: string;
  customerId: string;
  reservationId?: string;
  agentId?: string;
  agreementValuePaise: string | number | bigint;
  advancePaise?: string | number | bigint;
  notes?: string;
};

type BookingListRow = {
  id: string;
  organizationId: string;
  projectId: string;
  plotId: string;
  customerId: string;
  agentId: string | null;
  reservationId: string | null;
  state: BookingState;
  bookedAt: Date;
  agreementValuePaise: bigint;
  advancePaise: bigint;
  cancelRequestStatus: string | null;
  cancelReason: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  plot: { id: string; number: string; status: PlotStatus };
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    city: string | null;
    agentId: string | null;
    userId: string | null;
  };
  agent: { id: string; code: string; name: string; userId: string } | null;
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private roleLabel(actor: AuthPrincipal) {
    const map: Record<string, string> = {
      FOUNDER: 'Founder',
      ADMINISTRATOR: 'Administrator',
      FINANCE: 'Finance',
      VIEWER: 'Viewer',
      AGENT: 'Agent',
      CUSTOMER: 'Customer',
    };
    return map[actor.roleCode] ?? 'Viewer';
  }

  private async agentProfileFor(actor: AuthPrincipal) {
    return this.prisma.agentProfile.findFirst({
      where: { userId: actor.userId, organizationId: actor.organizationId },
    });
  }

  /**
   * Project a booking for list/detail responses.
   * Agents only receive customer PII when they own the relationship
   * (booking.agentId or customer.agentId). Responsible agent is always shown
   * when present (id/code/name — not unrelated customer PII).
   */
  private projectBooking(
    actor: AuthPrincipal,
    b: BookingListRow,
    opts: { ownsRelationship: boolean; isSelf: boolean },
  ) {
    const customer = projectCustomerPii(
      {
        id: b.customer.id,
        name: b.customer.name,
        phone: b.customer.phone,
        email: b.customer.email,
        city: b.customer.city,
      },
      {
        role: this.roleLabel(actor),
        ownsRelationship: opts.ownsRelationship,
        isSelf: opts.isSelf,
      },
    );
    return {
      id: b.id,
      organizationId: b.organizationId,
      projectId: b.projectId,
      plotId: b.plotId,
      customerId: b.customerId,
      agentId: b.agentId,
      reservationId: b.reservationId,
      state: b.state,
      bookedAt: b.bookedAt,
      agreementValuePaise: b.agreementValuePaise.toString(),
      advancePaise: b.advancePaise.toString(),
      cancelRequestStatus: b.cancelRequestStatus,
      cancelReason: b.cancelReason,
      notes: opts.ownsRelationship || actor.roleCode !== 'AGENT' ? b.notes : null,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      plot: b.plot,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        city: customer.city,
        redacted: customer.redacted,
        reason: customer.reason,
        agentId: b.customer.agentId,
      },
      agent: b.agent
        ? { id: b.agent.id, code: b.agent.code, name: b.agent.name }
        : null,
      responsibleAgent: b.agent
        ? { id: b.agent.id, code: b.agent.code, name: b.agent.name }
        : null,
    };
  }

  async list(actor: AuthPrincipal, q: { projectId?: string; customerId?: string } = {}) {
    let myAgentId: string | null = null;
    let allAgentsAccess = false;
    if (actor.roleCode === 'AGENT') {
      const agent = await this.agentProfileFor(actor);
      if (!agent) return [];
      myAgentId = agent.id;
      allAgentsAccess = agent.allAgentsAccess;
    }

    const where: Prisma.BookingWhereInput = {
      organizationId: actor.organizationId,
      ...(q.projectId ? { projectId: q.projectId } : {}),
      ...(q.customerId ? { customerId: q.customerId } : {}),
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
    };

    const rows = await this.prisma.booking.findMany({
      where,
      orderBy: { bookedAt: 'desc' },
      take: 200,
      include: {
        plot: { select: { id: true, number: true, status: true } },
        customer: {
          select: {
            id: true, name: true, phone: true, email: true, city: true,
            agentId: true, userId: true,
          },
        },
        agent: { select: { id: true, code: true, name: true, userId: true } },
      },
    });

    return rows.map((b) => {
      const owns =
        actor.roleCode !== 'AGENT' ||
        allAgentsAccess ||
        b.agentId === myAgentId ||
        b.customer.agentId === myAgentId;
      const isSelf =
        actor.roleCode === 'CUSTOMER' && b.customer.userId === actor.userId;
      return this.projectBooking(actor, b as BookingListRow, {
        ownsRelationship: owns,
        isSelf,
      });
    });
  }

  async book(actor: AuthPrincipal, input: CreateBookingInput) {
    const agreementValuePaise = BigInt(input.agreementValuePaise);
    const advancePaise = BigInt(input.advancePaise ?? 0);
    if (agreementValuePaise <= 0n) throw new BadRequestException('agreementValuePaise must be > 0');

    // Agents always attribute bookings to themselves (server-side); staff may pass agentId
    // or inherit the customer's assigned agent.
    let resolvedAgentId = input.agentId;
    if (actor.roleCode === 'AGENT') {
      const agent = await this.agentProfileFor(actor);
      if (!agent) throw new BadRequestException('Agent profile required to book');
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
        if (plot.organizationId !== actor.organizationId) throw new NotFoundException('Plot not found');

        let reservationId: string | undefined = input.reservationId;
        if (reservationId) {
          const reservation = await tx.reservation.findFirst({
            where: {
              id: reservationId,
              organizationId: actor.organizationId,
              plotId: plot.id,
            },
          });
          if (!reservation) throw new NotFoundException('Reservation not found');
          if (reservation.state !== ReservationState.ACTIVE && reservation.state !== ReservationState.EXPIRING_TODAY) {
            throw new ConflictException(`Reservation is ${reservation.state}`);
          }
          // Reservation → booking must preserve the same customer (no cross-customer convert)
          if (reservation.customerId !== input.customerId) {
            throw new BadRequestException(
              'Reservation customer does not match booking customer',
            );
          }
          if (actor.roleCode === 'AGENT' && resolvedAgentId) {
            const reservationCustomer = await tx.customer.findFirst({
              where: { id: reservation.customerId, organizationId: actor.organizationId },
            });
            if (
              reservation.agentId &&
              reservation.agentId !== resolvedAgentId &&
              reservationCustomer?.agentId &&
              reservationCustomer.agentId !== resolvedAgentId
            ) {
              throw new NotFoundException('Reservation not found');
            }
          }
          await tx.reservation.update({
            where: { id: reservation.id },
            data: { state: ReservationState.CONVERTED },
          });
          // Prefer explicit agent, else reservation agent, else customer agent
          if (!resolvedAgentId) {
            resolvedAgentId = reservation.agentId ?? undefined;
          }
        } else if (plot.status !== PlotStatus.AVAILABLE && plot.status !== PlotStatus.RESERVED && plot.status !== PlotStatus.RESALE_AVAILABLE) {
          throw new ConflictException(`Plot is ${plot.status}, cannot book`);
        }

        const canBook =
          plot.status === PlotStatus.RESERVED ||
          plot.status === PlotStatus.AVAILABLE ||
          plot.status === PlotStatus.RESALE_AVAILABLE ||
          isTransitionAllowed(plot.status as any, PlotStatus.BOOKED as any);
        if (!canBook) {
          throw new BadRequestException(`Transition ${plot.status} → BOOKED not allowed`);
        }

        const customer = await tx.customer.findFirst({
          where: { id: input.customerId, organizationId: actor.organizationId },
        });
        if (!customer) throw new NotFoundException('Customer not found');

        if (actor.roleCode === 'AGENT') {
          // Agent may only book for customers they own (or unassigned that they claim via this booking)
          if (customer.agentId && customer.agentId !== resolvedAgentId) {
            throw new NotFoundException('Customer not found');
          }
        }

        if (!resolvedAgentId) {
          resolvedAgentId = customer.agentId ?? undefined;
        }

        const booking = await tx.booking.create({
          data: {
            organizationId: actor.organizationId,
            projectId: plot.projectId,
            plotId: plot.id,
            customerId: customer.id,
            agentId: resolvedAgentId,
            reservationId: reservationId,
            state: BookingState.ACTIVE,
            agreementValuePaise,
            advancePaise,
            notes: input.notes,
          },
        });

        const fromStatus = plot.status;
        await tx.plot.update({
          where: { id: plot.id },
          data: {
            status: PlotStatus.BOOKED,
            customerId: customer.id,
            agentId: resolvedAgentId,
          },
        });
        // Ensure customer is attributed to the responsible agent when previously unassigned
        if (resolvedAgentId && !customer.agentId) {
          await tx.customer.update({
            where: { id: customer.id },
            data: { agentId: resolvedAgentId },
          });
        }
        await tx.plotStatusHistory.create({
          data: {
            plotId: plot.id,
            fromStatus,
            toStatus: PlotStatus.BOOKED,
            reason: 'Booking created',
            source: StatusChangeSource.SALES_FLOW,
            actorId: actor.userId,
          },
        });

        return booking;
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
      action: 'booking.create',
      entityType: 'Booking',
      entityId: result.id,
      metaJson: { plotId: input.plotId, customerId: input.customerId, agentId: result.agentId },
    });
    const cust = await this.prisma.customer.findUnique({ where: { id: result.customerId }, select: { userId: true } });
    if (cust?.userId) {
      await this.notifications.notify({
        organizationId: actor.organizationId,
        userId: cust.userId,
        title: 'Booking created',
        body: 'Your booking was confirmed.',
        payloadJson: { kind: 'booking_created', bookingId: result.id, plotId: result.plotId, href: '/bookings' },
        actorId: actor.userId,
      });
    }
    await this.notifications.notify({
      organizationId: actor.organizationId,
      userId: actor.userId,
      title: 'Booking created',
      body: 'Booking ' + result.id + ' created.',
      payloadJson: { kind: 'booking_created', bookingId: result.id, plotId: result.plotId, href: '/bookings' },
      actorId: actor.userId,
    });

    const agent = result.agentId
      ? await this.prisma.agentProfile.findUnique({
          where: { id: result.agentId },
          select: { id: true, code: true, name: true },
        })
      : null;

    return {
      ...result,
      agreementValuePaise: result.agreementValuePaise.toString(),
      advancePaise: result.advancePaise.toString(),
      agent,
      responsibleAgent: agent,
    };
  }
}
