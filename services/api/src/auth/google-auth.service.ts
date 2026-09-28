import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoleCode, UserAccountStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import {
  BHAIRAVA_DIRECT_CODE,
  decideInviteHintMatch,
  decideMobileOnlyDup,
  generateAgentCode,
  needsProfileCompletion,
  normalizePhoneIn,
  preserveOriginalAttribution,
  resolveDirectAppSalesOwner,
  resolveInviteSalesOwner,
} from '@bhairava/domain';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from './auth.service';
import {
  createGoogleTokenVerifier,
  type GoogleIdentity,
  type GoogleTokenVerifier,
} from './google-verifier';
import type { AuthPrincipal } from './auth.types';

@Injectable()
export class GoogleAuthService {
  private verifier: GoogleTokenVerifier;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {
    this.verifier = createGoogleTokenVerifier({
      NODE_ENV: process.env.NODE_ENV,
      GOOGLE_AUTH_DEV_BYPASS: process.env.GOOGLE_AUTH_DEV_BYPASS,
    });
  }

  /** Test hook — inject a fake verifier without Nest overrides. */
  setVerifierForTests(verifier: GoogleTokenVerifier) {
    this.verifier = verifier;
  }

  private audienceFor(role: 'CUSTOMER' | 'AGENT'): string | string[] {
    const customer = this.config.get<string>('GOOGLE_CLIENT_ID_CUSTOMER') || process.env.GOOGLE_CLIENT_ID_CUSTOMER;
    const agent = this.config.get<string>('GOOGLE_CLIENT_ID_AGENT') || process.env.GOOGLE_CLIENT_ID_AGENT;
    const shared = this.config.get<string>('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID;
    const isProd = (process.env.NODE_ENV || 'development') === 'production';
    /** Dev-only placeholder audience when client IDs absent. Never in production. */
    const allowDevAudience =
      !isProd &&
      ['1', 'true', 'yes'].includes(String(process.env.GOOGLE_AUTH_DEV_BYPASS || '').toLowerCase());
    if (role === 'CUSTOMER') {
      const ids = [customer, shared].filter(Boolean) as string[];
      if (!ids.length && allowDevAudience) return 'dev';
      if (!ids.length) throw new BadRequestException('Google customer client not configured');
      return ids.length === 1 ? ids[0] : ids;
    }
    const ids = [agent, shared].filter(Boolean) as string[];
    if (!ids.length && allowDevAudience) return 'dev';
    if (!ids.length) throw new BadRequestException('Google agent client not configured');
    return ids.length === 1 ? ids[0] : ids;
  }

  private async resolveOrganizationId(): Promise<string> {
    const code = (process.env.DEFAULT_ORG_CODE || process.env.FOUNDER_ORG_CODE || 'BHAIRAVA').trim().toUpperCase();
    const byCode = await this.prisma.organization.findUnique({ where: { code } });
    if (byCode) return byCode.id;
    const first = await this.prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!first) throw new BadRequestException('No organization configured');
    return first.id;
  }

  async ensureBhairavaDirect(organizationId: string): Promise<string> {
    const existing = await this.prisma.agentProfile.findFirst({
      where: { organizationId, code: BHAIRAVA_DIRECT_CODE },
    });
    if (existing) return existing.id;

    const systemEmail = `bhairava-direct+${organizationId.slice(0, 8)}@system.bhairava.local`;
    const user = await this.prisma.user.upsert({
      where: { organizationId_email: { organizationId, email: systemEmail } },
      update: { roleCode: RoleCode.AGENT, status: UserAccountStatus.ACTIVE, displayName: 'Bhairava Direct' },
      create: {
        organizationId,
        email: systemEmail,
        passwordHash: null,
        displayName: 'Bhairava Direct',
        roleCode: RoleCode.AGENT,
        status: UserAccountStatus.ACTIVE,
        profileCompletedAt: new Date(),
      },
    });

    const agent = await this.prisma.agentProfile.upsert({
      where: { userId: user.id },
      update: { code: BHAIRAVA_DIRECT_CODE, name: 'Bhairava Direct', status: 'Active', isSystem: true },
      create: {
        organizationId,
        userId: user.id,
        code: BHAIRAVA_DIRECT_CODE,
        name: 'Bhairava Direct',
        status: 'Active',
        isSystem: true,
        allAgentsAccess: false,
      },
    });
    return agent.id;
  }

