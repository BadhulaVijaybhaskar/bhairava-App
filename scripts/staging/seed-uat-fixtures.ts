/**
 * Staging UAT fixtures � synthetic only. Passwords from env. Never the banned demo password.
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

type Persona = {
  key: string;
  emailEnv: string;
  passEnv: string;
  roleCode: RoleCode;
  displayName: string;
};

const personas: Persona[] = [
  { key: 'admin', emailEnv: 'STAGING_ADMIN_EMAIL', passEnv: 'STAGING_ADMIN_PASSWORD', roleCode: RoleCode.ADMINISTRATOR, displayName: 'Staging Admin' },
  { key: 'finance', emailEnv: 'STAGING_FINANCE_EMAIL', passEnv: 'STAGING_FINANCE_PASSWORD', roleCode: RoleCode.FINANCE, displayName: 'Staging Finance' },
  { key: 'viewer', emailEnv: 'STAGING_VIEWER_EMAIL', passEnv: 'STAGING_VIEWER_PASSWORD', roleCode: RoleCode.VIEWER, displayName: 'Staging Viewer' },
  { key: 'agent1', emailEnv: 'STAGING_AGENT1_EMAIL', passEnv: 'STAGING_AGENT1_PASSWORD', roleCode: RoleCode.AGENT, displayName: 'Staging Agent 1' },
  { key: 'agent2', emailEnv: 'STAGING_AGENT2_EMAIL', passEnv: 'STAGING_AGENT2_PASSWORD', roleCode: RoleCode.AGENT, displayName: 'Staging Agent 2' },
  { key: 'customer1', emailEnv: 'STAGING_CUSTOMER1_EMAIL', passEnv: 'STAGING_CUSTOMER1_PASSWORD', roleCode: RoleCode.CUSTOMER, displayName: 'Staging Customer 1' },
  { key: 'customer2', emailEnv: 'STAGING_CUSTOMER2_EMAIL', passEnv: 'STAGING_CUSTOMER2_PASSWORD', roleCode: RoleCode.CUSTOMER, displayName: 'Staging Customer 2' },
];

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
  if ((process.env.NODE_ENV || '') === 'production') {
    console.error('Refusing staging fixtures in production');
    process.exit(2);
  }
  const orgCode = (process.env.FOUNDER_ORG_CODE || 'BHAIRAVA-STG').trim().toUpperCase();
  const org = await prisma.organization.findUnique({ where: { code: orgCode } });
  if (!org) {
    console.error(`Organization ${orgCode} not found. Run founder bootstrap first.`);
    process.exit(1);
  }

  const userIds: Record<string, string> = {};
  for (const p of personas) {
    const email = (process.env[p.emailEnv] || '').trim().toLowerCase();
    const password = process.env[p.passEnv] || '';
    if (!email || !password) {
      console.error(`Missing ${p.emailEnv}/${p.passEnv}`);
      process.exit(1);
    }
    if (password.length < 12 || new RegExp(['demo','@','12345'].join(''), 'i').test(password)) {
      console.error(`Invalid staging password for ${p.key}`);
      process.exit(1);
    }
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const row = await prisma.user.upsert({
      where: { organizationId_email: { organizationId: org.id, email } },
      update: {
        passwordHash,
        roleCode: p.roleCode,
        status: UserAccountStatus.ACTIVE,
        displayName: p.displayName,
      },
      create: {
        organizationId: org.id,
        email,
        passwordHash,
        displayName: p.displayName,
        roleCode: p.roleCode,
        status: UserAccountStatus.ACTIVE,
      },
    });
    userIds[p.key] = row.id;
  }

  const agent1 = await prisma.agentProfile.upsert({
    where: { userId: userIds.agent1 },
    update: { name: 'Staging Agent 1', code: 'STG-AG-01' },
    create: {
      organizationId: org.id,
      userId: userIds.agent1,
      code: 'STG-AG-01',
      name: 'Staging Agent 1',
    },
  });
  const agent2 = await prisma.agentProfile.upsert({
    where: { userId: userIds.agent2 },
    update: { name: 'Staging Agent 2', code: 'STG-AG-02' },
    create: {
      organizationId: org.id,
      userId: userIds.agent2,
      code: 'STG-AG-02',
      name: 'Staging Agent 2',
    },
  });

  const customer1 = await ensureCustomer({
    organizationId: org.id,
    email: process.env.STAGING_CUSTOMER1_EMAIL!.toLowerCase(),
    name: 'Staging Customer 1',
    phone: '9100000001',
    userId: userIds.customer1,
    agentId: agent1.id,
  });
  const customer2 = await ensureCustomer({
    organizationId: org.id,
    email: process.env.STAGING_CUSTOMER2_EMAIL!.toLowerCase(),
    name: 'Staging Customer 2',
    phone: '9100000002',
    userId: userIds.customer2,
    agentId: agent2.id,
  });

  const project = await prisma.project.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'STG-1' } },
    update: {
      agentVisible: true,
      customerListed: true,
      lifecycleStatus: ProjectLifecycle.ACTIVE,
    },
    create: {
      organizationId: org.id,
      name: 'Staging Township',
      code: 'STG-1',
      city: 'Hyderabad',
      lifecycleStatus: ProjectLifecycle.ACTIVE,
      agentVisible: true,
      customerListed: true,
    },
  });

  for (let i = 1; i <= 12; i++) {
    const number = `S-${String(i).padStart(2, '0')}`;
    await prisma.plot.upsert({
      where: { projectId_number: { projectId: project.id, number } },
      update: {},
      create: {
        organizationId: org.id,
        projectId: project.id,
        number,
        areaSqYd: 200,
        status: PlotStatus.AVAILABLE,
        ratePerSqYd: 12000,
        totalPrice: 2400000,
      },
    });
  }

  const existingInternal = await prisma.document.findFirst({
    where: { organizationId: org.id, title: 'INTERNAL Staging Pricing' },
  });
  if (!existingInternal) {
    await prisma.document.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        visibility: DocumentVisibility.INTERNAL,
        title: 'INTERNAL Staging Pricing',
        docType: 'pricing',
        storageKey: `${org.id}/documents/internal-staging-pricing.pdf`,
        mimeType: 'application/pdf',
        uploadedById: userIds.admin,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      actorId: userIds.admin,
      action: 'staging.fixtures.seeded',
      entityType: 'Organization',
      entityId: org.id,
      metaJson: { personas: Object.keys(userIds), project: project.code },
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        org: org.code,
        project: project.code,
        agents: [agent1.code, agent2.code],
        customers: [customer1.id, customer2.id],
        users: Object.keys(userIds),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
