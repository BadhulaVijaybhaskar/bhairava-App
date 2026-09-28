import { Worker, Queue } from 'bullmq';
import { PrismaClient } from '@bhairava/database';
import type { Prisma } from '@prisma/client';
import { InstallmentStatus, NotificationChannel, PlotStatus, ReservationState, StatusChangeSource } from '@prisma/client';

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };
const prisma = new PrismaClient();

export const RESERVATION_EXPIRY_QUEUE = 'reservation-expiry';

async function notifyUsers(organizationId: string, userIds: Array<string | null | undefined>, title: string, body: string, payloadJson: Prisma.InputJsonValue) {
  const seen = new Set<string>();
  for (const uid of userIds) {
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    await prisma.notification.create({
      data: {
        organizationId,
        userId: uid,
        channel: NotificationChannel.IN_APP,
        title,
        body,
        payloadJson,
        sentAt: new Date(),
      },
    });
  }
}

async function releaseExpiredBatch(limit = 100) {
  const now = new Date();
  const due = await prisma.reservation.findMany({
    where: { state: ReservationState.ACTIVE, expiresAt: { lte: now } },
    take: limit,
    orderBy: { expiresAt: 'asc' },
    include: { customer: { select: { userId: true } } },
  });
  let released = 0;
  for (const r of due) {
    try {
      await prisma.$transaction(async (tx) => {
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
              reason: 'Reservation expired (worker)',
              source: StatusChangeSource.SYSTEM,
              actorId: null,
            },
          });
        }
        released += 1;
      });
      await notifyUsers(
        r.organizationId,
        [r.customer?.userId],
        'Reservation expired',
        'Your reservation expired and the plot was released.',
        { kind: 'reservation_expired', reservationId: r.id, plotId: r.plotId, href: '/reservations' },
      );
    } catch {
      // race with booking conversion — skip
    }
  }
  return released;
}

/** Notify once for ACTIVE reservations expiring within 24h. */
async function notifyExpiringSoon() {
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 3600 * 1000);
  const rows = await prisma.reservation.findMany({
    where: { state: ReservationState.ACTIVE, expiresAt: { gt: now, lte: soon } },
    take: 100,
    include: { customer: { select: { userId: true } } },
  });
  let n = 0;
  for (const r of rows) {
    if (!r.customer?.userId) continue;
    const recent = await prisma.notification.findMany({
      where: {
        organizationId: r.organizationId,
        userId: r.customer.userId,
        title: 'Reservation expiring',
        createdAt: { gte: new Date(now.getTime() - 48 * 3600 * 1000) },
      },
      take: 50,
    });
    const already = recent.some((x) => {
      const p = x.payloadJson as Record<string, unknown> | null;
      return p && p.reservationId === r.id;
    });
    if (already) continue;
    await notifyUsers(
      r.organizationId,
      [r.customer.userId],
      'Reservation expiring',
      'Your reservation expires at ' + r.expiresAt.toISOString() + '.',
      { kind: 'reservation_expiring', reservationId: r.id, plotId: r.plotId, href: '/reservations' },
    );
    n += 1;
  }
  return n;
}

async function markOverdueInstallments() {
  const now = new Date();
  const due = await prisma.paymentScheduleItem.findMany({
    where: {
      status: { in: [InstallmentStatus.UPCOMING, InstallmentStatus.DUE] },
      dueDate: { lte: now },
    },
    take: 200,
    });
  let n = 0;
  for (const item of due) {
    const cust = item.customerId ? await prisma.customer.findUnique({ where: { id: item.customerId }, select: { userId: true } }) : null;
    const nextStatus = InstallmentStatus.OVERDUE;
    if (item.status !== InstallmentStatus.OVERDUE) {
      await prisma.paymentScheduleItem.update({
        where: { id: item.id },
        data: { status: nextStatus },
      });
    }
    if (!cust?.userId) continue;
    const recent = await prisma.notification.findMany({
      where: {
        organizationId: item.organizationId,
        userId: cust.userId,
        title: 'Payment overdue',
        createdAt: { gte: new Date(now.getTime() - 7 * 24 * 3600 * 1000) },
      },
      take: 50,
    });
    const already = recent.some((x) => {
      const p = x.payloadJson as Record<string, unknown> | null;
      return p && p.scheduleItemId === item.id;
    });
    if (already) continue;
    await notifyUsers(
      item.organizationId,
      [cust.userId],
      'Payment overdue',
      'Installment "' + item.name + '" is overdue.',
      { kind: 'payment_overdue', scheduleItemId: item.id, bookingId: item.bookingId, href: '/schedules' },
    );
    n += 1;
  }
  return n;
}

async function main() {
  const queue = new Queue(RESERVATION_EXPIRY_QUEUE, { connection });
  await queue.add(
    'sweep',
    {},
    { repeat: { every: 60_000 }, removeOnComplete: 100, removeOnFail: 100 },
  );

  // eslint-disable-next-line no-new
  new Worker(
    RESERVATION_EXPIRY_QUEUE,
    async () => {
      const released = await releaseExpiredBatch();
      const expiring = await notifyExpiringSoon();
      const overdue = await markOverdueInstallments();
      if (released || expiring || overdue) {
        console.log(`[worker] released=${released} expiring=${expiring} overdue=${overdue}`);
      }
      return { released, expiring, overdue };
    },
    { connection },
  );

  console.log('[worker] reservation expiry + overdue worker started (every 60s)');
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
