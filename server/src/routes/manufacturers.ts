import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

const router = Router();

router.get("/:id", async (req, res) => {
  const profile = await prisma.manufacturerProfile.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      companyName: true,
      description: true,
      logoUrl: true,
      country: true,
      verified: true,
      createdAt: true,
    },
  });
  if (!profile) return res.status(404).json({ error: "Manufacturer not found" });
  res.json({ manufacturer: profile });
});

const profileUpdateSchema = z.object({
  companyName: z.string().min(1).optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  country: z.string().optional(),
  shipFromAddress: z
    .object({
      name: z.string().min(1),
      street1: z.string().min(1),
      street2: z.string().nullable().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
      zip: z.string().min(1),
      country: z.string().min(2).default("US"),
      phone: z.string().optional(),
    })
    .optional(),
});

router.patch("/me", requireAuth, requireRole("MANUFACTURER"), async (req: AuthedRequest, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { shipFromAddress, ...profileFields } = parsed.data;

  const profile = await prisma.manufacturerProfile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Manufacturer profile not found" });

  let shipFromAddressId = profile.shipFromAddressId;
  if (shipFromAddress) {
    if (shipFromAddressId) {
      await prisma.address.update({ where: { id: shipFromAddressId }, data: shipFromAddress });
    } else {
      const address = await prisma.address.create({ data: shipFromAddress });
      shipFromAddressId = address.id;
    }
  }

  const updated = await prisma.manufacturerProfile.update({
    where: { userId: req.user!.userId },
    data: { ...profileFields, shipFromAddressId },
    include: { shipFromAddress: true },
  });
  res.json({ manufacturer: updated });
});

router.get("/me/full", requireAuth, requireRole("MANUFACTURER"), async (req: AuthedRequest, res) => {
  const profile = await prisma.manufacturerProfile.findUnique({
    where: { userId: req.user!.userId },
    include: { shipFromAddress: true },
  });
  if (!profile) return res.status(404).json({ error: "Manufacturer profile not found" });
  res.json({ manufacturer: profile });
});

export default router;
