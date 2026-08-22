"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

type Point = [number, number];

function parseCoords(raw: string): Point[] | null {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data) || data.length < 2) return null;
    const pts: Point[] = [];
    for (const p of data) {
      if (!Array.isArray(p) || p.length < 2) return null;
      const x = Number(p[0]);
      const y = Number(p[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      if (x < 0 || x > 1 || y < 0 || y > 1) return null;
      pts.push([x, y]);
    }
    return pts;
  } catch {
    return null;
  }
}

export async function upsertLayoutShape(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const layoutMapId = String(formData.get("layoutMapId") || "");
  const plotId = String(formData.get("plotId") || "");
  const shapeType = String(formData.get("shapeType") || "RECT") as "RECT" | "POLYGON";
  const coordsRaw = String(formData.get("coordinates") || "");
  const projectId = String(formData.get("projectId") || "");

  const coordinates = parseCoords(coordsRaw);
  if (!layoutMapId || !plotId || !coordinates || (shapeType === "RECT" && coordinates.length < 2)) {
    redirect(`/admin/projects/${projectId}/layout?error=shape`);
  }
  if (shapeType === "POLYGON" && coordinates.length < 3) {
    redirect(`/admin/projects/${projectId}/layout?error=shape`);
  }

  const layout = await prisma.layoutMap.findFirst({
    where: { id: layoutMapId, organizationId: session.orgId, isActive: true },
  });
  if (!layout) redirect(`/admin/projects/${projectId}`);

  const plot = await prisma.plot.findFirst({
    where: {
      id: plotId,
      organizationId: session.orgId,
      projectId: layout.projectId,
      deletedAt: null,
    },
  });
  if (!plot) redirect(`/admin/projects/${layout.projectId}/layout?error=plot`);

  const xs = coordinates.map((c) => c[0]);
  const ys = coordinates.map((c) => c[1]);
  const labelX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const labelY = (Math.min(...ys) + Math.max(...ys)) / 2;

  await prisma.layoutPlotShape.upsert({
    where: { layoutMapId_plotId: { layoutMapId, plotId } },
    create: {
      organizationId: session.orgId,
      layoutMapId,
      plotId,
      shapeType,
      coordinates,
      labelX,
      labelY,
    },
    update: {
      shapeType,
      coordinates,
      labelX,
      labelY,
    },
  });

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "layout.shape_upsert",
    entityType: "LayoutPlotShape",
    entityId: plotId,
    metadata: { layoutMapId, shapeType },
  });

  revalidatePath(`/admin/projects/${layout.projectId}`);
  revalidatePath(`/admin/projects/${layout.projectId}/layout`);
  redirect(`/admin/projects/${layout.projectId}/layout?saved=1`);
}

export async function deleteLayoutShape(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const shapeId = String(formData.get("shapeId") || "");
  const projectId = String(formData.get("projectId") || "");
  if (!shapeId) redirect(`/admin/projects/${projectId}/layout`);

  const shape = await prisma.layoutPlotShape.findFirst({
    where: { id: shapeId, organizationId: session.orgId },
    include: { layoutMap: { select: { projectId: true } } },
  });
  if (!shape) redirect(`/admin/projects/${projectId}/layout`);

  await prisma.layoutPlotShape.delete({ where: { id: shapeId } });

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "layout.shape_delete",
    entityType: "LayoutPlotShape",
    entityId: shapeId,
  });

  revalidatePath(`/admin/projects/${shape.layoutMap.projectId}`);
  revalidatePath(`/admin/projects/${shape.layoutMap.projectId}/layout`);
  redirect(`/admin/projects/${shape.layoutMap.projectId}/layout?deleted=1`);
}
