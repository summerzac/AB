import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const addressSchema = z.object({
  name: z.string().min(1),
  street1: z.string().min(1),
  street2: z.string().nullable().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(2).default("US"),
  phone: z.string().nullable().optional(),
});

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ addresses });
});

router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const address = await prisma.address.create({
    data: { ...parsed.data, userId: req.user!.userId },
  });
  res.status(201).json({ address });
});

export default router;
