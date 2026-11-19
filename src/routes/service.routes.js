import { Router } from "express";
import { getPublicServices, getServiceById } from "../controllers/service.controller.js";
import {
  createService,
  getMyServices,
  updateService,
  toggleAvailability,
  deleteService,
} from "../controllers/technicianService.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyTechnician } from "../middlewares/verifyRole.js";

const router = Router();
const tech = [verifyToken, verifyTechnician];

// Public
router.get("/", getPublicServices);

// "/my" MUST stay above "/:id", otherwise Express treats "my" as an id
router.get("/my", ...tech, getMyServices);
router.post("/", ...tech, createService);

router.get("/:id", getServiceById);
router.patch("/:id/availability", ...tech, toggleAvailability);
router.patch("/:id", ...tech, updateService);
router.delete("/:id", ...tech, deleteService);

export default router;