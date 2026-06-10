import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3009";
const screenshotPath = process.env.SCREENSHOT_PATH ?? "output/playwright/signmeeting-seed-result.png";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
await context.addInitScript(() => {
  window.localStorage.setItem("signmeeting-admin", "true");
});

const page = await context.newPage();
await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
await page.waitForSelector("text=Meetings", { timeout: 30_000 });
await page.getByPlaceholder("Live Search...").first().fill("Playwright Browser");
await page.waitForTimeout(750);

const rows = await page.locator("table tbody tr").evaluateAll((items) =>
  items
    .map((row) => row.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .filter((text) => text.includes("Playwright Browser")),
);

await page.screenshot({ path: screenshotPath, fullPage: true });
await browser.close();

console.log(JSON.stringify({ ok: rows.length >= 5, rowsFound: rows.length, screenshotPath, rows }, null, 2));
