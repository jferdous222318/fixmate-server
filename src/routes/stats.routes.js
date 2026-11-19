import { Router } from "express";
import {
  publicStats, customerStats, technicianStats, adminStats,
} from "../controllers/stats.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyCustomer, verifyTechnician, verifyAdmin } from "../middlewares/verifyRole.js";

const router = Router();

router.get("/public", publicStats);
router.get("/customer", verifyToken, verifyCustomer, customerStats);
router.get("/technician", verifyToken, verifyTechnician, technicianStats);
router.get("/admin", verifyToken, verifyAdmin, adminStats);

export default router;