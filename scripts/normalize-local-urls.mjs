import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const meetings = await prisma.meeting.findMany();
  for (const meeting of meetings) {
    await prisma.meeting.update({
      where: { meetingId: meeting.meetingId },
      data: {
        qrUrlInt: meeting.qrUrlInt?.replace("127.0.0.1", "localhost"),
        qrUrlExt: meeting.qrUrlExt?.replace("127.0.0.1", "localhost"),
      },
    });
  }
  console.log(`Updated ${meetings.length} meeting QR URLs.`);
} finally {
  await prisma.$disconnect();
}
