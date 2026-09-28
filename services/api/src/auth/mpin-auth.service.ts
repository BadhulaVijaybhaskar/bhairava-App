import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  decideMpinLock,
  isMpinEligibleRole,
  needsMpinSetup,
  nextMpinFailureState,
  normalizeMpinLoginIdentifier,
  normalizePhoneIn,
  validateMpinConfirm,
  validateMpinFormat,
} from '@bhairava/domain';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from './auth.service';
import { hashPassword, verifyPassword } from './crypto.util';
import { createGoogleTokenVerifier, type GoogleTokenVerifier } from './google-verifier';
import type { AuthPrincipal } from './auth.types';

const GENERIC_AUTH_FAIL = 'Invalid credentials.';

@Injectable()
export class MpinAuthService {
  private verifier: GoogleTokenVerifier;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {
    this.verifier = createGoogleTokenVerifier({
      NODE_ENV: process.env.NODE_ENV,
      GOOGLE_AUTH_DEV_BYPASS: process.env.GOOGLE_AUTH_DEV_BYPASS,
    });
  }

  setVerifierForTests(verifier: GoogleTokenVerifier) {
    this.verifier = verifier;
  }

  private assertPortalRole(roleRaw: string): 'CUSTOMER' | 'AGENT' {
    const role = String(roleRaw || '').toUpperCase();
    if (role !== 'CUSTOMER' && role !== 'AGENT') {
      throw new BadRequestException('MPIN is only available for Customer and Agent portals.');
    }
    return role;
  }

  private audienceFor(role: 'CUSTOMER' | 'AGENT'): string | string[] {
    const customer = process.env.GOOGLE_CLIENT_ID_CUSTOMER;
    const agent = process.env.GOOGLE_CLIENT_ID_AGENT;
    const shared = process.env.GOOGLE_CLIENT_ID;
    const isProd = (process.env.NODE_ENV || 'development') === 'production';
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

  /** POST /auth/mpin/setup — authenticated Google session after profile complete. */
  async setup(
    principal: AuthPrincipal,
    dto: { mpin: string; confirmMpin: string },
    meta: { ip?: string },
  ) {
    if (!isMpinEligibleRole(principal.roleCode)) {
      throw new ForbiddenException('MPIN is only available for Customer and Agent portals.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: principal.userId } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('User inactive');
    if (!user.profileCompletedAt) {
      throw new BadRequestException('Complete your profile before setting an MPIN.');
    }
    if (user.mpinSetAt && user.mpinHash) {
      throw new BadRequestException('MPIN already set. Use reset with Google to change it.');
    }
    const format = validateMpinConfirm(dto.mpin, dto.confirmMpin);
    if (!format.ok) throw new BadRequestException(format.message);

    const mpinHash = await hashPassword(format.mpin);
    const now = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mpinHash,
        mpinSetAt: now,
        mpinFailedAttempts: 0,
        mpinLockedUntil: null,
      },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'auth.mpin.create',
      entityType: 'User',
      entityId: user.id,
      metaJson: { role: user.roleCode },
      ip: meta.ip,
    });

    const refreshed = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return { user: this.auth.toPublicUser(refreshed), ok: true };
  }

