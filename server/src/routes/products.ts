import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

const router = Router();

const variantSchema = z.object({
  sku: z.string().min(1),
  attributes: z.record(z.string()),
  price: z.number().positive(),
  currency: z.string().default("USD"),
  stock: z.number().int().min(0).default(0),
  weightOz: z.number().positive().default(16),
  lengthIn: z.number().positive().default(6),
  widthIn: z.number().positive().default(6),
  heightIn: z.number().positive().default(6),
});

const productCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  categoryId: z.string().optional(),
  minOrderQty: z.number().int().positive().default(1),
  images: z.array(z.string()).default([]),
  variants: z.array(variantSchema).min(1),
});

async function getOwnManufacturerProfile(userId: string) {
  return prisma.manufacturerProfile.findUnique({ where: { userId } });
}

// GET /api/products — public marketplace browse/search
router.get("/", async (req, res) => {
  const { q, categoryId, manufacturerId, page = "1", pageSize = "20" } = req.query as Record<string, string>;

  const where: any = { published: true };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (manufacturerId) where.manufacturerId = manufacturerId;

  const take = Math.min(parseInt(pageSize, 10) || 20, 50);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        variants: { orderBy: { price: "asc" }, take: 1 },
        category: true,
        manufacturer: { select: { companyName: true, verified: true, country: true, id: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.product.count({ where }),
  ]);

  res.json({ items, total, page: Number(page), pageSize: take });
});

// GET /api/products/mine — manufacturer's own products (incl. unpublished)
router.get("/mine", requireAuth, requireRole("MANUFACTURER"), async (req: AuthedRequest, res) => {
  const profile = await getOwnManufacturerProfile(req.user!.userId);
  if (!profile) return res.status(404).json({ error: "Manufacturer profile not found" });

  const items = await prisma.product.findMany({
    where: { manufacturerId: profile.id },
    include: { images: true, variants: true, category: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ items });
});

// GET /api/products/:id — public detail
router.get("/:id", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: true,
      category: true,
      manufacturer: { select: { id: true, companyName: true, description: true, logoUrl: true, verified: true, country: true } },
    },
  });
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json({ product });
});

// POST /api/products — create (manufacturer only)
router.post("/", requireAuth, requireRole("MANUFACTURER"), async (req: AuthedRequest, res) => {
  const parsed = productCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const profile = await getOwnManufacturerProfile(req.user!.userId);
  if (!profile) return res.status(404).json({ error: "Manufacturer profile not found" });

  const { images, variants, ...productData } = parsed.data;

  try {
    const product = await prisma.product.create({
      data: {
        ...productData,
        manufacturerId: profile.id,
        images: { create: images.map((url, position) => ({ url, position })) },
        variants: { create: variants },
      },
      include: { images: true, variants: true, category: true },
    });
    res.status(201).json({ product });
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Duplicate SKU among variants" });
    }
    throw err;
  }
});

const productUpdateSchema = productCreateSchema.partial().extend({
  published: z.boolean().optional(),
});

// PATCH /api/products/:id — update own product's fields (not variants directly)
router.patch("/:id", requireAuth, requireRole("MANUFACTURER"), async (req: AuthedRequest, res) => {
  const parsed = productUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const profile = await getOwnManufacturerProfile(req.user!.userId);
  if (!profile) return res.status(404).json({ error: "Manufacturer profile not found" });

  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.manufacturerId !== profile.id) {
    return res.status(404).json({ error: "Product not found" });
  }

  const { images, variants, ...productData } = parsed.data;
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: productData,
    include: { images: true, variants: true, category: true },
  });
  res.json({ product });
});

// DELETE /api/products/:id
router.delete("/:id", requireAuth, requireRole("MANUFACTURER"), async (req: AuthedRequest, res) => {
  const profile = await getOwnManufacturerProfile(req.user!.userId);
  if (!profile) return res.status(404).json({ error: "Manufacturer profile not found" });

  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.manufacturerId !== profile.id) {
    return res.status(404).json({ error: "Product not found" });
  }

  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// POST /api/products/:id/variants — add a variant to an existing product
router.post("/:id/variants", requireAuth, requireRole("MANUFACTURER"), async (req: AuthedRequest, res) => {
  const parsed = variantSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const profile = await getOwnManufacturerProfile(req.user!.userId);
  if (!profile) return res.status(404).json({ error: "Manufacturer profile not found" });

  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product || product.manufacturerId !== profile.id) {
    return res.status(404).json({ error: "Product not found" });
  }

  try {
    const variant = await prisma.productVariant.create({
      data: { ...parsed.data, productId: product.id },
    });
    res.status(201).json({ variant });
  } catch (err: any) {
    if (err.code === "P2002") return res.status(409).json({ error: "SKU already exists" });
    throw err;
  }
});

// PATCH /api/products/:id/variants/:variantId
router.patch("/:id/variants/:variantId", requireAuth, requireRole("MANUFACTURER"), async (req: AuthedRequest, res) => {
  const parsed = variantSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const profile = await getOwnManufacturerProfile(req.user!.userId);
  if (!profile) return res.status(404).json({ error: "Manufacturer profile not found" });

  const variant = await prisma.productVariant.findUnique({
    where: { id: req.params.variantId },
    include: { product: true },
  });
  if (!variant || variant.productId !== req.params.id || variant.product.manufacturerId !== profile.id) {
    return res.status(404).json({ error: "Variant not found" });
  }

  const updated = await prisma.productVariant.update({
    where: { id: req.params.variantId },
    data: parsed.data,
  });
  res.json({ variant: updated });
});

// DELETE /api/products/:id/variants/:variantId
router.delete("/:id/variants/:variantId", requireAuth, requireRole("MANUFACTURER"), async (req: AuthedRequest, res) => {
  const profile = await getOwnManufacturerProfile(req.user!.userId);
  if (!profile) return res.status(404).json({ error: "Manufacturer profile not found" });

  const variant = await prisma.productVariant.findUnique({
    where: { id: req.params.variantId },
    include: { product: true },
  });
  if (!variant || variant.productId !== req.params.id || variant.product.manufacturerId !== profile.id) {
    return res.status(404).json({ error: "Variant not found" });
  }

  await prisma.productVariant.delete({ where: { id: req.params.variantId } });
  res.status(204).send();
});

export default router;
