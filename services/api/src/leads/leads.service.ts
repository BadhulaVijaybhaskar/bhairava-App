import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeadStage, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: AuthPrincipal, q: { projectId?: string } = {}) {
    const where: Prisma.LeadWhereInput = { organizationId: actor.organizationId };
    if (q.projectId) where.projectId = q.projectId;
    if (actor.roleCode === 'AGENT') {
      const agent = await this.prisma.agentProfile.findFirst({ where: { userId: actor.userId } });
      if (!agent) return [];
      where.agentId = agent.id;
    }
    return this.prisma.lead.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, projectId: true, name: true, phone: true, email: true,
        stage: true, source: true, agentId: true, customerId: true,
        notes: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async create(actor: AuthPrincipal, body: {
    projectId: string; name: string; phone?: string; email?: string;
    source?: string; notes?: string; customerId?: string; agentId?: string;
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
    return this.prisma.lead.create({
      data: {
        organizationId: actor.organizationId,
        projectId: body.projectId,
        name: body.name,
        phone: body.phone,
        email: body.email,
        source: body.source,
        notes: body.notes,
        customerId: body.customerId,
        agentId,
        stage: LeadStage.NEW,
      },
    });
  }

  async updateStage(actor: AuthPrincipal, id: string, stage: string, notes?: string) {
    const where: Prisma.LeadWhereInput = { id, organizationId: actor.organizationId };
    if (actor.roleCode === 'AGENT') {
      const agent = await this.prisma.agentProfile.findFirst({
        where: { userId: actor.userId, organizationId: actor.organizationId },
      });
      if (!agent) throw new NotFoundException('Lead not found');
      if (!agent.allAgentsAccess) where.agentId = agent.id;
    }
    const lead = await this.prisma.lead.findFirst({ where });
    if (!lead) throw new NotFoundException('Lead not found');
    if (!(Object.values(LeadStage) as string[]).includes(stage)) {
      throw new BadRequestException('Invalid stage');
    }
    const history = Array.isArray(lead.stageHistoryJson) ? (lead.stageHistoryJson as object[]) : [];
    return this.prisma.lead.update({
      where: { id },
      data: {
        stage: stage as LeadStage,
        notes: notes ?? lead.notes,
        stageHistoryJson: [
          ...history,
          { from: lead.stage, to: stage, at: new Date().toISOString(), by: actor.userId },
        ] as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
