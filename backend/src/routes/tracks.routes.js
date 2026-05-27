import express from "express";
import mongoose from "mongoose";
import { Track } from "../models/Track.js";
import { TrackComment } from "../models/TrackComment.js";
import { TrackLove } from "../models/TrackLove.js";
import { User } from "../models/User.js";
import { SiteConfig } from "../models/SiteConfig.js";
import { auth } from "../middleware/auth.js";
import { redis } from "../config/redis.js";
import { cacheDelPattern, cacheGet, cacheSet } from "../services/cache.js";

export const tracksRouter = express.Router();

const LOVE_COUNT_TTL = 3600;
const SECTION_DEFINITIONS = [
  {
    id: "live-shows",
    title: "Shows ao Vivo",
    filter: { mediaType: "live_show" },
    sort: { votes: -1, lovesCount: -1, createdAt: -1 }
  },
  {
    id: "metal",
    title: "Metal",
    filter: { subgenre: "metal" },
    sort: { votes: -1, lovesCount: -1, createdAt: -1 }
  },
  {
    id: "most-commented",
    title: "Mais Comentados",
    redisKey: "ranking:videos:comments",
    filter: {},
    sort: { weeklyTrendingScore: -1, votes: -1, createdAt: -1 }
  },
  {
    id: "most-loved",
    title: "Mais Amei",
    redisKey: "ranking:videos:loves",
    filter: {},
    sort: { lovesCount: -1, communityFavoriteScore: -1, votes: -1 }
  }
];

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const parseWithScores = (list) => {
  const pairs = [];
  for (let index = 0; index < list.length; index += 2) {
    pairs.push({ member: list[index], score: Number(list[index + 1]) });
  }
  return pairs;
};

const resolveTracksInOrder = async (trackIds) => {
  if (!trackIds.length) return [];
  const tracks = await Track.find({ _id: { $in: trackIds } });
  const map = new Map(tracks.map((track) => [String(track._id), track]));
  return trackIds.map((trackId) => map.get(String(trackId))).filter(Boolean);
};

