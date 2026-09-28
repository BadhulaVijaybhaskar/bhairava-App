import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { decidePhoneStealAttempt, invitePublicMeta, normalizePhoneIn } from '@bhairava/domain';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { hashToken } from '../auth/crypto.util';
import type { AuthPrincipal } from '../auth/auth.types';

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async agentFor(actor: AuthPrincipal) {
    const agent = await this.prisma.agentProfile.findFirst({
      where: { userId: actor.userId, organizationId: actor.organizationId },
    });
    if (!agent || agent.isSystem) throw new ForbiddenException('Agent profile required');
    return agent;
  }

  async create(
    actor: AuthPrincipal,
    body: { nameHint?: string; phoneHint?: string; emailHint?: string },
  ) {
    if (actor.roleCode !== 'AGENT') throw new ForbiddenException('Agents only');
    const agent = await this.agentFor(actor);

    const phoneHintNormalized = body.phoneHint ? normalizePhoneIn(body.phoneHint) : null;
    if (body.phoneHint && !phoneHintNormalized) {
      throw new BadRequestException('Invalid mobile hint');
    }

    if (phoneHintNormalized) {
      const existing = await this.prisma.customer.findFirst({
        where: { organizationId: actor.organizationId, phoneNormalized: phoneHintNormalized },
        select: { id: true, agentId: true },
      });
      const decision = decidePhoneStealAttempt({
        normalizedMobile: phoneHintNormalized,
        existingCustomer: existing,
        actingAgentId: agent.id,
      });
      if (!decision.ok) {
        await this.audit.log({
          organizationId: actor.organizationId,
          actorId: actor.userId,
          action: 'assignment.steal_attempt',
          entityType: 'Customer',
          entityId: existing?.id,
          metaJson: { via: 'invite', code: decision.code },
        });
        throw new ConflictException(decision.message);
      }
    }

    const rawToken = randomBytes(32).toString('base64url');
    const invite = await this.prisma.customerInvite.create({
      data: {
        organizationId: actor.organizationId,
        invitedByAgentId: agent.id,
        tokenHash: hashToken(rawToken),
        nameHint: body.nameHint?.trim() || null,
        phoneHintNormalized,
        emailHint: body.emailHint?.trim().toLowerCase() || null,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'invite.create',
      entityType: 'CustomerInvite',
      entityId: invite.id,
      metaJson: {
        invitedByAgentId: agent.id,
        hasPhoneHint: Boolean(phoneHintNormalized),
        attributionSource: 'AGENT_INVITE',
      },
    });

    const customerWeb =
      process.env.CUSTOMER_WEB_URL || process.env.VITE_CUSTOMER_WEB_URL || 'http://localhost:5175';
    const sharePath = `/login?invite=${encodeURIComponent(rawToken)}`;
    const shareUrl = `${customerWeb.replace(/\/$/, '')}${sharePath}`;

    return {
      id: invite.id,
      token: rawToken,
      shareUrl,
      sharePath,
      expiresAt: invite.expiresAt.toISOString(),
      attributionSource: 'AGENT_INVITE',
      invitedByAgentId: agent.id,
      agentCode: agent.code,
    };
  }

  async listMine(actor: AuthPrincipal) {
    if (actor.roleCode !== 'AGENT') throw new ForbiddenException('Agents only');
    const agent = await this.agentFor(actor);
    const rows = await this.prisma.customerInvite.findMany({
      where: { invitedByAgentId: agent.id, organizationId: actor.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        nameHint: true,
        expiresAt: true,
        claimedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      nameHint: r.nameHint,
      expiresAt: r.expiresAt.toISOString(),
      claimedAt: r.claimedAt?.toISOString() ?? null,
      revokedAt: r.revokedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      status: r.revokedAt ? 'revoked' : r.claimedAt ? 'claimed' : r.expiresAt.getTime() <= Date.now() ? 'expired' : 'open',
    }));
  }

  /** Public metadata only — never returns other customers' PII. */
  async peek(rawToken: string) {
    if (!rawToken?.trim()) throw new BadRequestException('token required');
    const invite = await this.prisma.customerInvite.findUnique({
      where: { tokenHash: hashToken(rawToken.trim()) },
      include: {
        invitedByAgent: { select: { name: true, code: true } },
        organization: { select: { name: true } },
      },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    return invitePublicMeta({
      agentName: invite.invitedByAgent.name,
      agentCode: invite.invitedByAgent.code,
      orgName: invite.organization.name,
      expiresAt: invite.expiresAt,
      claimedAt: invite.claimedAt,
      revokedAt: invite.revokedAt,
    });
  }
}
