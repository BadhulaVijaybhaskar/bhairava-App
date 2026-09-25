import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AmenityStatus, Prisma, ProjectLifecycle } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  list(actor: AuthPrincipal, q: { lifecycleStatus?: string } = {}) {
    const where: Prisma.ProjectWhereInput = { organizationId: actor.organizationId };
    if (q.lifecycleStatus) where.lifecycleStatus = q.lifecycleStatus as ProjectLifecycle;
    if (actor.roleCode === 'AGENT') where.agentVisible = true;
    if (actor.roleCode === 'CUSTOMER') where.customerListed = true;
    return this.prisma.project.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, code: true, city: true, state: true, location: true,
        lifecycleStatus: true, agentVisible: true, customerListed: true, resaleAvailable: true,
        coverImageKey: true, createdAt: true, updatedAt: true,
        _count: { select: { plots: true } },
      },
    });
  }

  async get(actor: AuthPrincipal, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId: actor.organizationId },
      include: {
        layouts: { select: { id: true, name: true, imageKey: true, widthPx: true, heightPx: true, metaJson: true } },
        plotTypes: true,
        pricingRules: true,
        amenities: { orderBy: { name: 'asc' } },
        phases: { orderBy: { sortOrder: 'asc' } },
        blocks: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { plots: true, leads: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (actor.roleCode === 'AGENT' && !project.agentVisible) throw new NotFoundException('Project not found');
    if (actor.roleCode === 'CUSTOMER' && !project.customerListed) throw new NotFoundException('Project not found');
    return {
      ...project,
      plotTypes: project.plotTypes.map((pt) => ({
        ...pt,
        areaSqYd: pt.areaSqYd?.toString?.() ?? String(pt.areaSqYd),
        lengthFt: pt.lengthFt?.toString?.() ?? null,
        widthFt: pt.widthFt?.toString?.() ?? null,
      })),
      pricingRules: project.pricingRules
        ? {
            ...project.pricingRules,
            baseRatePerSqYd: project.pricingRules.baseRatePerSqYd.toString(),
          }
        : null,
    };
  }

  async create(actor: AuthPrincipal, body: { name: string; code: string; city?: string; state?: string; location?: string; description?: string }) {
    try {
      return await this.prisma.project.create({
        data: {
          organizationId: actor.organizationId,
          name: body.name,
          code: body.code,
          city: body.city,
          state: body.state,
          location: body.location,
          description: body.description,
          lifecycleStatus: ProjectLifecycle.DRAFT,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Project code already exists');
      }
      throw e;
    }
  }

  async update(actor: AuthPrincipal, id: string, body: Record<string, unknown>) {
    await this.get(actor, id);
    const data: Prisma.ProjectUpdateInput = {};
    for (const k of ['name', 'city', 'state', 'location', 'description', 'address', 'reraNumber', 'projectType', 'pincode'] as const) {
      if (body[k] !== undefined) (data as any)[k] = body[k];
    }
    if (body.agentVisible !== undefined) data.agentVisible = Boolean(body.agentVisible);
    if (body.customerListed !== undefined) data.customerListed = Boolean(body.customerListed);
    if (body.resaleAvailable !== undefined) data.resaleAvailable = Boolean(body.resaleAvailable);
    if (body.lifecycleStatus !== undefined) data.lifecycleStatus = body.lifecycleStatus as ProjectLifecycle;
    if (body.settingsJson !== undefined) data.settingsJson = body.settingsJson as Prisma.InputJsonValue;
    return this.prisma.project.update({ where: { id }, data });
  }

  async setupBundle(actor: AuthPrincipal, id: string) {
    const project = await this.get(actor, id);
    return {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        city: project.city,
        state: project.state,
        location: project.location,
        address: project.address,
        description: project.description,
        reraNumber: project.reraNumber,
        projectType: project.projectType,
        pincode: project.pincode,
        lifecycleStatus: project.lifecycleStatus,
        agentVisible: project.agentVisible,
        customerListed: project.customerListed,
        resaleAvailable: project.resaleAvailable,
        settingsJson: project.settingsJson,
      },
      plotTypes: project.plotTypes,
      pricingRules: project.pricingRules,
      amenities: project.amenities,
      phases: project.phases,
      blocks: project.blocks,
      layouts: project.layouts,
    };
  }

  async addPlotType(
    actor: AuthPrincipal,
    projectId: string,
    body: { name: string; code?: string; areaSqYd: string; lengthFt?: string; widthFt?: string; category?: string },
  ) {
    await this.get(actor, projectId);
    const row = await this.prisma.plotType.create({
      data: {
        organizationId: actor.organizationId,
        projectId,
        name: body.name,
        code: body.code,
        areaSqYd: new Prisma.Decimal(body.areaSqYd),
        lengthFt: body.lengthFt ? new Prisma.Decimal(body.lengthFt) : null,
        widthFt: body.widthFt ? new Prisma.Decimal(body.widthFt) : null,
        category: body.category,
      },
    });
    return {
      ...row,
      areaSqYd: row.areaSqYd.toString(),
      lengthFt: row.lengthFt?.toString() ?? null,
      widthFt: row.widthFt?.toString() ?? null,
    };
  }

  async removePlotType(actor: AuthPrincipal, projectId: string, plotTypeId: string) {
    await this.get(actor, projectId);
    const row = await this.prisma.plotType.findFirst({ where: { id: plotTypeId, projectId, organizationId: actor.organizationId } });
    if (!row) throw new NotFoundException('Plot type not found');
    await this.prisma.plotType.delete({ where: { id: plotTypeId } });
    return { ok: true };
  }

  async upsertPricing(actor: AuthPrincipal, projectId: string, body: { baseRatePerSqYd: string; rulesJson?: Record<string, unknown> }) {
    await this.get(actor, projectId);
    const row = await this.prisma.pricingRule.upsert({
      where: { projectId },
      create: {
        organizationId: actor.organizationId,
        projectId,
        baseRatePerSqYd: new Prisma.Decimal(body.baseRatePerSqYd),
        rulesJson: (body.rulesJson ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        baseRatePerSqYd: new Prisma.Decimal(body.baseRatePerSqYd),
        rulesJson: (body.rulesJson ?? {}) as Prisma.InputJsonValue,
      },
    });
    return { ...row, baseRatePerSqYd: row.baseRatePerSqYd.toString() };
  }

  async addAmenity(
    actor: AuthPrincipal,
    projectId: string,
    body: { name: string; groupName?: string; description?: string; status?: string; completionPct?: number },
  ) {
    await this.get(actor, projectId);
    const status = (body.status && (Object.values(AmenityStatus) as string[]).includes(body.status)
      ? body.status
      : AmenityStatus.PLANNED) as AmenityStatus;
    return this.prisma.amenity.create({
      data: {
        organizationId: actor.organizationId,
        projectId,
        name: body.name,
        groupName: body.groupName,
        description: body.description,
        status,
        completionPct: body.completionPct ?? 0,
      },
    });
  }

  async removeAmenity(actor: AuthPrincipal, projectId: string, amenityId: string) {
    await this.get(actor, projectId);
    const row = await this.prisma.amenity.findFirst({ where: { id: amenityId, projectId, organizationId: actor.organizationId } });
    if (!row) throw new NotFoundException('Amenity not found');
    await this.prisma.amenity.delete({ where: { id: amenityId } });
    return { ok: true };
  }


  async addPhase(actor: AuthPrincipal, projectId: string, body: { name: string; status?: string; sortOrder?: number; startDate?: string; endDate?: string }) {
    await this.get(actor, projectId);
    const count = await this.prisma.phase.count({ where: { projectId } });
    return this.prisma.phase.create({
      data: {
        organizationId: actor.organizationId,
        projectId,
        name: body.name,
        status: body.status || 'Planned',
        sortOrder: body.sortOrder ?? count,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });
  }

  async updatePhase(actor: AuthPrincipal, projectId: string, phaseId: string, body: { name?: string; status?: string; sortOrder?: number; startDate?: string; endDate?: string }) {
    await this.get(actor, projectId);
    const row = await this.prisma.phase.findFirst({ where: { id: phaseId, projectId, organizationId: actor.organizationId } });
    if (!row) throw new NotFoundException('Phase not found');
    return this.prisma.phase.update({
      where: { id: phaseId },
      data: {
        name: body.name ?? row.name,
        status: body.status ?? row.status,
        sortOrder: body.sortOrder ?? row.sortOrder,
        startDate: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : row.startDate,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : row.endDate,
      },
    });
  }

  async removePhase(actor: AuthPrincipal, projectId: string, phaseId: string) {
    await this.get(actor, projectId);
    const row = await this.prisma.phase.findFirst({ where: { id: phaseId, projectId, organizationId: actor.organizationId } });
    if (!row) throw new NotFoundException('Phase not found');
    await this.prisma.phase.delete({ where: { id: phaseId } });
    return { ok: true };
  }

  async addBlock(actor: AuthPrincipal, projectId: string, body: { name: string; phaseId?: string; sortOrder?: number }) {
    await this.get(actor, projectId);
    const count = await this.prisma.block.count({ where: { projectId } });
    return this.prisma.block.create({
      data: {
        organizationId: actor.organizationId,
        projectId,
        phaseId: body.phaseId || null,
        name: body.name,
        sortOrder: body.sortOrder ?? count,
      },
    });
  }

  async updateBlock(actor: AuthPrincipal, projectId: string, blockId: string, body: { name?: string; phaseId?: string; sortOrder?: number }) {
    await this.get(actor, projectId);
    const row = await this.prisma.block.findFirst({ where: { id: blockId, projectId, organizationId: actor.organizationId } });
    if (!row) throw new NotFoundException('Block not found');
    return this.prisma.block.update({
      where: { id: blockId },
      data: {
        name: body.name ?? row.name,
        phaseId: body.phaseId !== undefined ? (body.phaseId || null) : row.phaseId,
        sortOrder: body.sortOrder ?? row.sortOrder,
      },
    });
  }

  async removeBlock(actor: AuthPrincipal, projectId: string, blockId: string) {
    await this.get(actor, projectId);
    const row = await this.prisma.block.findFirst({ where: { id: blockId, projectId, organizationId: actor.organizationId } });
    if (!row) throw new NotFoundException('Block not found');
    await this.prisma.block.delete({ where: { id: blockId } });
    return { ok: true };
  }

  async mediaList(actor: AuthPrincipal, projectId: string) {
    const project = await this.get(actor, projectId);
    const layouts = await this.prisma.layout.findMany({
      where: { projectId, organizationId: actor.organizationId },
      orderBy: { createdAt: 'desc' },
    });
    const settings = (project.settingsJson as Record<string, unknown>) || {};
    const gallery = Array.isArray(settings.gallery) ? settings.gallery : [];
    return {
      coverImageKey: project.coverImageKey,
      brochureKey: project.brochureKey,
      gallery,
      layouts: layouts.map((l) => ({
        id: l.id, name: l.name, imageKey: l.imageKey, widthPx: l.widthPx, heightPx: l.heightPx,
        metaJson: l.metaJson, createdAt: l.createdAt,
      })),
    };
  }

  async mediaUpload(
    actor: AuthPrincipal,
    projectId: string,
    body: { kind: string; originalName: string; mimeType?: string; sizeBytes?: number; label?: string },
  ) {
    await this.get(actor, projectId);
    const kind = body.kind || 'gallery';
    this.storage.validateUploadMeta(body.mimeType, body.sizeBytes);
    const key = this.storage.buildKey(actor.organizationId, `projects/${projectId}/${kind}`, body.originalName);
    const upload = await this.storage.getUploadUrl(key, body.mimeType || 'application/octet-stream', body.sizeBytes);

    if (kind === 'cover') {
      await this.prisma.project.update({ where: { id: projectId }, data: { coverImageKey: key } });
    } else if (kind === 'brochure') {
      await this.prisma.project.update({ where: { id: projectId }, data: { brochureKey: key } });
    } else {
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      const settings = ((project?.settingsJson as Record<string, unknown>) || {});
      const gallery = Array.isArray(settings.gallery) ? [...(settings.gallery as object[])] : [];
      gallery.push({
        key,
        label: body.label || body.originalName,
        mimeType: body.mimeType || null,
        sizeBytes: body.sizeBytes ?? null,
        visibility: 'AGENT_VISIBLE',
        createdAt: new Date().toISOString(),
      });
      settings.gallery = gallery;
      await this.prisma.project.update({
        where: { id: projectId },
        data: { settingsJson: settings as Prisma.InputJsonValue },
      });
    }

    return { key, kind, upload };
  }

}
