import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") || "bookings";
  const orgId = session.orgId;
  let filename = "export.csv";
  let csv = "";

  if (type === "bookings") {
    const rows = await prisma.booking.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: {
        project: { select: { name: true, code: true } },
        plot: { select: { plotNumber: true } },
        customer: { select: { fullName: true, mobile: true } },
        agent: { select: { fullName: true } },
      },
      orderBy: { bookingDate: "desc" },
    });
    filename = "bookings.csv";
    csv = toCsv(
      [
        "bookingNumber",
        "date",
        "project",
        "plot",
        "customer",
        "mobile",
        "agent",
        "finalAmount",
        "status",
      ],
      rows.map((b) => [
        b.bookingNumber,
        b.bookingDate.toISOString().slice(0, 10),
        b.project.name,
        b.plot.plotNumber,
        b.customer.fullName,
        b.customer.mobile,
        b.agent?.fullName ?? "",
        Number(b.finalAmount),
        b.bookingStatus,
      ]),
    );
  } else if (type === "payments") {
    const rows = await prisma.payment.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: {
        booking: {
          select: {
            bookingNumber: true,
            customer: { select: { fullName: true } },
            plot: { select: { plotNumber: true } },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    });
    filename = "payments.csv";
    csv = toCsv(
      ["date", "amount", "method", "receipt", "booking", "customer", "plot", "status"],
      rows.map((p) => [
        p.paymentDate.toISOString().slice(0, 10),
        Number(p.amount),
        p.paymentMethod,
        p.receiptNumber ?? "",
        p.booking.bookingNumber,
        p.booking.customer.fullName,
        p.booking.plot.plotNumber,
        p.status,
      ]),
    );
  } else if (type === "inventory") {
    const rows = await prisma.plot.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: {
        project: { select: { name: true, code: true } },
        assignedCustomer: { select: { fullName: true } },
      },
      orderBy: [{ project: { name: "asc" } }, { plotNumber: "asc" }],
    });
    filename = "inventory.csv";
    csv = toCsv(
      ["project", "plot", "status", "area", "totalPrice", "customer"],
      rows.map((p) => [
        p.project.name,
        p.plotNumber,
        p.status,
        Number(p.area),
        Number(p.totalPrice),
        p.assignedCustomer?.fullName ?? "",
      ]),
    );
  } else if (type === "customers") {
    const rows = await prisma.customer.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { fullName: "asc" },
    });
    filename = "customers.csv";
    csv = toCsv(
      ["fullName", "mobile", "email", "city", "kycStatus"],
      rows.map((c) => [c.fullName, c.mobile, c.email ?? "", c.city ?? "", c.kycStatus]),
    );
  } else if (type === "agents") {
    const rows = await prisma.agent.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: { _count: { select: { bookings: true, projects: true } } },
      orderBy: { fullName: "asc" },
    });
    filename = "agents.csv";
    csv = toCsv(
      ["fullName", "mobile", "email", "employeeCode", "projects", "bookings", "active"],
      rows.map((a) => [
        a.fullName,
        a.mobile,
        a.email ?? "",
        a.employeeCode ?? "",
        a._count.projects,
        a._count.bookings,
        a.isActive ? "yes" : "no",
      ]),
    );
  } else {
    return NextResponse.json({ ok: false, error: "Unknown report type" }, { status: 400 });
  }

  await writeAudit({
    organizationId: orgId,
    actorUserId: session.sub,
    action: "reports.csv_export",
    metadata: { type },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