  /** POST /auth/mpin/login — identifier + MPIN; role-scoped; no existence leak. */
  async login(
    dto: { identifier: string; mpin: string; role: string },
    meta: { ip?: string; userAgent?: string },
  ) {
    const role = this.assertPortalRole(dto.role);
    const format = validateMpinFormat(dto.mpin);
    if (!format.ok) throw new BadRequestException(format.message);

    const identifier = normalizeMpinLoginIdentifier(dto.identifier);
    if (!identifier) throw new UnauthorizedException(GENERIC_AUTH_FAIL);

    const phoneMaybe = normalizePhoneIn(identifier) || (/^\d{10}$/.test(identifier) ? identifier : null);
    const user = await this.prisma.user.findFirst({
      where: {
        roleCode: role,
        status: 'ACTIVE',
        OR: [
          { email: identifier },
          ...(phoneMaybe ? [{ mobile: phoneMaybe }] : []),
        ],
      },
    });

    // Uniform failure — do not reveal whether identifier exists or role mismatch.
    if (!user?.mpinHash || !user.mpinSetAt) {
      await this.audit.log({
        organizationId: user?.organizationId,
        actorId: user?.id,
        action: 'auth.mpin.failure',
        entityType: 'User',
        entityId: user?.id,
        metaJson: { reason: 'unknown_or_unset', role },
        ip: meta.ip,
      });
      throw new UnauthorizedException(GENERIC_AUTH_FAIL);
    }

    const lock = decideMpinLock({ lockedUntil: user.mpinLockedUntil });
    if (lock.locked) {
      await this.audit.log({
        organizationId: user.organizationId,
        actorId: user.id,
        action: 'auth.mpin.lock',
        entityType: 'User',
        entityId: user.id,
        metaJson: { reason: 'still_locked' },
        ip: meta.ip,
      });
      throw new ForbiddenException(lock.message);
    }

    const ok = await verifyPassword(user.mpinHash, format.mpin);
    if (!ok) {
      const next = nextMpinFailureState({ failedAttempts: user.mpinFailedAttempts });
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          mpinFailedAttempts: next.mpinFailedAttempts,
          mpinLockedUntil: next.mpinLockedUntil,
        },
      });
      await this.audit.log({
        organizationId: user.organizationId,
        actorId: user.id,
        action: next.justLocked ? 'auth.mpin.lock' : 'auth.mpin.failure',
        entityType: 'User',
        entityId: user.id,
        metaJson: { attempts: next.mpinFailedAttempts, locked: next.justLocked },
        ip: meta.ip,
      });
      if (next.justLocked) throw new ForbiddenException('Too many attempts. Try again later.');
      throw new UnauthorizedException(GENERIC_AUTH_FAIL);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { mpinFailedAttempts: 0, mpinLockedUntil: null, lastLoginAt: new Date() },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'auth.mpin.login',
      entityType: 'User',
      entityId: user.id,
      metaJson: { role },
      ip: meta.ip,
    });

    const tokens = await this.auth.issueTokensPublic(user.id, user.organizationId, meta);
    const refreshed = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return { user: this.auth.toPublicUser(refreshed), ...tokens };
  }

  /**
   * POST /auth/mpin/reset — fresh Google ID token required.
   * Sets / replaces MPIN after Google identity verify (forgot flow).
   */
  async reset(
    dto: { idToken: string; mpin: string; confirmMpin: string; role: string },
    meta: { ip?: string; userAgent?: string },
  ) {
    const role = this.assertPortalRole(dto.role);
    const format = validateMpinConfirm(dto.mpin, dto.confirmMpin);
    if (!format.ok) throw new BadRequestException(format.message);

    let identity;
    try {
      identity = await this.verifier.verify(dto.idToken, this.audienceFor(role));
    } catch {
      throw new UnauthorizedException('Google verification failed');
    }
    if (!identity.emailVerified) throw new UnauthorizedException('Google email not verified');

    const email = identity.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        roleCode: role,
        OR: [{ googleSub: identity.sub }, { email }],
      },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException(GENERIC_AUTH_FAIL);
    }
    if (!user.profileCompletedAt) {
      throw new BadRequestException('Complete your profile before setting an MPIN.');
    }

    const mpinHash = await hashPassword(format.mpin);
    const now = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mpinHash,
        mpinSetAt: now,
        mpinFailedAttempts: 0,
        mpinLockedUntil: null,
        googleSub: user.googleSub || identity.sub,
      },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'auth.mpin.reset',
      entityType: 'User',
      entityId: user.id,
      metaJson: { role },
      ip: meta.ip,
    });

    const tokens = await this.auth.issueTokensPublic(user.id, user.organizationId, meta);
    const refreshed = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return { user: this.auth.toPublicUser(refreshed), ...tokens };
  }

  /** Helper for gates / tests. */
  static userNeedsMpin(user: {
    roleCode: string;
    profileCompletedAt: Date | null;
    mpinSetAt: Date | null;
  }) {
    return needsMpinSetup(user);
  }
}
