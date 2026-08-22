import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  }),
});

async function main() {
  const plot = await prisma.plot.findFirst({
    where: { deletedAt: null },
    include: {
      interests: { take: 1 },
      project: { select: { name: true } },
      assignedCustomer: { select: { fullName: true } },
    },
  });
  console.log(
    plot
      ? { id: plot.id, plotNumber: plot.plotNumber, interests: plot.interests.length, ok: true }
      : { ok: false },
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
