import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo-theatre" },
    update: {},
    create: {
      name: "Demo Theatre Company",
      slug: "demo-theatre",
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

  // 3 weeks of shows, starting with the current week (Sun–Sat, matching app's getWeekBounds)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const showSlots: Array<{ dayOffset: number; time: string }> = [
    { dayOffset: 0, time: "14:00" },   // Sun matinee
    { dayOffset: 3, time: "19:00" },   // Wed
    { dayOffset: 4, time: "19:00" },   // Thu
    { dayOffset: 5, time: "19:00" },   // Fri
    { dayOffset: 6, time: "14:00" },   // Sat matinee
    { dayOffset: 6, time: "19:00" },   // Sat evening
  ];

  for (let week = 0; week < 3; week++) {
    const weekDate = new Date(weekStart);
    weekDate.setDate(weekStart.getDate() + week * 7);
    for (const slot of showSlots) {
      const showDate = new Date(weekDate);
      showDate.setDate(weekDate.getDate() + slot.dayOffset);
      await prisma.show.upsert({
        where: {
          organizationId_date_showTime: {
            organizationId: org.id,
            date: showDate,
            showTime: slot.time,
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          date: showDate,
          showTime: slot.time,
        },
      });
    }
  }

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
