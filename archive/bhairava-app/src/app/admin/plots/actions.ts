"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AreaUnit, Facing, PlotStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { canTransitionPlot } from "@/lib/plot-status";

const AREA_UNITS: AreaUnit[] = ["SQ_YARD", "SQ_FT", "SQ_M", "ACRE", "CENT"];
const FACINGS: Facing[] = [
  "NORTH",
  "SOUTH",
  "EAST",
  "WEST",
  "NORTH_EAST",
  "NORTH_WEST",
  "SOUTH_EAST",
  "SOUTH_WEST",
];
const STATUSES: PlotStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "BOOKED",
  "UNDER_DOCUMENTATION",
  "SOLD",
  "REGISTERED",
  "RESALE_AVAILABLE",
  "BLOCKED",
  "CANCELLED",
];

function parsePricing(formData: FormData) {
  const area = Number(formData.get("area") || 0);
  const areaUnitRaw = String(formData.get("areaUnit") || "SQ_YARD");
  const areaUnit = AREA_UNITS.includes(areaUnitRaw as AreaUnit)
    ? (areaUnitRaw as AreaUnit)
    : "SQ_YARD";
  const facingRaw = String(formData.get("facing") || "");
  const facing = FACINGS.includes(facingRaw as Facing) ? (facingRaw as Facing) : null;
  const pricePerSqYard = Number(formData.get("pricePerSqYard") || 0);
  const additionalCharges = Number(formData.get("additionalCharges") || 0);
  const statusRaw = String(formData.get("status") || "AVAILABLE");
  const status = STATUSES.includes(statusRaw as PlotStatus)
    ? (statusRaw as PlotStatus)
    : "AVAILABLE";
  const blockName = String(formData.get("blockName") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  let basePrice = Number(formData.get("basePrice") || 0);
  if ((!basePrice || basePrice <= 0) && area > 0 && pricePerSqYard > 0) {
    basePrice = area * pricePerSqYard;
  }
  const totalPrice = Math.max(basePrice + additionalCharges, 0);

  return {
    area,
    areaUnit,
    facing,
    pricePerSqYard: pricePerSqYard > 0 ? pricePerSqYard : null,
    basePrice,
    additionalCharges: Math.max(additionalCharges, 0),
    totalPrice,
    status,
    blockName,
    notes,
  };
}

async function resolveBlockId(
  orgId: string,
  projectId: string,
  blockName: string,
): Promise<string | null> {
  if (!blockName) return null;
  const existing = await prisma.projectBlock.findFirst({
    where: { projectId, name: blockName, deletedAt: null },
  });
  if (existing) return existing.id;
  const created = await prisma.projectBlock.create({
    data: {
      organizationId: orgId,
      projectId,
      name: blockName,
    },
  });
  return created.id;
}

export async function createPlot(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectId = String(formData.get("projectId") || "");
  const mode = String(formData.get("mode") || "single");
  const pricing = parsePricing(formData);

  if (!projectId) redirect("/admin/projects");

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: session.orgId, deletedAt: null },
  });
  if (!project) redirect("/admin/projects");

  if (!(pricing.area > 0) || !(pricing.basePrice >= 0)) {
    redirect(`/admin/projects/${projectId}/plots/new?error=pricing`);
  }

  const blockId = await resolveBlockId(session.orgId, projectId, pricing.blockName);

  if (mode === "bulk") {
    const prefix = String(formData.get("prefix") || "").trim();
    const start = Number(formData.get("startNumber") || 1);
    const count = Number(formData.get("count") || 0);

    if (!Number.isInteger(start) || start < 1 || !Number.isInteger(count) || count < 1 || count > 500) {
      redirect(`/admin/projects/${projectId}/plots/new?error=bulk`);
    }

    const plotNumbers = Array.from({ length: count }, (_, i) => {
      const n = start + i;
      return prefix ? `${prefix}${n}` : String(n);
    });

    const dupes = await prisma.plot.findMany({
      where: {
        projectId,
        deletedAt: null,
        plotNumber: { in: plotNumbers },
      },
      select: { plotNumber: true },
    });
    if (dupes.length > 0) {
      redirect(`/admin/projects/${projectId}/plots/new?error=duplicate`);
    }

    await prisma.plot.createMany({
      data: plotNumbers.map((plotNumber) => ({
        organizationId: session.orgId,
        projectId,
        blockId,
        plotNumber,
        area: pricing.area,
        areaUnit: pricing.areaUnit,
        facing: pricing.facing,
        pricePerSqYard: pricing.pricePerSqYard,
        basePrice: pricing.basePrice,
        additionalCharges: pricing.additionalCharges,
        totalPrice: pricing.totalPrice,
        status: pricing.status,
        notes: pricing.notes || null,
        createdBy: session.sub,
        updatedBy: session.sub,
      })),
    });

    const plotCount = await prisma.plot.count({
      where: { projectId, deletedAt: null },
    });
    if (plotCount > project.totalPlots) {
      await prisma.project.update({
        where: { id: projectId },
        data: { totalPlots: plotCount },
      });
    }

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath("/admin/plots");
    redirect(`/admin/projects/${projectId}?created=${count}`);
  }

  const plotNumber = String(formData.get("plotNumber") || "").trim();
  if (!plotNumber) {
    redirect(`/admin/projects/${projectId}/plots/new?error=required`);
  }

  const existing = await prisma.plot.findFirst({
    where: { projectId, plotNumber, deletedAt: null },
  });
  if (existing) {
    redirect(`/admin/projects/${projectId}/plots/new?error=duplicate`);
  }

  const plot = await prisma.plot.create({
    data: {
      organizationId: session.orgId,
      projectId,
      blockId,
      plotNumber,
      area: pricing.area,
      areaUnit: pricing.areaUnit,
      facing: pricing.facing,
      pricePerSqYard: pricing.pricePerSqYard,
      basePrice: pricing.basePrice,
      additionalCharges: pricing.additionalCharges,
      totalPrice: pricing.totalPrice,
      status: pricing.status,
      notes: pricing.notes || null,
      createdBy: session.sub,
      updatedBy: session.sub,
    },
  });

  await prisma.plotStatusHistory.create({
    data: {
      organizationId: session.orgId,
      plotId: plot.id,
      fromStatus: null,
      toStatus: pricing.status,
      reason: "Plot created",
      changedBy: session.sub,
    },
  });

  const plotCount = await prisma.plot.count({
    where: { projectId, deletedAt: null },
  });
  if (plotCount > project.totalPlots) {
    await prisma.project.update({
      where: { id: projectId },
      data: { totalPlots: plotCount },
    });
  }

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/plots");
  redirect(`/admin/plots/${plot.id}?projectId=${projectId}&saved=1`);
}

