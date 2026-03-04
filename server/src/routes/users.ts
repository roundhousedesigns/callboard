import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";

const router = Router({ mergeParams: true });

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["owner", "admin", "actor"]),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

router.get("/", async (req, res) => {
  const companyId = req.companyId!;
  const memberships = await prisma.companyMembership.findMany({
    where: { companyId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
  res.json(
    memberships.map((m) => ({
      ...m.user,
      role: m.role,
    }))
  );
});

router.post("/", async (req, res) => {
  try {
    const data = createUserSchema.parse(req.body);
    const companyId = req.companyId!;
    const membershipRole = req.membershipRole!;

    if (data.role === "owner" && membershipRole !== "owner") {
      res.status(403).json({ error: "Only owners can add other owners" });
      return;
    }
    if (data.role === "admin" && membershipRole === "admin") {
      res.status(403).json({ error: "Admins cannot add other admins" });
      return;
    }

    let user = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!user) {
      const hashedPassword = await bcrypt.hash(data.password, 12);
      user = await prisma.user.create({
        data: {
          email: data.email,
          hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });
    }

    const existing = await prisma.companyMembership.findUnique({
      where: {
        userId_companyId: { userId: user.id, companyId },
      },
    });
    if (existing) {
      res.status(400).json({ error: "User is already a member of this company" });
      return;
    }

    await prisma.companyMembership.create({
      data: {
        userId: user.id,
        companyId,
        role: data.role,
      },
    });

    const membership = await prisma.companyMembership.findUniqueOrThrow({
      where: {
        userId_companyId: { userId: user.id, companyId },
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    res.status(201).json({ ...membership.user, role: membership.role });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
      return;
    }
    throw err;
  }
});

router.get("/:id", async (req, res) => {
  const companyId = req.companyId!;
  const membership = await prisma.companyMembership.findUnique({
    where: {
      userId_companyId: { userId: req.params.id, companyId },
    },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });
  if (!membership) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ ...membership.user, role: membership.role });
});

router.patch("/:id", async (req, res) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const companyId = req.companyId!;

    const membership = await prisma.companyMembership.findUnique({
      where: {
        userId_companyId: { userId: req.params.id, companyId },
      },
    });
    if (!membership) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.password) {
      updateData.hashedPassword = await bcrypt.hash(data.password, 12);
    }
    delete (updateData as Record<string, unknown>).password;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    res.json({ ...user, role: membership.role });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
      return;
    }
    throw err;
  }
});

router.delete("/:id", async (req, res) => {
  const companyId = req.companyId!;
  const membership = await prisma.companyMembership.findUnique({
    where: {
      userId_companyId: { userId: req.params.id, companyId },
    },
  });
  if (!membership) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await prisma.companyMembership.delete({
    where: {
      userId_companyId: { userId: req.params.id, companyId },
    },
  });
  res.json({ ok: true });
});

export { router as userRoutes };
