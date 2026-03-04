import { Router } from "express";
import { prisma } from "../db.js";

const router = Router({ mergeParams: true });

router.get("/callboard/active", async (req, res) => {
  const companyId = req.companyId!;

  const show = await prisma.show.findFirst({
    where: { companyId, activeAt: { not: null } },
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
    prisma.companyMembership.findMany({
      where: { companyId, role: "actor" },
      select: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
    prisma.attendance.findMany({
      where: {
        showId: show.id,
        user: { memberships: { some: { companyId } } },
        show: { companyId },
      },
      select: { userId: true, showId: true, status: true },
    }),
  ]);

  res.json({
    show,
    actors: actors.map((m) => m.user),
    attendance,
  });
});

export { router as actorRoutes };
