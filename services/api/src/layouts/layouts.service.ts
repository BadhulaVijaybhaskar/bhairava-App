import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildMasterPlanMeta,
  linkPolygonToPlot,
  relinkPolygon,
  unlinkPolygonFromPlot,
  validatePolygon,
} from '@bhairava/domain';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class LayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  list(actor: AuthPrincipal, projectId: string) {
    return this.prisma.layout.findMany({
      where: { organizationId: actor.organizationId, projectId },
      orderBy: { name: 'asc' },
    });
  }

  async get(actor: AuthPrincipal, id: string) {
    const row = await this.prisma.layout.findFirst({
      where: { id, organizationId: actor.organizationId },
      include: {
        plots: {
          select: {
            id: true, number: true, status: true, polygonJson: true,
            areaSqYd: true, totalPrice: true, facing: true, corner: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Layout not found');
    return row;
  }

  async create(actor: AuthPrincipal, body: {
    projectId: string; name: string;
    originalName?: string; mimeType?: string; sizeBytes?: number;
    widthPx?: number; heightPx?: number;
  }) {
    const project = await this.prisma.project.findFirst({
      where: { id: body.projectId, organizationId: actor.organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    let imageKey: string | undefined;
    let metaJson: Prisma.InputJsonValue | undefined;
    if (body.originalName) {
      imageKey = this.storage.buildKey(actor.organizationId, `layouts/${body.projectId}`, body.originalName);
      metaJson = buildMasterPlanMeta({
        originalName: body.originalName,
        mimeType: body.mimeType || 'image/png',
        sizeBytes: body.sizeBytes || 0,
        widthPx: body.widthPx,
        heightPx: body.heightPx,
      }) as unknown as Prisma.InputJsonValue;
    }

    const layout = await this.prisma.layout.create({
      data: {
        organizationId: actor.organizationId,
        projectId: body.projectId,
        name: body.name,
        imageKey,
        widthPx: body.widthPx,
        heightPx: body.heightPx,
        metaJson,
      },
    });

    let upload: Awaited<ReturnType<StorageService['getUploadUrl']>> | undefined;
    if (imageKey) {
      upload = await this.storage.getUploadUrl(imageKey, body.mimeType || 'image/png');
    }
    return { layout, upload };
  }

  async setPolygon(actor: AuthPrincipal, plotId: string, body: {
    points: unknown; replaceExisting?: boolean; layoutId?: string;
  }) {
    const plot = await this.prisma.plot.findFirst({
      where: { id: plotId, organizationId: actor.organizationId },
    });
    if (!plot) throw new NotFoundException('Plot not found');

    const linked = linkPolygonToPlot({
      plot: { id: plot.id, number: plot.number, polygonJson: plot.polygonJson },
      points: body.points,
      replaceExisting: body.replaceExisting,
    });
    if (!linked.ok) throw new BadRequestException(linked.error);

    return this.prisma.plot.update({
      where: { id: plot.id },
      data: {
        polygonJson: linked.points as unknown as Prisma.InputJsonValue,
        ...(body.layoutId ? { layoutId: body.layoutId } : {}),
      },
      select: { id: true, number: true, polygonJson: true, layoutId: true, status: true },
    });
  }

  async clearPolygon(actor: AuthPrincipal, plotId: string) {
    const plot = await this.prisma.plot.findFirst({
      where: { id: plotId, organizationId: actor.organizationId },
    });
    if (!plot) throw new NotFoundException('Plot not found');
    const cleared = unlinkPolygonFromPlot();
    return this.prisma.plot.update({
      where: { id: plot.id },
      data: { polygonJson: cleared.points as unknown as Prisma.InputJsonValue },
      select: { id: true, number: true, polygonJson: true },
    });
  }

  async relink(actor: AuthPrincipal, body: { sourcePlotId: string; targetPlotId: string }) {
    const [source, target] = await Promise.all([
      this.prisma.plot.findFirst({ where: { id: body.sourcePlotId, organizationId: actor.organizationId } }),
      this.prisma.plot.findFirst({ where: { id: body.targetPlotId, organizationId: actor.organizationId } }),
    ]);
    if (!source || !target) throw new NotFoundException('Plot not found');
    const result = relinkPolygon({
      source: { id: source.id, number: source.number, polygonJson: source.polygonJson },
      target: { id: target.id, number: target.number, polygonJson: target.polygonJson },
    });
    if (!result.ok) throw new BadRequestException(result.error);

    await this.prisma.$transaction([
      this.prisma.plot.update({
        where: { id: source.id },
        data: { polygonJson: result.sourcePoints as unknown as Prisma.InputJsonValue },
      }),
      this.prisma.plot.update({
        where: { id: target.id },
        data: {
          polygonJson: result.targetPoints as unknown as Prisma.InputJsonValue,
          layoutId: source.layoutId ?? target.layoutId,
        },
      }),
    ]);
    return { ok: true, sourcePlotId: source.id, targetPlotId: target.id };
  }

  validateDraft(points: unknown) {
    return validatePolygon(points);
  }
}
