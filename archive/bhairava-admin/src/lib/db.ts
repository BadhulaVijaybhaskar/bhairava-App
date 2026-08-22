import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/** Bump when Prisma schema fields change so Next.dev drops stale singleton. */
const PRISMA_SCHEMA_REV = 3;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaRev: number | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL or DIRECT_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrisma() {
  if (
    !globalForPrisma.prisma ||
    globalForPrisma.prismaSchemaRev !== PRISMA_SCHEMA_REV
  ) {
    void globalForPrisma.prisma?.$disconnect().catch(() => undefined);
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaSchemaRev = PRISMA_SCHEMA_REV;
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrisma();
