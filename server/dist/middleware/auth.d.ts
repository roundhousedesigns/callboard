import { Request, Response, NextFunction } from "express";
export interface AuthUser {
    id: string;
    email: string;
    role: "admin" | "actor";
    organizationId: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
export declare function adminOnly(req: Request, res: Response, next: NextFunction): void;
export declare function actorOnly(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map