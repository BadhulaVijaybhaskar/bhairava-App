"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

async function nextBookingNumber(tx: Prisma.TransactionClient, orgId: string) {
  const year = new Date().getFullYear();
  const prefix = `BK-${year}-`;
  const latest = await tx.booking.findFirst({
    where: { organizationId: orgId, bookingNumber: { startsWith: prefix } },
    orderBy: { bookingNumber: "desc" },
    select: { bookingNumber: true },
  });
  const lastSeq = latest ? Number(latest.bookingNumber.split("-").pop()) : 0;
  const seq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function createBookingWithCustomer(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const plotId = String(formData.get("plotId") || "");
  const fullName = String(formData.get("fullName") || "").trim();
  const mobile = String(formData.get("mobile") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase() || null;
  const existingCustomerId = String(formData.get("customerId") || "").trim();

  if (!plotId || (!existingCustomerId && (!fullName || mobile.length < 10))) {
    redirect(`/bookings/new?plotId=${plotId}&error=required`);
  }

  const plot = await prisma.plot.findFirst({
    where: {
      id: plotId,
      organizationId: session.orgId,
      deletedAt: null,
      status: { in: ["AVAILABLE", "RESERVED"] },
    },
  });
  if (!plot) redirect(`/bookings/new?plotId=${plotId}&error=plot`);

  const assigned = await prisma.agentProjectAssignment.findFirst({
    where: { agentId: session.agentId, projectId: plot.projectId },
  });
  if (!assigned) redirect("/projects");

  const bookingId = await prisma.$transaction(async (tx) => {
    let customerId = existingCustomerId;
    if (!customerId) {
      const existing = await tx.customer.findFirst({
        where: { organizationId: session.orgId, mobile, deletedAt: null },
      });
      if (existing) {
        customerId = existing.id;
      } else {
        const created = await tx.customer.create({
          data: {
            organizationId: session.orgId,
            fullName,
            mobile,
            email,
            createdBy: session.sub,
            supportNotes: `Created by agent ${session.name} via booking`,
          },
        });
        customerId = created.id;
      }
    }

    const bookingNumber = await nextBookingNumber(tx, session.orgId);
    const booking = await tx.booking.create({
      data: {
        organizationId: session.orgId,
        bookingNumber,
        projectId: plot.projectId,
        plotId: plot.id,
        customerId,
        agentId: session.agentId,
        bookingDate: new Date(),
        bookingAmount: plot.totalPrice,
        totalPlotPrice: plot.totalPrice,
        discount: 0,
        finalAmount: plot.totalPrice,
        bookingStatus: "RESERVED",
        createdBy: session.sub,
      },
    });

    await tx.plot.update({
      where: { id: plot.id },
      data: {
        status: "RESERVED",
        assignedCustomerId: customerId,
        assignedAgentId: session.agentId,
        bookingDate: new Date(),
        updatedBy: session.sub,
      },
    });

    await tx.plotStatusHistory.create({
      data: {
        organizationId: session.orgId,
        plotId: plot.id,
        fromStatus: plot.status,
        toStatus: "RESERVED",
        reason: "Reserved by agent booking",
        changedBy: session.sub,
      },
    });

    await tx.bookingStatusHistory.create({
      data: {
        organizationId: session.orgId,
        bookingId: booking.id,
        fromStatus: null,
        toStatus: "RESERVED",
        reason: "Created by agent",
        changedBy: session.sub,
      },
    });

    return booking.id;
  });

  revalidatePath("/bookings");
  revalidatePath("/customers");
  redirect(`/bookings?created=1`);
}
