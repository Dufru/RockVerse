import { redis } from "../config/redis.js";

export const cacheGet = async (key) => {
  const raw = await redis.get(key);
  if (!raw) return null;
  return JSON.parse(raw);
};

export const cacheSet = async (key, value, ttlSeconds = 60) => {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
};

export const cacheDelPattern = async (pattern) => {
  const keys = await redis.keys(pattern);
  if (keys.length) {
    await redis.del(keys);
  }
};