  private toSessionUser(user: {
    id: string;
    organizationId: string;
    email: string | null;
    mobile: string | null;
    displayName: string;
    roleCode: string;
    status: string;
    profileCompletedAt: Date | null;
    mpinSetAt?: Date | null;
  }) {
    const publicUser = this.auth.toPublicUser(user);
    return {
      ...publicUser,
      mobile: user.mobile,
      profileComplete: !needsProfileCompletion(user.profileCompletedAt),
      needsProfile: needsProfileCompletion(user.profileCompletedAt),
    };
  }

  private async issueForUser(
    user: {
      id: string;
      organizationId: string;
      email: string | null;
      mobile: string | null;
      displayName: string;
      roleCode: string;
      status: string;
      profileCompletedAt: Date | null;
      mpinSetAt?: Date | null;
    },
    meta: { ip?: string; userAgent?: string },
  ) {
    if (user.status !== 'ACTIVE') throw new ForbiddenException('Account suspended');
    const tokens = await this.auth.issueTokensPublic(user.id, user.organizationId, meta);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { user: this.toSessionUser(user), ...tokens };
  }

  async continueWithGoogle(
    role: 'CUSTOMER' | 'AGENT',
    dto: { idToken: string; inviteToken?: string },
    meta: { ip?: string; userAgent?: string },
  ) {
    let identity: GoogleIdentity;
    try {
      identity = await this.verifier.verify(dto.idToken, this.audienceFor(role));
    } catch {
      throw new UnauthorizedException('Invalid Google credential');
    }
    if (!identity.emailVerified) {
      throw new UnauthorizedException('Google email must be verified');
    }

    const organizationId = await this.resolveOrganizationId();
    const email = identity.email.toLowerCase();

    let user = await this.prisma.user.findFirst({
      where: {
        organizationId,
        OR: [{ googleSub: identity.sub }, { email }],
      },
    });

    if (user) {
      // Bind Google sub if signing in by email match.
      if (!user.googleSub) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleSub: identity.sub },
        });
      } else if (user.googleSub !== identity.sub && user.email?.toLowerCase() === email) {
        // Email collision with different Google account — refuse without PII of the other party.
        throw new ConflictException('This email is already linked to another sign-in method.');
      }
      if (user.roleCode !== role && !(user.roleCode === 'AGENT' && role === 'AGENT')) {
        // Staff accounts must not enter customer Google flow as CUSTOMER, etc.
        if (role === 'CUSTOMER' && user.roleCode !== 'CUSTOMER') {
          throw new ForbiddenException('This Google account is not a customer login.');
        }
        if (role === 'AGENT' && user.roleCode !== 'AGENT') {
          throw new ForbiddenException('This Google account is not an agent login.');
        }
      }
      await this.audit.log({
        organizationId,
        actorId: user.id,
        action: role === 'CUSTOMER' ? 'auth.google.customer.login' : 'auth.google.agent.login',
        entityType: 'User',
        entityId: user.id,
        ip: meta.ip,
      });
      return this.issueForUser(user, meta);
    }

    // New signup
    user = await this.prisma.user.create({
      data: {
        organizationId,
        email,
        googleSub: identity.sub,
        passwordHash: null,
        displayName: identity.name?.trim() || email.split('@')[0],
        roleCode: role === 'CUSTOMER' ? RoleCode.CUSTOMER : RoleCode.AGENT,
        status: UserAccountStatus.ACTIVE,
        profileCompletedAt: null,
      },
    });

    // Early invite email-hint binding for new customers (phone checked at profile complete).
    if (role === 'CUSTOMER' && dto.inviteToken) {
      const { hashToken } = await import('./crypto.util');
      const invite = await this.prisma.customerInvite.findUnique({
        where: { tokenHash: hashToken(dto.inviteToken) },
      });
      if (invite && !invite.revokedAt && !invite.claimedAt && invite.expiresAt.getTime() > Date.now()) {
        const hint = decideInviteHintMatch({
          emailHint: invite.emailHint,
          phoneHintNormalized: null, // phone not known yet
          claimantEmail: email,
          claimantMobileNormalized: null,
        });
        if (!hint.ok) {
          await this.audit.log({
            organizationId,
            actorId: user.id,
            action: 'invite.hint_mismatch',
            entityType: 'CustomerInvite',
            entityId: invite.id,
            metaJson: { code: hint.code, stage: 'google_continue' },
            ip: meta.ip,
          });
          throw new ConflictException(hint.message);
        }
      }
    }

    // Stash invite token claim intent in audit; actual claim happens on profile complete.
    if (role === 'CUSTOMER' && dto.inviteToken) {
      await this.audit.log({
        organizationId,
        actorId: user.id,
        action: 'auth.google.customer.signup_with_invite',
        entityType: 'User',
        entityId: user.id,
        metaJson: { hasInviteToken: true },
        ip: meta.ip,
      });
    } else {
      await this.audit.log({
        organizationId,
        actorId: user.id,
        action: role === 'CUSTOMER' ? 'auth.google.customer.signup' : 'auth.google.agent.signup',
        entityType: 'User',
        entityId: user.id,
        ip: meta.ip,
      });
    }

    return this.issueForUser(user, meta);
  }

  async completeCustomerProfile(
    actor: AuthPrincipal,
    dto: {
      name: string;
      mobile: string;
      city?: string;
      preferredProjectId?: string;
      referralCode?: string;
      referralNote?: string;
      termsAccepted: boolean;
      inviteToken?: string;
    },
    meta: { ip?: string },
  ) {
    if (actor.roleCode !== 'CUSTOMER') throw new ForbiddenException('Customer profile only');
    if (!dto.termsAccepted) throw new BadRequestException('Terms must be accepted');
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Name is required');
    const mobile = normalizePhoneIn(dto.mobile);
    if (!mobile) throw new BadRequestException('Valid Indian mobile is required');

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
    if (user.profileCompletedAt) {
      // Idempotent: returning users skip — return current session shape.
      const customer = await this.prisma.customer.findFirst({ where: { userId: user.id } });
      return {
        user: this.toSessionUser(user),
        customerId: customer?.id ?? null,
        skipped: true,
      };
    }

    // Mobile uniqueness on User + Customer — no merge, no PII leak.
    const existingUserByMobile = await this.prisma.user.findFirst({
      where: {
        organizationId: user.organizationId,
        mobile,
        NOT: { id: user.id },
      },
    });
    const dup = decideMobileOnlyDup({
      normalizedMobile: mobile,
      existingOwner: existingUserByMobile
        ? {
            userId: existingUserByMobile.id,
            googleSub: existingUserByMobile.googleSub,
            email: existingUserByMobile.email,
          }
        : null,
      claimant: {
        userId: user.id,
        googleSub: user.googleSub,
        email: user.email,
      },
    });
    if (!dup.ok) {
      await this.audit.log({
        organizationId: user.organizationId,
        actorId: user.id,
        action: 'auth.customer.mobile_conflict',
        entityType: 'User',
        entityId: user.id,
        metaJson: { code: dup.code },
        ip: meta.ip,
      });
      throw new ConflictException(dup.message);
    }

    const existingCustomerByPhone = await this.prisma.customer.findFirst({
      where: {
        organizationId: user.organizationId,
        phoneNormalized: mobile,
        userId: { not: user.id },
      },
      select: {
        id: true,
        userId: true,
        agentId: true,
        attributionSource: true,
        invitedByAgentId: true,
      },
    });
    if (existingCustomerByPhone?.userId) {
      throw new ConflictException('This mobile number cannot be used for this account.');
    }

    let inviteAgentId: string | null = null;
    let inviteId: string | null = null;
    if (dto.inviteToken) {
      const { hashToken } = await import('./crypto.util');
      const tokenHash = hashToken(dto.inviteToken);
      const invite = await this.prisma.customerInvite.findUnique({ where: { tokenHash } });
      if (
        !invite ||
        invite.revokedAt ||
        invite.claimedAt ||
        invite.expiresAt.getTime() <= Date.now() ||
        invite.organizationId !== user.organizationId
      ) {
        // Invalid invite — continue as DIRECT_APP without leaking invite/agent PII.
        await this.audit.log({
          organizationId: user.organizationId,
          actorId: user.id,
          action: 'invite.claim_rejected',
          entityType: 'CustomerInvite',
          entityId: invite?.id,
          metaJson: { reason: 'invalid_or_expired' },
          ip: meta.ip,
        });
      } else {
        const hint = decideInviteHintMatch({
          emailHint: invite.emailHint,
          phoneHintNormalized: invite.phoneHintNormalized,
          claimantEmail: user.email,
          claimantMobileNormalized: mobile,
        });
        if (!hint.ok) {
          await this.audit.log({
            organizationId: user.organizationId,
            actorId: user.id,
            action: 'invite.hint_mismatch',
            entityType: 'CustomerInvite',
            entityId: invite.id,
            metaJson: { code: hint.code },
            ip: meta.ip,
          });
          throw new ConflictException(hint.message);
        }
        inviteAgentId = invite.invitedByAgentId;
        inviteId = invite.id;
      }
    }

    const directId = await this.ensureBhairavaDirect(user.organizationId);
    const attribution = inviteAgentId
      ? resolveInviteSalesOwner(inviteAgentId)
      : resolveDirectAppSalesOwner(directId);
    const invitedByAgentId: string | null = inviteAgentId;

    if (dto.preferredProjectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.preferredProjectId, organizationId: user.organizationId },
      });
      if (!project) throw new BadRequestException('Invalid project');
    }

    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          displayName: name,
          mobile,
          profileCompletedAt: now,
          termsAcceptedAt: now,
          status: UserAccountStatus.ACTIVE,
        },
      });

      let customer = await tx.customer.findFirst({ where: { userId: user.id } });
      if (!customer && existingCustomerByPhone && !existingCustomerByPhone.userId) {
        // Unclaimed CRM row with same phone — link only if invite agent matches or Direct.
        const canLink =
          !existingCustomerByPhone.agentId ||
          existingCustomerByPhone.agentId === attribution.agentId;
        if (!canLink) {
          throw new ConflictException('This mobile number cannot be used for this account.');
        }
        const retained = preserveOriginalAttribution({
          existingAttributionSource: existingCustomerByPhone.attributionSource,
          existingInvitedByAgentId: existingCustomerByPhone.invitedByAgentId,
          incomingAttributionSource: attribution.attributionSource,
          incomingInvitedByAgentId: invitedByAgentId,
        });
        customer = await tx.customer.update({
          where: { id: existingCustomerByPhone.id },
          data: {
            userId: user.id,
            name,
            phone: mobile,
            phoneNormalized: mobile,
            email: user.email,
            city: dto.city,
            preferredProjectId: dto.preferredProjectId,
            agentId: attribution.agentId,
            invitedByAgentId: retained.invitedByAgentId,
            attributionSource: retained.attributionSource as any,
            referralCode: dto.referralCode,
            referralNote: dto.referralNote,
            source: String(retained.attributionSource),
          },
        });
      } else if (!customer) {
        customer = await tx.customer.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            name,
            phone: mobile,
            phoneNormalized: mobile,
            email: user.email,
            city: dto.city,
            preferredProjectId: dto.preferredProjectId,
            agentId: attribution.agentId,
            invitedByAgentId,
            attributionSource: attribution.attributionSource,
            referralCode: dto.referralCode,
            referralNote: dto.referralNote,
            source: attribution.attributionSource,
          },
        });
      }

      if (inviteId) {
        await tx.customerInvite.update({
          where: { id: inviteId },
          data: { claimedAt: now, claimedByUserId: user.id },
        });
      }

      return { updatedUser, customer, attribution, invitedByAgentId };
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'assignment.customer.sales_owner',
      entityType: 'Customer',
      entityId: result.customer!.id,
      metaJson: {
        agentId: result.attribution.agentId,
        attributionSource: result.attribution.attributionSource,
        invitedByAgentId: result.invitedByAgentId,
      },
      ip: meta.ip,
    });

    return {
      user: this.toSessionUser(result.updatedUser),
      customerId: result.customer!.id,
      skipped: false,
    };
  }

  async completeAgentProfile(
    actor: AuthPrincipal,
    dto: { name: string; phone: string; region: string; termsAccepted: boolean },
    meta: { ip?: string },
  ) {
    if (actor.roleCode !== 'AGENT') throw new ForbiddenException('Agent profile only');
    if (!dto.termsAccepted) throw new BadRequestException('Terms must be accepted');
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Name is required');
    const region = dto.region?.trim();
    if (!region) throw new BadRequestException('City / region is required');
    const phone = normalizePhoneIn(dto.phone);
    if (!phone) throw new BadRequestException('Valid Indian mobile is required');

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
    if (user.profileCompletedAt) {
      const agent = await this.prisma.agentProfile.findFirst({ where: { userId: user.id } });
      return {
        user: this.toSessionUser(user),
        agentId: agent?.id ?? null,
        agentCode: agent?.code ?? null,
        skipped: true,
      };
    }

    const existingMobile = await this.prisma.user.findFirst({
      where: { organizationId: user.organizationId, mobile: phone, NOT: { id: user.id } },
    });
    const dup = decideMobileOnlyDup({
      normalizedMobile: phone,
      existingOwner: existingMobile
        ? {
            userId: existingMobile.id,
            googleSub: existingMobile.googleSub,
            email: existingMobile.email,
          }
        : null,
      claimant: { userId: user.id, googleSub: user.googleSub, email: user.email },
    });
    if (!dup.ok) throw new ConflictException(dup.message);

    const existingCodes = new Set(
      (
        await this.prisma.agentProfile.findMany({
          where: { organizationId: user.organizationId },
          select: { code: true },
        })
      ).map((a) => a.code),
    );
    const code = generateAgentCode(existingCodes, randomBytes(4).toString('hex'));
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          displayName: name,
          mobile: phone,
          profileCompletedAt: now,
          termsAcceptedAt: now,
          status: UserAccountStatus.ACTIVE,
        },
      });
      const agent = await tx.agentProfile.upsert({
        where: { userId: user.id },
        update: {
          name,
          phone,
          region,
          status: 'Active',
          email: user.email,
        },
        create: {
          organizationId: user.organizationId,
          userId: user.id,
          code,
          name,
          phone,
          region,
          email: user.email,
          status: 'Active',
          isSystem: false,
        },
      });
      return { updatedUser, agent };
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'auth.agent.profile_completed',
      entityType: 'AgentProfile',
      entityId: result.agent.id,
      metaJson: { agentCode: result.agent.code, noAdminApproval: true },
      ip: meta.ip,
    });

    return {
      user: this.toSessionUser(result.updatedUser),
      agentId: result.agent.id,
      agentCode: result.agent.code,
      skipped: false,
    };
  }
}
