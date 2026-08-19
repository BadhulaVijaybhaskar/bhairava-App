"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ProjectStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { highlightsFromForm } from "@/lib/project-highlights";
import { saveLayoutImage } from "@/lib/uploads";

const STATUSES: ProjectStatus[] = ["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

function readCoreFields(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const country = String(formData.get("country") || "").trim() || "India";
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const pincode = String(formData.get("pincode") || "").trim();
  const latitudeRaw = String(formData.get("latitude") || "").trim();
  const longitudeRaw = String(formData.get("longitude") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const reraNumber = String(formData.get("reraNumber") || "").trim();
  const statusRaw = String(formData.get("status") || "ACTIVE");
  const status = STATUSES.includes(statusRaw as ProjectStatus)
    ? (statusRaw as ProjectStatus)
    : "ACTIVE";
  const highlights = highlightsFromForm(formData);

  const latitude = latitudeRaw ? Number(latitudeRaw) : null;
  const longitude = longitudeRaw ? Number(longitudeRaw) : null;
  const fullAddress = [address, city, state, country, pincode].filter(Boolean).join(", ");

  return {
    name,
    code,
    city,
    state,
    address: address || fullAddress || null,
    pincode: pincode || null,
    latitude: latitude != null && Number.isFinite(latitude) ? latitude : null,
    longitude: longitude != null && Number.isFinite(longitude) ? longitude : null,
    description: description || null,
    reraNumber: reraNumber || null,
    status,
    highlights,
  };
}

export async function createProject(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const fields = readCoreFields(formData);
  const plotsMode = String(formData.get("plotsMode") || "none");
  const totalPlotsRaw = String(formData.get("totalPlots") || "0").trim();
  const layout = formData.get("layout");

  if (!fields.name || !fields.code) {
    redirect("/admin/projects/new?error=1");
  }
  if (!fields.city || !fields.state || fields.city === "__other__") {
    redirect("/admin/projects/new?error=location");
  }
  if (fields.pincode && !/^\d{6}$/.test(fields.pincode)) {
    redirect("/admin/projects/new?error=pincode");
  }

  let totalPlots = 0;
  if (plotsMode === "count") {
    totalPlots = Number(totalPlotsRaw);
    if (!Number.isInteger(totalPlots) || totalPlots < 0 || totalPlots > 5000) {
      redirect("/admin/projects/new?error=plots");
    }
  }

  const existing = await prisma.project.findFirst({
    where: { organizationId: session.orgId, code: fields.code, deletedAt: null },
  });
  if (existing) redirect("/admin/projects/new?error=duplicate");

  let projectId = "";

  try {
    const project = await prisma.project.create({
      data: {
        organizationId: session.orgId,
        name: fields.name,
        code: fields.code,
        city: fields.city,
        state: fields.state,
        address: fields.address,
        pincode: fields.pincode,
        latitude: fields.latitude,
        longitude: fields.longitude,
        description: fields.description,
        reraNumber: fields.reraNumber,
        highlights: fields.highlights,
        totalPlots,
        status: "ACTIVE",
        projectType: "OPEN_PLOTS",
        createdBy: session.sub,
      },
    });
    projectId = project.id;
  } catch {
    redirect("/admin/projects/new?error=failed");
  }

  const hasUpload =
    layout != null &&
    typeof layout === "object" &&
    "arrayBuffer" in layout &&
    "size" in layout &&
    Number((layout as { size: number }).size) > 0;

  if (hasUpload) {
    try {
      const saved = await saveLayoutImage(layout as File, session.orgId, projectId);
      await prisma.$transaction([
        prisma.layoutMap.create({
          data: {
            organizationId: session.orgId,
            projectId,
            imagePath: saved.publicPath,
            originalWidth: saved.width,
            originalHeight: saved.height,
            version: 1,
            isActive: true,
            createdBy: session.sub,
          },
        }),
        prisma.project.update({
          where: { id: projectId },
          data: { coverImagePath: saved.publicPath },
        }),
      ]);
    } catch (err) {
      const codeErr = err instanceof Error ? err.message : "upload";
      const known = ["invalid_type", "too_large"];
      redirect(
        `/admin/projects/${projectId}?layoutError=${known.includes(codeErr) ? codeErr : "upload"}`,
      );
    }
  }

  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${projectId}`);
}

export async function updateProject(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = String(formData.get("id") || "");
  const fields = readCoreFields(formData);
  const totalPlots = Number(formData.get("totalPlots") || 0);
  const layout = formData.get("layout");

  if (!id) redirect("/admin/projects");
  if (!fields.name || !fields.code) {
    redirect(`/admin/projects/${id}/edit?error=1`);
  }
  if (!fields.city || !fields.state || fields.city === "__other__") {
    redirect(`/admin/projects/${id}/edit?error=location`);
  }
  if (fields.pincode && !/^\d{6}$/.test(fields.pincode)) {
    redirect(`/admin/projects/${id}/edit?error=pincode`);
  }
  if (!Number.isInteger(totalPlots) || totalPlots < 0 || totalPlots > 5000) {
    redirect(`/admin/projects/${id}/edit?error=plots`);
  }

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
  });
  if (!project) redirect("/admin/projects");

  const duplicate = await prisma.project.findFirst({
    where: {
      organizationId: session.orgId,
      code: fields.code,
      deletedAt: null,
      NOT: { id },
    },
  });
  if (duplicate) redirect(`/admin/projects/${id}/edit?error=duplicate`);

  try {
    await prisma.project.update({
      where: { id },
      data: {
        name: fields.name,
        code: fields.code,
        city: fields.city,
        state: fields.state,
        address: fields.address,
        pincode: fields.pincode,
        latitude: fields.latitude,
        longitude: fields.longitude,
        description: fields.description,
        reraNumber: fields.reraNumber,
        highlights: fields.highlights,
        totalPlots,
        status: fields.status,
        updatedBy: session.sub,
      },
    });
  } catch (err) {
    console.error("[updateProject]", err);
    redirect(`/admin/projects/${id}/edit?error=failed`);
  }

  const hasUpload =
    layout != null &&
    typeof layout === "object" &&
    "arrayBuffer" in layout &&
    "size" in layout &&
    Number((layout as { size: number }).size) > 0;

  if (hasUpload) {
    try {
      await prisma.layoutMap.updateMany({
        where: { projectId: id, isActive: true },
        data: { isActive: false },
      });
      const saved = await saveLayoutImage(layout as File, session.orgId, id);
      await prisma.$transaction([
        prisma.layoutMap.create({
          data: {
            organizationId: session.orgId,
            projectId: id,
            imagePath: saved.publicPath,
            originalWidth: saved.width,
            originalHeight: saved.height,
            version: 1,
            isActive: true,
            createdBy: session.sub,
          },
        }),
        prisma.project.update({
          where: { id },
          data: { coverImagePath: saved.publicPath },
        }),
      ]);
    } catch (err) {
      const codeErr = err instanceof Error ? err.message : "upload";
      const known = ["invalid_type", "too_large"];
      redirect(
        `/admin/projects/${id}/edit?error=${known.includes(codeErr) ? codeErr : "upload"}`,
      );
    }
  }

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${id}`);
  redirect(`/admin/projects/${id}?projectSaved=1`);
}

export async function deleteProject(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = String(formData.get("id") || "");
  if (!id) redirect("/admin/projects");

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
    include: {
      _count: {
        select: {
          bookings: { where: { deletedAt: null, bookingStatus: { not: "CANCELLED" } } },
        },
      },
    },
  });
  if (!project) redirect("/admin/projects");

  if (project._count.bookings > 0) {
    redirect(`/admin/projects/${id}?projectError=bookings`);
  }

  await prisma.project.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      updatedBy: session.sub,
    },
  });

  revalidatePath("/admin/projects");
  revalidatePath("/admin/dashboard");
  redirect("/admin/projects?deleted=1");
}

/** Flip ACTIVE ↔ ON_HOLD from the projects list toggle. */
export async function toggleProjectActive(projectId: string, makeActive: boolean) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!projectId) return { ok: false as const, error: "missing" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: session.orgId, deletedAt: null },
  });
  if (!project) return { ok: false as const, error: "not_found" };

  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: makeActive ? "ACTIVE" : "ON_HOLD",
      updatedBy: session.sub,
    },
  });

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true as const };
}
