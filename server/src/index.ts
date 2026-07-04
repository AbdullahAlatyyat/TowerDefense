import cookieParser from "cookie-parser";
import express from "express";
import { authRouter } from "./routes/auth.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { syncRouter } from "./routes/sync.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", authRouter);
// Must come before syncRouter: syncRouter.use(requireAuth) is unconditional router
// middleware that would otherwise intercept these public routes too, since Express
// tries mounted routers in registration order for any path under the shared "/api" prefix.
app.use("/api", leaderboardRouter);
app.use("/api", syncRouter);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`towerdefense-server listening on :${port}`);
});
