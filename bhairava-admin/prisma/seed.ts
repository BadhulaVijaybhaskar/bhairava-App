import "dotenv/config";
import { PrismaClient, PlotStatus, ProjectStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const ROLES = [
  { code: "ADMIN", name: "Administrator", description: "Full system access" },
  { code: "SALES_MANAGER", name: "Sales Manager", description: "Manage sales team and bookings" },
  { code: "SALES_AGENT", name: "Sales Agent", description: "Create bookings and manage leads" },
  { code: "ACCOUNTANT", name: "Accountant", description: "Payments and collections" },
  { code: "LEGAL_TEAM", name: "Legal Team", description: "Documents and registrations" },
  { code: "CUSTOMER", name: "Customer", description: "Customer portal access (future)" },
] as const;

const PERMISSIONS = [
  ["dashboard", "read"],
  ["projects", "read"],
  ["projects", "write"],
  ["plots", "read"],
  ["plots", "write"],
  ["layout", "read"],
  ["layout", "write"],
  ["customers", "read"],
  ["customers", "write"],
  ["agents", "read"],
  ["agents", "write"],
  ["bookings", "read"],
  ["bookings", "write"],
  ["payments", "read"],
  ["payments", "write"],
  ["documents", "read"],
  ["documents", "write"],
  ["registrations", "read"],
  ["registrations", "write"],
  ["resale", "read"],
  ["resale", "write"],
  ["reports", "read"],
  ["notifications", "read"],
  ["users", "read"],
  ["users", "write"],
  ["roles", "read"],
  ["roles", "write"],
  ["settings", "read"],
  ["settings", "write"],
  ["audit", "read"],
] as const;

async function main() {
  console.log("Seeding Bhairava Real Estate...");

  const org = await prisma.organization.upsert({
    where: { code: "BHAIRAVA" },
    update: { name: "Bhairava Real Estate" },
    create: {
      name: "Bhairava Real Estate",
      code: "BHAIRAVA",
      legalName: "Bhairava Real Estate Pvt Ltd",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      phone: "9999999999",
      email: "admin@bhairava.com",
    },
  });

  await prisma.organizationSettings.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      primaryColor: "#1A4F9D",
      currencyCode: "INR",
      dateFormat: "dd MMM yyyy",
      timezone: "Asia/Kolkata",
      supportEmail: "support@bhairava.com",
      supportPhone: "9999999999",
    },
  });

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { organizationId_code: { organizationId: org.id, code: role.code } },
      update: { name: role.name, description: role.description },
      create: {
        organizationId: org.id,
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: true,
      },
    });
  }

  const permissionIds: string[] = [];
  for (const [module, action] of PERMISSIONS) {
    const code = `${module}.${action}`;
    const perm = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, module, action, description: `${action} ${module}` },
    });
    permissionIds.push(perm.id);
  }

  const adminRole = await prisma.role.findFirstOrThrow({
    where: { organizationId: org.id, code: "ADMIN" },
  });

  for (const permissionId of permissionIds) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId } },
      update: {},
      create: { roleId: adminRole.id, permissionId },
    });
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@bhairava.com";
  const mobile = process.env.SEED_ADMIN_MOBILE ?? "9999999999";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findFirst({
    where: { organizationId: org.id, OR: [{ email }, { mobile }] },
  });

  const admin =
    existing ??
    (await prisma.user.create({
      data: {
        organizationId: org.id,
        email,
        mobile,
        passwordHash,
        fullName: "Bhairava Admin",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    }));

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, status: "ACTIVE", fullName: "Bhairava Admin" },
    });
  }

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  // Sample project + plots for dashboard
  let project = await prisma.project.findFirst({
    where: { organizationId: org.id, code: "GREEN-CITY" },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: "Green City",
        code: "GREEN-CITY",
        projectType: "OPEN_PLOTS",
        description: "Premium open plots in Visakhapatnam",
        address: "Madhurawada",
        city: "Visakhapatnam",
        state: "Andhra Pradesh",
        pincode: "530048",
        status: ProjectStatus.ACTIVE,
        totalPlots: 24,
        launchDate: new Date("2024-01-15"),
        createdBy: admin.id,
      },
    });

    const phase = await prisma.projectPhase.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        name: "Phase 1",
        code: "P1",
        sequence: 1,
      },
    });

    const block = await prisma.projectBlock.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        phaseId: phase.id,
        name: "Block A",
        code: "A",
      },
    });

    const statuses: PlotStatus[] = [
      "AVAILABLE",
      "AVAILABLE",
      "SOLD",
      "RESERVED",
      "REGISTERED",
      "UNDER_DOCUMENTATION",
      "RESALE_AVAILABLE",
      "BLOCKED",
      "AVAILABLE",
      "BOOKED",
      "SOLD",
      "AVAILABLE",
    ];

    for (let i = 0; i < statuses.length; i++) {
      const n = i + 1;
      const base = 2500000;
      const status = statuses[i];
      await prisma.plot.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          phaseId: phase.id,
          blockId: block.id,
          plotNumber: `A-${n}`,
          area: 200,
          areaUnit: "SQ_YARD",
          facing: "EAST",
          pricePerSqYard: 12500,
          basePrice: base,
          additionalCharges: 0,
          totalPrice: base,
          status,
          createdBy: admin.id,
        },
      });
    }

    await prisma.project.create({
      data: {
        organizationId: org.id,
        name: "Sunrise Enclave",
        code: "SUNRISE",
        projectType: "OPEN_PLOTS",
        city: "Visakhapatnam",
        state: "Andhra Pradesh",
        status: ProjectStatus.ACTIVE,
        totalPlots: 80,
        createdBy: admin.id,
      },
    });
  }

  // ——— Demo agents + customers covering profile interest states ———
  await seedDemoScenarios(org.id, admin.id, project.id);

  // Portal logins for Agent :3001 and Customer :3002 apps
  await seedPortalLogins(org.id);

  const existingNotif = await prisma.notification.findFirst({
    where: {
      organizationId: org.id,
      userId: admin.id,
      title: "Welcome to Bhairava Admin",
    },
  });
  if (!existingNotif) {
    await prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: admin.id,
        type: "INFO",
        title: "Welcome to Bhairava Admin",
        body: "Your admin account is ready. Start by reviewing projects and plots.",
        linkUrl: "/admin/projects",
      },
    });
  }

  console.log("Seed complete.");
  console.log(`  Org: ${org.name}`);
  console.log(`  Admin email: ${email}`);
  console.log(`  Admin mobile: ${mobile}`);
  console.log(`  Admin password: ${password}`);
  console.log("  Demo customers (by situation):");
  console.log("    9000000001  Empty — Preferred/Interest/In progress/Bought all empty");
  console.log("    9000000002  Interest only — Preferred + Current interest filled");
  console.log("    9000000003  In progress — active booking");
  console.log("    9000000004  Bought — sold plot");
  console.log("    9000000005  Full mix — interest + in progress + bought");
}

