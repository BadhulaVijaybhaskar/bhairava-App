import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "qa-screenshots");
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.QA_BASE || "http://localhost:8081";
async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
  console.log("shot", name);
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(20000);
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"], input[name="email"]').first().fill("admin@bhairava.com");
  await page.locator('input[type="password"]').first().fill("admin@2026");
  await page.getByRole("button", { name: /sign in|log in|continue/i }).first().click().catch(async () => {
    await page.locator('input[type="password"]').first().press("Enter");
  });
  await page.waitForTimeout(1200);
  await page.goto(BASE + "/projects/PRJ-01?tab=sales", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shot(page, "p3-sales-01-leads.png");
  for (const label of ["Customers", "Agents", "Site Visits", "Reservations", "Bookings"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.waitForTimeout(500);
    await shot(page, `p3-sales-0${["Customers","Agents","Site Visits","Reservations","Bookings"].indexOf(label)+2}-${label.toLowerCase().replace(/\s+/g,"-")}.png`);
  }
  // create a lead
  await page.getByRole("button", { name: "Leads", exact: true }).click();
  await page.waitForTimeout(300);
  const newBtn = page.getByRole("button", { name: /New Lead/i });
  if (await newBtn.count()) {
    await newBtn.click();
    await page.waitForTimeout(400);
    const inputs = page.locator('input');
    // fill first text fields in sheet - name/phone
    await shot(page, "p3-sales-08-new-lead-sheet.png");
  }
  await browser.close();
  console.log("P3 QA done");
})().catch((e) => { console.error(e); process.exit(1); });
