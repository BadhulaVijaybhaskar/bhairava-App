import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlotStatus, Prisma, StatusChangeSource } from '@prisma/client';
import { applyStatusTransition, isTransitionAllowed } from '@bhairava/domain';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class PlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listByProject(actor: AuthPrincipal, projectId: string) {
    return this.prisma.plot.findMany({
      where: { organizationId: actor.organizationId, projectId },
      orderBy: { number: 'asc' },
    });
  }

  async create(
    actor: AuthPrincipal,
    body: {
      projectId: string;
      number: string;
      areaSqYd: number | string;
      ratePerSqYd?: number | string;
      totalPrice?: number | string;
      facing?: string;
      notes?: string;
    },
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: body.projectId, organizationId: actor.organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');
    const area = Number(body.areaSqYd);
    if (!(area > 0)) throw new BadRequestException('areaSqYd must be > 0');
    const rate = body.ratePerSqYd != null ? Number(body.ratePerSqYd) : undefined;
    const total =
      body.totalPrice != null
        ? Number(body.totalPrice)
        : rate != null
          ? area * rate
          : undefined;

    try {
      const plot = await this.prisma.plot.create({
        data: {
          organizationId: actor.organizationId,
          projectId: project.id,
          number: body.number.trim(),
          areaSqYd: new Prisma.Decimal(area),
          ratePerSqYd: rate != null ? new Prisma.Decimal(rate) : undefined,
          totalPrice: total != null ? new Prisma.Decimal(total) : undefined,
          status: PlotStatus.AVAILABLE,
          notes: body.notes,
          facing: body.facing as any,
        },
      });
      await this.audit.log({
        organizationId: actor.organizationId,
        actorId: actor.userId,
        action: 'plot.create',
        entityType: 'Plot',
        entityId: plot.id,
        metaJson: { number: plot.number, projectId: project.id },
      });
      return plot;
    } catch (err: any) {
      if (err?.code === 'P2002') throw new BadRequestException(`Plot number ${body.number} already exists`);
      throw err;
    }
  }

  /**
   * Apply a single allow-listed status transition (domain plot-transitions).
   * ADMIN_MANUAL requires reason; SALES_FLOW used by lifecycle endpoints.
   */
  async transitionStatus(
    actor: AuthPrincipal,
    plotId: string,
    body: { toStatus: string; reason?: string; source?: 'SALES_FLOW' | 'ADMIN_MANUAL' },
  ) {
    const plot = await this.prisma.plot.findFirst({
      where: { id: plotId, organizationId: actor.organizationId },
    });
    if (!plot) throw new NotFoundException('Plot not found');

    const source = body.source ?? 'ADMIN_MANUAL';
    const result = applyStatusTransition({
      from: plot.status,
      to: body.toStatus,
      reason: body.reason,
      actorId: actor.userId,
      source,
    });
    if (!result.ok) throw new BadRequestException(result.error);

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.plot.update({
        where: { id: plot.id },
        data: { status: result.to as PlotStatus },
      });
      await tx.plotStatusHistory.create({
        data: {
          plotId: plot.id,
          fromStatus: result.from as PlotStatus,
          toStatus: result.to as PlotStatus,
          reason: result.entry.reason,
          source: result.entry.source as StatusChangeSource,
          actorId: actor.userId,
        },
      });
      return row;
    });

    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'plot.status',
      entityType: 'Plot',
      entityId: plot.id,
      metaJson: { from: result.from, to: result.to, source },
    });
    return updated;
  }

  /** Walk multi-hop path for sales lifecycle (e.g. BOOKED → … → REGISTERED). */
  async advanceTo(
    actor: AuthPrincipal,
    plotId: string,
    target: PlotStatus,
    reason: string,
  ) {
    const plot = await this.prisma.plot.findFirst({
      where: { id: plotId, organizationId: actor.organizationId },
    });
    if (!plot) throw new NotFoundException('Plot not found');
    if (plot.status === target) return plot;

    const path = this.findPath(plot.status as PlotStatus, target);
    if (!path) {
      throw new BadRequestException(`No allow-listed path from ${plot.status} to ${target}`);
    }
    let current = plot;
    for (const step of path) {
      current = await this.transitionStatus(actor, current.id, {
        toStatus: step,
        reason,
        source: 'SALES_FLOW',
      });
    }
    return current;
  }

  private findPath(from: PlotStatus, to: PlotStatus): PlotStatus[] | null {
    if (from === to) return [];
    // BFS over allow-list
    const queue: Array<{ node: PlotStatus; path: PlotStatus[] }> = [{ node: from, path: [] }];
    const seen = new Set<string>([from]);
    while (queue.length) {
      const cur = queue.shift()!;
      for (const next of Object.values(PlotStatus)) {
        if (seen.has(next)) continue;
        if (!isTransitionAllowed(cur.node, next)) continue;
        const path = [...cur.path, next as PlotStatus];
        if (next === to) return path;
        seen.add(next);
        queue.push({ node: next as PlotStatus, path });
      }
    }
    return null;
  }
}
