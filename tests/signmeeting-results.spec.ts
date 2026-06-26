import { expect, test } from "@playwright/test";

test.describe("SignMeeting seeded meeting results", () => {
  test("shows seeded Playwright Browser meetings", async ({ page }) => {
    // Authenticate via the login API; the session cookie is shared with the
    // page context, so the app loads straight into the admin console.
    const login = await page.context().request.post("/api/auth/login", {
      data: { username: "admin", password: "signmeeting" },
    });
    expect(login.ok()).toBeTruthy();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByAltText("SignMeeting")).toBeVisible();

    await page.getByPlaceholder("Live Search...").first().fill("Playwright Browser");

    const rows = page.locator("#meetingsTable table tbody tr").filter({ hasText: "Playwright Browser" });
    await expect.poll(async () => rows.count()).toBeGreaterThanOrEqual(5);

    for (const meetingName of [
      "Playwright Browser QA Meeting 1",
      "Playwright Browser QA Meeting 2",
      "Playwright Browser QA Meeting 3",
      "Playwright Browser QA Meeting 4",
      "Playwright Browser QA Meeting 5",
    ]) {
      const matchingRows = page.locator("#meetingsTable table tbody tr").filter({ hasText: meetingName });
      await expect.poll(async () => matchingRows.count()).toBeGreaterThanOrEqual(1);
    }
  });
});
