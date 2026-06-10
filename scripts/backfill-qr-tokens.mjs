import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function token() {
  return randomBytes(24).toString("base64url");
}

try {
  const meetings = await prisma.meeting.findMany();
  for (const meeting of meetings) {
    const qrTokenInt = meeting.qrTokenInt ?? token();
    const qrTokenExt = meeting.qrTokenExt ?? token();
    const origin = "http://localhost:3009";
    await prisma.meeting.update({
      where: { meetingId: meeting.meetingId },
      data: {
        qrTokenInt,
        qrTokenExt,
        qrUrlInt: `${origin}/register/${qrTokenInt}/internal`,
        qrUrlExt: `${origin}/register/${qrTokenExt}/external`,
      },
    });
  }
  console.log(`Backfilled QR tokens for ${meetings.length} meetings.`);
} finally {
  await prisma.$disconnect();
}
