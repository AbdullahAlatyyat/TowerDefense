import argon2 from "argon2";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { tooManyAttempts } from "../rateLimit.js";
import { clearSessionCookie, COOKIE_NAME, createSession, destroySession, setSessionCookie } from "../session.js";

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200),
});

authRouter.post("/signup", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "email_taken" });
    return;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({ data: { email, passwordHash } });

  const token = await createSession(user.id);
  setSessionCookie(res, token);
  res.status(201).json({ email: user.email, muted: user.muted });
});

authRouter.post("/login", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const { email, password } = parsed.data;

  const limiterKey = `${req.ip}:${email}`;
  if (tooManyAttempts(limiterKey, 10, 5 * 60 * 1000)) {
    res.status(429).json({ error: "too_many_attempts" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await argon2.verify(user.passwordHash, password) : false;
  if (!user || !valid) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }

  const token = await createSession(user.id);
  setSessionCookie(res, token);
  res.json({ email: user.email, muted: user.muted });
});

authRouter.post("/logout", async (req, res) => {
  const token = (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAME];
  if (token) await destroySession(token);
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: (req as AuthedRequest).userId } });
  res.json({ email: user.email, muted: user.muted });
});
