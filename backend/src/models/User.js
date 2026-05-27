import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema(
  {
    avatarUrl: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },
    about: { type: String, default: "" },
    favoriteGenre: { type: String, default: "" },
    favoriteBand: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    birthDate: { type: Date, default: null }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true, trim: true },
    email: { type: String, unique: true, required: true, trim: true },
    passwordHash: { type: String, required: true },
    favoriteBands: [{ type: String }],
    role: { type: String, enum: ["user", "admin"], default: "user" },
    profile: { type: userProfileSchema, default: () => ({}) }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
