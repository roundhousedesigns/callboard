import { Router } from "express";
import { prisma } from "../db.js";
import { authMiddleware, actorOnly } from "../middleware/auth.js";
const router = Router();
router.get("/:token", authMiddleware, actorOnly, async (req, res) => {
    const token = req.params.token;
    const show = await prisma.show.findUnique({
        where: { signInToken: token },
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
    const userId = req.user.id;
    if (req.user.organizationId !== show.organizationId) {
        res.status(403).json({ error: "You are not in this organization" });
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
            show: { date: show.date, showTime: show.showTime },
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
        show: { date: show.date, showTime: show.showTime },
    });
});
export { router as signInRoutes };
