import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const company = await prisma.company.upsert({
    where: { slug: "demo-theatre" },
    update: {},
    create: {
      name: "Demo Theatre Company",
      slug: "demo-theatre",
      weekStartsOn: 2,
    },
  });

  const hashedPassword = await bcrypt.hash("password123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@demo.theatre" },
    update: {},
    create: {
      email: "admin@demo.theatre",
      hashedPassword,
      firstName: "Admin",
      lastName: "User",
    },
  });

  await prisma.companyMembership.upsert({
    where: {
      userId_companyId: { userId: adminUser.id, companyId: company.id },
    },
    update: { role: "owner" },
    create: {
      userId: adminUser.id,
      companyId: company.id,
      role: "owner",
    },
  });

  const actors = [
    { firstName: "Alice", lastName: "Anderson" },
    { firstName: "Bob", lastName: "Brown" },
    { firstName: "Carol", lastName: "Clark" },
  ];

  for (const a of actors) {
    const user = await prisma.user.upsert({
      where: {
        email: `${a.firstName.toLowerCase()}.${a.lastName.toLowerCase()}@demo.theatre`,
      },
      update: {},
      create: {
        email: `${a.firstName.toLowerCase()}.${a.lastName.toLowerCase()}@demo.theatre`,
        hashedPassword,
        firstName: a.firstName,
        lastName: a.lastName,
      },
    });

    await prisma.companyMembership.upsert({
      where: {
        userId_companyId: { userId: user.id, companyId: company.id },
      },
      update: { role: "actor" },
      create: {
        userId: user.id,
        companyId: company.id,
        role: "actor",
      },
    });
  }

  // Keep demo users, but start with an empty show schedule.
  await prisma.show.deleteMany({
    where: { companyId: company.id },
  });

  await prisma.show.createMany({
    data: [],
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
