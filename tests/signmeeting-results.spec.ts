import { expect, test } from "@playwright/test";

test.describe("SignMeeting seeded meeting results", () => {
  test("shows five Playwright Browser meetings with 15 attendees each", async ({ page }) => {
    // Authenticate via the login API; the session cookie is shared with the
    // page context, so the app loads straight into the admin console.
    const login = await page.context().request.post("/api/auth/login", {
      data: { username: "admin", password: "signmeeting" },
    });
    expect(login.ok()).toBeTruthy();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "SignMeeting" })).toBeVisible();

    await page.getByPlaceholder("Live Search...").first().fill("Playwright Browser");

    const rows = page.locator("#meetingsTable table tbody tr").filter({ hasText: "Playwright Browser" });
    await expect.poll(async () => rows.count()).toBeGreaterThanOrEqual(5);

    for (const meetingId of ["MTG-2026-0014", "MTG-2026-0013", "MTG-2026-0012", "MTG-2026-0011", "MTG-2026-0010"]) {
      await expect(page.locator("#meetingsTable table tbody tr").filter({ hasText: meetingId })).toContainText("15");
    }
  });
});
