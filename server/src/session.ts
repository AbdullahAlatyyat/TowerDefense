import { randomBytes, createHash } from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "./db.js";

export const COOKIE_NAME = "td_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      id: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return token;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export async function destroySession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: hashToken(token) } });
}

export async function getUserIdFromRequest(req: Request): Promise<number | null> {
  const token = (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAME];
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { id: hashToken(token) } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.userId;
}
