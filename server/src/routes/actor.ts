import { Router } from "express";
import { prisma } from "../db.js";
import { authMiddleware, actorOnly } from "../middleware/auth.js";

const router = Router();

router.get("/callboard/active", authMiddleware, actorOnly, async (req, res) => {
  const orgId = req.user!.organizationId;

  const show = await prisma.show.findFirst({
    where: { organizationId: orgId, activeAt: { not: null } },
    orderBy: { activeAt: "desc" },
    select: {
      id: true,
      date: true,
      showTime: true,
      activeAt: true,
      lockedAt: true,
    },
  });

  if (!show) {
    res.status(404).json({ error: "No active show" });
    return;
  }

  const [actors, attendance] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: orgId, role: "actor" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.attendance.findMany({
      where: {
        showId: show.id,
        user: { organizationId: orgId },
        show: { organizationId: orgId },
      },
      select: { userId: true, showId: true, status: true },
    }),
  ]);

  res.json({ show, actors, attendance });
});

export { router as actorRoutes };

