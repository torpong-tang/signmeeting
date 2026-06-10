import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.config.upsert({
    where: { key: "meeting_running" },
    update: {},
    create: { key: "meeting_running", value: "1" },
  });
  await prisma.config.upsert({
    where: { key: "close_time" },
    update: {},
    create: { key: "close_time", value: "15" },
  });

  const people = [
    ["Torpong", "T.", "TPT Team", "Admin"],
    ["Kittanan", "S.", "Project Office", "Project Manager"],
    ["Pichet", "P.", "System Analysis", "System Analyst"],
    ["Decha", "D.", "Development", "Developer"],
    ["Jutarat", "J.", "Quality Assurance", "Tester"],
  ];

  for (const [fname, lname, department, position] of people) {
    const existing = await prisma.internalPerson.findFirst({ where: { fname, lname } });
    if (!existing) {
      await prisma.internalPerson.create({ data: { fname, lname, department, position } });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