async function upsertCustomer(
  orgId: string,
  adminId: string,
  data: {
    fullName: string;
    mobile: string;
    email: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    kycStatus?: "PENDING" | "PARTIAL" | "VERIFIED" | "REJECTED";
    supportNotes?: string;
    alternateMobile?: string;
    nomineeName?: string;
    nomineeRelation?: string;
    nomineeMobile?: string;
  },
) {
  const existing = await prisma.customer.findFirst({
    where: { organizationId: orgId, mobile: data.mobile },
  });
  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        fullName: data.fullName,
        email: data.email,
        address: data.address ?? existing.address,
        city: data.city ?? "Visakhapatnam",
        state: data.state ?? "Andhra Pradesh",
        pincode: data.pincode ?? "530001",
        kycStatus: data.kycStatus ?? existing.kycStatus,
        supportNotes: data.supportNotes,
        alternateMobile: data.alternateMobile,
        nomineeName: data.nomineeName,
        nomineeRelation: data.nomineeRelation,
        nomineeMobile: data.nomineeMobile,
        deletedAt: null,
        updatedBy: adminId,
      },
    });
  }
  return prisma.customer.create({
    data: {
      organizationId: orgId,
      fullName: data.fullName,
      mobile: data.mobile,
      email: data.email,
      address: data.address ?? "Demo street",
      city: data.city ?? "Visakhapatnam",
      state: data.state ?? "Andhra Pradesh",
      pincode: data.pincode ?? "530001",
      kycStatus: data.kycStatus ?? "PENDING",
      supportNotes: data.supportNotes,
      alternateMobile: data.alternateMobile,
      nomineeName: data.nomineeName,
      nomineeRelation: data.nomineeRelation,
      nomineeMobile: data.nomineeMobile,
      createdBy: adminId,
    },
  });
}

