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
  const orgId = req.organizationId!;
  const memberships = await prisma.organizationMembership.findMany({
    where: { organizationId: orgId },
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
    const orgId = req.organizationId!;
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

    const existing = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: { userId: user.id, organizationId: orgId },
      },
    });
    if (existing) {
      res.status(400).json({ error: "User is already a member of this organization" });
      return;
    }

    await prisma.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role: data.role,
      },
    });

    const membership = await prisma.organizationMembership.findUniqueOrThrow({
      where: {
        userId_organizationId: { userId: user.id, organizationId: orgId },
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
  const orgId = req.organizationId!;
  const membership = await prisma.organizationMembership.findUnique({
    where: {
      userId_organizationId: { userId: req.params.id, organizationId: orgId },
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
    const orgId = req.organizationId!;

    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: { userId: req.params.id, organizationId: orgId },
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
  const orgId = req.organizationId!;
  const membership = await prisma.organizationMembership.findUnique({
    where: {
      userId_organizationId: { userId: req.params.id, organizationId: orgId },
    },
  });
  if (!membership) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await prisma.organizationMembership.delete({
    where: {
      userId_organizationId: { userId: req.params.id, organizationId: orgId },
    },
  });
  res.json({ ok: true });
});

export { router as userRoutes };
