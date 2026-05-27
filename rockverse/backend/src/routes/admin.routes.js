import express from "express";
import mongoose from "mongoose";
import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/admin.js";
import { Track } from "../models/Track.js";
import { SiteConfig } from "../models/SiteConfig.js";
import { cacheDelPattern } from "../services/cache.js";

export const adminRouter = express.Router();
adminRouter.use(auth, adminOnly);

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const getOrCreateConfig = async () => {
  let config = await SiteConfig.findOne({ key: "main" });
  if (!config) {
    config = await SiteConfig.create({
      key: "main",
      featuredTrackId: null,
      highlightTrackIds: [],
      heroAutoRotateSeconds: 10,
      heroMaxCount: 5
    });
  }
  return config;
};

const invalidateCaches = async () => {
  await Promise.all([
    cacheDelPattern("tracks:sections:*"),
    cacheDelPattern("tracks:highlights:*"),
    cacheDelPattern("tracks:leaderboard:*"),
    cacheDelPattern("tracks:list:*")
  ]);
};

adminRouter.get("/tracks", async (_req, res) => {
  const items = await Track.find({}).sort({ createdAt: -1 });
  return res.json({ items });
});

adminRouter.post("/tracks", async (req, res) => {
  const created = await Track.create(req.body);
  await invalidateCaches();
  return res.status(201).json(created);
});

adminRouter.put("/tracks/:id", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID inválido" });

  const updated = await Track.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: "Vídeo não encontrado" });

  await invalidateCaches();
  return res.json(updated);
});

adminRouter.delete("/tracks/:id", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID inválido" });

  const removed = await Track.findByIdAndDelete(req.params.id);
  if (!removed) return res.status(404).json({ message: "Vídeo não encontrado" });

  await invalidateCaches();
  return res.json({ ok: true });
});

adminRouter.get("/highlights", async (_req, res) => {
  const [config, tracks] = await Promise.all([getOrCreateConfig(), Track.find({}).sort({ createdAt: -1 })]);
  return res.json({ config, tracks });
});

adminRouter.put("/highlights", async (req, res) => {
  const {
    featuredTrackId = null,
    highlightTrackIds = [],
    heroAutoRotateSeconds = 10,
    heroMaxCount = 5
  } = req.body || {};

  const config = await getOrCreateConfig();
  const cleanIds = (highlightTrackIds || []).filter((id) => isValidObjectId(String(id))).map((id) => String(id));

  config.featuredTrackId = featuredTrackId && isValidObjectId(String(featuredTrackId)) ? featuredTrackId : null;
  config.highlightTrackIds = cleanIds;
  config.heroAutoRotateSeconds = Math.max(4, Number(heroAutoRotateSeconds || 10));
  config.heroMaxCount = Math.max(1, Math.min(10, Number(heroMaxCount || 5)));

  await config.save();
  await invalidateCaches();
  return res.json({ ok: true, config });
});
