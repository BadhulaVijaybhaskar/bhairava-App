const path = require("path");
const fs = require("fs");

const adminRoot = path.join(__dirname, "..", "bhairava-app");
const targets = ["bhairava-agent", "bhairava-customer"];

const srcPrisma = path.join(adminRoot, "node_modules", ".prisma");
if (!fs.existsSync(path.join(srcPrisma, "client"))) {
  console.error("Missing generated client at", srcPrisma);
  process.exit(1);
}

for (const app of targets) {
  const dest = path.join(__dirname, "..", app, "node_modules", ".prisma");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(srcPrisma, dest, { recursive: true });
  console.log("Synced .prisma →", app);
}
