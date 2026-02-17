import express, { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../db.js";
import multer from "multer";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { authMiddleware, adminOnly } from "../middleware/auth.js";

const router = Router();

/** Normalize imported time to HH:mm. Handles 24h, 12h, legacy labels, Excel serial. */
function normalizeShowTime(value: string | number | undefined): string | null {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const s = String(value).trim();
  const lower = s.toLowerCase();

  const legacy: Record<string, string> = {
    matinee: "14:00",
    evening: "19:00",
    noon: "12:00",
    midnight: "00:00",
  };
  if (legacy[lower]) return legacy[lower];

  if (typeof value === "number" && !Number.isNaN(value)) {
    const fraction = value >= 1 ? value % 1 : value;
    if (fraction >= 0 && fraction < 1) {
      const totalMinutes = Math.round(fraction * 24 * 60) % (24 * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const min = m24[2];
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:${min}`;
  }

  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = m12[2];
    const ampm = (m12[3] ?? "").toLowerCase();
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:${min}`;
  }

  return s;
}
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);
router.use(adminOnly);

/** Validates HH:mm or HH:mm:ss format */
const SHOW_TIME_REGEX = /^\d{1,2}:\d{2}(?::\d{2})?$/;
const showTimeSchema = z.string().regex(SHOW_TIME_REGEX, "Time must be HH:mm or HH:mm:ss");

/** Normalize to HH:mm for consistent storage */
function toHHmm(s: string): string {
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return s;
  const h = String(parseInt(m[1], 10)).padStart(2, "0");
  const min = m[2];
  return `${h}:${min}`;
}

const createShowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  showTime: showTimeSchema,
});

const updateShowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  showTime: showTimeSchema.optional(),
});

router.get("/", async (req, res) => {
  const orgId = req.user!.organizationId;
  const start = req.query.start as string | undefined;
  const end = req.query.end as string | undefined;

  const where: { organizationId: string; date?: { gte?: Date; lte?: Date } } = {
    organizationId: orgId,
  };
  if (start || end) {
    where.date = {};
    if (start) where.date.gte = new Date(start);
    if (end) where.date.lte = new Date(end);
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
    const orgId = req.user!.organizationId;

    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    const show = await prisma.show.create({
      data: {
        organizationId: orgId,
        date,
        showTime: toHHmm(data.showTime),
      },
    });
    res.status(201).json(show);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
      return;
    }
    throw err;
  }
});

router.post("/import", upload.single("file") as unknown as express.RequestHandler, async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const orgId = req.user!.organizationId;
    const skipDuplicates = (req.body.skipDuplicates ?? "true") === "true";

    const rows: { date: string; showTime: string }[] = [];
    const ext = file.originalname.toLowerCase();

    if (ext.endsWith(".csv")) {
      const text = file.buffer.toString("utf-8");
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      for (const row of parsed.data) {
        const date = row.date ?? row.Date ?? row.DATE;
        const raw = row.showTime ?? row.show_time ?? row.ShowTime ?? row.time ?? row.Time ?? row.label ?? row.Label ?? row.name ?? row.Name;
        const showTime = normalizeShowTime(raw);
        if (date && showTime && SHOW_TIME_REGEX.test(showTime)) {
          rows.push({ date: String(date).trim(), showTime });
        }
      }
    } else if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      for (const row of data) {
        const date = row.date ?? row.Date ?? row.DATE;
        const raw = row.showTime ?? row.show_time ?? row.ShowTime ?? row.time ?? row.Time ?? row.label ?? row.Label ?? row.name ?? row.Name;
        const showTime = normalizeShowTime(raw);
        if (date && showTime && SHOW_TIME_REGEX.test(showTime)) {
          rows.push({
            date: String(date).trim(),
            showTime,
          });
        }
      }
    } else {
      res.status(400).json({
        error: "Unsupported format. Use CSV or Excel (.xlsx, .xls)",
      });
      return;
    }

    const created: { date: string; showTime: string }[] = [];
    const skipped: { date: string; showTime: string }[] = [];

    for (const row of rows) {
      const match = row.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) continue;

      const date = new Date(row.date);
      date.setHours(0, 0, 0, 0);

      const existing = await prisma.show.findUnique({
        where: {
          organizationId_date_time: {
            organizationId: orgId,
            date,
            time: row.showTime,
          },
        },
      });

      if (existing) {
        if (skipDuplicates) {
          skipped.push(row);
          continue;
        }
      } else {
        await prisma.show.create({
          data: {
            organizationId: orgId,
            date,
            showTime: toHHmm(row.showTime),
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Import failed" });
  }
});

router.get("/active", async (req, res) => {
  const orgId = req.user!.organizationId;
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
  const orgId = req.user!.organizationId;
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
    const orgId = req.user!.organizationId;

    const existing = await prisma.show.findFirst({
      where: { id: req.params.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Show not found" });
      return;
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.date) {
      const d = new Date(data.date);
      d.setHours(0, 0, 0, 0);
      updateData.date = d;
    }
    if (data.showTime) {
      updateData.showTime = toHHmm(data.showTime);
    }

    const show = await prisma.show.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(show);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
      return;
    }
    throw err;
  }
});

router.post("/:id/activate", async (req, res) => {
  const orgId = req.user!.organizationId;
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
  const orgId = req.user!.organizationId;
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
  const orgId = req.user!.organizationId;
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
  const orgId = req.user!.organizationId;
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
