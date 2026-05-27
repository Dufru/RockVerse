import { User } from "../models/User.js";

export const adminOnly = async (req, res, next) => {
  const user = await User.findById(req.user.userId).select("role");
  if (!user) return res.status(401).json({ message: "Usuário não encontrado" });
  if (user.role !== "admin") return res.status(403).json({ message: "Acesso restrito a administradores" });
  req.authUserRole = user.role;
  next();
};
