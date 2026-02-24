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

  await prisma.user.upsert({
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

  // Keep demo users, but start with an empty show schedule.
  await prisma.show.deleteMany({
    where: { organizationId: org.id },
  });

  await prisma.show.createMany({
    data: showData,
    skipDuplicates: true,
  });

  console.log("Seed complete.");
  console.log("Removed all demo shows; none were seeded.");
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