/** Create User accounts for agent/customer Next apps (separate hosts). */
async function seedPortalLogins(orgId: string) {
  const agentRole = await prisma.role.findFirstOrThrow({
    where: { organizationId: orgId, code: "SALES_AGENT" },
  });
  const customerRole = await prisma.role.findFirstOrThrow({
    where: { organizationId: orgId, code: "CUSTOMER" },
  });

  const agentPassword = process.env.SEED_AGENT_PASSWORD ?? "Agent@12345";
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? "Customer@12345";
  const agentHash = await bcrypt.hash(agentPassword, 12);
  const customerHash = await bcrypt.hash(customerPassword, 12);

  const agent = await prisma.agent.findFirst({
    where: { organizationId: orgId, mobile: "9888888801", deletedAt: null },
  });
  if (agent) {
    const email = agent.email ?? "suresh.agent@bhairava.com";
    let user = await prisma.user.findFirst({
      where: { organizationId: orgId, OR: [{ email }, { mobile: agent.mobile }] },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          organizationId: orgId,
          email,
          mobile: agent.mobile,
          passwordHash: agentHash,
          fullName: agent.fullName,
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: agentHash,
          status: "ACTIVE",
          fullName: agent.fullName,
          email,
          mobile: agent.mobile,
        },
      });
    }
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: agentRole.id } },
      update: {},
      create: { userId: user.id, roleId: agentRole.id },
    });
    if (agent.userId !== user.id) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { userId: user.id },
      });
    }
    console.log(`  Agent portal: ${email} / ${agentPassword}`);
  }

  const customer = await prisma.customer.findFirst({
    where: { organizationId: orgId, mobile: "9000000004", deletedAt: null },
  });
  if (customer) {
    const email = customer.email ?? "demo.bought@example.com";
    let user = await prisma.user.findFirst({
      where: {
        organizationId: orgId,
        OR: [{ email }, { mobile: customer.mobile }],
      },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          organizationId: orgId,
          email,
          mobile: customer.mobile,
          passwordHash: customerHash,
          fullName: customer.fullName,
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: customerHash,
          status: "ACTIVE",
          fullName: customer.fullName,
          email,
          mobile: customer.mobile,
        },
      });
    }
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: customerRole.id } },
      update: {},
      create: { userId: user.id, roleId: customerRole.id },
    });
    console.log(`  Customer portal: ${email} / ${customerPassword}`);
  }
}

