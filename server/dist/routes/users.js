import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, adminOnly } from "../middleware/auth.js";
const prisma = new PrismaClient();
const router = Router();
router.use(authMiddleware);
router.use(adminOnly);
const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: z.enum(["admin", "actor"]),
});
const updateUserSchema = z.object({
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
});
router.get("/", async (req, res) => {
    const orgId = req.user.organizationId;
    const users = await prisma.user.findMany({
        where: { organizationId: orgId },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
        },
    });
    res.json(users);
});
router.post("/", async (req, res) => {
    try {
        const data = createUserSchema.parse(req.body);
        const orgId = req.user.organizationId;
        const existing = await prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existing) {
            res.status(400).json({ error: "Email already registered" });
            return;
        }
        const hashedPassword = await bcrypt.hash(data.password, 12);
        const user = await prisma.user.create({
            data: {
                ...data,
                hashedPassword,
                organizationId: orgId,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
            },
        });
        res.status(201).json(user);
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
            return;
        }
        throw err;
    }
});
router.get("/:id", async (req, res) => {
    const orgId = req.user.organizationId;
    const user = await prisma.user.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
        },
    });
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.json(user);
});
router.patch("/:id", async (req, res) => {
    try {
        const data = updateUserSchema.parse(req.body);
        const orgId = req.user.organizationId;
        const existing = await prisma.user.findFirst({
            where: { id: req.params.id, organizationId: orgId },
        });
        if (!existing) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        const updateData = { ...data };
        if (data.password) {
            updateData.hashedPassword = await bcrypt.hash(data.password, 12);
        }
        delete updateData.password;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: updateData,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
            },
        });
        res.json(user);
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
            return;
        }
        throw err;
    }
});
router.delete("/:id", async (req, res) => {
    const orgId = req.user.organizationId;
    const user = await prisma.user.findFirst({
        where: { id: req.params.id, organizationId: orgId },
    });
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
});
export { router as userRoutes };
