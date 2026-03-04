import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { authMiddleware, adminOrOwner, ownerOnly } from "../middleware/auth.js";
import { prisma } from "../db.js";

const router = Router();
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

const updateSchema = z.object({
  name: z.string().min(1),
});

const settingsSchema = z.object({
  showTitle: z.string().nullable().optional(),
  weekStartsOn: z.number().int().min(0).max(6).optional(),
});

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "admin", "actor"]),
});

const updateMemberSchema = z.object({
  role: z.enum(["owner", "admin", "actor"]),
});

router.post("/", authMiddleware, asyncHandler(async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const data = createSchema.parse(req.body);
    const existing = await prisma.organization.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      res.status(400).json({ error: "Organization slug already exists" });
      return;
    }
    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: { name: data.name, slug: data.slug },
      });
      await tx.organizationMembership.create({
        data: {
          userId: req.user!.id,
          organizationId: created.id,
          role: "owner",
        },
      });
      return created;
    });
    res.status(201).json(org);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
      return;
    }
    throw err;
  }
}));

router.patch("/:orgSlug", authMiddleware, ownerOnly, asyncHandler(async (req, res) => {
  try {
    const data = updateSchema.parse(req.body);
    const orgId = req.organizationId!;
    await prisma.organization.update({
      where: { id: orgId },
      data: { name: data.name },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
      return;
    }
    throw err;
  }
}));

router.delete("/:orgSlug", authMiddleware, ownerOnly, asyncHandler(async (req, res) => {
  const orgId = req.organizationId!;
  await prisma.organization.delete({
    where: { id: orgId },
  });
  res.json({ ok: true });
}));

router.get("/:orgSlug/settings", authMiddleware, adminOrOwner, asyncHandler(async (req, res) => {
  const orgId = req.organizationId!;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { showTitle: true, weekStartsOn: true },
  });
  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }
  res.json(org);
}));

router.patch("/:orgSlug/settings", authMiddleware, adminOrOwner, asyncHandler(async (req, res) => {
  try {
    const data = settingsSchema.parse(req.body);
    const orgId = req.organizationId!;
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(data.showTitle !== undefined && { showTitle: data.showTitle || null }),
        ...(data.weekStartsOn !== undefined && { weekStartsOn: data.weekStartsOn ?? null }),
      },
      select: { showTitle: true, weekStartsOn: true },
    });
    res.json(org);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
      return;
    }
    throw err;
  }
}));

router.get("/:orgSlug/members", authMiddleware, adminOrOwner, asyncHandler(async (req, res) => {
  const orgId = req.organizationId!;
  const memberships = await prisma.organizationMembership.findMany({
    where: { organizationId: orgId },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });
  res.json(
    memberships.map((m) => ({
      ...m.user,
      role: m.role,
    }))
  );
}));

router.post("/:orgSlug/members", authMiddleware, adminOrOwner, asyncHandler(async (req, res) => {
  try {
    const data = addMemberSchema.parse(req.body);
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
      res.status(404).json({ error: "User not found. They must register first." });
      return;
    }

    const existing = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: { userId: user.id, organizationId: orgId },
      },
    });
    if (existing) {
      res.status(400).json({ error: "User is already a member" });
      return;
    }

    const membership = await prisma.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role: data.role,
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
}));

router.patch("/:orgSlug/members/:userId", authMiddleware, adminOrOwner, asyncHandler(async (req, res) => {
  try {
    const data = updateMemberSchema.parse(req.body);
    const orgId = req.organizationId!;
    const targetUserId = req.params.userId;
    const membershipRole = req.membershipRole!;

    if (data.role === "owner" && membershipRole !== "owner") {
      res.status(403).json({ error: "Only owners can assign owner role" });
      return;
    }
    if (data.role === "admin" && membershipRole === "admin") {
      res.status(403).json({ error: "Admins cannot assign admin role" });
      return;
    }

    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: { userId: targetUserId, organizationId: orgId },
      },
    });
    if (!membership) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    await prisma.organizationMembership.update({
      where: {
        userId_organizationId: { userId: targetUserId, organizationId: orgId },
      },
      data: { role: data.role },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
      return;
    }
    throw err;
  }
}));

router.delete("/:orgSlug/members/:userId", authMiddleware, adminOrOwner, asyncHandler(async (req, res) => {
  const orgId = req.organizationId!;
  const targetUserId = req.params.userId;
  const currentUserId = req.user!.id;

  if (targetUserId === currentUserId) {
    const ownerCount = await prisma.organizationMembership.count({
      where: { organizationId: orgId, role: "owner" },
    });
    if (ownerCount <= 1) {
      res.status(400).json({ error: "Cannot remove the last owner" });
      return;
    }
  }

  const membership = await prisma.organizationMembership.findUnique({
    where: {
      userId_organizationId: { userId: targetUserId, organizationId: orgId },
    },
  });
  if (!membership) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  await prisma.organizationMembership.delete({
    where: {
      userId_organizationId: { userId: targetUserId, organizationId: orgId },
    },
  });
  res.json({ ok: true });
}));

export { router as organizationRoutes };
