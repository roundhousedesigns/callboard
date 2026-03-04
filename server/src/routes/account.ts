import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { prisma } from "../db.js";

const router = Router();

router.get("/companies", authMiddleware, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const memberships = await prisma.organizationMembership.findMany({
    where: { userId: req.user.id },
    select: {
      organizationId: true,
      role: true,
      organization: {
        select: { id: true, name: true, slug: true, showTitle: true, weekStartsOn: true },
      },
    },
  });
  res.json(
    memberships.map((m) => ({
      organizationId: m.organizationId,
      organization: m.organization,
      role: m.role,
    }))
  );
});

export { router as accountRoutes };
