import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const org = await prisma.organization.findFirst({ where: { code: "BHAIRAVA" } });
  if (!org) throw new Error("Org not found");

  let customer = await prisma.customer.findFirst({
    where: { organizationId: org.id, mobile: "9876543210" },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        organizationId: org.id,
        fullName: "Ravi Kumar",
        mobile: "9876543210",
        email: "ravi.kumar@example.com",
        city: "Visakhapatnam",
        state: "Andhra Pradesh",
        kycStatus: "VERIFIED",
      },
    });
  }

  const result = await prisma.plot.updateMany({
    where: {
      organizationId: org.id,
      deletedAt: null,
      status: { in: ["SOLD", "REGISTERED", "BOOKED", "UNDER_DOCUMENTATION", "RESERVED", "RESALE_AVAILABLE"] },
      assignedCustomerId: null,
    },
    data: {
      assignedCustomerId: customer.id,
      bookingDate: new Date("2024-05-10"),
    },
  });

  console.log(`Linked ${result.count} plots to ${customer.fullName}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
