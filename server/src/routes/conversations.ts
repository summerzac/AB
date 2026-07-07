import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { emitToConversation } from "../sockets/chat";

const router = Router();

// GET /api/conversations — list conversations for the current user (buyer or manufacturer)
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const { userId, role } = req.user!;

  if (role === "BUYER") {
    const conversations = await prisma.conversation.findMany({
      where: { buyerId: userId },
      include: {
        manufacturer: { select: { id: true, companyName: true, logoUrl: true } },
        product: { select: { id: true, title: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });
    return res.json({ conversations });
  }

  const profile = await prisma.manufacturerProfile.findUnique({ where: { userId } });
  if (!profile) return res.status(404).json({ error: "Manufacturer profile not found" });

  const conversations = await prisma.conversation.findMany({
    where: { manufacturerId: profile.id },
    include: {
      buyer: { select: { id: true, name: true } },
      product: { select: { id: true, title: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ conversations });
});

const startSchema = z.object({
  manufacturerId: z.string().min(1),
  productId: z.string().optional(),
  message: z.string().min(1),
});

// POST /api/conversations — buyer starts (or continues) a conversation with a manufacturer
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  if (req.user!.role !== "BUYER") {
    return res.status(403).json({ error: "Only buyers can start conversations" });
  }
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { manufacturerId, productId, message } = parsed.data;

  const manufacturer = await prisma.manufacturerProfile.findUnique({ where: { id: manufacturerId } });
  if (!manufacturer) return res.status(404).json({ error: "Manufacturer not found" });

  let conversation = await prisma.conversation.findFirst({
    where: { buyerId: req.user!.userId, manufacturerId, productId: productId ?? null },
  });
  if (conversation) {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
  } else {
    conversation = await prisma.conversation.create({
      data: { buyerId: req.user!.userId, manufacturerId, productId },
    });
  }

  const msg = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: req.user!.userId, body: message },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

  emitToConversation(conversation.id, "message:new", msg);

  res.status(201).json({ conversation, message: msg });
});

async function assertParticipant(conversationId: string, userId: string, role: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return null;
  if (role === "BUYER" && conversation.buyerId !== userId) return null;
  if (role === "MANUFACTURER") {
    const profile = await prisma.manufacturerProfile.findUnique({ where: { userId } });
    if (!profile || conversation.manufacturerId !== profile.id) return null;
  }
  return conversation;
}

// GET /api/conversations/:id/messages
router.get("/:id/messages", requireAuth, async (req: AuthedRequest, res) => {
  const conversation = await assertParticipant(req.params.id, req.user!.userId, req.user!.role);
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });

  await prisma.message.updateMany({
    where: { conversationId: conversation.id, senderId: { not: req.user!.userId }, readAt: null },
    data: { readAt: new Date() },
  });

  res.json({ conversation, messages });
});

const sendSchema = z.object({ body: z.string().min(1) });

// POST /api/conversations/:id/messages
router.post("/:id/messages", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const conversation = await assertParticipant(req.params.id, req.user!.userId, req.user!.role);
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });

  const msg = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: req.user!.userId, body: parsed.data.body },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

  emitToConversation(conversation.id, "message:new", msg);

  res.status(201).json({ message: msg });
});

export default router;
