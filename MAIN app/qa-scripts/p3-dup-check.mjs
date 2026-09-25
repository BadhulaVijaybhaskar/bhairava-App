import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "qa-screenshots");
const BASE = "http://localhost:8080";

async function closeSheet(page) {
  const cancel = page.getByRole("button", { name: "Cancel", exact: true });
  if (await cancel.count()) await cancel.last().click();
  await page.waitForTimeout(300);
  const backdrop = page.locator('[aria-label="Close editor"]');
  if (await backdrop.count()) await backdrop.last().click({ force: true });
  await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 4000 }).catch(() => {});
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + "/login");
  await page.locator('input[type="email"]').first().fill("admin@bhairava.com");
  await page.locator('input[type="password"]').first().fill("admin@2026");
  await page.locator('input[type="password"]').first().press("Enter");
  await page.waitForTimeout(1000);
  await page.goto(BASE + "/projects/PRJ-01?tab=sales", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="sales-workspace"]');
  await page.getByTestId("sales-section-reservations").click();
  await page.waitForTimeout(300);

  // First reservation — capture selected plot label
  await page.getByTestId("sales-new-btn").click();
  await page.waitForSelector('[data-testid="sales-create-sheet"]');
  const plotSelect = page.locator('[data-testid="sales-create-sheet"] select').nth(2); // Customer, Agent, Plot
  const plotValue = await plotSelect.inputValue();
  const plotLabel = await plotSelect.locator("option:checked").textContent();
  console.log("first plot", plotValue, plotLabel);
  await page.getByRole("button", { name: /save changes/i }).click();
  await page.waitForTimeout(900);
  console.log("flash1", await page.getByTestId("sales-flash").innerText().catch(() => ""));
  await closeSheet(page);

  // Second attempt same plot
  await page.getByTestId("sales-new-btn").click();
  await page.waitForSelector('[data-testid="sales-create-sheet"]');
  const plotSelect2 = page.locator('[data-testid="sales-create-sheet"] select').nth(2);
  await plotSelect2.selectOption(plotValue).catch(async () => {
    // if option disabled/missing because now RESERVED, still present in list
    await plotSelect2.selectOption({ value: plotValue });
  });
  await page.getByRole("button", { name: /save changes/i }).click();
  await page.waitForTimeout(900);
  const err = await page.getByTestId("sales-create-error").innerText().catch(() => "");
  const flash = await page.getByTestId("sales-flash").innerText().catch(() => "");
  console.log("dup err", err);
  console.log("dup flash", flash);
  await page.screenshot({ path: path.join(OUT, "p3-complete-08-dup-reserve.png") });
  fs.writeFileSync(path.join(OUT, "p3-dup-check.json"), JSON.stringify({ plotValue, plotLabel, err, flash }, null, 2));
  await browser.close();
  if (!/already has an active reservation|RESERVED|reserve only/i.test(err + " " + flash)) {
    console.error("FAIL: expected duplicate block");
    process.exit(1);
  }
  console.log("DUP BLOCK OK");
})().catch((e) => { console.error(e); process.exit(1); });
