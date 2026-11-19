import { Router } from "express";
import { createBooking, getMyBookings } from "../controllers/booking.controller.js";
import {
    getTechnicianBookings,
    updateBookingStatus,
    cancelBooking,
} from "../controllers/bookingStatus.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyCustomer, verifyTechnician } from "../middlewares/verifyRole.js";

const router = Router();
const customer = [verifyToken, verifyCustomer];
const technician = [verifyToken, verifyTechnician];

// Customer
router.post("/", ...customer, createBooking);
router.get("/my", ...customer, getMyBookings);
router.patch("/:id/cancel", ...customer, cancelBooking);

// Technician
router.get("/technician", ...technician, getTechnicianBookings);
router.patch("/:id/status", ...technician, updateBookingStatus);

export default router;