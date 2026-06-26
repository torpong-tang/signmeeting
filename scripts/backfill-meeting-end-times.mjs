import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function defaultEndTime(startTime) {
  const [hour = "9", minute = "0"] = String(startTime || "09:00").split(":");
  const date = new Date(2000, 0, 1, Number(hour), Number(minute), 0, 0);
  date.setHours(date.getHours() + 1);
  if (date.getDate() !== 1) return "23:59";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

try {
  const meetings = await prisma.meeting.findMany({
    select: {
      id: true,
      meetingId: true,
      startTime: true,
      endTime: true,
    },
  });

  let updated = 0;
  for (const meeting of meetings) {
    if (meeting.endTime && meeting.endTime > meeting.startTime) continue;
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { endTime: defaultEndTime(meeting.startTime) },
    });
    updated += 1;
  }

  console.log(`Backfilled ${updated} meeting end time${updated === 1 ? "" : "s"}.`);
} finally {
  await prisma.$disconnect();
}
