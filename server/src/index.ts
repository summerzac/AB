import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import http from "http";

import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import categoryRoutes from "./routes/categories";
import manufacturerRoutes from "./routes/manufacturers";
import addressRoutes from "./routes/addresses";
import conversationRoutes from "./routes/conversations";
import orderRoutes from "./routes/orders";
import uploadRoutes from "./routes/uploads";
import { initChatSocket } from "./sockets/chat";
import { shippingMode } from "./services/shipping";
import { UPLOAD_DIR } from "./middleware/upload";

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/api/health", (_req, res) => res.json({ ok: true, shippingMode }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/manufacturers", manufacturerRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/uploads", uploadRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const httpServer = http.createServer(app);
initChatSocket(httpServer, corsOrigin);

const port = Number(process.env.PORT) || 4000;
httpServer.listen(port, () => {
  console.log(`AB Marketplace API listening on :${port} (shipping mode: ${shippingMode})`);
});
