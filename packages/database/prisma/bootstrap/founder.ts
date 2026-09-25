/**
 * Founder bootstrap ? SEPARATE from demo seeds.
 * Creates one Organization + FOUNDER user from env.
 * Safe to re-run (upserts by org code / email).
 *
 * Required env: DATABASE_URL, FOUNDER_EMAIL, FOUNDER_PASSWORD
 * Optional: FOUNDER_ORG_NAME, FOUNDER_ORG_CODE, FOUNDER_DISPLAY_NAME
 * Guard: ALLOW_FOUNDER_BOOTSTRAP=yes (required when NODE_ENV=production)
 *
 * Usage: npm run db:bootstrap -w @bhairava/database
 *
 * NEVER uses Demo@12345. Production passwords must be unique & strong.
 */
import { PrismaClient, RoleCode, UserAccountStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const FORBIDDEN_PASSWORDS = [
  'Demo@12345',
  'password',
  'Password1',
  'Password123',
  'admin',
  'founder',
  'change-me',
];

async function main() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const allow = (process.env.ALLOW_FOUNDER_BOOTSTRAP || '').toLowerCase();
  if (nodeEnv === 'production' && allow !== 'yes' && allow !== 'true' && allow !== '1') {
    console.error(
      'Refusing founder bootstrap in production without ALLOW_FOUNDER_BOOTSTRAP=yes',
    );
    process.exit(2);
  }

  const email = (process.env.FOUNDER_EMAIL || '').trim().toLowerCase();
  const password = process.env.FOUNDER_PASSWORD || '';
  const orgName = process.env.FOUNDER_ORG_NAME || 'Bhairava';
  const orgCode = (process.env.FOUNDER_ORG_CODE || 'BHAIRAVA').trim().toUpperCase();
  const displayName = process.env.FOUNDER_DISPLAY_NAME || 'Founder';

  if (!email || !password) {
    console.error('FOUNDER_EMAIL and FOUNDER_PASSWORD are required');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('FOUNDER_PASSWORD must be at least 12 characters');
    process.exit(1);
  }
  if (FORBIDDEN_PASSWORDS.some((p) => p.toLowerCase() === password.toLowerCase())) {
    console.error('FOUNDER_PASSWORD is a known demo/weak password and is forbidden');
    process.exit(1);
  }
  if (/demo@12345/i.test(password) || /bhairava\.demo/i.test(email)) {
    console.error('Demo personas must not be used for founder bootstrap');
    process.exit(1);
  }

  const org = await prisma.organization.upsert({
    where: { code: orgCode },
    update: { name: orgName },
    create: { name: orgName, code: orgCode },
  });

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email } },
    update: {
      passwordHash,
      roleCode: RoleCode.FOUNDER,
      status: UserAccountStatus.ACTIVE,
      displayName,
    },
    create: {
      organizationId: org.id,
      email,
      passwordHash,
      displayName,
      roleCode: RoleCode.FOUNDER,
      status: UserAccountStatus.ACTIVE,
    },
  });

  await prisma.companySettings.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      settingsJson: {
        reservationHoldHoursDefault: 48,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        bootstrappedAt: new Date().toISOString(),
        mustRotateFounderPassword: true,
      },
    },
  });

  console.log(JSON.stringify({
    ok: true,
    organizationId: org.id,
    orgCode: org.code,
    founderUserId: user.id,
    founderEmail: user.email,
    note: 'Demo seeds were NOT applied. Run prisma db seed only for demo/staging data. Force password rotation on first interactive login where applicable.',
  }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
