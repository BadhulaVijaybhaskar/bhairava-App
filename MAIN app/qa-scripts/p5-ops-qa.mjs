import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "qa-screenshots");
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.QA_BASE || "http://127.0.0.1:5173";

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
  console.log("shot", name);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(30000);

  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"], input[name="email"]').first().fill("admin@bhairava.com");
  await page.locator('input[type="password"]').first().fill("admin@2026");
  await page.getByRole("button", { name: /sign in|log in|continue/i }).first().click().catch(async () => {
    await page.locator('input[type="password"]').first().press("Enter");
  });
  await page.waitForTimeout(1500);

  await page.goto(BASE + "/projects/PRJ-01?tab=documents", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const workspace = page.getByTestId("ops-workspace");
  await workspace.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  console.log("ops-workspace", await workspace.isVisible().catch(() => false));
  console.log("dashboard", await page.getByTestId("ops-dashboard").count());
  await shot(page, "p5-complete-01-documents.png");

  const docRow = page.locator('[data-testid^="ops-doc-row-"]').first();
  if (await docRow.count()) { await docRow.click(); await page.waitForTimeout(400); }
  await shot(page, "p5-complete-02-doc-detail.png");

  if (await page.getByTestId("ops-verify-doc").count()) {
    await page.getByTestId("ops-verify-doc").click();
    await page.waitForTimeout(400);
  }
  if (await page.getByTestId("ops-replace-doc").count()) {
    await page.getByTestId("ops-replace-doc").click();
    await page.waitForTimeout(500);
  }
  await shot(page, "p5-complete-06-doc-version.png");

  await page.getByTestId("ops-section-registration").click();
  await page.waitForTimeout(600);
  const regRow = page.locator('[data-testid^="ops-reg-row-"]').first();
  if (await regRow.count()) { await regRow.click(); await page.waitForTimeout(400); }
  await shot(page, "p5-complete-03-registration.png");

  if (await page.getByTestId("ops-schedule-reg").count()) {
    await page.getByTestId("ops-schedule-reg").click();
    await page.waitForTimeout(600);
  }
  await shot(page, "p5-complete-07-reg-gate.png");
  console.log("blocker", await page.getByTestId("ops-reg-blocker").count());

  // Prefer a SCHEDULED/READY row with verified docs if present
  const rows = page.locator('[data-testid^="ops-reg-row-"]');
  const n = await rows.count();
  for (let i = 0; i < n; i++) {
    await rows.nth(i).click();
    await page.waitForTimeout(200);
    if (await page.getByTestId("ops-complete-reg").count()) {
      await page.getByTestId("ops-complete-reg").click();
      await page.waitForTimeout(700);
      break;
    }
  }
  await shot(page, "p5-complete-08-reg-complete.png");

  await page.getByTestId("ops-section-resale").click();
  await page.waitForTimeout(600);
  const resaleRow = page.locator('[data-testid^="ops-resale-row-"]').first();
  if (await resaleRow.count()) { await resaleRow.click(); await page.waitForTimeout(400); }
  await shot(page, "p5-complete-04-resale.png");

  if (await page.getByTestId("ops-add-resale").count()) {
    await page.getByTestId("ops-add-resale").click();
    await page.waitForTimeout(500);
    await shot(page, "p5-complete-09-resale-form.png");
    await page.keyboard.press("Escape").catch(() => {});
  }

  await page.getByTestId("ops-section-documents").click();
  await page.waitForTimeout(400);
  if (await page.getByTestId("ops-add-doc").count()) {
    await page.getByTestId("ops-add-doc").click();
    await page.waitForTimeout(400);
    const nameInput = page.locator("input").filter({ hasText: "" }).first();
    await page.locator('input[placeholder*="master-layout"], input[placeholder*="e.g."], input[placeholder*=".pdf"]').first().fill("p5-qa-internal-note.pdf").catch(async () => {
      await page.locator("form input, [role='dialog'] input").first().fill("p5-qa-internal-note.pdf");
    });
    await page.getByRole("button", { name: /save/i }).first().click().catch(() => {});
    await page.waitForTimeout(800);
  }
  await shot(page, "p5-complete-05-after-add-doc.png");
  await shot(page, "p5-complete-10-dashboard.png");

  console.log("action", await page.getByTestId("ops-action-msg").innerText().catch(() => ""));
  await browser.close();
  console.log("P5 QA done");
})().catch((e) => { console.error(e); process.exit(1); });
