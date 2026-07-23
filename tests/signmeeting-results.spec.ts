import { expect, test } from "@playwright/test";

const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
const adminPassword = process.env.ADMIN_PASSWORD ?? "signmeeting";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  const login = await page.context().request.post("/api/auth/login", {
    data: { username: adminUsername, password: adminPassword },
  });
  expect(login.ok()).toBeTruthy();
}

test.describe("SignMeeting seeded meeting results", () => {
  test("filters and shows matching meetings", async ({ page }) => {
    // Authenticate via the login API; the session cookie is shared with the
    // page context, so the app loads straight into the admin console.
    await loginAsAdmin(page);

    const meetingsResponse = await page.context().request.get("/api/meetings");
    expect(meetingsResponse.ok()).toBeTruthy();
    const meetings = (await meetingsResponse.json()) as Array<{ meetingId: string }>;
    expect(meetings.length).toBeGreaterThan(0);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByAltText("SignMeeting")).toBeVisible();

    await page.getByPlaceholder("Live Search...").first().fill(meetings[0].meetingId);

    const rows = page.locator("#meetingsTable table tbody tr").filter({ hasText: meetings[0].meetingId });
    await expect.poll(async () => rows.count()).toBeGreaterThanOrEqual(1);
    await expect(rows.first()).toContainText(meetings[0].meetingId);
  });

  test("exports attendance PDF in landscape and portrait layouts", async ({ page }) => {
    await loginAsAdmin(page);
    const meetingsResponse = await page.context().request.get("/api/meetings");
    expect(meetingsResponse.ok()).toBeTruthy();
    const meetings = (await meetingsResponse.json()) as Array<{
      meetingId: string;
      attendances: unknown[];
    }>;
    const meeting = meetings.find((item) => item.attendances.length > 0);
    expect(meeting).toBeTruthy();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByTitle("เลือกการประชุมเพื่อแสดง Attendance").selectOption(meeting!.meetingId);
    await expect(page.getByRole("button", { name: "Export PDF แนวนอน" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export PDF แนวตั้ง" })).toBeVisible();

    const portrait = await page.context().request.get(
      `/api/meetings/${meeting!.meetingId}/export-pdf?layout=portrait`,
    );
    expect(portrait.ok()).toBeTruthy();
    expect(portrait.headers()["content-type"]).toContain("application/pdf");
    expect(portrait.headers()["content-disposition"]).toContain("-portrait.pdf");
    expect((await portrait.body()).subarray(0, 4).toString()).toBe("%PDF");
  });

  test("enforces meeting edit policy on the server and in the edit modal", async ({ page }) => {
    await loginAsAdmin(page);
    const meetingsResponse = await page.context().request.get("/api/meetings");
    expect(meetingsResponse.ok()).toBeTruthy();
    const meetings = (await meetingsResponse.json()) as Array<{
      meetingId: string;
      meetingProjectName: string;
      meetingName: string;
      meetingDate: string;
      startTime: string;
      endTime: string;
      meetingLocation: string;
      meetingType: "INTERNAL" | "EXTERNAL";
      internalMeetingName: string;
      externalMeetingName: string | null;
      allowLateRegister: boolean;
      updatedAt: string;
      attendances: Array<{ channel: "INTERNAL" | "EXTERNAL" }>;
    }>;
    const meeting = meetings.find((item) => item.attendances.length > 0);
    expect(meeting).toBeTruthy();
    const unchangedPayload = {
      meetingProjectName: meeting!.meetingProjectName,
      meetingName: meeting!.meetingName,
      meetingDate: meeting!.meetingDate,
      startTime: meeting!.startTime,
      endTime: meeting!.endTime,
      meetingLocation: meeting!.meetingLocation,
      meetingType: meeting!.meetingType,
      internalMeetingName: meeting!.internalMeetingName,
      externalMeetingName: meeting!.externalMeetingName ?? "",
      allowLateRegister: meeting!.allowLateRegister,
      expectedUpdatedAt: meeting!.updatedAt,
    };

    const unchanged = await page.context().request.put(`/api/meetings/${meeting!.meetingId}`, {
      data: unchangedPayload,
    });
    expect(unchanged.ok()).toBeTruthy();

    const typeChange = await page.context().request.put(`/api/meetings/${meeting!.meetingId}`, {
      data: {
        ...unchangedPayload,
        meetingType: meeting!.meetingType === "INTERNAL" ? "EXTERNAL" : "INTERNAL",
      },
    });
    expect(typeChange.status()).toBe(409);
    expect((await typeChange.json()).code).toBe("EDIT_POLICY_VIOLATION");

    const scheduleChange = await page.context().request.put(`/api/meetings/${meeting!.meetingId}`, {
      data: { ...unchangedPayload, meetingDate: "2099-01-01" },
    });
    expect(scheduleChange.status()).toBe(409);
    expect((await scheduleChange.json()).lockedFields).toContain("meetingDate");

    const groupChangeData = meeting!.attendances.some((row) => row.channel === "INTERNAL")
      ? { internalMeetingName: `${meeting!.internalMeetingName} changed` }
      : { externalMeetingName: `${meeting!.externalMeetingName || "Group"} changed` };
    const groupChange = await page.context().request.put(`/api/meetings/${meeting!.meetingId}`, {
      data: { ...unchangedPayload, ...groupChangeData },
    });
    expect(groupChange.status()).toBe(409);
    expect((await groupChange.json()).code).toBe("EDIT_POLICY_VIOLATION");

    const staleVersion = await page.context().request.put(`/api/meetings/${meeting!.meetingId}`, {
      data: { ...unchangedPayload, expectedUpdatedAt: "2000-01-01T00:00:00.000Z" },
    });
    expect(staleVersion.status()).toBe(409);
    expect((await staleVersion.json()).code).toBe("STALE_VERSION");

    const invalidDate = await page.context().request.put(`/api/meetings/${meeting!.meetingId}`, {
      data: { ...unchangedPayload, meetingDate: "2026-02-31" },
    });
    expect(invalidDate.status()).toBe(400);

    const changes = await page.context().request.get(`/api/meetings/${meeting!.meetingId}/changes`);
    expect(changes.ok()).toBeTruthy();
    expect(Array.isArray(await changes.json())).toBeTruthy();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: `แก้ไข ${meeting!.meetingId}` }).click();
    await expect(page.getByRole("heading", { name: `แก้ไขการประชุม ${meeting!.meetingId}` })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Meeting Date" })).toBeDisabled();
    await expect(page.getByLabel("Start Time")).toBeDisabled();
    await expect(page.getByLabel("End Time")).toBeDisabled();
    await expect(page.getByText(/วันและเวลาถูกล็อก/)).toBeVisible();
  });

  test("switches between named and open external attendee groups", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator("#createMeetingButton").click();

    const modes = page.locator('input[name="externalGroupMode"]');
    await modes.nth(1).check();
    await expect(page.getByTestId("external-group-name-input")).toHaveCount(0);

    await modes.nth(0).check();
    await expect(page.getByTestId("external-group-name-input")).toBeVisible();
  });

  test("shows department input only when an external group has no fixed name", async ({ page }) => {
    let externalMeetingName = "Vendor Team";
    await page.route("**/api/register/fake/external", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          meeting: {
            meetingId: "TEST",
            meetingProjectName: "Project",
            meetingName: "Meeting",
            meetingDate: "2099-01-01",
            startTime: "09:00",
            endTime: "10:00",
            meetingLocation: "Room",
            meetingType: "EXTERNAL",
            internalMeetingName: "Staff",
            externalMeetingName,
            attendances: [],
          },
          channel: "EXTERNAL",
          limitMinutes: 15,
          deadline: "2099-01-01T03:00:00.000Z",
          isClosed: false,
        }),
      });
    });
    await page.route("**/api/internal-people", async (route) => {
      await route.fulfill({ contentType: "application/json", body: "[]" });
    });

    await page.goto("/register/fake/external");
    await expect(page.getByTestId("external-department-input")).toHaveCount(0);

    externalMeetingName = "";
    await page.reload();
    await expect(page.getByTestId("external-department-input")).toBeVisible();
  });
});
