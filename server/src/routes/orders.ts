import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import shipping from "../services/shipping";

const router = Router();

const quoteSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
  shippingAddressId: z.string().min(1),
});

// POST /api/orders/quote — get subtotal + live shipping rates before placing the order
router.post("/quote", requireAuth, requireRole("BUYER"), async (req: AuthedRequest, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { variantId, quantity, shippingAddressId } = parsed.data;

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { include: { manufacturer: { include: { shipFromAddress: true } } } } },
  });
  if (!variant) return res.status(404).json({ error: "Variant not found" });
  if (variant.stock < quantity) return res.status(400).json({ error: "Insufficient stock" });

  const shipFrom = variant.product.manufacturer.shipFromAddress;
  if (!shipFrom) return res.status(422).json({ error: "This manufacturer has not configured a ship-from address yet" });

  const shipTo = await prisma.address.findUnique({ where: { id: shippingAddressId } });
  if (!shipTo || shipTo.userId !== req.user!.userId) {
    return res.status(404).json({ error: "Shipping address not found" });
  }

  const quote = await shipping.getRates(
    shipFrom,
    shipTo,
    {
      weightOz: variant.weightOz * quantity,
      lengthIn: variant.lengthIn,
      widthIn: variant.widthIn,
      heightIn: Math.max(variant.heightIn * Math.ceil(quantity / 4), variant.heightIn),
    }
  );

  const subtotal = Number(variant.price) * quantity;
  res.json({ subtotal, currency: variant.currency, quote });
});

const createOrderSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
  shippingAddressId: z.string().min(1),
  shipmentId: z.string().min(1),
  rateId: z.string().min(1),
});

// POST /api/orders — confirm order: purchase the chosen shipping label and persist everything
router.post("/", requireAuth, requireRole("BUYER"), async (req: AuthedRequest, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { variantId, quantity, shippingAddressId, shipmentId, rateId } = parsed.data;

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });
  if (!variant) return res.status(404).json({ error: "Variant not found" });
  if (variant.stock < quantity) return res.status(400).json({ error: "Insufficient stock" });

  const shipTo = await prisma.address.findUnique({ where: { id: shippingAddressId } });
  if (!shipTo || shipTo.userId !== req.user!.userId) {
    return res.status(404).json({ error: "Shipping address not found" });
  }

  let label;
  try {
    label = await shipping.buyLabel(shipmentId, rateId);
  } catch (err) {
    return res.status(422).json({ error: `Failed to purchase shipping label: ${(err as Error).message}` });
  }

  const subtotal = Number(variant.price) * quantity;
  const total = subtotal + label.rateAmount;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        buyerId: req.user!.userId,
        manufacturerId: variant.product.manufacturerId,
        shippingAddressId,
        subtotal,
        shippingCost: label.rateAmount,
        total,
        status: "LABEL_PURCHASED",
        items: {
          create: [{ variantId: variant.id, quantity, unitPrice: variant.price }],
        },
        shipment: {
          create: {
            simulated: label.simulated,
            easypostShipmentId: label.shipmentId,
            easypostRateId: label.rateId,
            carrier: label.carrier,
            service: label.service,
            rateAmount: label.rateAmount,
            trackingCode: label.trackingCode,
            trackingUrl: label.trackingUrl,
            labelUrl: label.labelUrl,
            status: "label_purchased",
          },
        },
      },
      include: { items: true, shipment: true },
    });

    await tx.productVariant.update({
      where: { id: variant.id },
      data: { stock: { decrement: quantity } },
    });

    return created;
  });

  res.status(201).json({ order });
});

// GET /api/orders — list orders for buyer or manufacturer
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const { userId, role } = req.user!;

  if (role === "BUYER") {
    const orders = await prisma.order.findMany({
      where: { buyerId: userId },
      include: { items: { include: { variant: { include: { product: true } } } }, shipment: true, manufacturer: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ orders });
  }

  const profile = await prisma.manufacturerProfile.findUnique({ where: { userId } });
  if (!profile) return res.status(404).json({ error: "Manufacturer profile not found" });

  const orders = await prisma.order.findMany({
    where: { manufacturerId: profile.id },
    include: { items: { include: { variant: { include: { product: true } } } }, shipment: true, buyer: { select: { name: true, email: true } }, shippingAddress: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
});

// GET /api/orders/:id/tracking — refresh tracking status
router.get("/:id/tracking", requireAuth, async (req: AuthedRequest, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { shipment: true } });
  if (!order) return res.status(404).json({ error: "Order not found" });

  const profile = req.user!.role === "MANUFACTURER" ? await prisma.manufacturerProfile.findUnique({ where: { userId: req.user!.userId } }) : null;
  const isOwner = order.buyerId === req.user!.userId || (profile && order.manufacturerId === profile.id);
  if (!isOwner) return res.status(403).json({ error: "Not authorized" });

  if (!order.shipment?.trackingCode) return res.json({ status: order.status });

  const tracking = await shipping.trackShipment(order.shipment.trackingCode);
  res.json({ status: tracking.status });
});

export default router;
