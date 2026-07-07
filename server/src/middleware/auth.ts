import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";

export interface AuthedRequest extends Request {
  user?: { userId: string; role: "MANUFACTURER" | "BUYER" };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token" });
  }
  try {
    const payload = verifyToken(header.slice("Bearer ".length));
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(role: "MANUFACTURER" | "BUYER") {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: `Requires ${role.toLowerCase()} role` });
    }
    next();
  };
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(header.slice("Bearer ".length));
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
