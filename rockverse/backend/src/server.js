import "dotenv/config";
import { app } from "./app.js";
import { connectMongo } from "./config/mongo.js";
import { redis } from "./config/redis.js";
import { rebuildRedisStateFromMongo } from "./services/bootstrap.js";

const PORT = process.env.PORT || 4000;

const start = async () => {
  await connectMongo();
  await redis.ping();
  await rebuildRedisStateFromMongo();

  app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
  });
};

start().catch((err) => {
  console.error("Falha ao iniciar:", err);
  process.exit(1);
});
