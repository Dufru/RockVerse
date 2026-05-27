import mongoose from "mongoose";

const trackCommentSchema = new mongoose.Schema(
  {
    track: { type: mongoose.Schema.Types.ObjectId, ref: "Track", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

trackCommentSchema.index({ track: 1, createdAt: -1 });

export const TrackComment = mongoose.model("TrackComment", trackCommentSchema);
