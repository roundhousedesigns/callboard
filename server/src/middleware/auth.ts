import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { prisma } from "../db.js";

export interface AuthUser {
  id: string;
  email: string;
}

export type MembershipRole = "owner" | "admin" | "actor";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      organizationId?: string;
      membershipRole?: MembershipRole;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
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

    const decoded = jwt.verify(token, secret) as JwtPayload & AuthUser;
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Validates user has membership in org with given role. Owner implies admin. Sets req.organizationId and req.membershipRole. */
export function orgContext(
  allowedRoles: MembershipRole[]
): (req: Request, res: Response, next: NextFunction) => void {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const orgSlug = req.params.orgSlug;
    if (!orgSlug) {
      res.status(400).json({ error: "Organization slug required" });
      return;
    }
    try {
      const org = await prisma.organization.findUnique({
        where: { slug: orgSlug },
        select: { id: true },
      });
      if (!org) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }
      const membership = await prisma.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.id,
            organizationId: org.id,
          },
        },
        select: { role: true },
      });
      if (!membership) {
        res.status(403).json({ error: "You are not a member of this organization" });
        return;
      }
      const role = membership.role as MembershipRole;
      const hasAccess =
        allowedRoles.includes(role) ||
        (allowedRoles.includes("admin") && role === "owner");
      if (!hasAccess) {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }
      req.organizationId = org.id;
      req.membershipRole = role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Allow owner or admin (for admin UI). */
export const adminOrOwner = orgContext(["owner", "admin"]);

/** Allow only owner (for delete, rename). */
export const ownerOnly = orgContext(["owner"]);

/** Allow owner, admin, or actor. */
export const anyMember = orgContext(["owner", "admin", "actor"]);

