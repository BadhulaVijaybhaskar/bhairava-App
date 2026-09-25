import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InstallmentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthPrincipal } from '../auth/auth.types';
import {
  agentOwnedPaymentWhere,
  resolveAgentScope,
} from '../common/ownership/record-scope';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: FinanceService,
    private readonly notifications: NotificationsService,
  ) {}

  private async paymentWhereForActor(
    actor: AuthPrincipal,
    q: { bookingId?: string; projectId?: string } = {},
  ): Promise<Prisma.PaymentWhereInput | null> {
    const where: Prisma.PaymentWhereInput = { organizationId: actor.organizationId };
    if (q.bookingId) where.bookingId = q.bookingId;
    if (q.projectId) where.projectId = q.projectId;
    if (actor.roleCode === 'CUSTOMER') {
      where.customer = { userId: actor.userId };
      return where;
    }
    if (actor.roleCode === 'AGENT') {
      const scope = await resolveAgentScope(this.prisma, actor);
      if (!scope.agentId) return null;
      if (!scope.allAgentsAccess) {
        Object.assign(where, agentOwnedPaymentWhere(scope.agentId));
      }
    }
    return where;
  }

  async list(actor: AuthPrincipal, q: { bookingId?: string; projectId?: string } = {}) {
    const where = await this.paymentWhereForActor(actor, q);
    if (!where) return [];
    const rows = await this.prisma.payment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      select: {
        id: true, bookingId: true, customerId: true, projectId: true, plotId: true,
        amountPaise: true, paidAt: true, method: true, txnRef: true, receiptNumber: true,
        reconciliationStatus: true, notes: true, voidedAt: true, voidReason: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({ ...r, amountPaise: r.amountPaise.toString() }));
  }

  async get(actor: AuthPrincipal, id: string) {
    const where = await this.paymentWhereForActor(actor);
    if (!where) throw new NotFoundException('Payment not found');
    const row = await this.prisma.payment.findFirst({
      where: { ...where, id },
      select: {
        id: true, bookingId: true, customerId: true, projectId: true, plotId: true,
        amountPaise: true, paidAt: true, method: true, txnRef: true, receiptNumber: true,
        reconciliationStatus: true, notes: true, voidedAt: true, voidReason: true,
        createdAt: true,
      },
    });
    if (!row) throw new NotFoundException('Payment not found');
    return { ...row, amountPaise: row.amountPaise.toString() };
  }

  /**
   * Atomically allocate next RCP-* receipt number for the organization.
   * Uses UPDATE … RETURNING on organizations.receiptCounter (row-level lock).
   */
  async allocateReceiptNumber(
    tx: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<string> {
    const rows = await tx.$queryRaw<Array<{ receiptCounter: number }>>`
      UPDATE organizations
      SET "receiptCounter" = "receiptCounter" + 1
      WHERE id = ${organizationId}
      RETURNING "receiptCounter"
    `;
    const next = rows[0]?.receiptCounter;
    if (next == null || next < 1) {
      throw new BadRequestException('Could not allocate receipt number');
    }
    return `RCP-${String(next).padStart(6, '0')}`;
  }

  async create(actor: AuthPrincipal, body: {
    bookingId: string; amountPaise: string; paidAt: string; method: string;
    txnRef?: string; scheduleItemId?: string; notes?: string;
  }) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: body.bookingId, organizationId: actor.organizationId },
      include: { customer: { select: { agentId: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (actor.roleCode === 'AGENT') {
      const scope = await resolveAgentScope(this.prisma, actor);
      if (!scope.agentId) throw new NotFoundException('Booking not found');
      if (
        !scope.allAgentsAccess &&
        booking.agentId !== scope.agentId &&
        booking.customer.agentId !== scope.agentId
      ) {
        throw new NotFoundException('Booking not found');
      }
    }
    if (actor.roleCode === 'CUSTOMER') {
      const mine = await this.prisma.customer.findFirst({
        where: { userId: actor.userId, organizationId: actor.organizationId },
      });
      if (!mine || booking.customerId !== mine.id) throw new NotFoundException('Booking not found');
    }

    const amount = BigInt(body.amountPaise);
    if (amount <= 0n) throw new BadRequestException('amountPaise must be > 0');
    if (!(Object.values(PaymentMethod) as string[]).includes(body.method)) {
      throw new BadRequestException('Invalid payment method');
    }

    let result: { payment: any; receipt: any };
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        result = await this.prisma.$transaction(async (tx) => {
          const receiptNumber = await this.allocateReceiptNumber(tx, actor.organizationId);

          const payment = await tx.payment.create({
            data: {
              organizationId: actor.organizationId,
              bookingId: booking.id,
              customerId: booking.customerId,
              projectId: booking.projectId,
              plotId: booking.plotId,
              scheduleItemId: body.scheduleItemId,
              amountPaise: amount,
              paidAt: new Date(body.paidAt),
              method: body.method as PaymentMethod,
              txnRef: body.txnRef,
              notes: body.notes,
              recordedByUserId: actor.userId,
              receiptNumber,
            },
          });

          const receipt = await tx.receipt.create({
            data: {
              organizationId: actor.organizationId,
              paymentId: payment.id,
              bookingId: booking.id,
              receiptNumber,
              metaJson: { method: body.method, txnRef: body.txnRef ?? null },
            },
          });

          if (body.scheduleItemId) {
            const item = await tx.paymentScheduleItem.findFirst({
              where: { id: body.scheduleItemId, bookingId: booking.id, organizationId: actor.organizationId },
            });
            if (item) {
              const linked = await tx.payment.aggregate({
                where: { scheduleItemId: item.id, voidedAt: null },
                _sum: { amountPaise: true },
              });
              const paid = linked._sum.amountPaise ?? 0n;
              await tx.paymentScheduleItem.update({
                where: { id: item.id },
                data: {
                  status:
                    paid >= item.amountDuePaise
                      ? InstallmentStatus.PAID
                      : paid > 0n
                        ? InstallmentStatus.PARTIALLY_PAID
                        : item.status,
                },
              });
            }
          }

          return { payment, receipt };
        });
        break;
      } catch (err: any) {
        const code = err?.code;
        const msg = String(err?.message ?? err);
        if (
          (code === 'P2002' || /unique constraint|duplicate key/i.test(msg)) &&
          attempt < maxAttempts
        ) {
          continue;
        }
        if (code === 'P2002' || /unique constraint|duplicate key/i.test(msg)) {
          throw new ConflictException('Receipt number conflict — retry payment');
        }
        throw err;
      }
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: booking.customerId },
      select: { userId: true, name: true },
    });
    const amountStr = result!.payment.amountPaise.toString();
    const rcp = result!.receipt.receiptNumber;
    if (customer?.userId) {
      await this.notifications.notify({
        organizationId: actor.organizationId,
        userId: customer.userId,
        title: 'Payment received',
        body: 'Payment of ' + amountStr + ' paise recorded. Receipt ' + rcp + '.',
        payloadJson: {
          kind: 'payment_received',
          paymentId: result!.payment.id,
          receiptId: result!.receipt.id,
          bookingId: booking.id,
          href: '/receipts/' + result!.receipt.id,
        },
        actorId: actor.userId,
      });
    }
    await this.notifications.notify({
      organizationId: actor.organizationId,
      userId: actor.userId,
      title: 'Payment recorded',
      body: 'Receipt ' + rcp + ' issued for booking ' + booking.id + '.',
      payloadJson: {
        kind: 'payment_received',
        paymentId: result!.payment.id,
        receiptId: result!.receipt.id,
        bookingId: booking.id,
        href: '/receipts/' + result!.receipt.id,
      },
      actorId: actor.userId,
    });

    return {
      ...result!.payment,
      amountPaise: result!.payment.amountPaise.toString(),
      receipt: {
        id: result!.receipt.id,
        receiptNumber: result!.receipt.receiptNumber,
        issuedAt: result!.receipt.issuedAt,
      },
    };
  }

  voidPayment(actor: AuthPrincipal, id: string, reason: string) {
    return this.finance.voidPayment(actor, id, reason);
  }
}
