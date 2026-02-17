import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, adminOnly } from "../middleware/auth.js";
const prisma = new PrismaClient();
const router = Router();
router.use(authMiddleware);
router.use(adminOnly);
const statusSchema = z.enum(["signed_in", "absent", "vacation", "personal_day"]);
const setAttendanceSchema = z.object({
    userId: z.string(),
    showId: z.string(),
    status: statusSchema,
});
router.get("/", async (req, res) => {
    const orgId = req.user.organizationId;
    const showId = req.query.showId;
    const userId = req.query.userId;
    const where = {};
    if (showId)
        where.showId = showId;
    if (userId)
        where.userId = userId;
    const attendance = await prisma.attendance.findMany({
        where: {
            ...where,
            user: { organizationId: orgId },
            show: { organizationId: orgId },
        },
        include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            show: { select: { id: true, date: true, showTime: true } },
        },
    });
    res.json(attendance);
});
router.post("/", async (req, res) => {
    try {
        const data = setAttendanceSchema.parse(req.body);
        const orgId = req.user.organizationId;
        const [user, show] = await Promise.all([
            prisma.user.findFirst({
                where: { id: data.userId, organizationId: orgId },
            }),
            prisma.show.findFirst({
                where: { id: data.showId, organizationId: orgId },
            }),
        ]);
        if (!user || !show) {
            res.status(404).json({ error: "User or show not found" });
            return;
        }
        const attendance = await prisma.attendance.upsert({
            where: {
                userId_showId: { userId: data.userId, showId: data.showId },
            },
            create: {
                userId: data.userId,
                showId: data.showId,
                status: data.status,
                signedInAt: data.status === "signed_in" ? new Date() : null,
                markedByUserId: req.user.id,
            },
            update: {
                status: data.status,
                signedInAt: data.status === "signed_in" ? new Date() : null,
                markedByUserId: req.user.id,
            },
        });
        res.json(attendance);
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
            return;
        }
        throw err;
    }
});
router.post("/bulk", async (req, res) => {
    try {
        const schema = z.object({
            showId: z.string(),
            userIds: z.array(z.string()),
        });
        const data = schema.parse(req.body);
        const orgId = req.user.organizationId;
        const show = await prisma.show.findFirst({
            where: { id: data.showId, organizationId: orgId },
        });
        if (!show) {
            res.status(404).json({ error: "Show not found" });
            return;
        }
        const users = await prisma.user.findMany({
            where: {
                id: { in: data.userIds },
                organizationId: orgId,
                role: "actor",
            },
        });
        const validIds = new Set(users.map((u) => u.id));
        const results = await Promise.all(data.userIds
            .filter((id) => validIds.has(id))
            .map((userId) => prisma.attendance.upsert({
            where: {
                userId_showId: { userId, showId: data.showId },
            },
            create: {
                userId,
                showId: data.showId,
                status: "signed_in",
                signedInAt: new Date(),
                markedByUserId: req.user.id,
            },
            update: {
                status: "signed_in",
                signedInAt: new Date(),
                markedByUserId: req.user.id,
            },
        })));
        res.json({ count: results.length });
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
            return;
        }
        throw err;
    }
});
export { router as attendanceRoutes };
