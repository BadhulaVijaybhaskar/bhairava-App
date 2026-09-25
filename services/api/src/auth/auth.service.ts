import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  generateRefreshToken,
  hashPassword,
  hashToken,
  newFamilyId,
  verifyPassword,
} from './crypto.util';
import type { AuthPrincipal } from './auth.types';
import type { LoginDto, PasswordResetConfirmDto, PasswordResetRequestDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private accessTtl() {
    return Number(this.config.get('JWT_ACCESS_TTL_SEC') || 900);
  }
  private refreshTtl() {
    return Number(this.config.get('JWT_REFRESH_TTL_SEC') || 604800);
  }

  async login(dto: LoginDto, meta: { ip?: string; userAgent?: string }) {
    if (!dto.email && !dto.mobile) {
      throw new BadRequestException('email or mobile required');
    }
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email.trim().toLowerCase() } : undefined,
          dto.mobile ? { mobile: dto.mobile.trim() } : undefined,
        ].filter(Boolean) as any,
      },
    });
    if (!user || !(await verifyPassword(user.passwordHash, dto.password))) {
      await this.audit.log({
        organizationId: user?.organizationId,
        actorId: user?.id,
        action: 'auth.login_failed',
        entityType: 'User',
        entityId: user?.id,
        metaJson: { email: dto.email, mobile: dto.mobile },
        ip: meta.ip,
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account suspended');
    }
    const tokens = await this.issueTokens(user.id, user.organizationId, meta);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      ip: meta.ip,
    });
    return { user: this.toPublicUser(user), ...tokens };
  }

  async refresh(rawRefresh: string | undefined, meta: { ip?: string; userAgent?: string }) {
    if (!rawRefresh) throw new UnauthorizedException('Missing refresh token');
    const tokenHash = hashToken(rawRefresh);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!existing) throw new UnauthorizedException('Invalid refresh token');

    if (existing.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.prisma.session.updateMany({
        where: { refreshFamilyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.log({
        organizationId: existing.organizationId,
        actorId: existing.userId,
        action: 'auth.refresh_reuse_detected',
        entityType: 'RefreshToken',
        entityId: existing.id,
        ip: meta.ip,
      });
      throw new UnauthorizedException('Refresh token reuse detected — sessions revoked');
    }
    if (existing.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.prisma.user.findUnique({ where: { id: existing.userId } });
    if (!user || user.status !== 'ACTIVE') throw new ForbiddenException('Account not active');

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.organizationId, meta, existing.familyId);
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { replacedById: tokens.refreshTokenId },
    });
    return { user: this.toPublicUser(user), ...tokens };
  }

  async logout(rawRefresh: string | undefined, userId?: string) {
    if (rawRefresh) {
      const tokenHash = hashToken(rawRefresh);
      const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
      if (existing && !existing.revokedAt) {
        await this.prisma.refreshToken.updateMany({
          where: { familyId: existing.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await this.prisma.session.updateMany({
          where: { refreshFamilyId: existing.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await this.audit.log({
          organizationId: existing.organizationId,
          actorId: existing.userId,
          action: 'auth.logout',
          entityType: 'Session',
          entityId: existing.familyId,
        });
      }
    } else if (userId) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { ok: true };
  }

  async requestPasswordReset(dto: PasswordResetRequestDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email.trim().toLowerCase() } : undefined,
          dto.mobile ? { mobile: dto.mobile.trim() } : undefined,
        ].filter(Boolean) as any,
      },
    });
    if (user) {
      const raw = generateRefreshToken();
      await this.prisma.passwordResetToken.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          tokenHash: hashToken(raw),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      if (process.env.NODE_ENV === 'development') {
        return { ok: true, devResetToken: raw };
      }
    }
    return { ok: true };
  }

  async confirmPasswordReset(dto: PasswordResetConfirmDto) {
    const tokenHash = hashToken(dto.token);
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  private async issueTokens(
    userId: string,
    organizationId: string,
    meta: { ip?: string; userAgent?: string },
    familyId?: string,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const accessExpiresIn = this.accessTtl();
    const refreshExpiresIn = this.refreshTtl();
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        org: user.organizationId,
        role: user.roleCode,
        email: user.email,
        name: user.displayName,
        typ: 'access',
      },
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiresIn,
      },
    );
    const rawRefresh = generateRefreshToken();
    const fam = familyId ?? newFamilyId();
    const refreshRow = await this.prisma.refreshToken.create({
      data: {
        organizationId,
        userId,
        tokenHash: hashToken(rawRefresh),
        familyId: fam,
        expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });
    const existingSession = await this.prisma.session.findFirst({
      where: { refreshFamilyId: fam, userId },
    });
    if (existingSession) {
      await this.prisma.session.update({
        where: { id: existingSession.id },
        data: { lastSeenAt: new Date(), revokedAt: null },
      });
    } else {
      await this.prisma.session.create({
        data: { organizationId, userId, refreshFamilyId: fam },
      });
    }
    const now = Date.now();
    return {
      accessToken,
      refreshToken: rawRefresh,
      refreshTokenId: refreshRow.id,
      accessExpiresAt: new Date(now + accessExpiresIn * 1000).toISOString(),
      refreshExpiresAt: new Date(now + refreshExpiresIn * 1000).toISOString(),
      cookie: {
        name: 'bhairava_refresh',
        options: 'httpOnly; Secure(prod); SameSite=Lax; Path=/api/auth',
      },
    };
  }

  toPublicUser(user: {
    id: string;
    organizationId: string;
    email: string | null;
    mobile: string | null;
    displayName: string;
    roleCode: string;
    status: string;
  }) {
    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      mobile: user.mobile,
      displayName: user.displayName,
      role: user.roleCode,
      status: user.status,
    };
  }

  async validateAccessPayload(payload: any): Promise<AuthPrincipal> {
    if (!payload?.sub || !payload?.org || payload.typ !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('User inactive');
    if (user.organizationId !== payload.org) {
      throw new UnauthorizedException('Org mismatch');
    }
    return {
      userId: user.id,
      organizationId: user.organizationId,
      roleCode: user.roleCode,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
    };
  }
}



