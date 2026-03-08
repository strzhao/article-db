/**
 * XHS session keep-alive.
 *
 * Loads the saved session, visits XHS homepage headlessly,
 * and re-saves the refreshed session state (cookies get renewed).
 *
 * Usage: npm run xhs-keep-alive
 * Recommended: run via cron every 12 hours.
 */
import { chromium } from "playwright";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const STATE_FILE = join(homedir(), ".xhs-session", "state.json");

async function main() {
  // Check session file exists
  try {
    await stat(STATE_FILE);
  } catch {
    console.error("No session file found. Run 'npm run xhs-login' first.");
    process.exit(1);
  }

  const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || "";

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    ...(proxyUrl ? { proxy: { server: proxyUrl } } : {}),
  });

  try {
    const context = await browser.newContext({
      storageState: STATE_FILE,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      locale: "zh-CN",
    });

    const page = await context.newPage();
    await page.goto("https://www.xiaohongshu.com", { waitUntil: "domcontentloaded", timeout: 30_000 });
    // Wait a bit for any cookie-refresh responses
    await page.waitForLoadState("networkidle").catch(() => {});

    // Check if still logged in
    const cookies = await context.cookies("https://www.xiaohongshu.com");
    const hasAuth = cookies.some(
      (c) => c.name === "web_session" || c.name === "customer-sso-sid" || c.name === "galaxy_creator_session_id",
    );

    if (hasAuth) {
      await context.storageState({ path: STATE_FILE });
      console.log(`[${new Date().toISOString()}] XHS session refreshed successfully (${cookies.length} cookies)`);
    } else {
      console.error(`[${new Date().toISOString()}] XHS session expired! Run 'npm run xhs-login' to re-login.`);
      process.exit(1);
    }

    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(`[${new Date().toISOString()}] Keep-alive failed:`, err.message);
  process.exit(1);
});
