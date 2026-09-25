/**
 * Demo seed — coherent with client-test personas.
 * NOT for production. Founder bootstrap is separate (prisma/bootstrap/founder.ts).
 *
 * Personas (password Demo@12345):
 *   founder@ admin@ finance@ viewer@ agent@ agent2@ customer@ customer2@
 */
import {
  PrismaClient,
  RoleCode,
  PlotStatus,
  ProjectLifecycle,
  UserAccountStatus,
  DocumentVisibility,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Demo@12345';

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
}


async function ensureCustomer(params: {
  organizationId: string;
  email: string;
  name: string;
  phone: string;
  userId: string;
  agentId: string;
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
        userId: params.userId,
        agentId: params.agentId,
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
      city: 'Hyderabad',
    },
  });
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
      update: { passwordHash, roleCode: u.roleCode, status: UserAccountStatus.ACTIVE, displayName: u.displayName },
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
    update: { name: 'Demo Agent 1', code: 'AG-01' },
    create: {
      organizationId: org.id,
      userId: userIds['agent@bhairava.demo'],
      code: 'AG-01',
      name: 'Demo Agent 1',
    },
  });
  const agent2 = await prisma.agentProfile.upsert({
    where: { userId: userIds['agent2@bhairava.demo'] },
    update: { name: 'Demo Agent 2', code: 'AG-02' },
    create: {
      organizationId: org.id,
      userId: userIds['agent2@bhairava.demo'],
      code: 'AG-02',
      name: 'Demo Agent 2',
    },
  });

  const customer1 = await ensureCustomer({
    organizationId: org.id,
    email: 'customer@bhairava.demo',
    name: 'Demo Customer 1',
    phone: '9000000001',
    userId: userIds['customer@bhairava.demo'],
    agentId: agent1.id,
  });
  const customer2 = await ensureCustomer({
    organizationId: org.id,
    email: 'customer2@bhairava.demo',
    name: 'Demo Customer 2',
    phone: '9000000002',
    userId: userIds['customer2@bhairava.demo'],
    agentId: agent2.id,
  });

  const project = await prisma.project.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'DEMO-1' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Demo Township',
      code: 'DEMO-1',
      city: 'Hyderabad',
      lifecycleStatus: ProjectLifecycle.ACTIVE,
      agentVisible: true,
      customerListed: true,
    },
  });

  for (let i = 1; i <= 8; i++) {
    const number = `A-${String(i).padStart(2, '0')}`;
    await prisma.plot.upsert({
      where: { projectId_number: { projectId: project.id, number } },
      update: {},
      create: {
        organizationId: org.id,
        projectId: project.id,
        number,
        areaSqYd: 200,
        status: PlotStatus.AVAILABLE,
        ratePerSqYd: 10000,
        totalPrice: 2000000,
      },
    });
  }

  const existingInternal = await prisma.document.findFirst({
    where: { organizationId: org.id, title: 'INTERNAL Pricing Sheet' },
  });
  if (!existingInternal) {
    await prisma.document.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        visibility: DocumentVisibility.INTERNAL,
        title: 'INTERNAL Pricing Sheet',
        docType: 'pricing',
        storageKey: `${org.id}/documents/internal-pricing.pdf`,
        mimeType: 'application/pdf',
        uploadedById: userIds['admin@bhairava.demo'],
      },
    });
  }

  await prisma.companySettings.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      settingsJson: {
        reservationHoldHoursDefault: 48,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        demo: true,
      },
    },
  });

  console.log('Demo seed complete.');
  console.log(JSON.stringify({
    org: org.code,
    project: project.code,
    agents: [agent1.code, agent2.code],
    customers: [customer1.id, customer2.id],
    logins: users.map((u) => u.email),
    password: DEMO_PASSWORD,
  }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
