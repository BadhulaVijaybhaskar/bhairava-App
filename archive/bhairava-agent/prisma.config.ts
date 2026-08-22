import "dotenv/config";
import { defineConfig } from "prisma/config";

/** Shared schema from admin app — same Postgres DB for all three hosts. */
export default defineConfig({
  schema: "../bhairava-app/prisma/schema.prisma",
  migrations: {
    path: "../bhairava-app/prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
