import mongoose from "mongoose";

const siteConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true, default: "main" },
    featuredTrackId: { type: mongoose.Schema.Types.ObjectId, ref: "Track", default: null },
    highlightTrackIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Track" }],
    heroAutoRotateSeconds: { type: Number, default: 10 },
    heroMaxCount: { type: Number, default: 5 }
  },
  { timestamps: true }
);

export const SiteConfig = mongoose.model("SiteConfig", siteConfigSchema);
