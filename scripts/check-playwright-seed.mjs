import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rows = await prisma.meeting.findMany({
  where: {
    OR: [
      { meetingProjectName: { startsWith: "Playwright Test Project" } },
      { meetingProjectName: { startsWith: "Playwright Browser Test Project" } },
    ],
  },
  select: {
    meetingId: true,
    meetingProjectName: true,
    meetingName: true,
    _count: { select: { attendances: true, photos: true } },
  },
  orderBy: { createdAt: "desc" },
});

const tests = rows.map((meeting) => ({
    id: meeting.meetingId,
    project: meeting.meetingProjectName,
    name: meeting.meetingName,
  attendance: meeting._count.attendances,
  photos: meeting._count.photos,
}));

await prisma.$disconnect();

console.log(JSON.stringify(tests, null, 2));
