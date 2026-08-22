"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  expandSpecsToPlotData,
  parsePlotSpecs,
  plotSpecsFromForm,
  totalPlannedFromSpecs,
} from "@/lib/block-plot-specs";
import { prisma } from "@/lib/db";

function revalidateProject(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/plots");
  revalidatePath("/admin/dashboard");
}

export async function createBlock(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectId = String(formData.get("projectId") || "");
  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "").trim().toUpperCase();

  if (!projectId || !name) {
    redirect(`/admin/projects/${projectId || ""}?blockError=required`);
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: session.orgId, deletedAt: null },
  });
  if (!project) redirect("/admin/projects");

  const existing = await prisma.projectBlock.findFirst({
    where: { projectId, name, deletedAt: null },
  });
  if (existing) {
    redirect(`/admin/projects/${projectId}?blockError=duplicate`);
  }

  const block = await prisma.projectBlock.create({
    data: {
      organizationId: session.orgId,
      projectId,
      name,
      code: code || null,
      plannedPlots: 0,
      plotSpecs: [],
    },
  });

  revalidateProject(projectId);
  redirect(`/admin/projects/${projectId}/blocks/${block.id}`);
}

export async function updateBlock(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectId = String(formData.get("projectId") || "");
  const blockId = String(formData.get("blockId") || "");
  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "").trim().toUpperCase();

  if (!projectId || !blockId || !name) {
    redirect(`/admin/projects/${projectId}?blockError=required`);
  }

  const block = await prisma.projectBlock.findFirst({
    where: {
      id: blockId,
      projectId,
      organizationId: session.orgId,
      deletedAt: null,
    },
  });
  if (!block) redirect(`/admin/projects/${projectId}`);

  const duplicate = await prisma.projectBlock.findFirst({
    where: {
      projectId,
      name,
      deletedAt: null,
      NOT: { id: blockId },
    },
  });
  if (duplicate) {
    redirect(`/admin/projects/${projectId}?blockError=duplicate`);
  }

  await prisma.projectBlock.update({
    where: { id: blockId },
    data: {
      name,
      code: code || null,
    },
  });

  revalidateProject(projectId);
  redirect(`/admin/projects/${projectId}?blockSaved=1`);
}

