import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { redis } from "../config/redis.js";

const toPublicUser = (user) => ({
  id: user._id,
  username: user.username,
  favoriteBands: user.favoriteBands,
  role: user.role,
  profile: user.profile
});

export const register = async (req, res) => {
  const { username, email, password, favoriteBands = [] } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Campos obrigatórios ausentes" });
  }

  const exists = await User.findOne({ $or: [{ username }, { email }] });
  if (exists) return res.status(409).json({ message: "Usuário já existe" });

  const passwordHash = await bcrypt.hash(password, 10);
  const usersCount = await User.countDocuments({});
  const role = usersCount === 0 ? "admin" : "user";
  const user = await User.create({ username, email, passwordHash, favoriteBands, role });

  const token = jwt.sign(
    { userId: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  await redis.set(`active:user:${user._id}`, "1", "EX", 900);

  return res.status(201).json({ token, user: toPublicUser(user) });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Credenciais inválidas" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: "Credenciais inválidas" });

  const token = jwt.sign(
    { userId: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  await redis.set(`active:user:${user._id}`, "1", "EX", 900);
  return res.json({ token, user: toPublicUser(user) });
};

export const me = async (req, res) => {
  const user = await User.findById(req.user.userId).select("username favoriteBands role profile");
  if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
  await redis.set(`active:user:${user._id}`, "1", "EX", 900);
  return res.json({ user: toPublicUser(user) });
};
