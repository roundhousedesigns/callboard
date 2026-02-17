import jwt from "jsonwebtoken";
export function authMiddleware(req, res, next) {
    const token = req.cookies?.accessToken ??
        req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret)
            throw new Error("JWT_SECRET not configured");
        const decoded = jwt.verify(token, secret);
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            organizationId: decoded.organizationId,
        };
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}
export function adminOnly(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    if (req.user.role !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
    }
    next();
}
export function actorOnly(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    if (req.user.role !== "actor") {
        res.status(403).json({ error: "Actor access required" });
        return;
    }
    next();
}
