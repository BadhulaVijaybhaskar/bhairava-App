"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/** Agent may create customers under them. Delete is never allowed from agent portal. */
export async function createCustomer(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const fullName = String(formData.get("fullName") || "").trim();
  const mobile = String(formData.get("mobile") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase() || null;
  const city = String(formData.get("city") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;

  if (!fullName || mobile.length < 10) {
    redirect("/customers/new?error=required");
  }

  const existing = await prisma.customer.findFirst({
    where: { organizationId: session.orgId, mobile, deletedAt: null },
  });
  if (existing) {
    redirect(`/customers/new?error=duplicate&mobile=${encodeURIComponent(mobile)}`);
  }

  const customer = await prisma.customer.create({
    data: {
      organizationId: session.orgId,
      fullName,
      mobile,
      email,
      city,
      address,
      createdBy: session.sub,
      supportNotes: `Created by agent ${session.name} (${session.agentId})`,
    },
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}?created=1`);
}