export async function updatePlot(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = String(formData.get("id") || "");
  const plotNumber = String(formData.get("plotNumber") || "").trim();
  const pricing = parsePricing(formData);

  if (!id || !plotNumber) redirect("/admin/plots");
  if (!(pricing.area > 0)) {
    redirect(`/admin/plots/${id}?error=pricing`);
  }

  const plot = await prisma.plot.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
  });
  if (!plot) redirect("/admin/plots");

  const duplicate = await prisma.plot.findFirst({
    where: {
      projectId: plot.projectId,
      plotNumber,
      deletedAt: null,
      NOT: { id },
    },
  });
  if (duplicate) redirect(`/admin/plots/${id}?error=duplicate`);

  const blockId = await resolveBlockId(session.orgId, plot.projectId, pricing.blockName);
  const statusChanged = plot.status !== pricing.status;

  if (statusChanged && !canTransitionPlot(plot.status, pricing.status)) {
    redirect(`/admin/plots/${id}?error=status`);
  }

  await prisma.plot.update({
    where: { id },
    data: {
      plotNumber,
      blockId,
      area: pricing.area,
      areaUnit: pricing.areaUnit,
      facing: pricing.facing,
      pricePerSqYard: pricing.pricePerSqYard,
      basePrice: pricing.basePrice,
      additionalCharges: pricing.additionalCharges,
      totalPrice: pricing.totalPrice,
      status: pricing.status,
      notes: pricing.notes || null,
      updatedBy: session.sub,
    },
  });

  if (statusChanged) {
    await prisma.plotStatusHistory.create({
      data: {
        organizationId: session.orgId,
        plotId: id,
        fromStatus: plot.status,
        toStatus: pricing.status,
        reason: "Plot updated by admin",
        changedBy: session.sub,
      },
    });
    await writeAudit({
      organizationId: session.orgId,
      actorUserId: session.sub,
      action: "plot.status_change",
      entityType: "Plot",
      entityId: id,
      metadata: { from: plot.status, to: pricing.status },
    });
  }

  revalidatePath(`/admin/plots/${id}`);
  revalidatePath(`/admin/projects/${plot.projectId}`);
  revalidatePath("/admin/plots");
  redirect(`/admin/plots/${id}?projectId=${plot.projectId}&saved=1`);
}

export async function deletePlot(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = String(formData.get("id") || "");
  if (!id) redirect("/admin/plots");

  const plot = await prisma.plot.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
    include: {
      bookings: {
        where: { deletedAt: null, bookingStatus: { not: "CANCELLED" } },
        take: 1,
        select: { id: true },
      },
    },
  });
  if (!plot) redirect("/admin/plots");

  if (plot.bookings.length > 0) {
    redirect(`/admin/plots/${id}?projectId=${plot.projectId}&error=booked`);
  }

  await prisma.plot.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      updatedBy: session.sub,
    },
  });

  revalidatePath(`/admin/projects/${plot.projectId}`);
  revalidatePath("/admin/plots");
  redirect(`/admin/projects/${plot.projectId}?deleted=1`);
}
