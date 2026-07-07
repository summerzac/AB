import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireRole("MANUFACTURER"),
  upload.array("files", 8),
  (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const urls = files.map((f) => `/uploads/${f.filename}`);
    res.status(201).json({ urls });
  }
);

export default router;
