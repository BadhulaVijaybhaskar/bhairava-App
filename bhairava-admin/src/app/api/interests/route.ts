import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, getClientMeta } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { CUSTOMER_ACTIONS_BY_STATUS } from "@/lib/customer-plot-actions";

const schema = z.object({
  plotId: z.string().uuid(),
  type: z.enum(["VIEWED", "INTERESTED", "CALLBACK_REQUEST", "WAITLIST", "OFFER"]).default("INTERESTED"),
  guestName: z.string().min(2).max(120).optional(),
  guestMobile: z.string().min(8).max(20).optional(),
  guestEmail: z.string().email().optional(),
  customerId: z.string().uuid().optional(),
  message: z.string().max(500).optional(),
  source: z.string().max(40).optional(),
});

/**
 * Public/customer-app interest endpoint (also usable for demos).
 * Creates plot_interest + in-app notifications for ADMIN users.
 */
export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = getClientMeta(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid interest payload");

  const plot = await prisma.plot.findFirst({
    where: { id: parsed.data.plotId, deletedAt: null },
    include: { project: { select: { name: true } } },
  });
  if (!plot) return jsonError("Plot not found", 404);

  const caps = CUSTOMER_ACTIONS_BY_STATUS[plot.status];
  const type = parsed.data.type;

  if (type === "VIEWED" && !caps.canView && !caps.visibleInApp) {
    return jsonError("Plot is not available to view", 403);
  }
  if (type === "INTERESTED" && !caps.canExpressInterest) {
    return jsonError("Interest is not allowed for this plot status", 403);
  }
  if (type === "WAITLIST" && !caps.canJoinWaitlist) {
    return jsonError("Waitlist is not allowed for this plot status", 403);
  }
  if (type === "OFFER" && !caps.canMakeOffer) {
    return jsonError("Offers are not allowed for this plot status", 403);
  }
  if (type === "CALLBACK_REQUEST" && !caps.canExpressInterest && !caps.canRequestBooking) {
    return jsonError("Callback is not allowed for this plot status", 403);
  }

  const interest = await prisma.plotInterest.create({
    data: {
      organizationId: plot.organizationId,
      projectId: plot.projectId,
      plotId: plot.id,
      customerId: parsed.data.customerId,
      guestName: parsed.data.guestName,
      guestMobile: parsed.data.guestMobile,
      guestEmail: parsed.data.guestEmail,
      type,
      message: parsed.data.message,
      source: parsed.data.source ?? "APP",
    },
  });

  const who =
    parsed.data.guestName ||
    parsed.data.guestMobile ||
    (parsed.data.customerId ? "A customer" : "Someone");

  const title =
    type === "VIEWED"
      ? `Plot ${plot.plotNumber} viewed`
      : type === "WAITLIST"
        ? `Waitlist: Plot ${plot.plotNumber}`
        : type === "OFFER"
          ? `Offer on Plot ${plot.plotNumber}`
          : `Interest: Plot ${plot.plotNumber}`;

  const bodyText = `${who} · ${plot.project.name} · ${type.replaceAll("_", " ")}`;

  // Notify all active ADMIN users in the org
  const admins = await prisma.user.findMany({
    where: {
      organizationId: plot.organizationId,
      deletedAt: null,
      status: "ACTIVE",
      userRoles: { some: { role: { code: "ADMIN" } } },
    },
    select: { id: true },
  });

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        organizationId: plot.organizationId,
        userId: admin.id,
        type: type === "VIEWED" ? "INFO" : "ACTION_REQUIRED",
        title,
        body: bodyText,
        linkUrl: `/admin/plots/${plot.id}?projectId=${plot.projectId}`,
      })),
    });
  }

  await writeAudit({
    organizationId: plot.organizationId,
    action: `plot_interest.${type.toLowerCase()}`,
    entityType: "plot",
    entityId: plot.id,
    ipAddress,
    userAgent,
    metadata: { interestId: interest.id, source: parsed.data.source ?? "APP" },
  });

  return jsonOk({
    interestId: interest.id,
    notifiedAdmins: admins.length,
    message: "Interest recorded. Sales team notified.",
  });
}
