import { Router } from "express";
import { createBooking, getMyBookings } from "../controllers/booking.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyCustomer } from "../middlewares/verifyRole.js";

const router = Router();

router.post("/", verifyToken, verifyCustomer, createBooking);
router.get("/my", verifyToken, verifyCustomer, getMyBookings);

export default router;