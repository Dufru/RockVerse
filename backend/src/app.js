import express from "express";
import cors from "cors";
import { authRouterV2 } from "./routes/auth2.routes.js";
import { tracksRouter } from "./routes/tracks.routes.js";
import { adminRouter } from "./routes/admin.routes.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouterV2);
app.use("/api/tracks", tracksRouter);
app.use("/api/admin", adminRouter);