export async function deleteBlock(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectId = String(formData.get("projectId") || "");
  const blockId = String(formData.get("blockId") || "");

  const block = await prisma.projectBlock.findFirst({
    where: {
      id: blockId,
      projectId,
      organizationId: session.orgId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          plots: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!block) redirect(`/admin/projects/${projectId}`);

  if (block._count.plots > 0) {
    redirect(`/admin/projects/${projectId}?blockError=hasplots`);
  }

  await prisma.projectBlock.update({
    where: { id: blockId },
    data: { deletedAt: new Date() },
  });

  revalidateProject(projectId);
  redirect(`/admin/projects/${projectId}?blockSaved=1`);
}

/** Save size rows (area × count + facing/price/extra) and refresh plannedPlots. */
export async function saveBlockPlotSpecs(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectId = String(formData.get("projectId") || "");
  const blockId = String(formData.get("blockId") || "");
  const specs = plotSpecsFromForm(formData);

  if (!projectId || !blockId) redirect("/admin/projects");
  if (specs.length === 0) {
    redirect(`/admin/projects/${projectId}/blocks/${blockId}?error=specs`);
  }

  const total = totalPlannedFromSpecs(specs);
  if (total < 1 || total > 2000) {
    redirect(`/admin/projects/${projectId}/blocks/${blockId}?error=count`);
  }

  const block = await prisma.projectBlock.findFirst({
    where: {
      id: blockId,
      projectId,
      organizationId: session.orgId,
      deletedAt: null,
    },
  });
  if (!block) redirect(`/admin/projects/${projectId}`);

  await prisma.projectBlock.update({
    where: { id: blockId },
    data: {
      plotSpecs: specs,
      plannedPlots: total,
    },
  });

  revalidateProject(projectId);
  revalidatePath(`/admin/projects/${projectId}/blocks/${blockId}`);
  redirect(`/admin/projects/${projectId}/blocks/${blockId}?saved=1`);
}

/**
 * Generate plots from saved size rows.
 * Creates only the remaining plots (planned − existing), filled from specs in order.
 */
export async function generatePlotsForBlock(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectId = String(formData.get("projectId") || "");
  const blockId = String(formData.get("blockId") || "");

  const block = await prisma.projectBlock.findFirst({
    where: {
      id: blockId,
      projectId,
      organizationId: session.orgId,
      deletedAt: null,
    },
    include: {
      project: true,
      plots: {
        where: { deletedAt: null },
        select: { plotNumber: true, area: true },
      },
    },
  });
  if (!block) redirect(`/admin/projects/${projectId}`);

  let specs = parsePlotSpecs(block.plotSpecs);
  // Allow generate right after submitting form rows (same POST)
  const formSpecs = plotSpecsFromForm(formData);
  if (formSpecs.length > 0) {
    specs = formSpecs;
    const total = totalPlannedFromSpecs(specs);
    await prisma.projectBlock.update({
      where: { id: blockId },
      data: { plotSpecs: specs, plannedPlots: total },
    });
  }

  if (specs.length === 0) {
    redirect(`/admin/projects/${projectId}/blocks/${blockId}?error=specs`);
  }

  const planned = totalPlannedFromSpecs(specs);
  const existingCount = block.plots.length;
  const toCreate = planned - existingCount;
  if (toCreate <= 0) {
    redirect(`/admin/projects/${projectId}/blocks/${blockId}?error=already`);
  }

  const allSlots = expandSpecsToPlotData(specs);
  const remainingSlots = allSlots.slice(existingCount);

  const prefix = (block.code || block.name.replace(/\s+/g, "").slice(0, 8) || "P").toUpperCase();
  const existingNumbers = new Set(block.plots.map((p) => p.plotNumber));

  const numbered: Array<(typeof remainingSlots)[number] & { plotNumber: string }> = [];
  let n = 1;
  for (const slot of remainingSlots) {
    let plotNumber = `${prefix}-${n}`;
    while (existingNumbers.has(plotNumber)) {
      n += 1;
      plotNumber = `${prefix}-${n}`;
    }
    existingNumbers.add(plotNumber);
    numbered.push({ plotNumber, ...slot });
    n += 1;
  }

  const conflicts = await prisma.plot.findMany({
    where: {
      projectId,
      deletedAt: null,
      plotNumber: { in: numbered.map((p) => p.plotNumber) },
    },
    select: { plotNumber: true },
  });
  if (conflicts.length > 0) {
    redirect(`/admin/projects/${projectId}/blocks/${blockId}?error=duplicate`);
  }

  await prisma.plot.createMany({
    data: numbered.map((row) => ({
      organizationId: session.orgId,
      projectId,
      blockId: block.id,
      plotNumber: row.plotNumber,
      area: row.area,
      areaUnit: row.areaUnit,
      facing: row.facing,
      pricePerSqYard: row.pricePerSqYard,
      basePrice: row.basePrice,
      additionalCharges: row.additionalCharges,
      totalPrice: row.totalPrice,
      status: "AVAILABLE",
      createdBy: session.sub,
      updatedBy: session.sub,
    })),
  });

  const totalPlots = await prisma.plot.count({
    where: { projectId, deletedAt: null },
  });
  if (totalPlots > block.project.totalPlots) {
    await prisma.project.update({
      where: { id: projectId },
      data: { totalPlots },
    });
  }

  revalidateProject(projectId);
  revalidatePath(`/admin/projects/${projectId}/blocks/${blockId}`);
  redirect(`/admin/projects/${projectId}?generated=${numbered.length}`);
}

/** Soft-delete selected plots in a block (skips any with active bookings). */
export async function bulkDeleteBlockPlots(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectId = String(formData.get("projectId") || "");
  const blockId = String(formData.get("blockId") || "");
  const ids = formData.getAll("plotIds").map(String).filter(Boolean);

  if (!projectId || !blockId) redirect("/admin/projects");
  if (ids.length === 0) {
    redirect(`/admin/projects/${projectId}/blocks/${blockId}?error=noselect`);
  }

  const block = await prisma.projectBlock.findFirst({
    where: {
      id: blockId,
      projectId,
      organizationId: session.orgId,
      deletedAt: null,
    },
  });
  if (!block) redirect(`/admin/projects/${projectId}`);

  const plots = await prisma.plot.findMany({
    where: {
      id: { in: ids },
      projectId,
      blockId,
      organizationId: session.orgId,
      deletedAt: null,
    },
    include: {
      bookings: {
        where: { deletedAt: null, bookingStatus: { not: "CANCELLED" } },
        take: 1,
        select: { id: true },
      },
    },
  });

  const deletable = plots.filter((p) => p.bookings.length === 0);
  const skipped = plots.length - deletable.length;

  if (deletable.length === 0) {
    redirect(
      `/admin/projects/${projectId}/blocks/${blockId}?error=${skipped > 0 ? "booked" : "noselect"}`,
    );
  }

  await prisma.plot.updateMany({
    where: { id: { in: deletable.map((p) => p.id) } },
    data: {
      deletedAt: new Date(),
      updatedBy: session.sub,
    },
  });

  revalidateProject(projectId);
  revalidatePath(`/admin/projects/${projectId}/blocks/${blockId}`);
  redirect(
    `/admin/projects/${projectId}/blocks/${blockId}?deleted=${deletable.length}${skipped > 0 ? `&skipped=${skipped}` : ""}`,
  );
}
