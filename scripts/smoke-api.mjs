const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3009";
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const createdResponse = await fetch(`${baseUrl}/api/meetings`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: baseUrl.replace("127.0.0.1", "localhost"),
  },
  body: JSON.stringify({
    meetingProjectName: "SignMeeting Pilot",
    meetingName: "Kickoff Meeting",
    meetingDate: tomorrow,
    startTime: "09:00",
    meetingLocation: "Meeting Room A",
    meetingType: "EXTERNAL",
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
  }),
});

if (!attendanceResponse.ok) {
  throw new Error(`Create attendance failed: ${attendanceResponse.status} ${await attendanceResponse.text()}`);
}

const attendance = await attendanceResponse.json();
console.log(`Smoke API OK: ${created.meetingId}, person ${attendance.personNo}`);
