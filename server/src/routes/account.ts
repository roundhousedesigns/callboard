import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { prisma } from "../db.js";

const router = Router();

router.get("/companies", authMiddleware, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const memberships = await prisma.companyMembership.findMany({
    where: { userId: req.user.id },
    select: {
      companyId: true,
      role: true,
      company: {
        select: { id: true, name: true, slug: true, showTitle: true, weekStartsOn: true },
      },
    },
  });
  res.json(
    memberships.map((m) => ({
      companyId: m.companyId,
      company: m.company,
      role: m.role,
    }))
  );
});

export { router as accountRoutes };
