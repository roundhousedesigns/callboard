import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { authMiddleware, adminOnly } from "../middleware/auth.js";
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

router.post("/", asyncHandler(async (req, res) => {
  try {
    const data = createSchema.parse(req.body);
    const existing = await prisma.organization.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      res.status(400).json({ error: "Organization slug already exists" });
      return;
    }
    const org = await prisma.organization.create({
      data: { name: data.name, slug: data.slug },
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

router.get("/", asyncHandler(async (_req, res) => {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });
  res.json(orgs);
}));

const settingsSchema = z.object({
  showTitle: z.string().nullable().optional(),
  weekStartsOn: z.number().int().min(0).max(6).optional(),
});

router.get("/me/settings", authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const orgId = req.user!.organizationId;
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

router.patch("/me/settings", authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  try {
    const data = settingsSchema.parse(req.body);
    const orgId = req.user!.organizationId;
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

export { router as organizationRoutes };
