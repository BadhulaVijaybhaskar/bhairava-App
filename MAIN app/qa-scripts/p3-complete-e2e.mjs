import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "qa-screenshots");
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.QA_BASE || "http://localhost:8080";

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
  console.log("shot", name);
}

async function closeSheet(page) {
  const cancel = page.getByRole("button", { name: "Cancel", exact: true });
  if (await cancel.count()) {
    await cancel.last().click();
    await page.waitForTimeout(400);
  }
  const backdrop = page.locator('[aria-label="Close editor"]');
  if (await backdrop.count()) {
    await backdrop.last().click({ force: true });
    await page.waitForTimeout(400);
  }
  await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 5000 }).catch(() => {});
}

async function clickNew(page) {
  const byTest = page.getByTestId("sales-new-btn");
  if (await byTest.count()) await byTest.click();
  else await page.getByRole("button", { name: /New /i }).first().click();
}

async function saveSheet(page) {
  await page.getByRole("button", { name: /save changes|save|create|confirm/i }).last().click();
  await page.waitForTimeout(700);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(20000);
  const log = [];

  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill("admin@bhairava.com");
  await page.locator('input[type="password"]').first().fill("admin@2026");
  await page.locator('input[type="password"]').first().press("Enter");
  await page.waitForTimeout(1200);

  await page.goto(BASE + "/projects/PRJ-01?tab=sales", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="sales-workspace"]');
  await shot(page, "p3-complete-01-dashboard.png");
  log.push("dashboard");

  // Create Lead
  await page.getByTestId("sales-section-leads").click();
  await page.waitForTimeout(300);
  await clickNew(page);
  await page.waitForSelector('[data-testid="sales-create-sheet"]');
  const create = page.locator('[data-testid="sales-create-sheet"]');
  const inputs = create.locator("input");
  await inputs.nth(0).fill("E2E Lead Vijay");
  await inputs.nth(1).fill("+91 91111 22233");
  await inputs.nth(2).fill("e2e.lead@example.com");
  await inputs.nth(3).fill("E2E-Campaign");
  await shot(page, "p3-complete-02-new-lead.png");
  await saveSheet(page);
  // create opens detail automatically
  await page.waitForSelector('[data-testid="sales-detail-sheet"]', { timeout: 8000 }).catch(() => {});
  await shot(page, "p3-complete-03-lead-detail.png");
  log.push("create lead + detail");

  // Assign agent already present; close and schedule visit
  await closeSheet(page);

  // Schedule Visit linked to lead
  await page.getByTestId("sales-section-visits").click();
  await page.waitForTimeout(300);
  await clickNew(page);
  await page.waitForSelector('[data-testid="sales-create-sheet"]');
  await shot(page, "p3-complete-04-new-visit.png");
  await saveSheet(page);
  await closeSheet(page);
  log.push("schedule visit");

  // Complete a visit
  await page.locator("table tbody tr").first().click();
  await page.waitForSelector('[data-testid="sales-detail-sheet"]');
  const statusSelect = page.locator('[data-testid="sales-detail-sheet"] select').first();
  if (await statusSelect.count()) {
    await statusSelect.selectOption({ value: "Completed" }).catch(async () => {
      await statusSelect.selectOption({ label: "COMPLETED" }).catch(() => {});
    });
  }
  await saveSheet(page);
  await closeSheet(page);
  log.push("complete visit");

  // Convert lead
  await page.getByTestId("sales-section-leads").click();
  await page.waitForTimeout(400);
  const leadRow = page.locator("table tbody tr", { hasText: "E2E Lead Vijay" }).first();
  if (await leadRow.count()) {
    await leadRow.click();
    await page.waitForSelector('[data-testid="sales-detail-sheet"]');
    const convert = page.getByTestId("convert-lead-btn");
    if (await convert.count()) {
      await convert.click();
      await page.waitForTimeout(800);
      log.push("convert lead");
    } else log.push("convert missing");
    await closeSheet(page);
  } else log.push("lead row missing");
  await page.getByTestId("sales-section-customers").click();
  await page.waitForTimeout(400);
  await shot(page, "p3-complete-05-customers.png");

  // Reserve
  await page.getByTestId("sales-section-reservations").click();
  await page.waitForTimeout(300);
  await clickNew(page);
  await page.waitForSelector('[data-testid="sales-create-sheet"]');
  await shot(page, "p3-complete-06-new-reservation.png");
  await saveSheet(page);
  const flash1 = (await page.getByTestId("sales-flash").count()) ? await page.getByTestId("sales-flash").innerText() : "";
  log.push("reserve: " + flash1);
  await closeSheet(page);
  await shot(page, "p3-complete-07-reservations.png");

  // Duplicate reserve blocked
  await clickNew(page);
  await page.waitForSelector('[data-testid="sales-create-sheet"]');
  await saveSheet(page);
  const err = page.getByTestId("sales-create-error");
  const flash = page.getByTestId("sales-flash");
  const dupMsg = (await err.count()) ? await err.innerText() : ((await flash.count()) ? await flash.innerText() : "");
  log.push("dup: " + dupMsg);
  await shot(page, "p3-complete-08-dup-reserve.png");
  await closeSheet(page);

  // Convert reservation → booking
  await page.locator("table tbody tr").first().click();
  await page.waitForSelector('[data-testid="sales-detail-sheet"]');
  const convR = page.getByTestId("convert-reservation-btn");
  if (await convR.count()) {
    await convR.click();
    await page.waitForTimeout(1000);
    log.push("convert reservation");
  }
  await closeSheet(page);
  await page.getByTestId("sales-section-bookings").click();
  await page.waitForTimeout(400);
  await shot(page, "p3-complete-09-bookings.png");

  // Cancellation request
  const bRow = page.locator("table tbody tr").first();
  if (await bRow.count()) {
    await bRow.click();
    await page.waitForSelector('[data-testid="sales-detail-sheet"]');
    const cancelReason = page.locator('[data-testid="sales-detail-sheet"] input').last();
    if (await cancelReason.count()) {
      await cancelReason.fill("E2E cancel — customer withdrew");
      await page.getByRole("button", { name: /request cancellation/i }).click();
      await page.waitForTimeout(600);
      log.push("cancel request");
    }
    await closeSheet(page);
  }

  await page.getByTestId("sales-section-agents").click();
  await page.waitForTimeout(400);
  await shot(page, "p3-complete-10-agents.png");

  await page.getByTestId("sales-section-dashboard").click();
  await page.waitForTimeout(500);
  await shot(page, "p3-complete-11-dashboard-after.png");

  await page.goto(BASE + "/projects/PRJ-01?tab=finance", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="finance-workspace"]');
  await shot(page, "p3-complete-12-finance.png");
  log.push("finance");

  fs.writeFileSync(path.join(OUT, "p3-complete-log.json"), JSON.stringify(log, null, 2));
  console.log("LOG", JSON.stringify(log, null, 2));
  await browser.close();
  console.log("P3 complete E2E done");
})().catch((e) => { console.error(e); process.exit(1); });
