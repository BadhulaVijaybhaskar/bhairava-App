#!/usr/bin/env node
/**
 * Non-destructive inventory replenishment.
 * Adds NEW AVAILABLE plots (E2E-NN) to the demo project without deleting
 * reservations/bookings/audit/plot_status_history.
 *
 * Usage: node scripts/seed/replenish-available-plots.mjs [--count=12]
 * Requires DATABASE_URL (defaults from packages/database/.env or root .env).
 */
import { PrismaClient, PlotStatus } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

function loadEnv() {
  for (const p of [
    resolve(repoRoot, '.env'),
    resolve(repoRoot, 'packages/database/.env'),
  ]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    }
  }
}
loadEnv();

const count = Number((process.argv.find((a) => a.startsWith('--count=')) || '--count=12').split('=')[1]) || 12;
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({ where: { code: 'BHAIRAVA-DEMO' } });
  if (!org) throw new Error('Demo org missing — run npm run db:seed first');
  const project = await prisma.project.findFirst({
    where: { organizationId: org.id, code: 'DEMO-1' },
  });
  if (!project) throw new Error('DEMO-1 project missing — run npm run db:seed first');

  const existing = await prisma.plot.findMany({
    where: { projectId: project.id },
    select: { number: true, status: true },
  });
  const used = new Set(existing.map((p) => p.number));
  const availableBefore = existing.filter((p) => p.status === PlotStatus.AVAILABLE).length;

  const created = [];
  let n = 1;
  while (created.length < count) {
    const number = `E2E-${String(n).padStart(2, '0')}`;
    n += 1;
    if (used.has(number)) continue;
    const row = await prisma.plot.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        number,
        areaSqYd: 200,
        status: PlotStatus.AVAILABLE,
        ratePerSqYd: 10000,
        totalPrice: 2000000,
        notes: 'Replenished by scripts/seed/replenish-available-plots.mjs (non-destructive)',
      },
    });
    created.push(row.number);
    used.add(number);
  }

  const availableAfter = await prisma.plot.count({
    where: { projectId: project.id, status: PlotStatus.AVAILABLE },
  });

  console.log(JSON.stringify({
    ok: true,
    mode: 'non-destructive-append',
    project: project.code,
    availableBefore,
    created,
    availableAfter,
    note: 'Existing reserved/booked plots and audit history preserved',
  }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
