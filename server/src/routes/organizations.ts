import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

router.post("/", async (req, res) => {
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
});

router.get("/", async (_req, res) => {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });
  res.json(orgs);
});

export { router as organizationRoutes };
