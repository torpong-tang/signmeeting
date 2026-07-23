const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3009";
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const signatureData =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: process.env.ADMIN_USERNAME ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? "signmeeting",
  }),
});

if (!loginResponse.ok) {
  throw new Error(`Login failed: ${loginResponse.status} ${await loginResponse.text()}`);
}

const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0];
if (!cookie) {
  throw new Error("Login did not return a session cookie.");
}

const createdResponse = await fetch(`${baseUrl}/api/meetings`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: cookie,
    Origin: baseUrl.replace("127.0.0.1", "localhost"),
  },
  body: JSON.stringify({
    meetingProjectName: "SignMeeting Pilot",
    meetingName: "Kickoff Meeting",
    meetingDate: tomorrow,
    startTime: "09:00",
    endTime: "10:00",
    meetingLocation: "Meeting Room A",
    meetingType: "EXTERNAL",
    internalMeetingName: "Smarterware",
    externalMeetingName: "",
  }),
});

if (!createdResponse.ok) {
  throw new Error(`Create meeting failed: ${createdResponse.status} ${await createdResponse.text()}`);
}

const created = await createdResponse.json();
const attendanceResponse = await fetch(`${baseUrl}/api/meetings/${created.meetingId}/attendance`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    channel: "EXTERNAL",
    fname: "Somchai",
    lname: "Test",
    department: "Vendor",
    position: "Consultant",
    signatureData,
  }),
});

if (!attendanceResponse.ok) {
  throw new Error(`Create attendance failed: ${attendanceResponse.status} ${await attendanceResponse.text()}`);
}

const attendance = await attendanceResponse.json();
console.log(`Smoke API OK: ${created.meetingId}, person ${attendance.personNo}`);
