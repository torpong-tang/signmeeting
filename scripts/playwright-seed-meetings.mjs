import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const origin = process.env.ORIGIN_URL ?? "http://localhost:3009";
const year = new Date().getFullYear();
const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lAqG4wAAAABJRU5ErkJggg==";

const people = [
  ["Kitti", "Test", "Project Office", "Project Manager"],
  ["Malee", "Jaidee", "Analysis", "System Analyst"],
  ["Somchai", "Mankong", "Development", "Developer"],
  ["Somying", "Fast", "Testing", "Tester"],
  ["Thana", "Ontime", "PMO", "Coordinator"],
  ["Pimchanok", "Bright", "Business", "Business Analyst"],
  ["Anan", "Sangthong", "IT", "Engineer"],
  ["Waraporn", "Detail", "Document", "Document Control"],
  ["Prasit", "Sure", "Quality", "QA Lead"],
  ["Lalita", "Happy", "Customer", "Customer Success"],
  ["Nat", "Smart", "System", "Architect"],
  ["Jira", "Meechai", "Training", "Trainer"],
  ["Pakorn", "Ready", "Support", "Support"],
  ["Napa", "Calm", "Procurement", "Procurement"],
  ["Chaiwat", "Together", "Management", "Manager"],
];

function createToken() {
  return randomBytes(24).toString("base64url");
}

const runningConfig = await prisma.config.upsert({
  where: { key: "meeting_running" },
  update: {},
  create: { key: "meeting_running", value: "1" },
});
let running = Number.parseInt(runningConfig.value, 10) || 1;

const created = [];

for (let i = 1; i <= 5; i += 1) {
  const meetingId = `MTG-${year}-${String(running).padStart(4, "0")}`;
  running += 1;
  const qrTokenInt = createToken();
  const qrTokenExt = createToken();
  const date = new Date(Date.now() + (i + 2) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const startTime = `${String(8 + i).padStart(2, "0")}:30`;

  await prisma.meeting.create({
    data: {
      meetingId,
      meetingProjectName: `Playwright Browser Test Project ${i}`,
      meetingName: `Playwright Browser QA Meeting ${i}`,
      meetingDate: date,
      startTime,
      endTime: `${String(9 + i).padStart(2, "0")}:30`,
      internalMeetingName: "Smarterware",
      externalMeetingName: `Partner Group ${i}`,
      meetingLocation: `Browser Test Meeting Room ${i}`,
      meetingType: "EXTERNAL",
      allowLateRegister: false,
      qrTokenInt,
      qrTokenExt,
      qrUrlInt: `${origin}/register/${qrTokenInt}/internal`,
      qrUrlExt: `${origin}/register/${qrTokenExt}/external`,
      photos: {
        create: {
          filename: `playwright-meeting-${i}.png`,
          mimeType: "image/png",
          size: Buffer.byteLength(tinyPngBase64, "base64"),
          data: `data:image/png;base64,${tinyPngBase64}`,
        },
      },
      attendances: {
        create: people.map(([fname, lname, department, position], index) => ({
          personNo: index + 1,
          channel: index % 3 === 0 ? "INTERNAL" : "EXTERNAL",
          fname: `${fname}${i}`,
          lname,
          department,
          position,
        })),
      },
    },
  });

  created.push(meetingId);
}

await prisma.config.update({
  where: { key: "meeting_running" },
  data: { value: String(running) },
});

await prisma.$disconnect();

console.log(JSON.stringify({ ok: true, meetings: created, attendancePerMeeting: 15, photosPerMeeting: 1 }, null, 2));