async function seedDemoScenarios(orgId: string, adminId: string, projectId: string) {
  // Include soft-deleted so we can revive them instead of colliding on plot numbers
  let plots = await prisma.plot.findMany({
    where: { organizationId: orgId, projectId },
    orderBy: { plotNumber: "asc" },
  });

  // Revive soft-deleted plots for demo use
  const softDeleted = plots.filter((p) => p.deletedAt);
  if (softDeleted.length > 0) {
    await prisma.plot.updateMany({
      where: { id: { in: softDeleted.map((p) => p.id) } },
      data: { deletedAt: null },
    });
    plots = await prisma.plot.findMany({
      where: { organizationId: orgId, projectId, deletedAt: null },
      orderBy: { plotNumber: "asc" },
    });
  } else {
    plots = plots.filter((p) => !p.deletedAt);
  }

  // Ensure enough plots exist for demo bookings / interests
  if (plots.length < 6) {
    let phase = await prisma.projectPhase.findFirst({
      where: { projectId, organizationId: orgId },
      orderBy: { sequence: "asc" },
    });
    if (!phase) {
      phase = await prisma.projectPhase.create({
        data: {
          organizationId: orgId,
          projectId,
          name: "Phase 1",
          code: "P1",
          sequence: 1,
        },
      });
    }
    let block = await prisma.projectBlock.findFirst({
      where: { projectId, organizationId: orgId },
    });
    if (!block) {
      block = await prisma.projectBlock.create({
        data: {
          organizationId: orgId,
          projectId,
          phaseId: phase.id,
          name: "Block A",
          code: "A",
        },
      });
    }

    const existingNumbers = new Set(
      (
        await prisma.plot.findMany({
          where: { projectId },
          select: { plotNumber: true },
        })
      ).map((p) => p.plotNumber),
    );

    for (let n = 1; n <= 12; n++) {
      const plotNumber = `DEMO-${n}`;
      if (existingNumbers.has(plotNumber)) continue;
      const base = 2500000;
      await prisma.plot.create({
        data: {
          organizationId: orgId,
          projectId,
          phaseId: phase.id,
          blockId: block.id,
          plotNumber,
          area: 200,
          areaUnit: "SQ_YARD",
          facing: "EAST",
          pricePerSqYard: 12500,
          basePrice: base,
          additionalCharges: 0,
          totalPrice: base,
          status: "AVAILABLE",
          createdBy: adminId,
        },
      });
    }

    plots = await prisma.plot.findMany({
      where: { organizationId: orgId, projectId, deletedAt: null },
      orderBy: { plotNumber: "asc" },
    });
  }

  if (plots.length < 6) {
    console.warn("Not enough plots for demo scenarios; skipping.");
    return;
  }

  const available = plots.filter((p) => p.status === "AVAILABLE");
  const pick = (n: number) => available[n] ?? plots[n] ?? plots[0];

  // Agents
  let agent = await prisma.agent.findFirst({
    where: { organizationId: orgId, mobile: "9888888801" },
  });
  if (!agent) {
    agent = await prisma.agent.create({
      data: {
        organizationId: orgId,
        fullName: "Suresh Sales",
        mobile: "9888888801",
        email: "suresh.agent@bhairava.com",
        employeeCode: "AG-001",
        isActive: true,
      },
    });
  }
  let agent2 = await prisma.agent.findFirst({
    where: { organizationId: orgId, mobile: "9888888802" },
  });
  if (!agent2) {
    agent2 = await prisma.agent.create({
      data: {
        organizationId: orgId,
        fullName: "Priya Closer",
        mobile: "9888888802",
        email: "priya.agent@bhairava.com",
        employeeCode: "AG-002",
        isActive: true,
      },
    });
  }
  for (const a of [agent, agent2]) {
    await prisma.agentProjectAssignment.upsert({
      where: { agentId_projectId: { agentId: a.id, projectId } },
      update: {},
      create: { agentId: a.id, projectId },
    });
  }

  // 1) Empty — all four tiles blank
  await upsertCustomer(orgId, adminId, {
    fullName: "Demo Empty Profile",
    mobile: "9000000001",
    email: "demo.empty@example.com",
    kycStatus: "PENDING",
    supportNotes: "DEMO: Preferred / Interest / In progress / Bought all empty.",
  });

  // 2) Interest only → Preferred + Current interest
  const interestCust = await upsertCustomer(orgId, adminId, {
    fullName: "Demo Interest Only",
    mobile: "9000000002",
    email: "demo.interest@example.com",
    kycStatus: "PARTIAL",
    alternateMobile: "9000000012",
    supportNotes: "DEMO: Has plot interest only (Preferred + Interest).",
  });
  const interestPlot = pick(0);
  const existingInterest = await prisma.plotInterest.findFirst({
    where: { organizationId: orgId, customerId: interestCust.id, plotId: interestPlot.id },
  });
  if (!existingInterest) {
    await prisma.plotInterest.create({
      data: {
        organizationId: orgId,
        projectId,
        plotId: interestPlot.id,
        customerId: interestCust.id,
        type: "INTERESTED",
        message: "Liked east-facing plot",
        source: "SEED",
      },
    });
  }

  // 3) In progress — active booking
  const progressCust = await upsertCustomer(orgId, adminId, {
    fullName: "Demo In Progress",
    mobile: "9000000003",
    email: "demo.progress@example.com",
    kycStatus: "VERIFIED",
    nomineeName: "Lakshmi",
    nomineeRelation: "Spouse",
    nomineeMobile: "9000000033",
    supportNotes: "DEMO: Active booking → In progress tile.",
  });
  const progressPlot =
    plots.find((p) => p.plotNumber === "A-4") ??
    plots.find((p) => p.status === "RESERVED") ??
    pick(1);
  await ensureBooking({
    orgId,
    adminId,
    projectId,
    plotId: progressPlot.id,
    customerId: progressCust.id,
    agentId: agent.id,
    bookingNumber: "BK-DEMO-PROG",
    status: "BOOKED",
    plotStatus: "BOOKED",
    withPayment: true,
    withSchedule: true,
  });

  // 4) Bought — sold
  const boughtCust = await upsertCustomer(orgId, adminId, {
    fullName: "Demo Bought Plot",
    mobile: "9000000004",
    email: "demo.bought@example.com",
    kycStatus: "VERIFIED",
    supportNotes: "DEMO: Sold booking → Previously bought tile.",
  });
  const boughtPlot =
    plots.find((p) => p.plotNumber === "A-3") ??
    plots.find((p) => p.status === "SOLD") ??
    pick(2);
  await ensureBooking({
    orgId,
    adminId,
    projectId,
    plotId: boughtPlot.id,
    customerId: boughtCust.id,
    agentId: agent2.id,
    bookingNumber: "BK-DEMO-SOLD",
    status: "SOLD",
    plotStatus: "SOLD",
    withPayment: true,
    withSchedule: false,
  });

  // 5) Full mix
  const mixCust = await upsertCustomer(orgId, adminId, {
    fullName: "Demo Full Mix",
    mobile: "9000000005",
    email: "demo.mix@example.com",
    kycStatus: "VERIFIED",
    nomineeName: "Ramesh",
    nomineeRelation: "Father",
    nomineeMobile: "9000000055",
    supportNotes:
      "DEMO: Mix — interest (Preferred/Interest) + active booking (In progress) + sold (Bought).",
  });
  const mixInterestPlot = pick(3) ?? plots[plots.length - 1];
  const mixInterestExists = await prisma.plotInterest.findFirst({
    where: { organizationId: orgId, customerId: mixCust.id, plotId: mixInterestPlot.id },
  });
  if (!mixInterestExists) {
    await prisma.plotInterest.create({
      data: {
        organizationId: orgId,
        projectId,
        plotId: mixInterestPlot.id,
        customerId: mixCust.id,
        type: "CALLBACK_REQUEST",
        message: "Wants callback on corner plot",
        source: "SEED",
      },
    });
  }
  const mixProgressPlot =
    plots.find((p) => p.plotNumber === "A-10") ??
    plots.find((p) => p.status === "BOOKED") ??
    pick(4);
  await ensureBooking({
    orgId,
    adminId,
    projectId,
    plotId: mixProgressPlot.id,
    customerId: mixCust.id,
    agentId: agent.id,
    bookingNumber: "BK-DEMO-MIX-A",
    status: "UNDER_DOCUMENTATION",
    plotStatus: "UNDER_DOCUMENTATION",
    withPayment: true,
    withSchedule: true,
  });
  const mixBoughtPlot =
    plots.find((p) => p.plotNumber === "A-11") ??
    plots.find((p) => p.status === "SOLD" && p.id !== boughtPlot.id) ??
    pick(5);
  await ensureBooking({
    orgId,
    adminId,
    projectId,
    plotId: mixBoughtPlot.id,
    customerId: mixCust.id,
    agentId: agent2.id,
    bookingNumber: "BK-DEMO-MIX-B",
    status: "REGISTERED",
    plotStatus: "REGISTERED",
    withPayment: true,
    withSchedule: false,
  });
}

