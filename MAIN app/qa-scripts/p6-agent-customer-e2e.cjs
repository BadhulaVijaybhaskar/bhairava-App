/**
 * P6 + client apps + cross-app E2E browser QA (local only, no push).
 * Run: node qa-scripts/p6-agent-customer-e2e.cjs
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const MAIN = "http://127.0.0.1:5173";
const AGENT = "http://127.0.0.1:5174";
const CUSTOMER = "http://127.0.0.1:5175";
const OUT = path.join(__dirname, "..", "qa-screenshots");
const REPORT = path.join(OUT, "p6-agent-customer-e2e-report.json");

fs.mkdirSync(OUT, { recursive: true });

const results = { p6: {}, agent: {}, customer: {}, e2e: {}, shots: [] };

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  results.shots.push(name);
  console.log("shot", name);
}

async function loginMain(page) {
  await page.goto(MAIN + "/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "admin@bhairava.com");
  await page.fill('input[name="password"]', "admin@2026");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 15000 });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // ---------- P6 ----------
    await loginMain(page);

    // Members invite / role / suspend
    await page.goto(MAIN + "/settings/users", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="members-panel"]');
    const inviteEmail = `qa.p6.${Date.now()}@bhairava.com`;
    await page.fill('[data-testid="invite-name"]', "P6 QA Invitee");
    await page.fill('[data-testid="invite-email"]', inviteEmail);
    await page.selectOption('[data-testid="invite-role"]', "Finance");
    await page.click('[data-testid="invite-submit"]');
    await page.waitForSelector('[data-testid="members-msg"]', { timeout: 5000 }).catch(() => {});
    results.p6.invite = await page.locator('[data-testid="members-msg"]').textContent().catch(() => null);

    // Permission matrix
    await page.waitForSelector('[data-testid="permission-matrix"]');
    results.p6.matrixVisible = true;
    await shot(page, "p6-complete-members.png");

    // Suspend first non-founder active if menu exists
    const menus = page.locator('[data-testid^="member-menu-"]');
    const menuCount = await menus.count();
    if (menuCount > 0) {
      await menus.first().click();
      const suspend = page.locator('[data-testid^="member-suspend-"]').first();
      if (await suspend.count()) {
        await suspend.click();
        results.p6.suspend = true;
      } else {
        results.p6.suspend = "no-active-suspend-target";
      }
    }
    await shot(page, "p6-complete-members-after-actions.png");

    // Audit
    await page.goto(MAIN + "/settings/audit", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="audit-panel"]');
    const auditRows = await page.locator('[data-testid^="audit-row-"]').count();
    results.p6.auditRows = auditRows;
    await shot(page, "p6-complete-audit.png");

    // Notifications
    await page.goto(MAIN + "/notifications", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="notifications-list"]', { timeout: 8000 }).catch(() => {});
    if (await page.locator('[data-testid="notifications-mark-all"]').count()) {
      await page.click('[data-testid="notifications-mark-all"]');
      results.p6.notificationsMarkAll = true;
    }
    await shot(page, "p6-complete-notifications.png");

    // Reports filters (sales)
    await page.goto(MAIN + "/reports/sales", { waitUntil: "networkidle" });
    await shot(page, "p6-complete-reports-sales.png");
    results.p6.reportsSales = true;

    // Company persist
    await page.goto(MAIN + "/settings/company", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="company-profile"]');
    const phoneField = page.locator('[data-testid="company-legal-name"]');
    if (await phoneField.count()) {
      await phoneField.fill("Bhairava P6 QA LLP");
    }
    await page.click('[data-testid="company-save"]');
    await page.waitForSelector('[data-testid="company-msg"]', { timeout: 5000 }).catch(() => {});
    results.p6.companySave = await page.locator('[data-testid="company-msg"]').textContent().catch(() => "saved?");
    await shot(page, "p6-complete-company.png");

    // Non-Founder denied billing/danger (Admin default)
    await page.goto(MAIN + "/settings/billing", { waitUntil: "networkidle" });
    results.p6.billingDeniedAsAdmin = (await page.locator('[data-testid="billing-denied"]').count()) > 0;
    await shot(page, "p6-complete-billing-denied.png");

    await page.goto(MAIN + "/settings/danger", { waitUntil: "networkidle" });
    results.p6.dangerDeniedAsAdmin = (await page.locator('[data-testid="danger-denied"]').count()) > 0;
    await shot(page, "p6-complete-danger-denied.png");

    // Switch to Founder via demo role switch
    await page.goto(MAIN + "/settings/users", { waitUntil: "networkidle" });
    await page.click('[data-testid="switch-role-Founder"]');
    await page.waitForLoadState("networkidle");
    await page.goto(MAIN + "/settings/billing", { waitUntil: "networkidle" });
    results.p6.billingOkAsFounder = (await page.locator('[data-testid="billing-surface"]').count()) > 0;
    const pendingText = await page.locator("text=billing integration pending").count();
    results.p6.billingIntegrationPending = pendingText > 0;
    await shot(page, "p6-complete-billing-founder.png");

    await page.goto(MAIN + "/settings/danger", { waitUntil: "networkidle" });
    results.p6.dangerOkAsFounder = (await page.locator('[data-testid="danger-surface"]').count()) > 0;
    await shot(page, "p6-complete-danger-founder.png");

    // ---------- Agent ----------
    const agentPage = await context.newPage();
    await agentPage.goto(AGENT + "/login", { waitUntil: "networkidle" });
    await agentPage.fill('[data-testid="agent-email"]', "agent@bhairava.com");
    await agentPage.fill('[data-testid="agent-password"]', "agent@2026");
    await agentPage.click('[data-testid="agent-login"]');
    await agentPage.waitForURL((u) => !u.pathname.includes("/login"));
    await shot(agentPage, "agent-home.png");

    await agentPage.goto(AGENT + "/projects", { waitUntil: "networkidle" });
    results.agent.projects = (await agentPage.locator('[data-testid^="agent-project-"]').count()) > 0;
    await shot(agentPage, "agent-projects.png");

    await agentPage.goto(AGENT + "/plots", { waitUntil: "networkidle" });
    await agentPage.waitForSelector('[data-testid="agent-plots-table"]');
    const piiHidden = await agentPage.locator("text=PII hidden").count();
    const ownCustomer = await agentPage.locator("text=Ananya Rao").count();
    results.agent.piiHidden = piiHidden > 0;
    results.agent.ownCustomerVisible = ownCustomer > 0;
    await shot(agentPage, "agent-plots.png");

    await agentPage.goto(AGENT + "/customers", { waitUntil: "networkidle" });
    await shot(agentPage, "agent-customers.png");
    await agentPage.goto(AGENT + "/leads", { waitUntil: "networkidle" });
    await shot(agentPage, "agent-leads.png");
    await agentPage.goto(AGENT + "/documents", { waitUntil: "networkidle" });
    const vaultLeak = await agentPage.locator("text=Internal cost sheet").count();
    results.agent.internalVaultHidden = vaultLeak === 0;
    await shot(agentPage, "agent-documents.png");
    await agentPage.goto(AGENT + "/bookings", { waitUntil: "networkidle" });
    await shot(agentPage, "agent-bookings.png");
    await agentPage.goto(AGENT + "/profile", { waitUntil: "networkidle" });
    await shot(agentPage, "agent-profile.png");

    // ---------- Customer ----------
    const custPage = await context.newPage();
    await custPage.goto(CUSTOMER + "/login", { waitUntil: "networkidle" });
    await custPage.fill('[data-testid="customer-email"]', "customer@bhairava.com");
    await custPage.fill('[data-testid="customer-password"]', "customer@2026");
    await custPage.click('[data-testid="customer-login"]');
    await custPage.waitForURL((u) => !u.pathname.includes("/login"));
    await shot(custPage, "customer-home.png");

    await custPage.goto(CUSTOMER + "/explore/projects", { waitUntil: "networkidle" });
    results.customer.projects = (await custPage.locator('[data-testid^="customer-project-"]').count()) > 0;
    await shot(custPage, "customer-projects.png");

    await custPage.goto(CUSTOMER + "/explore/plots", { waitUntil: "networkidle" });
    await custPage.waitForSelector('[data-testid="customer-plots-table"]');
    const otherCustLeak = await custPage.locator("text=Rahul Mehta").count();
    results.customer.otherCustomerPiiHidden = otherCustLeak === 0;
    await shot(custPage, "customer-plots.png");

    await custPage.goto(CUSTOMER + "/account/bookings", { waitUntil: "networkidle" });
    results.customer.ownBooking = (await custPage.getByTestId('customer-bookings').getByText('BK-01').count()) > 0;
    await shot(custPage, "customer-bookings.png");

    await custPage.goto(CUSTOMER + "/account/documents", { waitUntil: "networkidle" });
    results.customer.ownDocs = (await custPage.getByTestId('customer-docs').getByText('Booking acknowledgment').count()) > 0;
    results.customer.vaultHidden = (await custPage.locator("text=Internal cost sheet").count()) === 0;
    await shot(custPage, "customer-documents.png");
    await custPage.goto(CUSTOMER + "/account/profile", { waitUntil: "networkidle" });
    await shot(custPage, "customer-profile.png");

    // ---------- Cross-app E2E narrative (seeded shared SoT) ----------
    // Admin inventory/sales surface
    await page.goto(MAIN + "/projects/", { waitUntil: "networkidle" });
    await shot(page, "e2e-admin-projects.png");
    await page.goto(MAIN + "/plots/", { waitUntil: "networkidle" });
    await shot(page, "e2e-admin-plots.png");
    await page.goto(MAIN + "/bookings/", { waitUntil: "networkidle" });
    await shot(page, "e2e-admin-bookings.png");

    // Agent assigned lead/customer/reservation path
    await agentPage.goto(AGENT + "/leads", { waitUntil: "networkidle" });
    results.e2e.agentSeesOwnLead = (await agentPage.locator("text=Kiran Patel").count()) > 0;
    results.e2e.agentDoesNotSeeOtherLead = (await agentPage.locator("text=Meera Shah").count()) === 0;
    await shot(agentPage, "e2e-agent-leads.png");
    await agentPage.goto(AGENT + "/customers", { waitUntil: "networkidle" });
    results.e2e.agentSeesOwnCustomer = (await agentPage.locator("text=Ananya Rao").count()) > 0;
    results.e2e.agentDoesNotSeeOtherCustomer = (await agentPage.locator("text=Rahul Mehta").count()) === 0;
    await shot(agentPage, "e2e-agent-customers.png");
    await agentPage.goto(AGENT + "/plots", { waitUntil: "networkidle" });
    await shot(agentPage, "e2e-agent-plots-privacy.png");

    // Customer own booking/docs only
    await custPage.goto(CUSTOMER + "/account/bookings", { waitUntil: "networkidle" });
    await shot(custPage, "e2e-customer-own-booking.png");
    await custPage.goto(CUSTOMER + "/account/documents", { waitUntil: "networkidle" });
    await shot(custPage, "e2e-customer-own-docs.png");
    await custPage.goto(CUSTOMER + "/explore/plots", { waitUntil: "networkidle" });
    await shot(custPage, "e2e-customer-public-plots.png");

    results.e2e.privacyIsolation =
      results.agent.piiHidden &&
      results.agent.internalVaultHidden &&
      results.customer.otherCustomerPiiHidden &&
      results.customer.vaultHidden &&
      results.e2e.agentDoesNotSeeOtherLead &&
      results.e2e.agentDoesNotSeeOtherCustomer;

    results.p6.green =
      Boolean(results.p6.invite) &&
      results.p6.matrixVisible &&
      results.p6.auditRows >= 0 &&
      results.p6.billingDeniedAsAdmin &&
      results.p6.dangerDeniedAsAdmin &&
      results.p6.billingOkAsFounder &&
      results.p6.dangerOkAsFounder &&
      results.p6.billingIntegrationPending;

    results.agent.green =
      results.agent.projects &&
      results.agent.piiHidden &&
      results.agent.ownCustomerVisible &&
      results.agent.internalVaultHidden;

    results.customer.green =
      results.customer.projects &&
      results.customer.otherCustomerPiiHidden &&
      results.customer.ownBooking &&
      results.customer.ownDocs &&
      results.customer.vaultHidden;

    results.e2e.green = Boolean(results.e2e.privacyIsolation);

    fs.writeFileSync(REPORT, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    await browser.close();
    process.exit(results.p6.green && results.agent.green && results.customer.green && results.e2e.green ? 0 : 2);
  } catch (err) {
    console.error("QA FAILED", err);
    fs.writeFileSync(REPORT, JSON.stringify({ error: String(err), results }, null, 2));
    await browser.close();
    process.exit(1);
  }
})();

