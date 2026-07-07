import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../lib/prisma";

let io: Server | null = null;

export function initChatSocket(httpServer: HttpServer, corsOrigin: string) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) throw new Error("missing token");
      const payload = verifyToken(token);
      (socket.data as any).user = payload;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket.data as any).user as { userId: string; role: string };

    socket.on("conversation:join", async (conversationId: string) => {
      const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
      if (!conversation) return;

      const allowed =
        (user.role === "BUYER" && conversation.buyerId === user.userId) ||
        (user.role === "MANUFACTURER" &&
          (await prisma.manufacturerProfile.findUnique({ where: { userId: user.userId } }))?.id ===
            conversation.manufacturerId);

      if (allowed) socket.join(conversationId);
    });

    socket.on("conversation:leave", (conversationId: string) => {
      socket.leave(conversationId);
    });

    socket.on("typing", ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) => {
      socket.to(conversationId).emit("typing", { conversationId, userId: user.userId, isTyping });
    });
  });

  return io;
}

export function emitToConversation(conversationId: string, event: string, payload: unknown) {
  io?.to(conversationId).emit(event, payload);
}
