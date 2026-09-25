/**
 * Playwright smoke: login → PRJ-01 Layout & Plots → inventory/detail/canvas/editor/pricing/status.
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const BASE = process.env.BASE_URL || "http://localhost:8080";
const OUT = path.resolve("qa-screenshots");
fs.mkdirSync(OUT, { recursive: true });

function findChrome() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROME_PATH,
    "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
    "C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
    "C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
  ].filter(Boolean);
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  try {
    const fromPw = execSync("npx playwright install chromium --dry-run", { encoding: "utf8" });
    console.log(fromPw);
  } catch {}
  return undefined;
}

const exePath = findChrome();
console.log("chrome", exePath || "(playwright default)");

const browser = await chromium.launch({
  headless: true,
  executablePath: exePath,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function shot(name) {
  const p = path.join(OUT, name);
  await page.screenshot({ path: p, fullPage: true });
  console.log("shot", p);
}

try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"], input[name="email"]', "admin@bhairava.com");
  await page.fill('input[type="password"], input[name="password"]', "admin@2026");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1800);

  await page.goto(`${BASE}/projects/PRJ-01?tab=layout`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Inventory (full page with canvas + table)
  await shot("layout-inventory.png");

  // Scroll to table focus
  const table = page.locator("table").first();
  if (await table.count()) {
    await table.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await shot("layout-status.png");
  }

  // Open first plot drawer
  const row = page.locator("table tbody tr").first();
  if (await row.count()) {
    await row.click();
    await page.waitForTimeout(900);
    await shot("layout-detail.png");

    // Pricing section in drawer
    const pricing = page.getByText(/Base rate|Manual override|Effective|Hard price override|price/i).first();
    if (await pricing.count()) {
      await pricing.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(300);
      await shot("layout-pricing.png");
    }

    // close drawer if possible
    const closeBtn = page.getByRole("button", { name: /close|cancel|done/i }).first();
    if (await closeBtn.count()) await closeBtn.click().catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(400);
  }

  // Canvas area
  const canvas = page.locator("svg").first();
  if (await canvas.count()) {
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await shot("layout-canvas.png");
  }

  // Mapping editor
  await page.goto(`${BASE}/plots/editor?projectId=PRJ-01`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shot("layout-editor.png");

  console.log("smoke ok");
} catch (e) {
  console.error("smoke failed", e);
  await shot("layout-error.png");
  process.exitCode = 1;
} finally {
  await browser.close();
}
