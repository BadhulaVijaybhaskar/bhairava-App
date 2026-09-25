import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuthPrincipal } from '../../auth/auth.types';

export type AgentScope = {
  agentId: string | null;
  allAgentsAccess: boolean;
};

/** Resolve the caller's agent profile scope within their organization. */
export async function resolveAgentScope(
  prisma: PrismaService,
  actor: AuthPrincipal,
): Promise<AgentScope> {
  if (actor.roleCode !== 'AGENT') {
    return { agentId: null, allAgentsAccess: true };
  }
  const agent = await prisma.agentProfile.findFirst({
    where: { userId: actor.userId, organizationId: actor.organizationId },
  });
  if (!agent) return { agentId: null, allAgentsAccess: false };
  return { agentId: agent.id, allAgentsAccess: agent.allAgentsAccess };
}

/** Booking / reservation rows owned by or assigned to this agent. */
export function agentOwnedBookingWhere(agentId: string): Prisma.BookingWhereInput {
  return {
    OR: [{ agentId }, { customer: { agentId } }],
  };
}

export function agentOwnedReservationWhere(agentId: string): Prisma.ReservationWhereInput {
  return {
    OR: [{ agentId }, { customer: { agentId } }],
  };
}

/** Payments / schedules scoped to assigned customers or own bookings. */
export function agentOwnedPaymentWhere(agentId: string): Prisma.PaymentWhereInput {
  return {
    OR: [
      { customer: { agentId } },
      { booking: { agentId } },
      { booking: { customer: { agentId } } },
    ],
  };
}

export function agentOwnedScheduleWhere(agentId: string): Prisma.PaymentScheduleItemWhereInput {
  return {
    OR: [
      { customer: { agentId } },
      { booking: { agentId } },
      { booking: { customer: { agentId } } },
    ],
  };
}

export function agentOwnedReceiptWhere(agentId: string): Prisma.ReceiptWhereInput {
  return {
    OR: [
      { booking: { agentId } },
      { booking: { customer: { agentId } } },
      { payment: { customer: { agentId } } },
    ],
  };
}

export function agentOwnedDocumentWhere(agentId: string): Prisma.DocumentWhereInput {
  return {
    OR: [
      // Project / org packs visible to agents (no customer PII linkage required)
      { visibility: 'AGENT_VISIBLE' },
      // Customer-related docs only for assigned / owned customers
      {
        visibility: 'CUSTOMER_PROFILE_RELATED',
        OR: [
          { customer: { agentId } },
          { booking: { agentId } },
          { booking: { customer: { agentId } } },
        ],
      },
    ],
  };
}

export function agentOwnsCustomer(
  scope: AgentScope,
  customer: { agentId: string | null },
): boolean {
  if (scope.allAgentsAccess) return true;
  if (!scope.agentId) return false;
  return customer.agentId === scope.agentId;
}

export function agentOwnsBookingLike(
  scope: AgentScope,
  row: { agentId: string | null; customer?: { agentId: string | null } | null },
): boolean {
  if (scope.allAgentsAccess) return true;
  if (!scope.agentId) return false;
  return row.agentId === scope.agentId || row.customer?.agentId === scope.agentId;
}
