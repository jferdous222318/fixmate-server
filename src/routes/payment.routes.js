import { Router } from "express";
import {
  createCheckoutSession,
  verifyPayment,
  getMyPayments,
} from "../controllers/payment.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyCustomer } from "../middlewares/verifyRole.js";

const router = Router();
const customer = [verifyToken, verifyCustomer];

router.post("/create-checkout-session", ...customer, createCheckoutSession);
router.get("/verify", ...customer, verifyPayment);
router.get("/my", ...customer, getMyPayments);

export default router;