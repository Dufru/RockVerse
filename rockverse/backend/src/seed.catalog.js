import "dotenv/config";
import { connectMongo } from "./config/mongo.js";
import { Track } from "./models/Track.js";
import { mediaCatalog } from "./data/mediaCatalog.js";
import { SiteConfig } from "./models/SiteConfig.js";

await connectMongo();

// Ele garante que o catálogo base esteja disponível para quem acabou de clonar o projeto.
const seededIds = [];
for (const item of mediaCatalog) {
  const filter = {
    title: item.title,
    artist: item.artist,
    album: item.album || ""
  };

  const updated = await Track.findOneAndUpdate(
    filter,
    {
      $setOnInsert: {
        ...item,
        album: item.album || ""
      }
    },
    {
      new: true,
      upsert: true
    }
  );

  seededIds.push(updated._id);
}

let config = await SiteConfig.findOne({ key: "main" });
if (!config) {
  config = await SiteConfig.create({
    key: "main",
    featuredTrackId: seededIds[0] || null,
    highlightTrackIds: seededIds.slice(0, 5),
    heroAutoRotateSeconds: 10,
    heroMaxCount: 5
  });
} else {
  if (!config.featuredTrackId && seededIds[0]) config.featuredTrackId = seededIds[0];
  if (!config.highlightTrackIds?.length) config.highlightTrackIds = seededIds.slice(0, 5);
  if (!config.heroAutoRotateSeconds) config.heroAutoRotateSeconds = 10;
  if (!config.heroMaxCount) config.heroMaxCount = 5;
  await config.save();
}

console.log("Seed concluído.");
process.exit(0);
