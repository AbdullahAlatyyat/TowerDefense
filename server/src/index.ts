import cookieParser from "cookie-parser";
import express from "express";
import { authRouter } from "./routes/auth.js";
import { syncRouter } from "./routes/sync.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", authRouter);
app.use("/api", syncRouter);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`towerdefense-server listening on :${port}`);
});
