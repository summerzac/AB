import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json({ categories });
});

export default router;
