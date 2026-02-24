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

const bulkGenerateShowSchema = z.object({
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	weekdayTimes: z.record(z.string(), z.array(showTimeSchema)),
	skipDuplicates: z.boolean().optional().default(true),
});

const updateShowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  showTime: showTimeSchema.optional(),
});

function parseDateOnly(dateStr: string): Date {
	const [y, m, d] = dateStr.split("-").map((part) => parseInt(part, 10));
	return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function dayDiffInclusive(start: Date, end: Date): number {
	const MS_PER_DAY = 24 * 60 * 60 * 1000;
	return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

function formatDateOnly(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

router.get("/", async (req, res) => {
  const orgId = req.user!.organizationId;
  const start = req.query.start as string | undefined;
  const end = req.query.end as string | undefined;

  await deleteExpiredShowsWithoutAttendance(orgId);

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
        const showTime = normalizeShowTime(raw as string | number | undefined);
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
        const showTime = normalizeShowTime(raw as string | number | undefined);
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

router.post("/bulk-generate", async (req, res) => {
	try {
		const data = bulkGenerateShowSchema.parse(req.body);
		const orgId = req.user!.organizationId;

		const start = parseDateOnly(data.startDate);
		const end = parseDateOnly(data.endDate);
		if (start.getTime() > end.getTime()) {
			res.status(400).json({ error: "Start date must be on or before end date" });
			return;
		}

		const maxSpanDays = 366;
		const spanDays = dayDiffInclusive(start, end);
		if (spanDays > maxSpanDays) {
			res.status(400).json({ error: "Date range cannot exceed 1 year" });
			return;
		}

		const weekdayTimes: Record<number, string[]> = {};
		for (const [rawKey, rawTimes] of Object.entries(data.weekdayTimes)) {
			if (!/^[0-6]$/.test(rawKey)) {
				res.status(400).json({ error: "Weekday keys must be 0-6 (Sunday-Saturday)" });
				return;
			}
			const key = Number(rawKey);
			const normalizedUnique = Array.from(
				new Set(rawTimes.map((time) => toHHmm(time))),
			).sort((a, b) => a.localeCompare(b));
			weekdayTimes[key] = normalizedUnique;
		}

		const created: { date: string; showTime: string }[] = [];
		const skipped: { date: string; showTime: string }[] = [];

		for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
			const weekday = d.getDay();
			const times = weekdayTimes[weekday] ?? [];
			if (times.length === 0) continue;

			const date = new Date(d);
			date.setHours(0, 0, 0, 0);
			const dateLabel = formatDateOnly(date);

			for (const showTime of times) {
				const existing = await prisma.show.findUnique({
					where: {
						organizationId_date_showTime: {
							organizationId: orgId,
							date,
							showTime,
						},
					},
				});

				if (existing) {
					if (data.skipDuplicates) {
						skipped.push({ date: dateLabel, showTime });
						continue;
					}
				} else {
					await prisma.show.create({
						data: {
							organizationId: orgId,
							date,
							showTime,
						},
					});
					created.push({ date: dateLabel, showTime });
				}
			}
		}

		res.json({
			createdCount: created.length,
			skippedCount: skipped.length,
			createdShows: created,
			skippedShows: skipped,
		});
	} catch (err) {
		if (err instanceof z.ZodError) {
			res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
			return;
		}
		throw err;
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
  if (show.lockedAt) {
    res.status(400).json({ error: "Closed shows cannot re-open sign-in" });
    return;
  }

  const candidates = await prisma.show.findMany({
    where: { organizationId: orgId, lockedAt: null, activeAt: null },
    orderBy: [{ date: "asc" }, { showTime: "asc" }],
  });

  const nowMs = Date.now();
  const nextUpcoming =
    candidates.length > 0
      ? candidates.reduce<{ id: string; whenMs: number } | null>((best, s) => {
          const whenMs = getShowDateTimeMs(s.date, s.showTime);
          if (whenMs < nowMs) return best;
          if (!best || whenMs < best.whenMs) return { id: s.id, whenMs };
          return best;
        }, null)
      : null;

  if (!nextUpcoming || nextUpcoming.id !== req.params.id) {
    res.status(400).json({
      error: "Only the next upcoming show can be opened for sign-in",
    });
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
        lockedAt: null,
        // Rotate token on every activation to invalidate prior QR snapshots.
        signInToken: randomUUID(),
      },
    }),
  ]);

  const updated = await prisma.show.findUniqueOrThrow({
    where: { id: req.params.id },
  });
  res.json(updated);
});

router.post("/:id/close-signin", async (req, res) => {
  const orgId = req.user!.organizationId;
  const show = await prisma.show.findFirst({
    where: { id: req.params.id, organizationId: orgId },
  });
  if (!show) {
    res.status(404).json({ error: "Show not found" });
    return;
  }
  if (!show.activeAt) {
    res.status(400).json({ error: "Only the current active show can be closed" });
    return;
  }

  const updated = await prisma.show.update({
    where: { id: req.params.id },
    data: {
      lockedAt: new Date(),
      activeAt: null,
      // Immediately invalidate current QR link when sign-in is closed.
      signInToken: randomUUID(),
    },
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
