import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AttributionSource } from '@prisma/client';
import {
  decidePhoneStealAttempt,
  BHAIRAVA_DIRECT_CODE,
  maskAadhaar,
  maskPan,
  normalizePhoneIn,
  projectCustomerPii,
} from '@bhairava/domain';
import { PrismaService } from '../prisma/prisma.service';
import { PiiService } from '../pii/pii.service';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth.types';
import { GoogleAuthService } from '../auth/google-auth.service';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiService,
    private readonly audit: AuditService,
    private readonly googleAuth: GoogleAuthService,
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

  private canReveal(actor: AuthPrincipal) {
    return ['FOUNDER', 'ADMINISTRATOR', 'FINANCE'].includes(actor.roleCode);
  }

  private async agentIdFor(userId: string) {
    const agent = await this.prisma.agentProfile.findFirst({ where: { userId } });
    return agent?.id ?? null;
  }

  private project(
    actor: AuthPrincipal,
    c: {
      id: string;
      name: string;
      phone: string;
      email: string | null;
      city?: string | null;
      address?: string | null;
      kycStatus?: string | null;
      agentId?: string | null;
      userId?: string | null;
      panEncrypted?: string | null;
      aadhaarEncrypted?: string | null;
      createdAt?: Date;
    },
    opts: { ownsRelationship: boolean; isSelf: boolean },
  ) {
    const panPlain = c.panEncrypted ? this.pii.decrypt(c.panEncrypted) : null;
    const aadhaarPlain = c.aadhaarEncrypted ? this.pii.decrypt(c.aadhaarEncrypted) : null;
    const projected = projectCustomerPii(
      {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        city: c.city ?? null,
        address: c.address ?? null,
        kycStatus: c.kycStatus ?? null,
        pan: panPlain,
        aadhaar: aadhaarPlain,
      },
      {
        role: this.roleLabel(actor),
        ownsRelationship: opts.ownsRelationship,
        isSelf: opts.isSelf,
      },
    );
    return {
      id: projected.id,
      name: projected.name,
      phone: projected.phone,
      email: projected.email,
      city: projected.city,
      address: projected.address,
      kycStatus: projected.kycStatus,
      redacted: projected.redacted,
      reason: projected.reason,
      panMasked: panPlain ? maskPan(panPlain) : null,
      aadhaarMasked: aadhaarPlain ? maskAadhaar(aadhaarPlain) : null,
      hasPan: Boolean(c.panEncrypted),
      hasAadhaar: Boolean(c.aadhaarEncrypted),
      agentId: c.agentId ?? null,
      userId: c.userId ?? null,
      createdAt: c.createdAt,
    };
  }

  async list(actor: AuthPrincipal) {
    const where: { organizationId: string; agentId?: string; userId?: string } = {
      organizationId: actor.organizationId,
    };
    let agentId: string | null = null;
    if (actor.roleCode === 'AGENT') {
      agentId = await this.agentIdFor(actor.userId);
      if (!agentId) return [];
      where.agentId = agentId;
    }
    if (actor.roleCode === 'CUSTOMER') where.userId = actor.userId;

    const rows = await this.prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        city: true,
        address: true,
        agentId: true,
        userId: true,
        kycStatus: true,
        createdAt: true,
        panEncrypted: true,
        aadhaarEncrypted: true,
      },
    });

    return rows.map((c) =>
      this.project(actor, c, {
        ownsRelationship: actor.roleCode !== 'AGENT' || c.agentId === agentId,
        isSelf: c.userId === actor.userId,
      }),
    );
  }

  async get(actor: AuthPrincipal, id: string) {
    const c = await this.prisma.customer.findFirst({
      where: { id, organizationId: actor.organizationId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        city: true,
        address: true,
        state: true,
        pincode: true,
        agentId: true,
        userId: true,
        kycStatus: true,
        nomineeName: true,
        source: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        panEncrypted: true,
        aadhaarEncrypted: true,
      },
    });
    if (!c) throw new NotFoundException('Customer not found');
    if (actor.roleCode === 'CUSTOMER' && c.userId !== actor.userId) {
      throw new NotFoundException('Customer not found');
    }
    if (actor.roleCode === 'AGENT') {
      const myAgentId = await this.agentIdFor(actor.userId);
      if (!myAgentId || c.agentId !== myAgentId) throw new NotFoundException('Customer not found');
    }
    const projected = this.project(actor, c, {
      ownsRelationship: true,
      isSelf: c.userId === actor.userId,
    });
    return {
      ...projected,
      state: c.state,
      pincode: c.pincode,
      nomineeName: c.nomineeName,
      source: c.source,
      notes: c.notes,
      updatedAt: c.updatedAt,
    };
  }

  async create(
    actor: AuthPrincipal,
    body: {
      name: string;
      phone: string;
      email?: string;
      city?: string;
      address?: string;
      state?: string;
      pincode?: string;
      kycStatus?: string;
      agentId?: string;
      notes?: string;
      source?: string;
      pan?: string;
      aadhaar?: string;
    },
  ) {
    let agentId = body.agentId;
    if (actor.roleCode === 'AGENT') {
      agentId = (await this.agentIdFor(actor.userId)) ?? undefined;
    }
    const phoneNormalized = normalizePhoneIn(body.phone);
    if (!phoneNormalized) {
      throw new BadRequestException('Valid Indian mobile is required');
    }

    if (actor.roleCode === 'AGENT' && agentId) {
      const existing = await this.prisma.customer.findFirst({
        where: { organizationId: actor.organizationId, phoneNormalized },
        select: { id: true, agentId: true },
      });
      const decision = decidePhoneStealAttempt({
        normalizedMobile: phoneNormalized,
        existingCustomer: existing,
        actingAgentId: agentId,
      });
      if (!decision.ok) {
        await this.audit.log({
          organizationId: actor.organizationId,
          actorId: actor.userId,
          action: 'assignment.steal_attempt',
          entityType: 'Customer',
          entityId: existing?.id,
          metaJson: { via: 'customers.create', code: decision.code },
        });
        throw new ConflictException(decision.message);
      }
      if (decision.ok && decision.action === 'same_agent' && existing) {
        return this.get(actor, existing.id);
      }
    }

    // Ensure Direct desk exists for org (idempotent) when admin creates unassigned.
    if (!agentId) {
      agentId = await this.googleAuth.ensureBhairavaDirect(actor.organizationId);
    }

    const panEncrypted = body.pan ? this.pii.encrypt(body.pan) : null;
    const aadhaarEncrypted = body.aadhaar ? this.pii.encrypt(body.aadhaar) : null;
    const attributionSource =
      actor.roleCode === 'AGENT'
        ? AttributionSource.OTHER
        : body.source === 'DIRECT_APP'
          ? AttributionSource.DIRECT_APP
          : AttributionSource.ADMIN_CREATED;

    const created = await this.prisma.customer.create({
      data: {
        organizationId: actor.organizationId,
        name: body.name,
        phone: phoneNormalized,
        phoneNormalized,
        email: body.email,
        city: body.city,
        address: body.address,
        state: body.state,
        pincode: body.pincode,
        kycStatus: body.kycStatus,
        source: body.source ?? attributionSource,
        attributionSource,
        invitedByAgentId: actor.roleCode === 'AGENT' ? agentId : null,
        agentId,
        notes: body.notes,
        panEncrypted,
        aadhaarEncrypted,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        city: true,
        address: true,
        agentId: true,
        userId: true,
        kycStatus: true,
        createdAt: true,
        panEncrypted: true,
        aadhaarEncrypted: true,
      },
    });
    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'customer.create',
      entityType: 'Customer',
      entityId: created.id,
      metaJson: {
        hasPan: Boolean(panEncrypted),
        hasAadhaar: Boolean(aadhaarEncrypted),
        attributionSource,
        agentId,
        bhairavaDirect: created.agentId
          ? (
              await this.prisma.agentProfile.findFirst({
                where: { id: created.agentId, code: BHAIRAVA_DIRECT_CODE },
                select: { id: true },
              })
            )?.id === created.agentId
          : false,
      },
    });
    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'assignment.customer.sales_owner',
      entityType: 'Customer',
      entityId: created.id,
      metaJson: { agentId, attributionSource },
    });
    return this.project(actor, created, { ownsRelationship: true, isSelf: false });
  }

  async revealPii(actor: AuthPrincipal, id: string, field: 'pan' | 'aadhaar') {
    if (!this.canReveal(actor)) throw new ForbiddenException('PII reveal not permitted for role');
    const c = await this.prisma.customer.findFirst({
      where: { id, organizationId: actor.organizationId },
      select: { id: true, panEncrypted: true, aadhaarEncrypted: true },
    });
    if (!c) throw new NotFoundException('Customer not found');
    const cipher = field === 'pan' ? c.panEncrypted : c.aadhaarEncrypted;
    const value = this.pii.decrypt(cipher);
    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'pii.reveal',
      entityType: 'Customer',
      entityId: c.id,
      metaJson: { field, revealed: true },
    });
    return { customerId: c.id, field, value };
  }
}