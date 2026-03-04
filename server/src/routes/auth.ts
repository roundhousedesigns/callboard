import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db.js";

const router = Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function createTokens(user: { id: string; email: string }) {
  const accessSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!accessSecret || !refreshSecret) throw new Error("JWT secrets not configured");

  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    accessSecret,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    refreshSecret,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
}

function formatUserWithMemberships(
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    memberships: Array<{
      organizationId: string;
      role: string;
      organization: {
        id: string;
        name: string;
        slug: string;
        showTitle: string | null;
        weekStartsOn: number | null;
      };
    }>;
  }
) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    memberships: user.memberships.map((m) => ({
      organizationId: m.organizationId,
      organization: m.organization,
      role: m.role,
    })),
  };
}

router.post("/register", asyncHandler(async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

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
        email: data.email,
        hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        memberships: {
          select: {
            organizationId: true,
            role: true,
            organization: {
              select: { id: true, name: true, slug: true, showTitle: true, weekStartsOn: true },
            },
          },
        },
      },
    });

    const { accessToken, refreshToken } = createTokens({
      id: user.id,
      email: user.email,
    });

    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        user: formatUserWithMemberships(user),
      });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
      return;
    }
    throw err;
  }
}));

router.post("/login", asyncHandler(async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        hashedPassword: true,
        firstName: true,
        lastName: true,
        memberships: {
          select: {
            organizationId: true,
            role: true,
            organization: {
              select: { id: true, name: true, slug: true, showTitle: true, weekStartsOn: true },
            },
          },
        },
      },
    });
    if (!user || !(await bcrypt.compare(data.password, user.hashedPassword))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const { accessToken, refreshToken } = createTokens({
      id: user.id,
      email: user.email,
    });

    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        user: formatUserWithMemberships(user),
      });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid input" });
      return;
    }
    throw err;
  }
}));

router.post("/refresh", asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }

  try {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error("JWT_REFRESH_SECRET not configured");

    const decoded = jwt.verify(refreshToken, secret) as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const { accessToken } = createTokens({
      id: user.id,
      email: user.email,
    });

    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      })
      .json({ ok: true });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
}));

router.post("/logout", (_req, res) => {
  res
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json({ ok: true });
});

router.get("/me", asyncHandler(async (req, res) => {
  const token =
    req.cookies?.accessToken ??
    req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET not configured");

    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        memberships: {
          select: {
            organizationId: true,
            role: true,
            organization: {
              select: { id: true, name: true, slug: true, showTitle: true, weekStartsOn: true },
            },
          },
        },
      },
    });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    res.json(formatUserWithMemberships(user));
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}));

export { router as authRoutes };
