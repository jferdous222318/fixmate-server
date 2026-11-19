import { Router } from "express";
import { getPublicServices, getServiceById } from "../controllers/service.controller.js";

const router = Router();

// Technician routes (Part 3) like GET /my must be added ABOVE "/:id",
// otherwise Express treats "my" as an id.
router.get("/", getPublicServices);
router.get("/:id", getServiceById);

export default router;