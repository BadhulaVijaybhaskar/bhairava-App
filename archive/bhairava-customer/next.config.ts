import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Home-dir pnpm-workspace.yaml otherwise steals Turbopack resolution.
  turbopack: {
    root: path.join(__dirname),
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
