import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SiteVisitStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class VisitsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: AuthPrincipal, q: { projectId?: string } = {}) {
    const where: Prisma.SiteVisitWhereInput = { organizationId: actor.organizationId };
    if (q.projectId) where.projectId = q.projectId;
    if (actor.roleCode === 'AGENT') {
      const agent = await this.prisma.agentProfile.findFirst({ where: { userId: actor.userId } });
      if (!agent) return [];
      where.agentId = agent.id;
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
