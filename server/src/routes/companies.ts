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
    const existing = await prisma.company.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      res.status(400).json({ error: "Company slug already exists" });
      return;
    }
    const company = await prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: { name: data.name, slug: data.slug },
      });
      await tx.companyMembership.create({
        data: {
          userId: req.user!.id,
          companyId: created.id,
          role: "owner",
        },
      });
      return created;
    });
    res.status(201).json(company);
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
    const companyId = req.companyId!;
    await prisma.company.update({
      where: { id: companyId },
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
  const companyId = req.companyId!;
  await prisma.company.delete({
    where: { id: companyId },
  });
  res.json({ ok: true });
}));

router.get("/:orgSlug/settings", authMiddleware, adminOrOwner, asyncHandler(async (req, res) => {
  const companyId = req.companyId!;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { showTitle: true, weekStartsOn: true },
  });
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(company);
}));

router.patch("/:orgSlug/settings", authMiddleware, adminOrOwner, asyncHandler(async (req, res) => {
  try {
    const data = settingsSchema.parse(req.body);
    const companyId = req.companyId!;
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        ...(data.showTitle !== undefined && { showTitle: data.showTitle || null }),
        ...(data.weekStartsOn !== undefined && { weekStartsOn: data.weekStartsOn ?? null }),
      },
      select: { showTitle: true, weekStartsOn: true },
    });
    res.json(company);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
      return;
    }
    throw err;
  }
}));

router.get("/:orgSlug/members", authMiddleware, adminOrOwner, asyncHandler(async (req, res) => {
  const companyId = req.companyId!;
  const memberships = await prisma.companyMembership.findMany({
    where: { companyId },
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

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!user) {
      res.status(404).json({ error: "User not found. They must register first." });
      return;
    }

    const existing = await prisma.companyMembership.findUnique({
      where: {
        userId_companyId: { userId: user.id, companyId },
      },
    });
    if (existing) {
      res.status(400).json({ error: "User is already a member" });
      return;
    }

    const membership = await prisma.companyMembership.create({
      data: {
        userId: user.id,
        companyId,
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
    const companyId = req.companyId!;
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

    const membership = await prisma.companyMembership.findUnique({
      where: {
        userId_companyId: { userId: targetUserId, companyId },
      },
    });
    if (!membership) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    await prisma.companyMembership.update({
      where: {
        userId_companyId: { userId: targetUserId, companyId },
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
  const companyId = req.companyId!;
  const targetUserId = req.params.userId;
  const currentUserId = req.user!.id;

  if (targetUserId === currentUserId) {
    const ownerCount = await prisma.companyMembership.count({
      where: { companyId, role: "owner" },
    });
    if (ownerCount <= 1) {
      res.status(400).json({ error: "Cannot remove the last owner" });
      return;
    }
  }

  const membership = await prisma.companyMembership.findUnique({
    where: {
      userId_companyId: { userId: targetUserId, companyId },
    },
  });
  if (!membership) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  await prisma.companyMembership.delete({
    where: {
      userId_companyId: { userId: targetUserId, companyId },
    },
  });
  res.json({ ok: true });
}));

export { router as companyRoutes };
