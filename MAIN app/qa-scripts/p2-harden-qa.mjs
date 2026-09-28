import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "qa-screenshots");
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.QA_BASE || "http://localhost:8081";

async function shot(page, name) {
  const fp = path.join(OUT, name);
  await page.screenshot({ path: fp, fullPage: false });
  console.log("shot", name);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(20000);

  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  // fill login
  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]').first();
  const pass = page.locator('input[type="password"]').first();
  await email.fill("admin@bhairava.com");
  await pass.fill("admin@2026");
  await page.getByRole("button", { name: /sign in|log in|continue/i }).first().click().catch(async () => {
    await pass.press("Enter");
  });
  await page.waitForTimeout(1500);
  await shot(page, "p2-harden-01-after-login.png");

  // Project layout tab
  await page.goto(BASE + "/projects/PRJ-01?tab=layout", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shot(page, "p2-harden-02-layout-tab.png");

  // Setup media - set master plan via data URL in localStorage+UI
  await page.goto(BASE + "/projects/PRJ-01?tab=setup", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  // click Media section if present
  const mediaBtn = page.getByRole("button", { name: /^Media$/i }).or(page.getByText(/^Media$/));
  if (await mediaBtn.count()) await mediaBtn.first().click();
  await page.waitForTimeout(400);

  // Inject layout image via evaluate into store by visiting editor upload
  const pngPath = path.join(OUT, "master-plan-demo.png");
  await page.goto(BASE + "/plots/editor?projectId=PRJ-01", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await shot(page, "p2-harden-03-editor-empty-master.png");

  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count()) {
    await fileInput.setInputFiles(pngPath);
    await page.waitForTimeout(800);
  }
  await shot(page, "p2-harden-04-master-plan-uploaded.png");

  // Draw polygon: switch to draw tool
  await page.getByTitle("Draw polygon").click();
  const canvas = page.locator(".relative.overflow-hidden.rounded-2xl").first();
  const box = await canvas.boundingBox();
  if (box) {
    const pts = [
      [box.x + box.width * 0.15, box.y + box.height * 0.2],
      [box.x + box.width * 0.28, box.y + box.height * 0.2],
      [box.x + box.width * 0.28, box.y + box.height * 0.35],
      [box.x + box.width * 0.15, box.y + box.height * 0.35],
    ];
    for (const [x, y] of pts) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(120);
    }
    await page.mouse.dblclick(pts[3][0], pts[3][1]);
    await page.waitForTimeout(400);
  }
  await shot(page, "p2-harden-05-draft-drawn.png");

  // Prefer an unmapped plot — first unlink a seed plot to free capacity for demo
  // Select a mapped plot and unlink
  await page.getByTitle("Select").click();
  // click roughly a known polygon area
  if (box) {
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.25);
    await page.waitForTimeout(300);
  }

  // Link draft: pick first unmapped option if any; else create unlink then link
  const unlinkBtn = page.getByRole("button", { name: /Unlink polygon/i });
  if (await unlinkBtn.count()) {
    await unlinkBtn.click();
    await page.waitForTimeout(200);
    const confirm = page.getByRole("button", { name: /Confirm unlink/i });
    if (await confirm.count()) await confirm.click();
    await page.waitForTimeout(300);
  }
  await shot(page, "p2-harden-06-after-unlink.png");

  // Re-draw if draft cleared
  if (box) {
    await page.getByTitle("Draw polygon").click();
    const pts2 = [
      [box.x + box.width * 0.55, box.y + box.height * 0.55],
      [box.x + box.width * 0.68, box.y + box.height * 0.55],
      [box.x + box.width * 0.68, box.y + box.height * 0.68],
      [box.x + box.width * 0.55, box.y + box.height * 0.68],
    ];
    for (const [x, y] of pts2) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(100);
    }
    await page.mouse.dblclick(pts2[3][0], pts2[3][1]);
    await page.waitForTimeout(300);
  }

  const linkSelect = page.locator("select").filter({ hasText: /Unmapped plot/i }).or(page.locator("aside select").first());
  // find select with Unmapped
  const selects = page.locator("select");
  const n = await selects.count();
  let linked = false;
  for (let i = 0; i < n; i++) {
    const s = selects.nth(i);
    const txt = await s.innerText();
    if (txt.includes("Unmapped")) {
      const options = await s.locator("option").allTextContents();
      const opt = options.find((o) => o && !o.includes("Unmapped") && o.trim());
      if (opt) {
        await s.selectOption({ label: opt.trim() });
        const linkBtn = page.getByRole("button", { name: /Link draft/i });
        if (await linkBtn.count()) {
          await linkBtn.click();
          linked = true;
          await page.waitForTimeout(400);
        }
      }
      break;
    }
  }
  console.log("linked", linked);
  await shot(page, "p2-harden-07-linked.png");

  // Duplicate mapping rejection: try link same draft again without draw — or link onto mapped
  // Save geometry
  const saveBtn = page.getByRole("button", { name: /Save geometry/i });
  if (await saveBtn.count()) {
    await saveBtn.click();
    await page.waitForTimeout(500);
  }
  await shot(page, "p2-harden-08-saved.png");

  // Reload persistence
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await shot(page, "p2-harden-09-reload-persist.png");

  // Layout tab legend 9 statuses
  await page.goto(BASE + "/projects/PRJ-01?tab=layout", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await shot(page, "p2-harden-10-layout-9-statuses.png");

  // Fullscreen layout
  await page.goto(BASE + "/plots/layout?projectId=PRJ-01", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await shot(page, "p2-harden-11-fullscreen-layout.png");

  // Admin customer PII visible in table
  await page.goto(BASE + "/projects/PRJ-01?tab=layout", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "p2-harden-12-admin-customer-col.png");

  // Role switch to Agent via localStorage
  await page.evaluate(() => {
    const raw = localStorage.getItem("bhairava.session.v1");
    if (!raw) return;
    const s = JSON.parse(raw);
    s.role = "Agent";
    localStorage.setItem("bhairava.session.v1", JSON.stringify(s));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await shot(page, "p2-harden-13-agent-pii-redacted.png");

  // restore admin
  await page.evaluate(() => {
    const raw = localStorage.getItem("bhairava.session.v1");
    if (!raw) return;
    const s = JSON.parse(raw);
    s.role = "Administrator";
    localStorage.setItem("bhairava.session.v1", JSON.stringify(s));
  });

  // Try duplicate link rejection message via domain in page evaluate
  const dup = await page.evaluate(async () => {
    // Soft check: mapped plots count
    const cells = Array.from(document.querySelectorAll("td")).map((t) => t.textContent || "");
    return { sample: cells.slice(0, 8) };
  });
  console.log("sample cells", dup);

  await browser.close();
  console.log("QA done");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
