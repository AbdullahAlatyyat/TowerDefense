import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";

export const syncRouter = Router();
syncRouter.use(requireAuth);

const dailyRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  won: z.boolean(),
  livesLeft: z.number().int().min(0),
  stars: z.number().int().min(0).max(3),
});

const syncBodySchema = z.object({
  stars: z.record(z.string(), z.number().int().min(0).max(3)),
  daily: dailyRecordSchema.nullable(),
});

async function loadMergedState(userId: number, todayDate: string | null) {
  const progress = await prisma.levelProgress.findMany({ where: { userId } });
  const stars: Record<string, number> = {};
  for (const p of progress) stars[p.levelId] = p.stars;

  let daily = null;
  if (todayDate) {
    const row = await prisma.dailyResult.findUnique({
      where: { userId_date: { userId, date: todayDate } },
    });
    if (row) daily = { date: row.date, won: row.won, livesLeft: row.livesLeft, stars: row.stars };
  }
  return { stars, daily };
}

// Merge local guest progress into the account: take max stars per level,
// first-write-wins per daily date (mirrors client's recordStars/practice semantics).
syncRouter.post("/sync", async (req, res) => {
  const parsed = syncBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const userId = (req as AuthedRequest).userId;
  const { stars, daily } = parsed.data;

  await prisma.$transaction(async (tx) => {
    for (const [levelId, incomingStars] of Object.entries(stars)) {
      const existing = await tx.levelProgress.findUnique({ where: { userId_levelId: { userId, levelId } } });
      if (!existing || existing.stars < incomingStars) {
        await tx.levelProgress.upsert({
          where: { userId_levelId: { userId, levelId } },
          create: { userId, levelId, stars: incomingStars },
          update: { stars: incomingStars },
        });
      }
    }
    if (daily) {
      await tx.dailyResult.upsert({
        where: { userId_date: { userId, date: daily.date } },
        create: { userId, date: daily.date, won: daily.won, livesLeft: daily.livesLeft, stars: daily.stars },
        update: {}, // first-write-wins: never overwrite an existing day's result
      });
    }
  });

  const merged = await loadMergedState(userId, daily?.date ?? null);
  res.json(merged);
});

syncRouter.post("/stars", async (req, res) => {
  const bodySchema = z.object({ levelId: z.string().min(1), stars: z.number().int().min(0).max(3) });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const userId = (req as AuthedRequest).userId;
  const { levelId, stars } = parsed.data;

  const existing = await prisma.levelProgress.findUnique({ where: { userId_levelId: { userId, levelId } } });
  const finalStars = Math.max(existing?.stars ?? 0, stars);
  await prisma.levelProgress.upsert({
    where: { userId_levelId: { userId, levelId } },
    create: { userId, levelId, stars: finalStars },
    update: { stars: finalStars },
  });
  res.json({ levelId, stars: finalStars });
});

syncRouter.post("/daily", async (req, res) => {
  const parsed = dailyRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const userId = (req as AuthedRequest).userId;
  const { date, won, livesLeft, stars } = parsed.data;

  const row = await prisma.dailyResult.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, won, livesLeft, stars },
    update: {}, // first-write-wins
  });
  res.json({ date: row.date, won: row.won, livesLeft: row.livesLeft, stars: row.stars });
});
