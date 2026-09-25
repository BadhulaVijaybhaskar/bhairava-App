const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const outDir = path.join(process.cwd(), "qa-screenshots");
fs.mkdirSync(outDir, { recursive: true });

async function shot(page, name) {
  const file = path.join(outDir, `client-rehearsal-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("shot", name);
}

async function agentJourney(browser) {
  const page = await browser.newPage();
  const results = { agent1: {}, agent2: {}, privacy: {} };

  await page.goto("http://localhost:5174/login", { waitUntil: "networkidle" });
  await page.selectOption('[data-testid="agent-demo-pick"]', "agent1@bhairava.com");
  await page.click('[data-testid="agent-login"]');
  await page.waitForSelector('[data-testid="stat-customers"]');
  results.agent1.name = await page.textContent('[data-testid="agent-session-name"]');
  await shot(page, "agent1-home");

  await page.click('a[href="/plots"]');
  await page.waitForSelector('[data-testid="agent-plots-table"]');
  const a1_102 = await page.textContent('[data-testid="plot-customer-PLT-102"]');
  const a1_103 = await page.textContent('[data-testid="plot-customer-PLT-103"]');
  results.agent1.plot102 = a1_102.trim();
  results.agent1.plot103 = a1_103.trim();
  await shot(page, "agent1-plots");

  await page.click('a[href="/customers"]');
  await page.waitForSelector('[data-testid="agent-customers"]');
  results.agent1.customers = await page.textContent('[data-testid="agent-customers"]');
  await shot(page, "agent1-customers");

  await page.click('a[href="/documents"]');
  await page.waitForSelector('[data-testid="agent-docs"]');
  results.agent1.docs = await page.textContent('[data-testid="agent-docs"]');
  await shot(page, "agent1-docs");

  await page.click('[data-testid="agent-signout"]');
  await page.waitForSelector('[data-testid="agent-login"]');
  await page.selectOption('[data-testid="agent-demo-pick"]', "agent2@bhairava.com");
  await page.click('[data-testid="agent-login"]');
  await page.waitForSelector('[data-testid="stat-customers"]');
  results.agent2.name = await page.textContent('[data-testid="agent-session-name"]');
  await shot(page, "agent2-home");

  await page.click('a[href="/plots"]');
  await page.waitForSelector('[data-testid="agent-plots-table"]');
  results.agent2.plot102 = (await page.textContent('[data-testid="plot-customer-PLT-102"]')).trim();
  results.agent2.plot103 = (await page.textContent('[data-testid="plot-customer-PLT-103"]')).trim();
  await shot(page, "agent2-plots");

  await page.click('a[href="/customers"]');
  await page.waitForSelector('[data-testid="agent-customers"]');
  results.agent2.customers = await page.textContent('[data-testid="agent-customers"]');
  await shot(page, "agent2-customers");

  results.privacy.agent1HidesRahul = /PII hidden/i.test(results.agent1.plot102);
  results.privacy.agent1SeesAnanya = /Ananya/i.test(results.agent1.plot103);
  results.privacy.agent2SeesRahul = /Rahul/i.test(results.agent2.plot102);
  results.privacy.agent2HidesAnanya = /PII hidden/i.test(results.agent2.plot103);
  results.privacy.agentDocsNoInternal = !/Internal cost sheet/i.test(results.agent1.docs || "");

  await page.close();
  return results;
}

async function customerJourney(browser) {
  const page = await browser.newPage();
  const results = { customer1: {}, customer2: {}, privacy: {} };

  await page.goto("http://localhost:5175/login", { waitUntil: "networkidle" });
  await page.selectOption('[data-testid="customer-demo-pick"]', "customer1@bhairava.com");
  await page.click('[data-testid="customer-login"]');
  await page.waitForSelector("text=Welcome");
  results.customer1.name = await page.textContent('[data-testid="customer-session-name"]');
  await shot(page, "customer1-home");

  await page.click('a[href="/explore/plots"]');
  await page.waitForSelector('[data-testid="customer-plots-table"]');
  const plotsHtml = await page.innerHTML('[data-testid="customer-plots-table"]');
  results.privacy.noOtherBuyerInExplore = !/Ananya|Rahul|Sneha|900000000/i.test(plotsHtml);
  await shot(page, "customer1-plots");

  await page.click('a[href="/explore/plots/PLT-102"]');
  await page.waitForSelector('[data-testid="customer-plot-detail"]');
  const detail = await page.textContent('[data-testid="customer-plot-detail"]');
  results.privacy.reservedNoBuyerPii = /No other-buyer PII/i.test(detail) && !/Rahul|9000000002/i.test(detail);
  await shot(page, "customer1-reserved-plot");

  await page.click('a[href="/account/bookings"]');
  await page.waitForSelector('[data-testid="customer-bookings"]');
  results.customer1.bookings = await page.textContent('[data-testid="customer-bookings"]');
  await shot(page, "customer1-bookings");

  await page.click('a[href="/account/payments"]');
  await page.waitForSelector('[data-testid="customer-payments"]');
  results.customer1.payments = await page.textContent('[data-testid="customer-payments"]');
  await shot(page, "customer1-payments");

  await page.click('a[href="/account/documents"]');
  await page.waitForSelector('[data-testid="customer-docs"]');
  results.customer1.docs = await page.textContent('[data-testid="customer-docs"]');
  await shot(page, "customer1-docs");

  await page.click('[data-testid="customer-signout"]');
  await page.waitForSelector('[data-testid="customer-login"]');
  await page.selectOption('[data-testid="customer-demo-pick"]', "customer2@bhairava.com");
  await page.click('[data-testid="customer-login"]');
  await page.waitForSelector("text=Welcome");
  results.customer2.name = await page.textContent('[data-testid="customer-session-name"]');
  await shot(page, "customer2-home");

  await page.click('a[href="/account/bookings"]');
  await page.waitForSelector('[data-testid="customer-bookings"]');
  results.customer2.bookings = await page.textContent('[data-testid="customer-bookings"]');
  await page.click('a[href="/account/documents"]');
  await page.waitForSelector('[data-testid="customer-docs"]');
  results.customer2.docs = await page.textContent('[data-testid="customer-docs"]');
  await page.click('a[href="/account/properties"]');
  await page.waitForSelector('[data-testid="customer-properties"]');
  results.customer2.properties = await page.textContent('[data-testid="customer-properties"]');
  await shot(page, "customer2-properties");

  results.privacy.c1HasBk01 = /BK-01/i.test(results.customer1.bookings || "");
  results.privacy.c2NoBk01 = !/BK-01/i.test(results.customer2.bookings || "");
  results.privacy.c1OwnDoc = /Ananya/i.test(results.customer1.docs || "");
  results.privacy.c2OwnDoc = /Rahul/i.test(results.customer2.docs || "");
  results.privacy.c1NoVault = !/Internal cost sheet/i.test(results.customer1.docs || "");
  results.privacy.c2NoVault = !/Internal cost sheet/i.test(results.customer2.docs || "");

  await page.close();
  return results;
}

async function adminJourney(browser) {
  const page = await browser.newPage();
  const results = { accounts: [] };
  const accounts = [
    ["admin@bhairava.com", "admin@2026"],
    ["finance@bhairava.com", "finance@2026"],
    ["viewer@bhairava.com", "viewer@2026"],
  ];
  for (const [email, password] of accounts) {
    await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 60000 });
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
    const url = page.url();
    const ok = !url.includes("/login");
    results.accounts.push({ email, ok, url });
    await shot(page, `admin-${email.split("@")[0]}`);
    // sign out if possible
    const signOut = page.locator("text=Sign out").first();
    if (await signOut.count()) {
      await signOut.click();
      await page.waitForTimeout(1000);
    } else {
      await page.evaluate(() => {
        localStorage.clear();
        document.cookie = "bhairava.auth=0; Path=/; Max-Age=0";
      });
    }
  }
  await page.close();
  return results;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = {
    agent: await agentJourney(browser),
    customer: await customerJourney(browser),
    admin: await adminJourney(browser),
  };
  fs.writeFileSync(path.join(outDir, "client-rehearsal-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
