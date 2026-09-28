/**
 * Demo seed — coherent with client-test personas.
 * NOT for production. Founder bootstrap is separate (prisma/bootstrap/founder.ts).
 *
 * Personas (password Demo@12345):
 *   founder@ admin@ finance@ viewer@ agent@ agent2@ customer@ customer2@
 *
 * Idempotent upserts / find-or-create by stable notes keys. Does NOT wipe DB.
 */
import {
  PrismaClient,
  RoleCode,
  PlotStatus,
  ProjectLifecycle,
  UserAccountStatus,
  DocumentVisibility,
  Facing,
  CornerCode,
  AmenityStatus,
  LeadStage,
  SiteVisitStatus,
  ReservationState,
  BookingState,
  PaymentMethod,
  InstallmentStatus,
  ReconciliationStatus,
  CommissionStatus,
  RegistrationStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Demo@12345';
const SEED = '[demo-seed]';

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function daysAgo(n: number) {
  return daysFromNow(-n);
}
function r3(n: number) {
  return Math.round(n * 1000) / 1000;
}
function rectPolygon(col: number, row: number, cols: number, rows: number, pad = 0.35): [number, number][] {
  const cw = 100 / cols;
  const ch = 100 / rows;
  const x0 = col * cw + pad;
  const y0 = row * ch + pad;
  const x1 = (col + 1) * cw - pad;
  const y1 = (row + 1) * ch - pad;
  return [
    [r3(x0), r3(y0)],
    [r3(x1), r3(y0)],
    [r3(x1), r3(y1)],
    [r3(x0), r3(y1)],
  ];
}

async function assertSeedAllowed() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const allow = (process.env.ALLOW_DEMO_SEED || '').toLowerCase();
  if (nodeEnv === 'production') {
    console.error('Refusing demo seed in production. Use founder bootstrap instead.');
    process.exit(2);
  }
  if (allow === 'never' || allow === 'false' || allow === '0') {
    console.error('ALLOW_DEMO_SEED forbids seeding.');
    process.exit(2);
  }
  const db = process.env.DATABASE_URL || '';
  if (db.includes('ttfsumsxasfoarnritlj')) {
    console.error('Refusing seed against WhatsApp CRM Supabase project.');
    process.exit(2);
  }
}

async function ensureCustomer(params: {
  organizationId: string;
  email: string;
  name: string;
  phone: string;
  userId?: string;
  agentId: string;
  city?: string;
  source?: string;
}) {
  const existing = await prisma.customer.findFirst({
    where: { organizationId: params.organizationId, email: params.email },
  });
  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: params.name,
        phone: params.phone,
        userId: params.userId ?? existing.userId,
        agentId: params.agentId,
        city: params.city ?? existing.city ?? 'Hyderabad',
        source: params.source ?? existing.source,
      },
    });
  }
  return prisma.customer.create({
    data: {
      organizationId: params.organizationId,
      name: params.name,
      phone: params.phone,
      email: params.email,
      userId: params.userId,
      agentId: params.agentId,
      city: params.city ?? 'Hyderabad',
      source: params.source ?? 'demo-seed',
    },
  });
}

async function ensureBy<T extends { id: string }>(
  find: () => Promise<T | null>,
  create: () => Promise<T>,
  update?: (row: T) => Promise<T>,
): Promise<T> {
  const existing = await find();
  if (existing) return update ? update(existing) : existing;
  return create();
}