const getSiteConfig = async () => {
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

const ensureLoveCountCache = async (trackId, fallbackCount = 0) => {
  const countKey = `track:${trackId}:loves:count`;
  const cached = await redis.get(countKey);
  if (cached !== null) return Number(cached);
  await redis.set(countKey, String(fallbackCount), "EX", LOVE_COUNT_TTL);
  return fallbackCount;
};

const touchTrackCaches = async (trackId = "") => {
  // Sempre que algo muda (novo vídeo, comentário, like), limpamos os caches chave.
  // Assim o usuário já vê os dados novos sem esperar expirar TTL.
  await Promise.all([
    cacheDelPattern("tracks:sections:*"),
    cacheDelPattern("tracks:highlights:*"),
    cacheDelPattern("tracks:leaderboard:*"),
    cacheDelPattern("tracks:list:*"),
    trackId ? cacheDelPattern(`track:${trackId}:comments:*`) : Promise.resolve()
  ]);
};

const getSectionItems = async (definition, limit = 12) => {
  if (definition.redisKey) {
    const ranked = await redis.zrevrange(definition.redisKey, 0, limit - 1, "WITHSCORES");
    const pairs = parseWithScores(ranked);
    const orderedTracks = await resolveTracksInOrder(pairs.map((entry) => entry.member));
    if (orderedTracks.length) return orderedTracks;
  }

  return Track.find(definition.filter || {})
    .sort(definition.sort || { votes: -1, createdAt: -1 })
    .limit(limit);
};

const toggleLoveForTrack = async ({ trackId, authUser }) => {
  if (!isValidObjectId(trackId)) return { error: { status: 400, message: "ID inválido" } };

  const track = await Track.findById(trackId);
  if (!track) return { error: { status: 404, message: "Vídeo não encontrado" } };

  const existing = await TrackLove.findOne({ track: track._id, user: authUser.userId });
  const likeSetKey = `track:${track._id}:loves:users`;
  const countKey = `track:${track._id}:loves:count`;

  if (existing) {
    // Segundo clique no coração = desfaz o Amei.
    await TrackLove.deleteOne({ _id: existing._id });

    const updated = await Track.findByIdAndUpdate(
      track._id,
      {
        $inc: {
          lovesCount: -1,
          communityFavoriteScore: -1,
          weeklyTrendingScore: -1
        }
      },
      { new: true }
    );

    const safeCount = Math.max(0, Number(updated?.lovesCount || 0));
    if (updated && updated.lovesCount < 0) {
      updated.lovesCount = 0;
      await updated.save();
    }

    await Promise.all([
      redis.srem(likeSetKey, String(authUser.userId)),
      redis.set(countKey, String(safeCount), "EX", LOVE_COUNT_TTL),
      redis.zincrby("ranking:users:likes", -1, String(authUser.userId)),
      redis.zincrby("ranking:videos:loves", -1, String(track._id)),
      redis.zincrby("ranking:videos:popular", -1, String(track._id))
    ]);

    await touchTrackCaches(track._id);
    return { payload: { liked: false, lovesCount: safeCount } };
  }

  await TrackLove.create({ track: track._id, user: authUser.userId });
  // Primeiro clique no coração = registra Amei e atualiza ranking rápido no Redis.

  const updated = await Track.findByIdAndUpdate(
    track._id,
    {
      $inc: {
        lovesCount: 1,
        communityFavoriteScore: 1,
        weeklyTrendingScore: 1
      }
    },
    { new: true }
  );
  const safeCount = Math.max(0, Number(updated?.lovesCount || track.lovesCount + 1));

  await Promise.all([
    redis.sadd(likeSetKey, String(authUser.userId)),
    redis.expire(likeSetKey, LOVE_COUNT_TTL),
    redis.set(countKey, String(safeCount), "EX", LOVE_COUNT_TTL),
    redis.zincrby("ranking:users:likes", 1, String(authUser.userId)),
    redis.zincrby("ranking:videos:loves", 1, String(track._id)),
    redis.zincrby("ranking:videos:popular", 1, String(track._id))
  ]);

  await touchTrackCaches(track._id);
  return { payload: { liked: true, lovesCount: safeCount } };
};

tracksRouter.get("/highlights", async (_req, res) => {
  const key = "tracks:highlights:v2";
  const cached = await cacheGet(key);
  if (cached) return res.json({ source: "redis", ...cached });

  const config = await getSiteConfig();
  let highlights = await resolveTracksInOrder((config.highlightTrackIds || []).map((id) => String(id)));
  highlights = highlights.slice(0, config.heroMaxCount || 5);

  if (!highlights.length) {
    highlights = await Track.find({ mediaType: "live_show" })
      .sort({ weeklyTrendingScore: -1, lovesCount: -1, votes: -1 })
      .limit(config.heroMaxCount || 5);
  }

  let featured = null;
  if (config.featuredTrackId) {
    featured = highlights.find((item) => String(item._id) === String(config.featuredTrackId)) || null;
    if (!featured) featured = await Track.findById(config.featuredTrackId);
  }
  if (!featured) featured = highlights[0] || null;

  const payload = {
    featured,
    highlights,
    settings: {
      heroAutoRotateSeconds: config.heroAutoRotateSeconds || 10,
      heroMaxCount: config.heroMaxCount || 5
    }
  };

  await cacheSet(key, payload, 45);
  return res.json(payload);
});

tracksRouter.get("/sections", async (_req, res) => {
  const key = "tracks:sections:v4";
  const cached = await cacheGet(key);
  if (cached) return res.json({ source: "redis", ...cached });

  const sections = [];
  for (const definition of SECTION_DEFINITIONS) {
    const items = await getSectionItems(definition, 12);
    sections.push({ id: definition.id, title: definition.title, items });
  }

  const config = await getSiteConfig();
  const highlightTracks = await resolveTracksInOrder((config.highlightTrackIds || []).map((id) => String(id)));
  const limitedHighlights = highlightTracks.slice(0, config.heroMaxCount || 5);

  const featured = config.featuredTrackId
    ? await Track.findById(config.featuredTrackId)
    : limitedHighlights[0] || sections.find((section) => section.items.length > 0)?.items[0] || null;

  const payload = {
    hero: featured || limitedHighlights[0] || sections.find((section) => section.items.length > 0)?.items[0] || null,
    sections,
    highlights: limitedHighlights,
    highlightSettings: {
      heroAutoRotateSeconds: config.heroAutoRotateSeconds || 10,
      heroMaxCount: config.heroMaxCount || 5
    },
    updatedAt: new Date().toISOString()
  };

  await cacheSet(key, payload, 45);
  return res.json(payload);
});

tracksRouter.get("/leaderboard", async (_req, res) => {
  const key = "tracks:leaderboard:v3";
  const cached = await cacheGet(key);
  if (cached) return res.json({ source: "redis", ...cached });

  const [commentsRaw, likesRaw, commentedVideosRaw, lovedVideosRaw] = await Promise.all([
    redis.zrevrange("ranking:users:comments", 0, 9, "WITHSCORES"),
    redis.zrevrange("ranking:users:likes", 0, 9, "WITHSCORES"),
    redis.zrevrange("ranking:videos:comments", 0, 9, "WITHSCORES"),
    redis.zrevrange("ranking:videos:loves", 0, 9, "WITHSCORES")
  ]);

  const commentsRanking = parseWithScores(commentsRaw);
  const likesRanking = parseWithScores(likesRaw);
  const commentedVideosRanking = parseWithScores(commentedVideosRaw);
  const lovedVideosRanking = parseWithScores(lovedVideosRaw);

  const uniqueUserIds = [...new Set([...commentsRanking, ...likesRanking].map((entry) => entry.member))];
  const users = await User.find({ _id: { $in: uniqueUserIds.filter(isValidObjectId) } }).select("username");
  const userMap = new Map(users.map((user) => [String(user._id), user]));

  const commentedTracks = await resolveTracksInOrder(commentedVideosRanking.map((entry) => entry.member));
  const lovedTracks = await resolveTracksInOrder(lovedVideosRanking.map((entry) => entry.member));
  const commentedMap = new Map(commentedTracks.map((track) => [String(track._id), track]));
  const lovedMap = new Map(lovedTracks.map((track) => [String(track._id), track]));

  const payload = {
    usersMostComments: commentsRanking.map((entry) => ({
      userId: entry.member,
      username: userMap.get(entry.member)?.username || "Usuário removido",
      score: entry.score
    })),
    usersMostLikes: likesRanking.map((entry) => ({
      userId: entry.member,
      username: userMap.get(entry.member)?.username || "Usuário removido",
      score: entry.score
    })),
    videosMostCommented: commentedVideosRanking.map((entry) => ({
      trackId: entry.member,
      score: entry.score,
      track: commentedMap.get(entry.member) || null
    })),
    videosMostLoved: lovedVideosRanking.map((entry) => ({
      trackId: entry.member,
      score: entry.score,
      track: lovedMap.get(entry.member) || null
    }))
  };

  await cacheSet(key, payload, 25);
  return res.json(payload);
});

tracksRouter.get("/", async (req, res) => {
  const { search = "", subgenre = "", page = 1, limit = 8 } = req.query;
  const key = `tracks:list:${search}:${subgenre}:${page}:${limit}`;
  const cached = await cacheGet(key);
  if (cached) return res.json({ source: "redis", ...cached });

  const filter = {};
  if (search) filter.$text = { $search: search };
  if (subgenre) filter.subgenre = subgenre;

  const [items, total] = await Promise.all([
    Track.find(filter)
      .sort({ votes: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Track.countDocuments(filter)
  ]);

  const payload = { items, total };
  await cacheSet(key, payload, 45);
  return res.json(payload);
});

tracksRouter.post("/", async (req, res) => {
  const track = await Track.create(req.body);
  await touchTrackCaches(track._id);
  return res.status(201).json(track);
});

tracksRouter.get("/:id", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID inválido" });
  const track = await Track.findById(req.params.id);
  if (!track) return res.status(404).json({ message: "Vídeo não encontrado" });
  return res.json(track);
});

tracksRouter.get("/:id/comments", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID inválido" });

  const limit = Math.min(Number(req.query.limit || 60), 120);
  const key = `track:${req.params.id}:comments:${limit}`;
  const cached = await cacheGet(key);
  if (cached) return res.json({ source: "redis", ...cached });

  const comments = await TrackComment.find({ track: req.params.id })
    .populate("user", "username profile.avatarUrl role")
    .sort({ createdAt: -1 })
    .limit(limit);

  const payload = { items: comments.reverse() };
  await cacheSet(key, payload, 15);
  return res.json(payload);
});

tracksRouter.post("/:id/comments", auth, async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID inválido" });

  const message = String(req.body.message || "").trim();
  if (!message) return res.status(400).json({ message: "Mensagem obrigatória" });

  const track = await Track.findById(req.params.id);
  if (!track) return res.status(404).json({ message: "Vídeo não encontrado" });

  const comment = await TrackComment.create({
    track: track._id,
    user: req.user.userId,
    message
  });

  const populated = await TrackComment.findById(comment._id).populate("user", "username profile.avatarUrl role");

  await Promise.all([
    redis.zincrby("ranking:users:comments", 1, String(req.user.userId)),
    redis.zincrby("ranking:videos:comments", 1, String(track._id)),
    redis.zincrby("ranking:videos:popular", 1, String(track._id)),
    Track.findByIdAndUpdate(track._id, { $inc: { weeklyTrendingScore: 1 } })
  ]);

  await touchTrackCaches(track._id);
  return res.status(201).json(populated);
});

tracksRouter.get("/:id/love-status", auth, async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "ID inválido" });

  const track = await Track.findById(req.params.id).select("lovesCount");
  if (!track) return res.status(404).json({ message: "Vídeo não encontrado" });

  const loved = await TrackLove.exists({ track: req.params.id, user: req.user.userId });
  const lovesCount = await ensureLoveCountCache(track._id, track.lovesCount || 0);
  return res.json({ loved: Boolean(loved), lovesCount });
});

tracksRouter.post("/:id/love/toggle", auth, async (req, res) => {
  const result = await toggleLoveForTrack({ trackId: req.params.id, authUser: req.user });
  if (result.error) return res.status(result.error.status).json({ message: result.error.message });
  return res.json(result.payload);
});

tracksRouter.post("/:id/love", auth, async (req, res) => {
  const result = await toggleLoveForTrack({ trackId: req.params.id, authUser: req.user });
  if (result.error) return res.status(result.error.status).json({ message: result.error.message });
  return res.json(result.payload);
});
