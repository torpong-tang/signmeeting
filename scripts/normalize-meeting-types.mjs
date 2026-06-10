import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const result = await prisma.meeting.updateMany({
    where: { meetingType: "ALL" },
    data: { meetingType: "EXTERNAL" },
  });
  console.log(`Normalized ${result.count} meetings from ALL to EXTERNAL.`);
} finally {
  await prisma.$disconnect();
}