async function ensureBooking(opts: {
  orgId: string;
  adminId: string;
  projectId: string;
  plotId: string;
  customerId: string;
  agentId: string;
  bookingNumber: string;
  status: "BOOKED" | "SOLD" | "REGISTERED" | "UNDER_DOCUMENTATION" | "RESERVED";
  plotStatus: PlotStatus;
  withPayment: boolean;
  withSchedule: boolean;
}) {
  const {
    orgId,
    adminId,
    projectId,
    plotId,
    customerId,
    agentId,
    bookingNumber,
    status,
    plotStatus,
    withPayment,
    withSchedule,
  } = opts;

  let booking = await prisma.booking.findFirst({
    where: { organizationId: orgId, bookingNumber },
  });

  const plot = await prisma.plot.findFirstOrThrow({ where: { id: plotId } });
  const total = Number(plot.totalPrice);
  const token = Math.round(total * 0.1);

  if (!booking) {
    booking = await prisma.booking.create({
      data: {
        organizationId: orgId,
        bookingNumber,
        projectId,
        plotId,
        customerId,
        agentId,
        bookingDate: new Date("2025-06-15"),
        bookingAmount: token,
        paymentMode: "UPI",
        totalPlotPrice: total,
        discount: 0,
        finalAmount: total,
        bookingStatus: status,
        notes: "Seeded demo booking",
        createdBy: adminId,
      },
    });
  } else {
    booking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        customerId,
        agentId,
        bookingStatus: status,
        deletedAt: null,
        updatedBy: adminId,
      },
    });
  }

  await prisma.plot.update({
    where: { id: plotId },
    data: {
      status: plotStatus,
      assignedCustomerId: customerId,
      bookingDate: booking.bookingDate,
      updatedBy: adminId,
    },
  });

  if (withPayment) {
    const existingPay = await prisma.payment.findFirst({
      where: { organizationId: orgId, bookingId: booking.id, receiptNumber: `RCP-${bookingNumber}` },
    });
    if (!existingPay) {
      await prisma.payment.create({
        data: {
          organizationId: orgId,
          bookingId: booking.id,
          amount: token,
          paymentDate: booking.bookingDate,
          paymentMethod: "UPI",
          transactionReference: `UPI-${bookingNumber}`,
          receiptNumber: `RCP-${bookingNumber}`,
          status: "PAID",
          notes: "Token payment (seed)",
          createdBy: adminId,
        },
      });
    }
  }

  if (withSchedule) {
    const existingSch = await prisma.paymentSchedule.findFirst({
      where: { bookingId: booking.id, installmentNumber: 1 },
    });
    if (!existingSch) {
      const due = new Date();
      due.setDate(due.getDate() + 14);
      const amountDue = Math.round(total * 0.2);
      await prisma.paymentSchedule.create({
        data: {
          organizationId: orgId,
          bookingId: booking.id,
          installmentNumber: 1,
          dueDate: due,
          amountDue,
          amountPaid: 0,
          balance: amountDue,
          status: "PENDING",
          notes: "First installment (seed)",
        },
      });
    }
  }

  return booking;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
