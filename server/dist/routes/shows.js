import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { authMiddleware, adminOnly } from "../middleware/auth.js";
const prisma = new PrismaClient();
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(authMiddleware);
router.use(adminOnly);
const createShowSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    showTime: z.string().min(1),
});
const updateShowSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    showTime: z.string().min(1).optional(),
});
router.get("/", async (req, res) => {
    const orgId = req.user.organizationId;
    const start = req.query.start;
    const end = req.query.end;
    const where = {
        organizationId: orgId,
    };
    if (start || end) {
        where.date = {};
        if (start)
            where.date.gte = new Date(start);
        if (end)
            where.date.lte = new Date(end);
    }
    const shows = await prisma.show.findMany({
        where,
        orderBy: [{ date: "asc" }, { showTime: "asc" }],
    });
    res.json(shows);
});
router.post("/", async (req, res) => {
    try {
        const data = createShowSchema.parse(req.body);
        const orgId = req.user.organizationId;
        const date = new Date(data.date);
        date.setHours(0, 0, 0, 0);
        const show = await prisma.show.create({
            data: {
                organizationId: orgId,
                date,
                showTime: data.showTime,
            },
        });
        res.status(201).json(show);
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
            return;
        }
        throw err;
    }
});
router.post("/import", upload.single("file"), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }
        const orgId = req.user.organizationId;
        const skipDuplicates = (req.body.skipDuplicates ?? "true") === "true";
        const rows = [];
        const ext = file.originalname.toLowerCase();
        if (ext.endsWith(".csv")) {
            const text = file.buffer.toString("utf-8");
            const parsed = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
            });
            for (const row of parsed.data) {
                const date = row.date ?? row.Date ?? row.DATE;
                const showTime = row.showTime ?? row.show_time ?? row.ShowTime ?? row.time ?? row.Time ?? row.label ?? row.Label;
                if (date && showTime) {
                    rows.push({ date: String(date).trim(), showTime: String(showTime).trim() });
                }
            }
        }
        else if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
            const workbook = XLSX.read(file.buffer, { type: "buffer" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);
            for (const row of data) {
                const date = row.date ?? row.Date ?? row.DATE;
                const showTime = row.showTime ?? row.show_time ?? row.ShowTime ?? row.time ?? row.Time ?? row.label ?? row.Label;
                if (date && showTime) {
                    rows.push({
                        date: String(date).trim(),
                        showTime: String(showTime).trim(),
                    });
                }
            }
        }
        else {
            res.status(400).json({
                error: "Unsupported format. Use CSV or Excel (.xlsx, .xls)",
            });
            return;
        }
        const created = [];
        const skipped = [];
        for (const row of rows) {
            const match = row.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!match)
                continue;
            const date = new Date(row.date);
            date.setHours(0, 0, 0, 0);
            const existing = await prisma.show.findUnique({
                where: {
                    organizationId_date_showTime: {
                        organizationId: orgId,
                        date,
                        showTime: row.showTime,
                    },
                },
            });
            if (existing) {
                if (skipDuplicates) {
                    skipped.push(row);
                    continue;
                }
            }
            else {
                await prisma.show.create({
                    data: {
                        organizationId: orgId,
                        date,
                        showTime: row.showTime,
                    },
                });
                created.push(row);
            }
        }
        res.json({
            createdCount: created.length,
            skippedCount: skipped.length,
            createdShows: created,
            skippedShows: skipped,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Import failed" });
    }
});
router.get("/active", async (req, res) => {
    const orgId = req.user.organizationId;
    const show = await prisma.show.findFirst({
        where: { organizationId: orgId, activeAt: { not: null } },
        orderBy: { activeAt: "desc" },
    });
    if (!show) {
        res.status(404).json({ error: "No active show" });
        return;
    }
    res.json(show);
});
router.get("/:id", async (req, res) => {
    const orgId = req.user.organizationId;
    const show = await prisma.show.findFirst({
        where: { id: req.params.id, organizationId: orgId },
    });
    if (!show) {
        res.status(404).json({ error: "Show not found" });
        return;
    }
    res.json(show);
});
router.patch("/:id", async (req, res) => {
    try {
        const data = updateShowSchema.parse(req.body);
        const orgId = req.user.organizationId;
        const existing = await prisma.show.findFirst({
            where: { id: req.params.id, organizationId: orgId },
        });
        if (!existing) {
            res.status(404).json({ error: "Show not found" });
            return;
        }
        const updateData = { ...data };
        if (data.date) {
            const d = new Date(data.date);
            d.setHours(0, 0, 0, 0);
            updateData.date = d;
        }
        const show = await prisma.show.update({
            where: { id: req.params.id },
            data: updateData,
        });
        res.json(show);
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
            return;
        }
        throw err;
    }
});
router.post("/:id/activate", async (req, res) => {
    const orgId = req.user.organizationId;
    const show = await prisma.show.findFirst({
        where: { id: req.params.id, organizationId: orgId },
    });
    if (!show) {
        res.status(404).json({ error: "Show not found" });
        return;
    }
    await prisma.$transaction([
        prisma.show.updateMany({
            where: { organizationId: orgId, id: { not: req.params.id } },
            data: { activeAt: null },
        }),
        prisma.show.update({
            where: { id: req.params.id },
            data: {
                activeAt: new Date(),
                signInToken: show.signInToken ?? randomUUID(),
            },
        }),
    ]);
    const updated = await prisma.show.findUniqueOrThrow({
        where: { id: req.params.id },
    });
    res.json(updated);
});
router.post("/:id/lock", async (req, res) => {
    const orgId = req.user.organizationId;
    const show = await prisma.show.findFirst({
        where: { id: req.params.id, organizationId: orgId },
    });
    if (!show) {
        res.status(404).json({ error: "Show not found" });
        return;
    }
    const updated = await prisma.show.update({
        where: { id: req.params.id },
        data: { lockedAt: new Date() },
    });
    res.json(updated);
});
router.post("/:id/unlock", async (req, res) => {
    const orgId = req.user.organizationId;
    const show = await prisma.show.findFirst({
        where: { id: req.params.id, organizationId: orgId },
    });
    if (!show) {
        res.status(404).json({ error: "Show not found" });
        return;
    }
    const updated = await prisma.show.update({
        where: { id: req.params.id },
        data: { lockedAt: null },
    });
    res.json(updated);
});
router.delete("/:id", async (req, res) => {
    const orgId = req.user.organizationId;
    const show = await prisma.show.findFirst({
        where: { id: req.params.id, organizationId: orgId },
    });
    if (!show) {
        res.status(404).json({ error: "Show not found" });
        return;
    }
    await prisma.show.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
});
export { router as showRoutes };
