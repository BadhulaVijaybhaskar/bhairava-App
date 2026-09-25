import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InstallmentStatus,
  PlotStatus,
  Prisma,
  RegistrationStatus,
  ResaleListingStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlotsService } from '../plots/plots.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthPrincipal } from '../auth/auth.types';
import { buildReceiptPdf, amountInWordsInr } from './receipt-pdf';
import {
  agentOwnedReceiptWhere,
  agentOwnedScheduleWhere,
  resolveAgentScope,
} from '../common/ownership/record-scope';

@Injectable()
export class OpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plots: PlotsService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  agents(actor: AuthPrincipal) {
    return this.prisma.agentProfile.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        email: true,
        region: true,
        status: true,
        userId: true,
        allAgentsAccess: true,
        createdAt: true,
      },
    });
  }

  async receipts(actor: AuthPrincipal) {
    const where: Prisma.ReceiptWhereInput = { organizationId: actor.organizationId };
    if (actor.roleCode === 'CUSTOMER') {
      where.booking = { customer: { userId: actor.userId } };
    } else if (actor.roleCode === 'AGENT') {
      const scope = await resolveAgentScope(this.prisma, actor);
      if (!scope.agentId) return [];
      if (!scope.allAgentsAccess) {
        Object.assign(where, agentOwnedReceiptWhere(scope.agentId));
      }
    }
    const rows = await this.prisma.receipt.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      take: 200,
      include: {
        payment: {
          select: {
            id: true, amountPaise: true, method: true, paidAt: true, txnRef: true,
            receiptNumber: true, recordedByUserId: true, customerId: true, plotId: true, projectId: true,
          },
        },
        booking: { select: { id: true, plotId: true, customerId: true, projectId: true } },
      },
    });
    return rows.map((r) => ({
      ...r,
      payment: r.payment
        ? { ...r.payment, amountPaise: r.payment.amountPaise.toString() }
        : null,
    }));
  }

  async receipt(actor: AuthPrincipal, id: string) {
    const row = await this.prisma.receipt.findFirst({
      where: { id, organizationId: actor.organizationId },
      include: {
        payment: true,
        booking: {
          include: {
            plot: { select: { id: true, number: true, status: true, areaSqYd: true } },
            customer: { select: { id: true, name: true, phone: true, email: true, city: true } },
            project: { select: { id: true, name: true, code: true, city: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Receipt not found');
    if (actor.roleCode === 'CUSTOMER') {
      const mine = await this.prisma.customer.findFirst({
        where: { userId: actor.userId, organizationId: actor.organizationId },
      });
      if (!mine || row.booking.customerId !== mine.id) throw new NotFoundException('Receipt not found');
    }
    if (actor.roleCode === 'AGENT') {
      const agent = await this.prisma.agentProfile.findFirst({
        where: { userId: actor.userId, organizationId: actor.organizationId },
      });
      if (!agent) throw new NotFoundException('Receipt not found');
      if (!agent.allAgentsAccess) {
        const cust = await this.prisma.customer.findFirst({
          where: { id: row.booking.customerId, organizationId: actor.organizationId },
        });
        if (!cust || cust.agentId !== agent.id) throw new NotFoundException('Receipt not found');
      }
    }
    let generatedBy: { id: string; displayName: string | null; email: string | null } | null = null;
    if (row.payment.recordedByUserId) {
      const u = await this.prisma.user.findUnique({
        where: { id: row.payment.recordedByUserId },
        select: { id: true, displayName: true, email: true },
      });
      generatedBy = u;
    }
    const amountPaiseStr = row.payment.amountPaise.toString();
    return {
      id: row.id,
      receiptNumber: row.receiptNumber,
      issuedAt: row.issuedAt,
      pdfKey: row.pdfKey,
      metaJson: row.metaJson,
      amountInWords: amountInWordsInr(amountPaiseStr),
      payment: {
        id: row.payment.id,
        amountPaise: amountPaiseStr,
        method: row.payment.method,
        paidAt: row.payment.paidAt,
        txnRef: row.payment.txnRef,
        notes: row.payment.notes,
      },
      booking: {
        id: row.booking.id,
        state: row.booking.state,
      },
      customer: row.booking.customer,
      plot: row.booking.plot
        ? {
            ...row.booking.plot,
            areaSqYd: row.booking.plot.areaSqYd?.toString?.() ?? null,
          }
        : null,
      project: row.booking.project,
      generatedBy,
    };
  }


  async receiptPdf(actor: AuthPrincipal, id: string): Promise<{ buffer: Buffer; filename: string; receiptNumber: string }> {
    const detail = await this.receipt(actor, id);
    if (detail.payment && (detail as any).payment?.voidedAt) {
      // voided payments still printable historically if record exists; amount from persisted row only
    }
    const org = await this.prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: { name: true },
    });
    const authorizedBy =
      detail.generatedBy?.displayName ||
      detail.generatedBy?.email ||
      null;
    const buffer = await buildReceiptPdf({
      brandName: org?.name || 'Bhairava',
      receiptNumber: detail.receiptNumber,
      customerName: detail.customer?.name || 'Customer',
      customerPhone: detail.customer?.phone,
      customerEmail: detail.customer?.email,
      projectName: detail.project?.name || 'Project',
      projectCode: detail.project?.code,
      plotNumber: detail.plot?.number ?? null,
      bookingId: detail.booking.id,
      amountPaise: detail.payment.amountPaise,
      paymentMethod: detail.payment.method,
      txnRef: detail.payment.txnRef,
      paidAt: detail.payment.paidAt,
      generatedAt: new Date(),
      authorizedBy,
    });
    const filename = detail.receiptNumber.replace(/[^A-Za-z0-9_-]/g, '_') + '.pdf';
    return { buffer, filename, receiptNumber: detail.receiptNumber };
  }

  async commissions(actor: AuthPrincipal) {
    const where: any = { organizationId: actor.organizationId };
    if (actor.roleCode === 'AGENT') where.agent = { userId: actor.userId };
    const rows = await this.prisma.commission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        agent: { select: { id: true, name: true, code: true } },
        booking: { select: { id: true, plotId: true, customerId: true } },
      },
    });
    return rows.map((r) => ({ ...r, amountPaise: r.amountPaise.toString() }));
  }

  async schedules(actor: AuthPrincipal, bookingId?: string) {
    const where: Prisma.PaymentScheduleItemWhereInput = {
      organizationId: actor.organizationId,
      ...(bookingId ? { bookingId } : {}),
    };
    if (actor.roleCode === 'CUSTOMER') {
      where.customer = { userId: actor.userId };
    } else if (actor.roleCode === 'AGENT') {
      const scope = await resolveAgentScope(this.prisma, actor);
      if (!scope.agentId) return [];
      if (!scope.allAgentsAccess) {
        Object.assign(where, agentOwnedScheduleWhere(scope.agentId));
      }
    }
    const rows = await this.prisma.paymentScheduleItem.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }],
      take: 300,
    });
    return rows.map((r) => ({ ...r, amountDuePaise: r.amountDuePaise.toString() }));
  }

  async createSchedule(
    actor: AuthPrincipal,
    body: {
      bookingId: string;
      items: Array<{ name: string; dueDate: string; amountDuePaise: string; installmentNumber?: number }>;
    },
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: body.bookingId, organizationId: actor.organizationId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!Array.isArray(body.items) || body.items.length < 1) {
      throw new BadRequestException('items required');
    }
    const existing = await this.prisma.paymentScheduleItem.count({
      where: { bookingId: booking.id },
    });
    const created = await this.prisma.$transaction(
      body.items.map((it, idx) =>
        this.prisma.paymentScheduleItem.create({
          data: {
            organizationId: actor.organizationId,
            bookingId: booking.id,
            projectId: booking.projectId,
            customerId: booking.customerId,
            plotId: booking.plotId,
            installmentNumber: it.installmentNumber ?? existing + idx + 1,
            name: it.name,
            dueDate: new Date(it.dueDate),
            amountDuePaise: BigInt(it.amountDuePaise),
            status: InstallmentStatus.UPCOMING,
          },
        }),
      ),
    );
    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'payment_schedule.create',
      entityType: 'Booking',
      entityId: booking.id,
      metaJson: { count: created.length },
    });
    
    const cust = await this.prisma.customer.findUnique({ where: { id: booking.customerId }, select: { userId: true } });
    if (cust?.userId) {
      await this.notifications.notify({
        organizationId: actor.organizationId,
        userId: cust.userId,
        title: 'Payment due',
        body: 'A payment schedule with ' + created.length + ' installment(s) was created for your booking.',
        payloadJson: { kind: 'payment_due', bookingId: booking.id, href: '/collections' },
        actorId: actor.userId,
      });
    }

    return created.map((r) => ({ ...r, amountDuePaise: r.amountDuePaise.toString() }));
  }

  async registrations(actor: AuthPrincipal) {
    const where: Prisma.RegistrationWhereInput = { organizationId: actor.organizationId };
    if (actor.roleCode === 'CUSTOMER') {
      where.customer = { userId: actor.userId };
    } else if (actor.roleCode === 'AGENT') {
      const scope = await resolveAgentScope(this.prisma, actor);
      if (!scope.agentId) return [];
      if (!scope.allAgentsAccess) {
        where.OR = [
          { customer: { agentId: scope.agentId } },
          { booking: { agentId: scope.agentId } },
        ];
      }
    }
    return this.prisma.registration.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        booking: { select: { id: true, plotId: true } },
      },
    });
  }

  async createRegistration(actor: AuthPrincipal, body: { bookingId: string; notes?: string }) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: body.bookingId, organizationId: actor.organizationId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const existing = await this.prisma.registration.findUnique({ where: { bookingId: booking.id } });
    if (existing) return existing;

    // Move plot into UNDER_DOCUMENTATION if currently BOOKED
    const plot = await this.prisma.plot.findUnique({ where: { id: booking.plotId } });
    if (plot?.status === PlotStatus.BOOKED) {
      await this.plots.transitionStatus(actor, plot.id, {
        toStatus: PlotStatus.UNDER_DOCUMENTATION,
        reason: body.notes || 'Registration opened — under documentation',
        source: 'SALES_FLOW',
      });
    }

    const row = await this.prisma.registration.create({
      data: {
        organizationId: actor.organizationId,
        projectId: booking.projectId,
        bookingId: booking.id,
        customerId: booking.customerId,
        status: RegistrationStatus.IN_PROGRESS,
        notes: body.notes,
      },
    });
    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'registration.create',
      entityType: 'Registration',
      entityId: row.id,
      metaJson: { bookingId: booking.id },
    });
    
    const cust = await this.prisma.customer.findUnique({ where: { id: booking.customerId }, select: { userId: true } });
    if (cust?.userId) {
      await this.notifications.notify({
        organizationId: actor.organizationId,
        userId: cust.userId,
        title: 'Registration scheduled',
        body: 'Registration was opened for your booking.',
        payloadJson: { kind: 'registration_scheduled', registrationId: row.id, bookingId: booking.id, href: '/registrations' },
        actorId: actor.userId,
      });
    }

    return row;
  }

  async updateRegistration(
    actor: AuthPrincipal,
    id: string,
    body: { status: string; deedNumber?: string; notes?: string },
  ) {
    const row = await this.prisma.registration.findFirst({
      where: { id, organizationId: actor.organizationId },
      include: { booking: true },
    });
    if (!row) throw new NotFoundException('Registration not found');
    if (!(Object.values(RegistrationStatus) as string[]).includes(body.status)) {
      throw new BadRequestException('Invalid registration status');
    }

    const updated = await this.prisma.registration.update({
      where: { id },
      data: {
        status: body.status as RegistrationStatus,
        deedNumber: body.deedNumber ?? row.deedNumber,
        notes: body.notes ?? row.notes,
        registeredAt:
          body.status === RegistrationStatus.COMPLETED
            ? row.registeredAt ?? new Date()
            : row.registeredAt,
      },
    });

    if (body.status === RegistrationStatus.COMPLETED) {

      const cust = await this.prisma.customer.findUnique({ where: { id: row.customerId }, select: { userId: true } });
      if (cust?.userId) {
        await this.notifications.notify({
          organizationId: actor.organizationId,
          userId: cust.userId,
          title: 'Registration completed',
          body: 'Your registration is completed.',
          payloadJson: { kind: 'registration_completed', registrationId: id, href: '/registrations' },
          actorId: actor.userId,
        });
      }

      // Domain path: UNDER_DOCUMENTATION → SOLD → REGISTERED
      await this.plots.advanceTo(
        actor,
        row.booking.plotId,
        PlotStatus.REGISTERED,
        body.notes || body.deedNumber || 'Registration completed',
      );
    }

    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'registration.update',
      entityType: 'Registration',
      entityId: id,
      metaJson: { status: body.status },
    });
    return updated;
  }

  async resales(actor: AuthPrincipal) {
    const where: Prisma.ResaleListingWhereInput = { organizationId: actor.organizationId };
    if (actor.roleCode === 'CUSTOMER') {
      where.customer = { userId: actor.userId };
    } else if (actor.roleCode === 'AGENT') {
      const scope = await resolveAgentScope(this.prisma, actor);
      if (!scope.agentId) return [];
      if (!scope.allAgentsAccess) {
        where.customer = { agentId: scope.agentId };
      }
    }
    const rows = await this.prisma.resaleListing.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        customer: { select: { id: true, name: true } },
        plot: { select: { id: true, number: true, status: true } },
      },
    });
    return rows.map((r) => ({
      ...r,
      askingPricePaise: r.askingPricePaise?.toString() ?? null,
    }));
  }

  async createResale(
    actor: AuthPrincipal,
    body: { plotId: string; customerId: string; askingPricePaise?: string; notes?: string; list?: boolean },
  ) {
    const plot = await this.prisma.plot.findFirst({
      where: { id: body.plotId, organizationId: actor.organizationId },
    });
    if (!plot) throw new NotFoundException('Plot not found');
    const customer = await this.prisma.customer.findFirst({
      where: { id: body.customerId, organizationId: actor.organizationId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const listNow = body.list !== false;
    if (listNow && plot.status !== PlotStatus.RESALE_AVAILABLE) {
      await this.plots.advanceTo(
        actor,
        plot.id,
        PlotStatus.RESALE_AVAILABLE,
        body.notes || 'Resale listing opened',
      );
    }

    const row = await this.prisma.resaleListing.create({
      data: {
        organizationId: actor.organizationId,
        projectId: plot.projectId,
        plotId: plot.id,
        customerId: customer.id,
        status: listNow ? ResaleListingStatus.LISTED : ResaleListingStatus.DRAFT,
        askingPricePaise: body.askingPricePaise ? BigInt(body.askingPricePaise) : undefined,
        listedAt: listNow ? new Date() : undefined,
        notes: body.notes,
      },
    });
    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'resale.create',
      entityType: 'ResaleListing',
      entityId: row.id,
      metaJson: { plotId: plot.id },
    });
    
    await this.notifications.notify({
      organizationId: actor.organizationId,
      userId: actor.userId,
      title: 'Resale listing created',
      body: 'A resale listing was created.',
      payloadJson: { kind: 'resale_created', href: '/resale' },
      actorId: actor.userId,
    });
    const custR = await this.prisma.customer.findUnique({ where: { id: body.customerId }, select: { userId: true } });
    if (custR?.userId) {
      await this.notifications.notify({
        organizationId: actor.organizationId,
        userId: custR.userId,
        title: 'Resale listing created',
        body: 'Your property was listed for resale.',
        payloadJson: { kind: 'resale_created', href: '/resale' },
        actorId: actor.userId,
      });
    }
return {
      ...row,
      askingPricePaise: row.askingPricePaise?.toString() ?? null,
    };
  }

  users(actor: AuthPrincipal) {
    if (!['FOUNDER', 'ADMINISTRATOR'].includes(actor.roleCode)) {
      throw new ForbiddenException('Members directory requires admin');
    }
    return this.prisma.user.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        email: true,
        mobile: true,
        displayName: true,
        roleCode: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        agentProfile: { select: { id: true, code: true } },
        customerProfile: { select: { id: true, name: true } },
      },
    });
  }

  async companySettings(actor: AuthPrincipal) {
    const row = await this.prisma.companySettings.findUnique({
      where: { organizationId: actor.organizationId },
    });
    return row ?? { organizationId: actor.organizationId, settingsJson: {} };
  }

  async updateCompanySettings(actor: AuthPrincipal, settingsJson: Record<string, unknown>) {
    if (!['FOUNDER', 'ADMINISTRATOR'].includes(actor.roleCode)) {
      throw new ForbiddenException('settings.manage required');
    }
    return this.prisma.companySettings.upsert({
      where: { organizationId: actor.organizationId },
      create: { organizationId: actor.organizationId, settingsJson: settingsJson as Prisma.InputJsonValue },
      update: { settingsJson: settingsJson as Prisma.InputJsonValue },
    });
  }

  async reportsSummary(actor: AuthPrincipal) {
    const orgId = actor.organizationId;
    const [projects, plots, customers, leads, reservations, bookings, payments, agents] =
      await Promise.all([
        this.prisma.project.count({ where: { organizationId: orgId } }),
        this.prisma.plot.groupBy({ by: ['status'], where: { organizationId: orgId }, _count: true }),
        this.prisma.customer.count({ where: { organizationId: orgId } }),
        this.prisma.lead.count({ where: { organizationId: orgId } }),
        this.prisma.reservation.count({ where: { organizationId: orgId, state: 'ACTIVE' } }),
        this.prisma.booking.count({ where: { organizationId: orgId } }),
        this.prisma.payment.aggregate({
          where: { organizationId: orgId, voidedAt: null },
          _sum: { amountPaise: true },
          _count: true,
        }),
        this.prisma.agentProfile.count({ where: { organizationId: orgId } }),
      ]);
    return {
      projects,
      customers,
      leads,
      activeReservations: reservations,
      bookings,
      agents,
      inventoryByStatus: plots.map((p) => ({ status: p.status, count: p._count })),
      collections: {
        paymentCount: payments._count,
        amountPaise: (payments._sum.amountPaise ?? 0n).toString(),
      },
    };
  }
}
