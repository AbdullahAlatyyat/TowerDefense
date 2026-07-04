import type { NextFunction, Request, Response } from "express";
import { getUserIdFromRequest } from "../session.js";

export interface AuthedRequest extends Request {
  userId: number;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = await getUserIdFromRequest(req);
  if (userId === null) {
    res.status(401).json({ error: "not_authenticated" });
    return;
  }
  (req as AuthedRequest).userId = userId;
  next();
}
