import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../utils/jwt";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["MANUFACTURER", "BUYER"]),
  companyName: z.string().min(1).optional(),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password, name, role, companyName } = parsed.data;

  if (role === "MANUFACTURER" && !companyName) {
    return res.status(400).json({ error: "companyName is required for manufacturers" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
      manufacturerProfile:
        role === "MANUFACTURER"
          ? { create: { companyName: companyName! } }
          : undefined,
    },
    include: { manufacturerProfile: true },
  });

  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, manufacturerProfile: user.manufacturerProfile },
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { manufacturerProfile: true },
  });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, manufacturerProfile: user.manufacturerProfile },
  });
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { manufacturerProfile: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, manufacturerProfile: user.manufacturerProfile } });
});

export default router;
