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

  test("uploads meeting documents with type and 20 MB server limits", async ({ page }) => {
    await loginAsAdmin(page);
    const meetingsResponse = await page.context().request.get("/api/meetings");
    expect(meetingsResponse.ok()).toBeTruthy();
    const meetings = (await meetingsResponse.json()) as Array<{ meetingId: string }>;
    expect(meetings.length).toBeGreaterThan(0);
    const meetingId = meetings[0].meetingId;

    const upload = await page.context().request.post(`/api/meetings/${meetingId}/documents`, {
      multipart: {
        files: {
          name: "playwright-meeting-note.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("SignMeeting document attachment test"),
        },
      },
    });
    expect(upload.status()).toBe(201);
    const created = (await upload.json()) as Array<{
      id: string;
      filename: string;
      size: number;
    }>;
    expect(created).toHaveLength(1);
    expect(created[0].filename).toBe("playwright-meeting-note.txt");

    try {
      const download = await page.context().request.get(
        `/api/meetings/${meetingId}/documents/${created[0].id}`,
      );
      expect(download.ok()).toBeTruthy();
      expect(download.headers()["content-disposition"]).toContain("attachment;");
      expect((await download.body()).toString()).toBe("SignMeeting document attachment test");

      const unsupported = await page.context().request.post(
        `/api/meetings/${meetingId}/documents`,
        {
          multipart: {
            files: {
              name: "unsafe-script.js",
              mimeType: "application/javascript",
              buffer: Buffer.from("alert(1)"),
            },
          },
        },
      );
      expect(unsupported.status()).toBe(400);

      const oversized = await page.context().request.post(
        `/api/meetings/${meetingId}/documents`,
        {
          multipart: {
            files: {
              name: "oversized.txt",
              mimeType: "text/plain",
              buffer: Buffer.alloc(20 * 1024 * 1024),
            },
          },
        },
      );
      expect(oversized.status()).toBe(400);
      expect((await oversized.json()).message).toContain("20 MB");

      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: `แก้ไข ${meetingId}` }).click();
      const documentHeading = page.getByRole("heading", {
        name: "เอกสารประกอบการประชุม",
      });
      const historyHeading = page.getByText("ประวัติการแก้ไข", { exact: true });
      await expect(documentHeading).toBeVisible();
      await expect(page.getByText("playwright-meeting-note.txt", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "ดาวน์โหลด playwright-meeting-note.txt" }),
      ).toBeVisible();
      await expect(
        documentHeading
          .locator("xpath=ancestor::section/following-sibling::section")
          .filter({ has: historyHeading })
          .first(),
      ).toBeVisible();
    } finally {
      const cleanup = await page.context().request.delete(
        `/api/meetings/${meetingId}/documents/${created[0].id}`,
      );
      expect(cleanup.ok()).toBeTruthy();
    }
  });

  test("switches between named and open external attendee groups", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator("#createMeetingButton").click();

    const modes = page.locator('input[name="externalGroupMode"]');
    await modes.nth(1).check();
    await expect(page.getByTestId("external-group-name-select")).toHaveCount(0);

    await modes.nth(0).check();
    await expect(page.getByTestId("external-group-name-select")).toBeVisible();
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
            externalParticipantGroupId: null,
            attendances: [],
          },
          participantPeople: [],
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

  test("uses the selected participant directory and still allows manual registration", async ({
    page,
  }) => {
    await page.route("**/api/register/fake-directory/external", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          meeting: {
            meetingId: "TEST-DIRECTORY",
            meetingProjectName: "Project",
            meetingName: "Meeting",
            meetingDate: "2099-01-01",
            startTime: "09:00",
            endTime: "10:00",
            meetingLocation: "Room",
            meetingType: "EXTERNAL",
            internalMeetingName: "Staff",
            externalMeetingName: "Vendor Team",
            externalParticipantGroupId: 7,
            attendances: [],
          },
          participantPeople: [
            {
              participantId: 71,
              fname: "สมชาย",
              lname: "ทดสอบ",
              position: "ผู้จัดการ",
              email: "somchai@example.com",
              phone: "0812345678",
            },
          ],
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

    await page.goto("/register/fake-directory/external");
    const participantSearch = page.getByPlaceholder(
      "พิมพ์เพื่อค้นหาและเลือกผู้ร่วมประชุม...",
    );
    await expect(participantSearch).toBeVisible();
    await participantSearch.fill("สมชาย");
    await page.getByRole("button", { name: /สมชาย ทดสอบ/ }).click();
    await expect(page.getByLabel("ชื่อ", { exact: true })).toHaveValue("สมชาย");
    await expect(page.getByLabel("ชื่อ", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("ตำแหน่ง", { exact: true })).toHaveValue("ผู้จัดการ");
    await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue(
      "somchai@example.com",
    );
    await expect(page.getByLabel("E-mail", { exact: true })).not.toHaveAttribute("required", "");
    await expect(page.getByLabel("โทรศัพท์", { exact: true })).not.toHaveAttribute("required", "");
    await expect(page.getByLabel("ชื่อ", { exact: true })).toHaveAttribute("required", "");
    await expect(page.getByTestId("external-department-input")).toHaveCount(0);

    await page.getByRole("button", { name: "ไม่พบชื่อ กรอกข้อมูลเอง" }).click();
    await expect(page.getByPlaceholder("พิมพ์เพื่อค้นหาและเลือกผู้ร่วมประชุม...")).toHaveCount(0);
    await expect(page.getByLabel("ชื่อ", { exact: true })).toBeEditable();
    await expect(page.getByRole("button", { name: "เลือกจากรายชื่อ" })).toBeVisible();
    await expect(page.getByTestId("external-department-input")).toHaveCount(0);
  });

  test("manages participant groups and their prepared participant directory", async ({ page }) => {
    await loginAsAdmin(page);
    const groupName = "Playwright Participant Group";

    const existingResponse = await page.context().request.get("/api/participant-groups");
    expect(existingResponse.ok()).toBeTruthy();
    const existingGroups = (await existingResponse.json()) as Array<{
      groupId: number;
      name: string;
    }>;
    const existing = existingGroups.find((group) => group.name === groupName);
    if (existing) {
      const cleanup = await page.context().request.delete(
        `/api/participant-groups/${existing.groupId}`,
      );
      expect(cleanup.ok()).toBeTruthy();
    }

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "กลุ่มผู้ร่วมประชุม" }).click();
    await expect(
      page.getByRole("heading", { name: "กลุ่มผู้ร่วมประชุม" }),
    ).toBeVisible();

    await page.locator("#participantGroupName").fill(groupName);
    await page.getByRole("button", { name: "เพิ่มกลุ่ม" }).click();
    await page.getByRole("button", { name: "ยืนยัน", exact: true }).click();
    await expect(page.getByText(groupName, { exact: true })).toBeVisible();

    await page.getByPlaceholder("ชื่อ *").fill("Playwright");
    await page.getByPlaceholder("นามสกุล *").fill("Participant");
    await page.getByPlaceholder("ตำแหน่ง *").fill("Observer");
    await page.getByPlaceholder("E-mail").last().fill("participant@example.com");
    await page.getByPlaceholder("โทรศัพท์").last().fill("0812345678");
    await page.getByRole("button", { name: "เพิ่มรายชื่อผู้ร่วมประชุม" }).click();
    await page.getByRole("button", { name: "ยืนยัน", exact: true }).click();
    await expect(page.getByText("Playwright Participant", { exact: true })).toBeVisible();

    const groupsResponse = await page.context().request.get("/api/participant-groups");
    expect(groupsResponse.ok()).toBeTruthy();
    const groups = (await groupsResponse.json()) as Array<{
      groupId: number;
      name: string;
      people: Array<{
        participantId: number;
        email: string | null;
        phone: string | null;
      }>;
    }>;
    const created = groups.find((group) => group.name === groupName);
    expect(created).toBeTruthy();
    expect(created!.people).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "participant@example.com",
          phone: "0812345678",
        }),
      ]),
    );

    await page
      .getByRole("heading", { name: "กลุ่มผู้ร่วมประชุม" })
      .locator("..")
      .getByRole("button", { name: "ปิด", exact: true })
      .click();
    await page.locator("#createMeetingButton").click();
    await expect(page.getByTestId("external-group-name-select")).toContainText(groupName);
    await page.getByTestId("external-group-name-select").selectOption(String(created!.groupId));
    await expect(page.getByTestId("external-group-name-select")).toHaveValue(
      String(created!.groupId),
    );
    await page.getByRole("button", { name: "ปิด", exact: true }).first().click();

    const meetingResponse = await page.context().request.post("/api/meetings", {
      data: {
        meetingProjectName: "Participant Directory Test",
        meetingName: "Prepared Attendee Registration",
        meetingDate: "2099-01-01",
        startTime: "09:00",
        endTime: "10:00",
        meetingLocation: "Test Room",
        meetingType: "EXTERNAL",
        internalMeetingName: "Smarterware",
        externalGroupMode: "NAMED",
        externalMeetingName: groupName,
        externalParticipantGroupId: created!.groupId,
      },
    });
    expect(meetingResponse.ok()).toBeTruthy();
    const meeting = (await meetingResponse.json()) as {
      meetingId: string;
      qrTokenExt: string;
      externalMeetingName: string;
      externalParticipantGroupId: number;
    };
    expect(meeting.externalMeetingName).toBe(groupName);
    expect(meeting.externalParticipantGroupId).toBe(created!.groupId);

    const registrationResponse = await page.context().request.get(
      `/api/register/${meeting.qrTokenExt}/external`,
    );
    expect(registrationResponse.ok()).toBeTruthy();
    const registration = (await registrationResponse.json()) as {
      participantPeople: Array<{ participantId: number }>;
    };
    expect(registration.participantPeople).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          participantId: created!.people[0].participantId,
        }),
      ]),
    );

    const attendancePayload = {
      channel: "EXTERNAL",
      participantId: created!.people[0].participantId,
      email: "participant@example.com",
      phone: "0812345678",
      signatureData: "data:image/png;base64,aGVsbG8=",
    };
    const attendanceResponse = await page.context().request.post(
      `/api/meetings/${meeting.meetingId}/attendance`,
      { data: attendancePayload },
    );
    expect(attendanceResponse.status()).toBe(201);
    expect(await attendanceResponse.json()).toEqual(
      expect.objectContaining({
        participantId: created!.people[0].participantId,
        department: groupName,
      }),
    );

    const manualAttendanceResponse = await page.context().request.post(
      `/api/meetings/${meeting.meetingId}/attendance`,
      {
        data: {
          channel: "EXTERNAL",
          fname: "Manual",
          lname: "Attendee",
          department: groupName,
          position: "Observer",
          email: "",
          phone: "",
          signatureData: "data:image/png;base64,aGVsbG8=",
        },
      },
    );
    expect(manualAttendanceResponse.status()).toBe(201);
    expect(await manualAttendanceResponse.json()).toEqual(
      expect.objectContaining({
        email: null,
        phone: null,
      }),
    );

    const duplicateResponse = await page.context().request.post(
      `/api/meetings/${meeting.meetingId}/attendance`,
      { data: attendancePayload },
    );
    expect(duplicateResponse.status()).toBe(409);

    const meetingCleanup = await page.context().request.delete(
      `/api/meetings/${meeting.meetingId}`,
    );
    expect(meetingCleanup.ok()).toBeTruthy();

    const cleanup = await page.context().request.delete(
      `/api/participant-groups/${created!.groupId}`,
    );
    expect(cleanup.ok()).toBeTruthy();
  });
});
