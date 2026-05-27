import { redis } from "../config/redis.js";
import { Track } from "../models/Track.js";
import { TrackLove } from "../models/TrackLove.js";
import { TrackComment } from "../models/TrackComment.js";
import { cacheDelPattern } from "./cache.js";

const LOVE_CACHE_TTL_SECONDS = 3600;
const RANKING_KEYS = [
  "ranking:users:comments",
  "ranking:users:likes",
  "ranking:videos:comments",
  "ranking:videos:loves",
  "ranking:videos:popular"
];

const toScoreMap = (items) => {
  const map = new Map();
  for (const item of items) {
    map.set(String(item._id), Number(item.count || 0));
  }
  return map;
};

export const rebuildRedisStateFromMongo = async () => {
  // MongoDB e a fonte oficial. Quando a API sobe, a gente reaplica os contadores no Redis.
  // Isso evita perder ranking/likes visuais se o Redis reiniciar limpo.
  await redis.del(...RANKING_KEYS);

  const [tracks, likesByTrackRaw, likesByUserRaw, commentsByTrackRaw, commentsByUserRaw] = await Promise.all([
    Track.find({}).select("_id"),
    TrackLove.aggregate([{ $group: { _id: "$track", count: { $sum: 1 } } }]),
    TrackLove.aggregate([{ $group: { _id: "$user", count: { $sum: 1 } } }]),
    TrackComment.aggregate([{ $group: { _id: "$track", count: { $sum: 1 } } }]),
    TrackComment.aggregate([{ $group: { _id: "$user", count: { $sum: 1 } } }])
  ]);

  const likesByTrack = toScoreMap(likesByTrackRaw);
  const likesByUser = toScoreMap(likesByUserRaw);
  const commentsByTrack = toScoreMap(commentsByTrackRaw);
  const commentsByUser = toScoreMap(commentsByUserRaw);

  if (tracks.length) {
    const updates = tracks.map((track) => {
      const trackId = String(track._id);
      const lovesCount = likesByTrack.get(trackId) || 0;
      const commentsCount = commentsByTrack.get(trackId) || 0;
      return {
        updateOne: {
          filter: { _id: track._id },
          update: {
            $set: {
              lovesCount,
              communityFavoriteScore: lovesCount,
              weeklyTrendingScore: lovesCount + commentsCount
            }
          }
        }
      };
    });

    await Track.bulkWrite(updates, { ordered: false });
  }

  const pipeline = redis.pipeline();

  for (const [userId, score] of commentsByUser.entries()) {
    pipeline.zadd("ranking:users:comments", score, userId);
  }

  for (const [userId, score] of likesByUser.entries()) {
    pipeline.zadd("ranking:users:likes", score, userId);
  }

  for (const track of tracks) {
    const trackId = String(track._id);
    const loves = likesByTrack.get(trackId) || 0;
    const comments = commentsByTrack.get(trackId) || 0;
    const popularity = loves + comments;

    pipeline.zadd("ranking:videos:loves", loves, trackId);
    pipeline.zadd("ranking:videos:comments", comments, trackId);
    pipeline.zadd("ranking:videos:popular", popularity, trackId);
    pipeline.set(`track:${trackId}:loves:count`, String(loves), "EX", LOVE_CACHE_TTL_SECONDS);
  }

  await pipeline.exec();

  await Promise.all([
    cacheDelPattern("tracks:sections:*"),
    cacheDelPattern("tracks:highlights:*"),
    cacheDelPattern("tracks:leaderboard:*"),
    cacheDelPattern("tracks:list:*")
  ]);
};
