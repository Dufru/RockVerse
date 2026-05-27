import mongoose from "mongoose";

const trackSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    artist: { type: String, required: true },
    album: { type: String },
    subgenre: { type: String, enum: ["classic", "metal", "punk", "grunge", "prog", "indie", "alt", "hard"] },
    year: { type: Number },
    votes: { type: Number, default: 0 },
    genre: { type: String, default: "Rock" },
    mediaType: { type: String, enum: ["live_show", "classic_album"], default: "live_show" },
    youtubeVideoId: { type: String, trim: true },
    youtubeUrl: { type: String, trim: true },
    coverImage: { type: String, trim: true },
    bannerImage: { type: String, trim: true },
    description: { type: String, default: "" },
    lovesCount: { type: Number, default: 0 },
    communityFavoriteScore: { type: Number, default: 0 },
    weeklyTrendingScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

trackSchema.index({ title: "text", artist: "text", album: "text" });

export const Track = mongoose.model("Track", trackSchema);
