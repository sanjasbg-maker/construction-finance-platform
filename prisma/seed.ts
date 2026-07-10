import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const users = [
  { name: "Admin", email: "admin@construction-finance.local", role: "ADMIN" as const },
  {
    name: "Project Manager",
    email: "pm@construction-finance.local",
    role: "PROJECT_MANAGER" as const,
  },
  { name: "Finance", email: "finance@construction-finance.local", role: "FINANCE" as const },
  { name: "Director", email: "director@construction-finance.local", role: "DIRECTOR" as const },
];

async function main() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }
  console.log(`Seeded ${users.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
