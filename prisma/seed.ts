import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function getWeekStart(d: Date, weekStartsOn: number): Date {
  const start = new Date(d);
  const day = start.getDay(); // 0=Sun..6=Sat (local)
  const diff = (day - weekStartsOn + 7) % 7;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo-theatre" },
    update: {},
    create: {
      name: "Demo Theatre Company",
      slug: "demo-theatre",
      weekStartsOn: 2,
    },
  });

  const hashedPassword = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.theatre" },
    update: {},
    create: {
      email: "admin@demo.theatre",
      hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      organizationId: org.id,
    },
  });

  const actors = [
    { firstName: "Alice", lastName: "Anderson" },
    { firstName: "Bob", lastName: "Brown" },
    { firstName: "Carol", lastName: "Clark" },
  ];

  for (const a of actors) {
    await prisma.user.upsert({
      where: {
        email: `${a.firstName.toLowerCase()}.${a.lastName.toLowerCase()}@demo.theatre`,
      },
      update: {},
      create: {
        email: `${a.firstName.toLowerCase()}.${a.lastName.toLowerCase()}@demo.theatre`,
        hashedPassword,
        firstName: a.firstName,
        lastName: a.lastName,
        role: "actor",
        organizationId: org.id,
      },
    });
  }

  // Demo database: safe to wipe + recreate show data.
  // Populate with ~1 year of upcoming dummy shows so the UI always has data.
  await prisma.show.deleteMany({ where: { organizationId: org.id } });

  const now = new Date();
  const weekStartsOn = org.weekStartsOn ?? 0;
  const startDate = getWeekStart(now, weekStartsOn);

  const oneYearDays = 365 + 7; // include the whole current week
  const showData: Array<{ organizationId: string; date: Date; showTime: string }> = [];

  for (let i = 0; i < oneYearDays; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    const day = date.getDay(); // 0=Sun ... 6=Sat (local)

    // Evening show most days.
    showData.push({ organizationId: org.id, date, showTime: "19:00" });

    // Weekend matinees (and keep Saturday evening too).
    if (day === 0 || day === 6) {
      showData.push({ organizationId: org.id, date, showTime: "14:00" });
    }
  }

  await prisma.show.createMany({
    data: showData,
    skipDuplicates: true,
  });

  console.log("Seed complete.");
  console.log("Admin: admin@demo.theatre / password123");
  console.log("Actors: alice.anderson@demo.theatre, bob.brown@demo.theatre, carol.clark@demo.theatre / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
