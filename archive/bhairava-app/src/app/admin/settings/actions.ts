"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

export async function updateOrganizationSettings(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const name = String(formData.get("name") || "").trim();
  const legalName = String(formData.get("legalName") || "").trim();
  const code = String(formData.get("code") || "").trim();
  const gstin = String(formData.get("gstin") || "").trim();
  const pan = String(formData.get("pan") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const website = String(formData.get("website") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const pincode = String(formData.get("pincode") || "").trim();

  const supportEmail = String(formData.get("supportEmail") || "").trim();
  const supportPhone = String(formData.get("supportPhone") || "").trim();
  const primaryColor = String(formData.get("primaryColor") || "").trim() || "#0B3D91";
  const currencyCode = String(formData.get("currencyCode") || "").trim() || "INR";
  const timezone = String(formData.get("timezone") || "").trim() || "Asia/Kolkata";
  const dateFormat = String(formData.get("dateFormat") || "").trim() || "dd MMM yyyy";
  const addressLine = String(formData.get("addressLine") || "").trim();

  if (!name || !code) {
    redirect("/admin/settings?error=required");
  }

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: session.orgId },
      data: {
        name,
        legalName: legalName || null,
        code,
        gstin: gstin || null,
        pan: pan || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
      },
    }),
    prisma.organizationSettings.upsert({
      where: { organizationId: session.orgId },
      create: {
        organizationId: session.orgId,
        primaryColor,
        currencyCode,
        timezone,
        dateFormat,
        supportEmail: supportEmail || null,
        supportPhone: supportPhone || null,
        addressLine: addressLine || null,
      },
      update: {
        primaryColor,
        currencyCode,
        timezone,
        dateFormat,
        supportEmail: supportEmail || null,
        supportPhone: supportPhone || null,
        addressLine: addressLine || null,
      },
    }),
  ]);

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "settings.update",
    entityType: "Organization",
    entityId: session.orgId,
  });

  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}
