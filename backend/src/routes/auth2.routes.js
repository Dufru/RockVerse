import express from "express";
import { auth } from "../middleware/auth.js";
import { login, me, register } from "./auth2.controller.js";

export const authRouterV2 = express.Router();

authRouterV2.post("/register", register);
authRouterV2.post("/login", login);
authRouterV2.get("/me", auth, me);
