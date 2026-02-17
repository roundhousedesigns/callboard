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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.show.upsert({
    where: {
      organizationId_date_time: {
        organizationId: org.id,
        date: today,
        time: "14:00",
      },
    },
    update: {},
    create: {
        organizationId: org.id,
        date: today,
        time: "14:00",
      },
  });

  await prisma.show.upsert({
    where: {
      organizationId_date_time: {
        organizationId: org.id,
        date: today,
        time: "19:00",
      },
    },
    update: {},
    create: {
        organizationId: org.id,
        date: today,
        time: "19:00",
      },
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
