"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function expressInterest(plotId: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Unauthorized" };
  if (!session.customerId) {
    return { ok: false as const, error: "No customer profile linked to this account" };
  }

  const plot = await prisma.plot.findFirst({
    where: {
      id: plotId,
      organizationId: session.orgId,
      deletedAt: null,
      status: "AVAILABLE",
    },
    select: { id: true, projectId: true },
  });
  if (!plot) return { ok: false as const, error: "Plot not available" };

  await prisma.plotInterest.create({
    data: {
      organizationId: session.orgId,
      projectId: plot.projectId,
      plotId: plot.id,
      customerId: session.customerId,
      type: "INTERESTED",
      source: "CUSTOMER_APP",
      message: "Interest from customer portal",
    },
  });

  revalidatePath("/browse");
  return { ok: true as const };
}
