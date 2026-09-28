import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SiteVisitStatus } from '@prisma/client';
import { BHAIRAVA_DIRECT_CODE, resolveSiteVisitAssignee } from '@bhairava/domain';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GoogleAuthService } from '../auth/google-auth.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class VisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly googleAuth: GoogleAuthService,
  ) {}

  async list(actor: AuthPrincipal, q: { projectId?: string } = {}) {
    const where: Prisma.SiteVisitWhereInput = { organizationId: actor.organizationId };
    if (q.projectId) where.projectId = q.projectId;
    if (actor.roleCode === 'AGENT') {
      const agent = await this.prisma.agentProfile.findFirst({ where: { userId: actor.userId } });
      if (!agent) return [];
      where.agentId = agent.id;
    }
    if (actor.roleCode === 'CUSTOMER') {
      const customer = await this.prisma.customer.findFirst({ where: { userId: actor.userId } });
      if (!customer) return [];
      where.customerId = customer.id;
    }
    return this.prisma.siteVisit.findMany({ where, orderBy: { scheduledAt: 'desc' } });
  }

  async create(actor: AuthPrincipal, body: {
    projectId: string; scheduledAt: string; leadId?: string; customerId?: string;
    agentId?: string; notes?: string;
  }) {
    const project = await this.prisma.project.findFirst({
      where: { id: body.projectId, organizationId: actor.organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');
    let agentId = body.agentId;
    if (actor.roleCode === 'AGENT') {
      const agent = await this.prisma.agentProfile.findFirst({ where: { userId: actor.userId } });
      agentId = agent?.id;
    }
    return this.prisma.siteVisit.create({
      data: {
        organizationId: actor.organizationId,
        projectId: body.projectId,
        scheduledAt: new Date(body.scheduledAt),
        leadId: body.leadId,
        customerId: body.customerId,
        agentId,
        notes: body.notes,
        status: SiteVisitStatus.SCHEDULED,
      },
    });
  }

  /**
   * Customer-initiated site visit request.
   * Assign to primary sales owner if active, else Bhairava Direct.
   */
  async request(actor: AuthPrincipal, body: {
    projectId: string;
    scheduledAt: string;
    notes?: string;
  }) {
    if (actor.roleCode !== 'CUSTOMER') {
      throw new ForbiddenException('Customer site-visit request only');
    }
    const customer = await this.prisma.customer.findFirst({
      where: { userId: actor.userId, organizationId: actor.organizationId },
      include: { agent: true },
    });
    if (!customer) throw new NotFoundException('Complete your profile before requesting a visit');

    const project = await this.prisma.project.findFirst({
      where: { id: body.projectId, organizationId: actor.organizationId, customerListed: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const directId = await this.googleAuth.ensureBhairavaDirect(actor.organizationId);
    const routing = resolveSiteVisitAssignee({
      primaryAgent: customer.agent
        ? { id: customer.agent.id, status: customer.agent.status, code: customer.agent.code }
        : null,
      bhairavaDirectAgentId: directId,
    });

    const visit = await this.prisma.siteVisit.create({
      data: {
        organizationId: actor.organizationId,
        projectId: body.projectId,
        customerId: customer.id,
        agentId: routing.agentId,
        scheduledAt: new Date(body.scheduledAt),
        notes: body.notes,
        status: SiteVisitStatus.SCHEDULED,
      },
    });

    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'assignment.site_visit.route',
      entityType: 'SiteVisit',
      entityId: visit.id,
      metaJson: {
        reason: routing.reason,
        agentId: routing.agentId,
        primaryAgentId: customer.agentId,
        bhairavaDirect: routing.reason === 'BHAIRAVA_DIRECT',
        code: routing.reason === 'BHAIRAVA_DIRECT' ? BHAIRAVA_DIRECT_CODE : customer.agent?.code,
      },
    });

    return {
      ...visit,
      assignmentReason: routing.reason,
    };
  }

  async updateStatus(actor: AuthPrincipal, id: string, status: string, notes?: string) {
    const where: Prisma.SiteVisitWhereInput = { id, organizationId: actor.organizationId };
    if (actor.roleCode === 'AGENT') {
      const agent = await this.prisma.agentProfile.findFirst({
        where: { userId: actor.userId, organizationId: actor.organizationId },
      });
      if (!agent) throw new NotFoundException('Visit not found');
      if (!agent.allAgentsAccess) where.agentId = agent.id;
    }
    const visit = await this.prisma.siteVisit.findFirst({ where });
    if (!visit) throw new NotFoundException('Visit not found');
    return this.prisma.siteVisit.update({
      where: { id },
      data: { status: status as SiteVisitStatus, notes: notes ?? visit.notes },
    });
  }
}