async function main() {
  await assertSeedAllowed();

  const org = await prisma.organization.upsert({
    where: { code: 'BHAIRAVA-DEMO' },
    update: { name: 'Bhairava Demo Org' },
    create: { name: 'Bhairava Demo Org', code: 'BHAIRAVA-DEMO' },
  });

  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  const users = [
    { email: 'founder@bhairava.demo', roleCode: RoleCode.FOUNDER, displayName: 'Demo Founder' },
    { email: 'admin@bhairava.demo', roleCode: RoleCode.ADMINISTRATOR, displayName: 'Demo Admin' },
    { email: 'finance@bhairava.demo', roleCode: RoleCode.FINANCE, displayName: 'Demo Finance' },
    { email: 'viewer@bhairava.demo', roleCode: RoleCode.VIEWER, displayName: 'Demo Viewer' },
    { email: 'agent@bhairava.demo', roleCode: RoleCode.AGENT, displayName: 'Demo Agent 1' },
    { email: 'agent2@bhairava.demo', roleCode: RoleCode.AGENT, displayName: 'Demo Agent 2' },
    { email: 'customer@bhairava.demo', roleCode: RoleCode.CUSTOMER, displayName: 'Demo Customer 1' },
    { email: 'customer2@bhairava.demo', roleCode: RoleCode.CUSTOMER, displayName: 'Demo Customer 2' },
  ] as const;

  const userIds: Record<string, string> = {};
  for (const u of users) {
    const row = await prisma.user.upsert({
      where: { organizationId_email: { organizationId: org.id, email: u.email } },
      update: {
        passwordHash,
        roleCode: u.roleCode,
        status: UserAccountStatus.ACTIVE,
        displayName: u.displayName,
      },
      create: {
        organizationId: org.id,
        email: u.email,
        passwordHash,
        displayName: u.displayName,
        roleCode: u.roleCode,
        status: UserAccountStatus.ACTIVE,
      },
    });
    userIds[u.email] = row.id;
  }

  const agent1 = await prisma.agentProfile.upsert({
    where: { userId: userIds['agent@bhairava.demo'] },
    update: {
      name: 'Demo Agent 1',
      code: 'AG-01',
      phone: '9888000001',
      email: 'agent@bhairava.demo',
      region: 'Hyderabad North',
    },
    create: {
      organizationId: org.id,
      userId: userIds['agent@bhairava.demo'],
      code: 'AG-01',
      name: 'Demo Agent 1',
      phone: '9888000001',
      email: 'agent@bhairava.demo',
      region: 'Hyderabad North',
    },
  });
  const agent2 = await prisma.agentProfile.upsert({
    where: { userId: userIds['agent2@bhairava.demo'] },
    update: {
      name: 'Demo Agent 2',
      code: 'AG-02',
      phone: '9888000002',
      email: 'agent2@bhairava.demo',
      region: 'Hyderabad South',
    },
    create: {
      organizationId: org.id,
      userId: userIds['agent2@bhairava.demo'],
      code: 'AG-02',
      name: 'Demo Agent 2',
      phone: '9888000002',
      email: 'agent2@bhairava.demo',
      region: 'Hyderabad South',
    },
  });

  // System sales desk for DIRECT_APP attribution / site-visit fallback.
  const directEmail = 'bhairava-direct@bhairava.demo';
  const directUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: directEmail } },
    update: {
      passwordHash,
      roleCode: RoleCode.AGENT,
      status: UserAccountStatus.ACTIVE,
      displayName: 'Bhairava Direct',
      profileCompletedAt: new Date(),
    },
    create: {
      organizationId: org.id,
      email: directEmail,
      passwordHash,
      displayName: 'Bhairava Direct',
      roleCode: RoleCode.AGENT,
      status: UserAccountStatus.ACTIVE,
      profileCompletedAt: new Date(),
    },
  });
  await prisma.agentProfile.upsert({
    where: { userId: directUser.id },
    update: { code: 'BHAIRAVA_DIRECT', name: 'Bhairava Direct', status: 'Active', isSystem: true },
    create: {
      organizationId: org.id,
      userId: directUser.id,
      code: 'BHAIRAVA_DIRECT',
      name: 'Bhairava Direct',
      status: 'Active',
      isSystem: true,
    },
  });

  const customer1 = await ensureCustomer({
    organizationId: org.id,
    email: 'customer@bhairava.demo',
    name: 'Demo Customer 1',
    phone: '9000000001',
    userId: userIds['customer@bhairava.demo'],
    agentId: agent1.id,
    source: 'referral',
  });
  const customer2 = await ensureCustomer({
    organizationId: org.id,
    email: 'customer2@bhairava.demo',
    name: 'Demo Customer 2',
    phone: '9000000002',
    userId: userIds['customer2@bhairava.demo'],
    agentId: agent2.id,
    source: 'walk-in',
  });

  const extraSpecs = [
    { email: 'priya.rao@demo.bhairava', name: 'Priya Rao', phone: '9000000011', agentId: agent1.id, city: 'Hyderabad' },
    { email: 'arjun.nair@demo.bhairava', name: 'Arjun Nair', phone: '9000000012', agentId: agent1.id, city: 'Secunderabad' },
    { email: 'meera.singh@demo.bhairava', name: 'Meera Singh', phone: '9000000013', agentId: agent2.id, city: 'Hyderabad' },
    { email: 'vikram.patel@demo.bhairava', name: 'Vikram Patel', phone: '9000000014', agentId: agent2.id, city: 'Warangal' },
    { email: 'ananya.reddy@demo.bhairava', name: 'Ananya Reddy', phone: '9000000015', agentId: agent1.id, city: 'Hyderabad' },
    { email: 'karthik.iyer@demo.bhairava', name: 'Karthik Iyer', phone: '9000000016', agentId: agent2.id, city: 'Guntur' },
    { email: 'sneha.gupta@demo.bhairava', name: 'Sneha Gupta', phone: '9000000017', agentId: agent1.id, city: 'Hyderabad' },
    { email: 'rahul.verma@demo.bhairava', name: 'Rahul Verma', phone: '9000000018', agentId: agent2.id, city: 'Vijayawada' },
    { email: 'divya.menon@demo.bhairava', name: 'Divya Menon', phone: '9000000019', agentId: agent1.id, city: 'Hyderabad' },
    { email: 'suresh.kumar@demo.bhairava', name: 'Suresh Kumar', phone: '9000000020', agentId: agent2.id, city: 'Karimnagar' },
  ];
  const extras = [];
  for (const c of extraSpecs) {
    extras.push(await ensureCustomer({ organizationId: org.id, ...c, source: 'demo-seed' }));
  }
  const allCustomers = [customer1, customer2, ...extras];

  const project = await prisma.project.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'DEMO-1' } },
    update: {
      name: 'Demo Township',
      city: 'Hyderabad',
      state: 'Telangana',
      location: 'Shankarpally Road, Hyderabad',
      address: 'Survey Nos. 42-48, Near Outer Ring Road, Shankarpally',
      pincode: '501203',
      description: 'Premium plotted township with gated amenities. Demo inventory for client walkthroughs.',
      reraNumber: 'P02400001234',
      projectType: 'Plotted Development',
      lifecycleStatus: ProjectLifecycle.ACTIVE,
      agentVisible: true,
      customerListed: true,
      resaleAvailable: true,
      totalArea: 25.5,
      areaUnit: 'acres',
      launchDate: daysAgo(180),
      expectedCompletion: daysFromNow(540),
      settingsJson: {
        reservationHoldHoursDefault: 48,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        demo: true,
      },
    },
    create: {
      organizationId: org.id,
      name: 'Demo Township',
      code: 'DEMO-1',
      city: 'Hyderabad',
      state: 'Telangana',
      location: 'Shankarpally Road, Hyderabad',
      address: 'Survey Nos. 42-48, Near Outer Ring Road, Shankarpally',
      pincode: '501203',
      description: 'Premium plotted township with gated amenities. Demo inventory for client walkthroughs.',
      reraNumber: 'P02400001234',
      projectType: 'Plotted Development',
      lifecycleStatus: ProjectLifecycle.ACTIVE,
      agentVisible: true,
      customerListed: true,
      resaleAvailable: true,
      totalArea: 25.5,
      areaUnit: 'acres',
      launchDate: daysAgo(180),
      expectedCompletion: daysFromNow(540),
      settingsJson: {
        reservationHoldHoursDefault: 48,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        demo: true,
      },
    },
  });

  for (const agent of [agent1, agent2]) {
    await prisma.projectAgent.upsert({
      where: { projectId_agentId: { projectId: project.id, agentId: agent.id } },
      update: {},
      create: { projectId: project.id, agentId: agent.id },
    });
  }

  const phase1 = await ensureBy(
    () => prisma.phase.findFirst({ where: { projectId: project.id, name: 'Phase 1 — Launch' } }),
    () => prisma.phase.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        name: 'Phase 1 — Launch',
        sortOrder: 0,
        status: 'Active',
        startDate: daysAgo(180),
        endDate: daysFromNow(90),
      },
    }),
    (row) => prisma.phase.update({
      where: { id: row.id },
      data: { status: 'Active', sortOrder: 0, startDate: daysAgo(180), endDate: daysFromNow(90) },
    }),
  );
  const phase2 = await ensureBy(
    () => prisma.phase.findFirst({ where: { projectId: project.id, name: 'Phase 2 — Expansion' } }),
    () => prisma.phase.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        name: 'Phase 2 — Expansion',
        sortOrder: 1,
        status: 'Planned',
        startDate: daysFromNow(120),
        endDate: daysFromNow(540),
      },
    }),
    (row) => prisma.phase.update({
      where: { id: row.id },
      data: { status: 'Planned', sortOrder: 1 },
    }),
  );

  const blockDefs = [
    { name: 'Block A', phaseId: phase1.id, sortOrder: 0 },
    { name: 'Block B', phaseId: phase1.id, sortOrder: 1 },
    { name: 'Block C', phaseId: phase1.id, sortOrder: 2 },
    { name: 'Block D', phaseId: phase2.id, sortOrder: 3 },
  ];
  const blocks: Record<string, { id: string }> = {};
  for (const b of blockDefs) {
    blocks[b.name] = await ensureBy(
      () => prisma.block.findFirst({ where: { projectId: project.id, name: b.name } }),
      () => prisma.block.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          phaseId: b.phaseId,
          name: b.name,
          sortOrder: b.sortOrder,
        },
      }),
      (row) => prisma.block.update({
        where: { id: row.id },
        data: { phaseId: b.phaseId, sortOrder: b.sortOrder },
      }),
    );
  }

  const plotTypeDefs = [
    { name: 'Standard 30x40', code: 'STD-167', areaSqYd: 133.33, lengthFt: 40, widthFt: 30, category: 'Standard' },
    { name: 'Premium 40x50', code: 'PRM-200', areaSqYd: 200, lengthFt: 50, widthFt: 40, category: 'Premium' },
    { name: 'Corner 40x60', code: 'CRN-240', areaSqYd: 240, lengthFt: 60, widthFt: 40, category: 'Corner' },
    { name: 'Villa 50x60', code: 'VIL-300', areaSqYd: 300, lengthFt: 60, widthFt: 50, category: 'Villa' },
  ];
  const plotTypes: Record<string, { id: string; areaSqYd: any; lengthFt: any; widthFt: any }> = {};
  for (const pt of plotTypeDefs) {
    plotTypes[pt.code] = await ensureBy(
      () => prisma.plotType.findFirst({ where: { projectId: project.id, code: pt.code } }),
      () => prisma.plotType.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          name: pt.name,
          code: pt.code,
          areaSqYd: pt.areaSqYd,
          lengthFt: pt.lengthFt,
          widthFt: pt.widthFt,
          category: pt.category,
        },
      }),
      (row) => prisma.plotType.update({
        where: { id: row.id },
        data: {
          name: pt.name,
          areaSqYd: pt.areaSqYd,
          lengthFt: pt.lengthFt,
          widthFt: pt.widthFt,
          category: pt.category,
        },
      }),
    );
  }

  await prisma.pricingRule.upsert({
    where: { projectId: project.id },
    update: {
      baseRatePerSqYd: 12500,
      rulesJson: {
        facingPremium: { NORTH: 0.05, EAST: 0.03, WEST: 0.02, SOUTH: 0 },
        cornerPremiumPct: 0.08,
        roadWidthPremium: { '40': 0.05, '30': 0.02 },
      },
    },
    create: {
      organizationId: org.id,
      projectId: project.id,
      baseRatePerSqYd: 12500,
      rulesJson: {
        facingPremium: { NORTH: 0.05, EAST: 0.03, WEST: 0.02, SOUTH: 0 },
        cornerPremiumPct: 0.08,
        roadWidthPremium: { '40': 0.05, '30': 0.02 },
      },
    },
  });

  const amenityDefs: Array<{
    name: string; groupName: string; status: AmenityStatus; completionPct: number; description?: string;
  }> = [
    { name: 'Gated Entrance & Security', groupName: 'Infrastructure', status: AmenityStatus.COMPLETED, completionPct: 100, description: '24x7 manned gate with CCTV' },
    { name: 'Internal BT Roads', groupName: 'Infrastructure', status: AmenityStatus.COMPLETED, completionPct: 100 },
    { name: 'Underground Drainage', groupName: 'Infrastructure', status: AmenityStatus.IN_PROGRESS, completionPct: 70 },
    { name: 'Clubhouse', groupName: 'Lifestyle', status: AmenityStatus.IN_PROGRESS, completionPct: 45 },
    { name: 'Swimming Pool', groupName: 'Lifestyle', status: AmenityStatus.PLANNED, completionPct: 10 },
    { name: 'Children Play Area', groupName: 'Lifestyle', status: AmenityStatus.COMPLETED, completionPct: 100 },
    { name: 'Landscaped Parks', groupName: 'Green', status: AmenityStatus.IN_PROGRESS, completionPct: 55 },
    { name: 'Rainwater Harvesting', groupName: 'Green', status: AmenityStatus.COMPLETED, completionPct: 100 },
    { name: 'Street Lighting', groupName: 'Infrastructure', status: AmenityStatus.COMPLETED, completionPct: 100 },
    { name: 'Water Supply Network', groupName: 'Infrastructure', status: AmenityStatus.IN_PROGRESS, completionPct: 80 },
  ];
  for (const a of amenityDefs) {
    await ensureBy(
      () => prisma.amenity.findFirst({ where: { projectId: project.id, name: a.name } }),
      () => prisma.amenity.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          name: a.name,
          groupName: a.groupName,
          description: a.description,
          status: a.status,
          completionPct: a.completionPct,
          visibility: DocumentVisibility.AGENT_VISIBLE,
        },
      }),
      (row) => prisma.amenity.update({
        where: { id: row.id },
        data: {
          groupName: a.groupName,
          description: a.description,
          status: a.status,
          completionPct: a.completionPct,
        },
      }),
    );
  }

  const layout = await ensureBy(
    () => prisma.layout.findFirst({ where: { projectId: project.id, name: 'Master Plan — Demo Township' } }),
    () => prisma.layout.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        name: 'Master Plan — Demo Township',
        widthPx: 2000,
        heightPx: 2000,
        metaJson: {
          originalName: 'demo-township-master-plan.png',
          mimeType: 'image/png',
          sizeBytes: 0,
          widthPx: 2000,
          heightPx: 2000,
          viewBox: '0 0 100 100',
          seeded: true,
        },
      },
    }),
    (row) => prisma.layout.update({
      where: { id: row.id },
      data: {
        widthPx: 2000,
        heightPx: 2000,
        metaJson: {
          originalName: 'demo-township-master-plan.png',
          mimeType: 'image/png',
          sizeBytes: 0,
          widthPx: 2000,
          heightPx: 2000,
          viewBox: '0 0 100 100',
          seeded: true,
        },
      },
    }),
  );

  // ── 60 plots with polygons + varied statuses ────────────────────────────
  const facings = [Facing.NORTH, Facing.SOUTH, Facing.EAST, Facing.WEST];
  const typeRotate: Record<string, string[]> = {
    A: ['STD-167', 'PRM-200', 'STD-167', 'CRN-240'],
    B: ['PRM-200', 'STD-167', 'PRM-200', 'VIL-300'],
    C: ['STD-167', 'STD-167', 'PRM-200', 'CRN-240'],
    D: ['PRM-200', 'VIL-300', 'STD-167', 'PRM-200'],
  };
  const letterMeta: Record<string, { phaseId: string; blockName: string }> = {
    A: { phaseId: phase1.id, blockName: 'Block A' },
    B: { phaseId: phase1.id, blockName: 'Block B' },
    C: { phaseId: phase1.id, blockName: 'Block C' },
    D: { phaseId: phase2.id, blockName: 'Block D' },
  };

  const statusPlan: Array<{ status: PlotStatus; role: string }> = Array.from({ length: 60 }, () => ({
    status: PlotStatus.AVAILABLE,
    role: 'available',
  }));
  for (const i of [4, 19, 34, 49, 12]) statusPlan[i] = { status: PlotStatus.RESERVED, role: `res-${i}` };
  for (const i of [1, 16, 31, 46, 7, 22, 37, 52]) statusPlan[i] = { status: PlotStatus.BOOKED, role: `book-${i}` };
  for (const i of [2, 17, 32, 47]) statusPlan[i] = { status: PlotStatus.UNDER_DOCUMENTATION, role: `doc-${i}` };
  for (const i of [3, 18, 33, 48]) statusPlan[i] = { status: PlotStatus.SOLD, role: `sold-${i}` };
  for (const i of [8, 23]) statusPlan[i] = { status: PlotStatus.REGISTERED, role: `reg-${i}` };
  statusPlan[55] = { status: PlotStatus.BLOCKED, role: 'blocked' };
  statusPlan[58] = { status: PlotStatus.CANCELLED, role: 'cancelled' };

  const baseRate = 12500;
  const plotsByNumber: Record<string, { id: string; number: string; totalPrice: number; status: PlotStatus; index: number }> = {};
  let plotIndex = 0;

  for (const letter of ['A', 'B', 'C', 'D'] as const) {
    const meta = letterMeta[letter]!;
    for (let n = 1; n <= 15; n++) {
      const number = `${letter}-${String(n).padStart(2, '0')}`;
      const typeCode = typeRotate[letter]![(n - 1) % 4]!;
      const pt = plotTypes[typeCode]!;
      const area = Number(pt.areaSqYd);
      const facing = facings[(plotIndex + n) % facings.length]!;
      const isCorner = n === 1 || n === 15 || typeCode === 'CRN-240';
      const corner = isCorner
        ? ([CornerCode.NE, CornerCode.NW, CornerCode.SE, CornerCode.SW][n % 4] as typeof CornerCode.NE)
        : CornerCode.NONE;
      let rate = baseRate;
      if (facing === Facing.NORTH) rate = Math.round(rate * 1.05);
      if (facing === Facing.EAST) rate = Math.round(rate * 1.03);
      if (corner !== CornerCode.NONE) rate = Math.round(rate * 1.08);
      const totalPrice = Math.round(area * rate);
      const plan = statusPlan[plotIndex]!;
      const polygon = rectPolygon(n - 1, ['A', 'B', 'C', 'D'].indexOf(letter), 15, 4);
      const roadWidth = n % 3 === 0 ? 40 : 30;

      let customerId: string | null = null;
      let agentId: string | null = null;
      if (
        plan.status === PlotStatus.RESERVED ||
        plan.status === PlotStatus.BOOKED ||
        plan.status === PlotStatus.UNDER_DOCUMENTATION ||
        plan.status === PlotStatus.SOLD ||
        plan.status === PlotStatus.REGISTERED
      ) {
        customerId = allCustomers[plotIndex % allCustomers.length]!.id;
        agentId = (plotIndex % 2 === 0 ? agent1 : agent2).id;
      }

      const row = await prisma.plot.upsert({
        where: { projectId_number: { projectId: project.id, number } },
        update: {
          phaseId: meta.phaseId,
          blockId: blocks[meta.blockName]!.id,
          plotTypeId: pt.id,
          layoutId: layout.id,
          areaSqYd: area,
          lengthFt: pt.lengthFt,
          widthFt: pt.widthFt,
          facing,
          corner,
          roadWidthFt: roadWidth,
          polygonJson: polygon,
          status: plan.status,
          ratePerSqYd: rate,
          totalPrice,
          customerId,
          agentId,
          featuresJson: { seedTag: SEED, typeCode, roadWidthFt: roadWidth },
          notes: `${SEED} ${plan.role}`,
        },
        create: {
          organizationId: org.id,
          projectId: project.id,
          phaseId: meta.phaseId,
          blockId: blocks[meta.blockName]!.id,
          plotTypeId: pt.id,
          layoutId: layout.id,
          number,
          areaSqYd: area,
          lengthFt: pt.lengthFt,
          widthFt: pt.widthFt,
          facing,
          corner,
          roadWidthFt: roadWidth,
          polygonJson: polygon,
          status: plan.status,
          ratePerSqYd: rate,
          totalPrice,
          customerId,
          agentId,
          featuresJson: { seedTag: SEED, typeCode, roadWidthFt: roadWidth },
          notes: `${SEED} ${plan.role}`,
        },
      });

      plotsByNumber[number] = {
        id: row.id,
        number,
        totalPrice,
        status: plan.status,
        index: plotIndex,
      };
      plotIndex++;
    }
  }

  // ── Leads ───────────────────────────────────────────────────────────────
  const leadDefs: Array<{
    key: string; name: string; phone: string; email: string; stage: LeadStage;
    agentId: string; customerId?: string; source: string;
  }> = [
    { key: 'lead-new-1', name: 'Ravi Teja', phone: '9100000101', email: 'ravi.teja@demo.bhairava', stage: LeadStage.NEW, agentId: agent1.id, source: 'website' },
    { key: 'lead-contacted', name: 'Lakshmi Devi', phone: '9100000102', email: 'lakshmi@demo.bhairava', stage: LeadStage.CONTACTED, agentId: agent2.id, source: 'referral' },
    { key: 'lead-qualified', name: 'Mohammed Irfan', phone: '9100000103', email: 'irfan@demo.bhairava', stage: LeadStage.QUALIFIED, agentId: agent1.id, source: 'meta-ads' },
    { key: 'lead-visit-planned', name: 'Swathi Krishnan', phone: '9100000104', email: 'swathi@demo.bhairava', stage: LeadStage.SITE_VISIT_PLANNED, agentId: agent2.id, source: 'walk-in' },
    { key: 'lead-visit-done', name: 'Deepak Sharma', phone: '9100000105', email: 'deepak@demo.bhairava', stage: LeadStage.SITE_VISIT_COMPLETED, agentId: agent1.id, source: 'broker' },
    { key: 'lead-interested', name: 'Nisha Agarwal', phone: '9100000106', email: 'nisha@demo.bhairava', stage: LeadStage.INTERESTED, agentId: agent2.id, source: 'website' },
    { key: 'lead-negotiation', name: 'Prakash Rao', phone: '9100000107', email: 'prakash@demo.bhairava', stage: LeadStage.NEGOTIATION, agentId: agent1.id, source: 'referral' },
    { key: 'lead-reserved', name: 'Anita Desai', phone: '9100000108', email: 'anita@demo.bhairava', stage: LeadStage.RESERVED, agentId: agent2.id, customerId: extras[2]?.id, source: 'site-visit' },
    { key: 'lead-booked', name: 'Demo Customer 1', phone: '9000000001', email: 'customer@bhairava.demo', stage: LeadStage.BOOKED, agentId: agent1.id, customerId: customer1.id, source: 'referral' },
    { key: 'lead-lost', name: 'Ganesh Pillai', phone: '9100000109', email: 'ganesh@demo.bhairava', stage: LeadStage.LOST, agentId: agent2.id, source: 'cold-call' },
    { key: 'lead-new-2', name: 'Harini Prasad', phone: '9100000110', email: 'harini@demo.bhairava', stage: LeadStage.NEW, agentId: agent1.id, source: 'instagram' },
    { key: 'lead-qualified-2', name: 'Imran Khan', phone: '9100000111', email: 'imran@demo.bhairava', stage: LeadStage.QUALIFIED, agentId: agent2.id, source: 'website' },
  ];
  const leadsByKey: Record<string, { id: string }> = {};
  for (const ld of leadDefs) {
    const notes = `${SEED} ${ld.key}`;
    const existing = await prisma.lead.findFirst({ where: { projectId: project.id, notes } });
    const row = existing
      ? await prisma.lead.update({
          where: { id: existing.id },
          data: {
            name: ld.name, phone: ld.phone, email: ld.email, stage: ld.stage,
            agentId: ld.agentId, customerId: ld.customerId, source: ld.source,
            lostReason: ld.stage === LeadStage.LOST ? 'Budget mismatch' : null,
          },
        })
      : await prisma.lead.create({
          data: {
            organizationId: org.id, projectId: project.id,
            name: ld.name, phone: ld.phone, email: ld.email, stage: ld.stage,
            agentId: ld.agentId, customerId: ld.customerId, source: ld.source, notes,
            lostReason: ld.stage === LeadStage.LOST ? 'Budget mismatch' : null,
          },
        });
    leadsByKey[ld.key] = row;
  }

  // ── Site visits ─────────────────────────────────────────────────────────
  const visitDefs: Array<{
    key: string; leadKey: string; status: SiteVisitStatus; at: Date; agentId: string; customerId?: string;
  }> = [
    { key: 'visit-1', leadKey: 'lead-visit-planned', status: SiteVisitStatus.SCHEDULED, at: daysFromNow(3), agentId: agent2.id },
    { key: 'visit-2', leadKey: 'lead-visit-done', status: SiteVisitStatus.COMPLETED, at: daysAgo(5), agentId: agent1.id },
    { key: 'visit-3', leadKey: 'lead-interested', status: SiteVisitStatus.COMPLETED, at: daysAgo(12), agentId: agent2.id },
    { key: 'visit-4', leadKey: 'lead-negotiation', status: SiteVisitStatus.COMPLETED, at: daysAgo(8), agentId: agent1.id },
    { key: 'visit-5', leadKey: 'lead-qualified', status: SiteVisitStatus.SCHEDULED, at: daysFromNow(7), agentId: agent1.id },
    { key: 'visit-6', leadKey: 'lead-lost', status: SiteVisitStatus.NO_SHOW, at: daysAgo(20), agentId: agent2.id },
    { key: 'visit-7', leadKey: 'lead-booked', status: SiteVisitStatus.COMPLETED, at: daysAgo(45), agentId: agent1.id, customerId: customer1.id },
    { key: 'visit-8', leadKey: 'lead-reserved', status: SiteVisitStatus.COMPLETED, at: daysAgo(10), agentId: agent2.id },
  ];
  for (const v of visitDefs) {
    const notes = `${SEED} ${v.key}`;
    const existing = await prisma.siteVisit.findFirst({ where: { projectId: project.id, notes } });
    const data = {
      organizationId: org.id,
      projectId: project.id,
      leadId: leadsByKey[v.leadKey]?.id,
      customerId: v.customerId ?? null,
      agentId: v.agentId,
      scheduledAt: v.at,
      status: v.status,
      notes,
    };
    if (existing) await prisma.siteVisit.update({ where: { id: existing.id }, data });
    else await prisma.siteVisit.create({ data });
  }

  // ── Reservation / booking helpers ───────────────────────────────────────
  async function ensureReservation(opts: {
    key: string; plotNumber: string; customerId: string; agentId: string;
    state: ReservationState; expiresInDays: number; amountPaise: bigint; leadKey?: string;
  }) {
    const plot = plotsByNumber[opts.plotNumber]!;
    const notes = `${SEED} ${opts.key}`;
    const existing = await prisma.reservation.findFirst({
      where: { projectId: project.id, plotId: plot.id, notes },
    });
    const data = {
      organizationId: org.id,
      projectId: project.id,
      plotId: plot.id,
      customerId: opts.customerId,
      agentId: opts.agentId,
      leadId: opts.leadKey ? leadsByKey[opts.leadKey]?.id : undefined,
      state: opts.state,
      reservedAt: daysAgo(5),
      expiresAt: daysFromNow(opts.expiresInDays),
      amountPaise: opts.amountPaise,
      notes,
    };
    if (existing) return prisma.reservation.update({ where: { id: existing.id }, data });
    return prisma.reservation.create({ data });
  }

  async function ensureBooking(opts: {
    key: string; plotNumber: string; customerId: string; agentId: string;
    state: BookingState; reservationId?: string;
    agreementPaise: bigint; advancePaise: bigint; bookedDaysAgo: number;
  }) {
    const plot = plotsByNumber[opts.plotNumber]!;
    const notes = `${SEED} ${opts.key}`;
    const existing = await prisma.booking.findFirst({
      where: { projectId: project.id, plotId: plot.id, notes },
    });
    if (existing) {
      return prisma.booking.update({
        where: { id: existing.id },
        data: {
          customerId: opts.customerId,
          agentId: opts.agentId,
          state: opts.state,
          agreementValuePaise: opts.agreementPaise,
          advancePaise: opts.advancePaise,
          bookedAt: daysAgo(opts.bookedDaysAgo),
          notes,
        },
      });
    }
    return prisma.booking.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        plotId: plot.id,
        customerId: opts.customerId,
        agentId: opts.agentId,
        reservationId: opts.reservationId,
        state: opts.state,
        bookedAt: daysAgo(opts.bookedDaysAgo),
        agreementValuePaise: opts.agreementPaise,
        advancePaise: opts.advancePaise,
        notes,
      },
    });
  }

  async function ensureScheduleAndPayments(
    booking: { id: string; customerId: string; plotId: string; agreementValuePaise: bigint; advancePaise: bigint },
    key: string,
    paidInstallments: number,
  ) {
    const advance = booking.advancePaise;
    const remaining = booking.agreementValuePaise - advance;
    const installmentCount = 4;
    const each = remaining / BigInt(installmentCount);

    {
      const notes = `${SEED} ${key}-inst-0`;
      let item = await prisma.paymentScheduleItem.findFirst({ where: { bookingId: booking.id, notes } });
      const itemData = {
        organizationId: org.id,
        bookingId: booking.id,
        projectId: project.id,
        customerId: booking.customerId,
        plotId: booking.plotId,
        installmentNumber: 0,
        name: 'Booking Advance',
        dueDate: daysAgo(30),
        amountDuePaise: advance,
        status: InstallmentStatus.PAID,
        notes,
      };
      item = item
        ? await prisma.paymentScheduleItem.update({ where: { id: item.id }, data: itemData })
        : await prisma.paymentScheduleItem.create({ data: itemData });

      const payNotes = `${SEED} ${key}-pay-0`;
      const existingPay = await prisma.payment.findFirst({ where: { bookingId: booking.id, notes: payNotes } });
      if (!existingPay) {
        const payment = await prisma.payment.create({
          data: {
            organizationId: org.id,
            bookingId: booking.id,
            customerId: booking.customerId,
            projectId: project.id,
            plotId: booking.plotId,
            scheduleItemId: item.id,
            amountPaise: advance,
            paidAt: daysAgo(30),
            method: PaymentMethod.UPI,
            txnRef: `DEMO-UPI-${key}-0`,
            receiptNumber: `RCP-DEMO-${key}-0`,
            recordedByUserId: userIds['finance@bhairava.demo'],
            reconciliationStatus: ReconciliationStatus.RECONCILED,
            notes: payNotes,
          },
        });
        await prisma.receipt.create({
          data: {
            organizationId: org.id,
            paymentId: payment.id,
            bookingId: booking.id,
            receiptNumber: `RCP-DEMO-${key}-0`,
            issuedAt: daysAgo(30),
            metaJson: { seedTag: SEED },
          },
        });
      }
    }

    for (let i = 1; i <= installmentCount; i++) {
      const notes = `${SEED} ${key}-inst-${i}`;
      let item = await prisma.paymentScheduleItem.findFirst({ where: { bookingId: booking.id, notes } });
      const paid = i <= paidInstallments;
      const overdue = !paid && i === paidInstallments + 1 && paidInstallments < 2;
      const status = paid
        ? InstallmentStatus.PAID
        : overdue
          ? InstallmentStatus.OVERDUE
          : i === paidInstallments + 1
            ? InstallmentStatus.DUE
            : InstallmentStatus.UPCOMING;
      const amount = i === installmentCount ? remaining - each * BigInt(installmentCount - 1) : each;
      const itemData = {
        organizationId: org.id,
        bookingId: booking.id,
        projectId: project.id,
        customerId: booking.customerId,
        plotId: booking.plotId,
        installmentNumber: i,
        name: `Installment ${i}`,
        dueDate: daysFromNow(-30 + i * 30),
        amountDuePaise: amount,
        status,
        notes,
      };
      item = item
        ? await prisma.paymentScheduleItem.update({ where: { id: item.id }, data: itemData })
        : await prisma.paymentScheduleItem.create({ data: itemData });

      if (paid) {
        const payNotes = `${SEED} ${key}-pay-${i}`;
        const existingPay = await prisma.payment.findFirst({ where: { bookingId: booking.id, notes: payNotes } });
        if (!existingPay) {
          const payment = await prisma.payment.create({
            data: {
              organizationId: org.id,
              bookingId: booking.id,
              customerId: booking.customerId,
              projectId: project.id,
              plotId: booking.plotId,
              scheduleItemId: item.id,
              amountPaise: amount,
              paidAt: daysFromNow(-30 + i * 30 - 2),
              method: i % 2 === 0 ? PaymentMethod.BANK_TRANSFER : PaymentMethod.UPI,
              txnRef: `DEMO-TXN-${key}-${i}`,
              receiptNumber: `RCP-DEMO-${key}-${i}`,
              recordedByUserId: userIds['finance@bhairava.demo'],
              reconciliationStatus:
                i <= 2 ? ReconciliationStatus.RECONCILED : ReconciliationStatus.UNRECONCILED,
              notes: payNotes,
            },
          });
          await prisma.receipt.create({
            data: {
              organizationId: org.id,
              paymentId: payment.id,
              bookingId: booking.id,
              receiptNumber: `RCP-DEMO-${key}-${i}`,
              issuedAt: daysFromNow(-30 + i * 30 - 2),
              metaJson: { seedTag: SEED },
            },
          });
        }
      }
    }
  }

  // Reservations for RESERVED plots
  const reservedNums = Object.values(plotsByNumber)
    .filter((p) => p.status === PlotStatus.RESERVED)
    .map((p) => p.number);
  for (let i = 0; i < reservedNums.length; i++) {
    const num = reservedNums[i]!;
    const plot = plotsByNumber[num]!;
    const cust = allCustomers[(plot.index + 2) % allCustomers.length]!;
    const ag = plot.index % 2 === 0 ? agent1 : agent2;
    await ensureReservation({
      key: `res-${num}`,
      plotNumber: num,
      customerId: cust.id,
      agentId: ag.id,
      state: i === 0 ? ReservationState.EXPIRING_TODAY : ReservationState.ACTIVE,
      expiresInDays: i === 0 ? 0 : 2 + i,
      amountPaise: 5_000_000n,
      leadKey: i === 0 ? 'lead-reserved' : undefined,
    });
  }

  // Bookings for sold pipeline
  const bookingStatuses = new Set([
    PlotStatus.BOOKED,
    PlotStatus.UNDER_DOCUMENTATION,
    PlotStatus.SOLD,
    PlotStatus.REGISTERED,
  ]);
  const bookingPlots = Object.values(plotsByNumber).filter((p) => bookingStatuses.has(p.status));
  let seededBookings = 0;

  for (const plotInfo of bookingPlots) {
    const cust = allCustomers[plotInfo.index % allCustomers.length]!;
    const ag = plotInfo.index % 2 === 0 ? agent1 : agent2;
    const agreementPaise = BigInt(Math.round(plotInfo.totalPrice * 100));
    const advancePaise = 20_000_000n;
    const key = `book-${plotInfo.number}`;

    const res = await ensureReservation({
      key: `res-for-${plotInfo.number}`,
      plotNumber: plotInfo.number,
      customerId: cust.id,
      agentId: ag.id,
      state: ReservationState.CONVERTED,
      expiresInDays: -10,
      amountPaise: 5_000_000n,
    });

    let bookingState = BookingState.ACTIVE;
    if (plotInfo.status === PlotStatus.UNDER_DOCUMENTATION) bookingState = BookingState.UNDER_DOCUMENTATION;
    if (plotInfo.status === PlotStatus.SOLD || plotInfo.status === PlotStatus.REGISTERED) {
      bookingState = BookingState.COMPLETED;
    }

    const booking = await ensureBooking({
      key,
      plotNumber: plotInfo.number,
      customerId: cust.id,
      agentId: ag.id,
      state: bookingState,
      reservationId: res.id,
      agreementPaise,
      advancePaise,
      bookedDaysAgo: 20 + (plotInfo.index % 40),
    });

    if (!booking.reservationId) {
      try {
        await prisma.booking.update({ where: { id: booking.id }, data: { reservationId: res.id } });
      } catch {
        /* unique conflict ok */
      }
    }

    const paidInst =
      plotInfo.status === PlotStatus.REGISTERED ? 4
        : plotInfo.status === PlotStatus.SOLD ? 3
          : plotInfo.status === PlotStatus.UNDER_DOCUMENTATION ? 2
            : 1;

    await ensureScheduleAndPayments(
      {
        id: booking.id,
        customerId: cust.id,
        plotId: plotInfo.id,
        agreementValuePaise: agreementPaise,
        advancePaise,
      },
      key,
      paidInst,
    );

    const commissionNotes = `${SEED} ${key}-comm`;
    const existingComm = await prisma.commission.findFirst({
      where: { bookingId: booking.id, notes: commissionNotes },
    });
    const commissionAmount = agreementPaise / 50n;
    const commStatus =
      plotInfo.status === PlotStatus.REGISTERED || plotInfo.status === PlotStatus.SOLD
        ? CommissionStatus.APPROVED
        : plotInfo.status === PlotStatus.UNDER_DOCUMENTATION
          ? CommissionStatus.EARNED
          : CommissionStatus.PENDING;
    if (existingComm) {
      await prisma.commission.update({
        where: { id: existingComm.id },
        data: {
          amountPaise: commissionAmount,
          status: commStatus,
          agentId: ag.id,
          earnedAt: daysAgo(10),
          approvedAt: commStatus === CommissionStatus.APPROVED ? daysAgo(3) : null,
        },
      });
    } else {
      await prisma.commission.create({
        data: {
          organizationId: org.id,
          bookingId: booking.id,
          agentId: ag.id,
          amountPaise: commissionAmount,
          status: commStatus,
          earnedAt: daysAgo(10),
          approvedAt: commStatus === CommissionStatus.APPROVED ? daysAgo(3) : null,
          notes: commissionNotes,
        },
      });
    }

    const regStatus =
      plotInfo.status === PlotStatus.REGISTERED
        ? RegistrationStatus.COMPLETED
        : plotInfo.status === PlotStatus.SOLD || plotInfo.status === PlotStatus.UNDER_DOCUMENTATION
          ? RegistrationStatus.IN_PROGRESS
          : RegistrationStatus.NOT_STARTED;
    await prisma.registration.upsert({
      where: { bookingId: booking.id },
      update: {
        status: regStatus,
        deedNumber: regStatus === RegistrationStatus.COMPLETED ? `DEED-DEMO-${plotInfo.number}` : null,
        registeredAt: regStatus === RegistrationStatus.COMPLETED ? daysAgo(5) : null,
        notes: `${SEED} ${key}-reg`,
      },
      create: {
        organizationId: org.id,
        projectId: project.id,
        bookingId: booking.id,
        customerId: cust.id,
        status: regStatus,
        deedNumber: regStatus === RegistrationStatus.COMPLETED ? `DEED-DEMO-${plotInfo.number}` : null,
        registeredAt: regStatus === RegistrationStatus.COMPLETED ? daysAgo(5) : null,
        notes: `${SEED} ${key}-reg`,
      },
    });

    const docTitle = `Sale Agreement — ${plotInfo.number}`;
    const existingDoc = await prisma.document.findFirst({
      where: { organizationId: org.id, bookingId: booking.id, title: docTitle },
    });
    if (!existingDoc) {
      await prisma.document.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          bookingId: booking.id,
          customerId: cust.id,
          visibility: DocumentVisibility.CUSTOMER_PROFILE_RELATED,
          title: docTitle,
          docType: 'sale-agreement',
          storageKey: `${org.id}/bookings/${booking.id}/sale-agreement.pdf`,
          mimeType: 'application/pdf',
          sizeBytes: 245760n,
          uploadedById: userIds['admin@bhairava.demo'],
        },
      });
    }

    seededBookings++;
  }

  const projectDocs: Array<{ title: string; visibility: DocumentVisibility; docType: string; key: string }> = [
    { title: 'INTERNAL Pricing Sheet', visibility: DocumentVisibility.INTERNAL, docType: 'pricing', key: 'internal-pricing.pdf' },
    { title: 'RERA Certificate', visibility: DocumentVisibility.AGENT_VISIBLE, docType: 'rera', key: 'rera-certificate.pdf' },
    { title: 'Project Brochure', visibility: DocumentVisibility.AGENT_VISIBLE, docType: 'brochure', key: 'brochure.pdf' },
    { title: 'Layout Approval Copy', visibility: DocumentVisibility.AGENT_VISIBLE, docType: 'approval', key: 'layout-approval.pdf' },
    { title: 'Customer Welcome Pack', visibility: DocumentVisibility.CUSTOMER_PROFILE_RELATED, docType: 'welcome', key: 'welcome-pack.pdf' },
  ];
  for (const d of projectDocs) {
    const existing = await prisma.document.findFirst({
      where: { organizationId: org.id, projectId: project.id, title: d.title, bookingId: null },
    });
    if (!existing) {
      await prisma.document.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          visibility: d.visibility,
          title: d.title,
          docType: d.docType,
          storageKey: `${org.id}/documents/${d.key}`,
          mimeType: 'application/pdf',
          sizeBytes: 102400n,
          uploadedById: userIds['admin@bhairava.demo'],
        },
      });
    }
  }

  await prisma.companySettings.upsert({
    where: { organizationId: org.id },
    update: {
      settingsJson: {
        reservationHoldHoursDefault: 48,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        demo: true,
        commissionDefaultPct: 2,
      },
    },
    create: {
      organizationId: org.id,
      settingsJson: {
        reservationHoldHoursDefault: 48,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        demo: true,
        commissionDefaultPct: 2,
      },
    },
  });

  const [
    phaseCount, blockCount, plotTypeCount, amenityCount, layoutCount,
    plotCount, customerCount, leadCount, visitCount,
    reservationCount, bookingCountDb, paymentCount, scheduleCount,
    commissionCount, registrationCount, documentCount,
  ] = await Promise.all([
    prisma.phase.count({ where: { projectId: project.id } }),
    prisma.block.count({ where: { projectId: project.id } }),
    prisma.plotType.count({ where: { projectId: project.id } }),
    prisma.amenity.count({ where: { projectId: project.id } }),
    prisma.layout.count({ where: { projectId: project.id } }),
    prisma.plot.count({ where: { projectId: project.id } }),
    prisma.customer.count({ where: { organizationId: org.id } }),
    prisma.lead.count({ where: { projectId: project.id } }),
    prisma.siteVisit.count({ where: { projectId: project.id } }),
    prisma.reservation.count({ where: { projectId: project.id } }),
    prisma.booking.count({ where: { projectId: project.id } }),
    prisma.payment.count({ where: { organizationId: org.id } }),
    prisma.paymentScheduleItem.count({ where: { organizationId: org.id } }),
    prisma.commission.count({ where: { organizationId: org.id } }),
    prisma.registration.count({ where: { projectId: project.id } }),
    prisma.document.count({ where: { organizationId: org.id } }),
  ]);

  const plotsWithPolygon = await prisma.plot.count({
    where: { projectId: project.id, NOT: { polygonJson: { equals: [] } } },
  });

  console.log('Demo seed complete.');
  console.log(JSON.stringify({
    org: org.code,
    projectId: project.id,
    projectCode: project.code,
    counts: {
      phases: phaseCount,
      blocks: blockCount,
      plotTypes: plotTypeCount,
      amenities: amenityCount,
      layouts: layoutCount,
      plots: plotCount,
      plotsWithPolygon,
      customers: customerCount,
      leads: leadCount,
      siteVisits: visitCount,
      reservations: reservationCount,
      bookings: bookingCountDb,
      paymentSchedules: scheduleCount,
      payments: paymentCount,
      commissions: commissionCount,
      registrations: registrationCount,
      documents: documentCount,
      seededBookingsThisRun: seededBookings,
    },
    logins: users.map((u) => u.email),
  }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
