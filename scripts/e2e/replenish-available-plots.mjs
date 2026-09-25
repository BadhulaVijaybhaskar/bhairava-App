/**
 * Replenish AVAILABLE plots for DEMO-1 without wiping sales history.
 * Uses plot.number (not code). Clears customerId/agentId when columns exist.
 * Usage: node scripts/e2e/replenish-available-plots.mjs
 */
import { PrismaClient, PlotStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findFirst({ where: { code: "DEMO-1" } });
  if (!project) throw new Error("DEMO-1 project not found — run db:seed");
  const orgId = project.organizationId;
  const created = [];
  for (let n = 9; n <= 20; n++) {
    const number = `A-${String(n).padStart(2, "0")}`;
    const row = await prisma.plot.upsert({
      where: { projectId_number: { projectId: project.id, number } },
      create: {
        organizationId: orgId,
        projectId: project.id,
        number,
        areaSqYd: 200,
        ratePerSqYd: 10000,
        totalPrice: 2000000,
        status: PlotStatus.AVAILABLE,
        corner: "NONE",
      },
      update: {
        status: PlotStatus.AVAILABLE,
        customerId: null,
        agentId: null,
      },
    });
    // Expire any ACTIVE reservation on this plot so inventory is truly free.
    await prisma.reservation.updateMany({
      where: { plotId: row.id, state: "ACTIVE" },
      data: { state: "EXPIRED" },
    });
    created.push(row.number);
  }
  const counts = await prisma.plot.groupBy({ by: ["status"], _count: true });
  console.log(JSON.stringify({ replenished: created, counts }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
