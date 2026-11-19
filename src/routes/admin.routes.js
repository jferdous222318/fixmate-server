import { Router } from "express";
import {
  getAllUsers,
  updateUserRole,
  getAllServices,
  updateApproval,
} from "../controllers/admin.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyAdmin } from "../middlewares/verifyRole.js";

const router = Router();

// every admin route needs a valid token AND the admin role
router.use(verifyToken, verifyAdmin);

router.get("/users", getAllUsers);
router.patch("/users/:id/role", updateUserRole);
router.get("/services", getAllServices);
router.patch("/services/:id/approval", updateApproval);
// /admin/bookings and /admin/payments are added in Parts 4 and 5

export default router;