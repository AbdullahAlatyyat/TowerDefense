import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

/** Public read-only rankings — no requireAuth, unlike syncRouter/authRouter's protected routes. */
export const leaderboardRouter = Router();

const TOP_N = 50;

leaderboardRouter.get("/leaderboard/endless", async (_req, res) => {
  const rows = await prisma.user.findMany({
    where: { bestEndlessWave: { gt: 0 } },
    orderBy: { bestEndlessWave: "desc" },
    take: TOP_N,
    select: { displayName: true, bestEndlessWave: true },
  });
  res.json(rows);
});

const dateQuerySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

leaderboardRouter.get("/leaderboard/daily", async (req, res) => {
  const parsed = dateQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const rows = await prisma.dailyResult.findMany({
    where: { date: parsed.data.date },
    orderBy: [{ won: "desc" }, { livesLeft: "desc" }, { stars: "desc" }],
    take: TOP_N,
    include: { user: { select: { displayName: true } } },
  });
  res.json(
    rows.map((r) => ({ displayName: r.user.displayName, won: r.won, livesLeft: r.livesLeft, stars: r.stars })),
  );
});
