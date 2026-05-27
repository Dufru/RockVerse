import mongoose from "mongoose";

const trackLoveSchema = new mongoose.Schema(
  {
    track: { type: mongoose.Schema.Types.ObjectId, ref: "Track", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

trackLoveSchema.index({ track: 1, user: 1 }, { unique: true });

export const TrackLove = mongoose.model("TrackLove", trackLoveSchema);
