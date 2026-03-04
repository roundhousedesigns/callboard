import { Router } from "express";
import { prisma } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/:token", authMiddleware, async (req, res) => {
  const token = req.params.token;

  const show = await prisma.show.findUnique({
    where: { signInToken: token },
    include: { organization: { select: { slug: true } } },
  });

  if (!show) {
    res.status(404).json({ error: "Invalid or expired sign-in link" });
    return;
  }
  if (!show.activeAt) {
    res.status(400).json({ error: "This show is not currently active" });
    return;
  }
  if (show.lockedAt) {
    res.status(400).json({ error: "Sign-in sheet is locked for this show" });
    return;
  }

  const userId = req.user!.id;
  const membership = await prisma.organizationMembership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: show.organizationId,
      },
    },
    select: { role: true },
  });
  if (!membership || membership.role !== "actor") {
    res.status(403).json({ error: "You are not an actor in this organization" });
    return;
  }

  const existing = await prisma.attendance.findUnique({
    where: {
      userId_showId: { userId, showId: show.id },
    },
  });
  if (existing) {
    res.json({
      success: true,
      alreadySignedIn: true,
      show: { date: show.date, showTime: show.showTime, orgSlug: show.organization.slug },
    });
    return;
  }

  await prisma.attendance.create({
    data: {
      userId,
      showId: show.id,
      status: "signed_in",
      signedInAt: new Date(),
    },
  });

  res.json({
    success: true,
    alreadySignedIn: false,
    show: { date: show.date, showTime: show.showTime, orgSlug: show.organization.slug },
  });
});

export { router as signInRoutes };
