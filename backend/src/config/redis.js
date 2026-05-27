import Redis from "ioredis";

// Aceita tanto "redis://..." quanto strings copiadas do terminal como "redis-cli -u redis://...".
// Assim a aplicação não quebra por detalhe de formatação no .env.
const rawRedisUrl = String(process.env.REDIS_URL || "redis://127.0.0.1:6379").trim();
const normalizedRedisUrl = rawRedisUrl.includes("redis://")
  ? rawRedisUrl.slice(rawRedisUrl.indexOf("redis://")).trim()
  : rawRedisUrl;

export const redis = new Redis(normalizedRedisUrl);

redis.on("connect", () => console.log("Redis conectado"));
redis.on("error", (err) => console.error("Erro Redis:", err.message));
