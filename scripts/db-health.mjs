import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

console.time("db");
const [meetings, attendances, photos, configs] = await Promise.all([
  prisma.meeting.count(),
  prisma.attendance.count(),
  prisma.meetingPhoto.count(),
  prisma.config.findMany({ orderBy: { key: "asc" } }),
]);
console.timeEnd("db");
console.log(JSON.stringify({ meetings, attendances, photos, configs }, null, 2));

await prisma.$disconnect();
