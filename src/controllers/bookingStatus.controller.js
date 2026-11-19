import { ObjectId } from "mongodb";
import { col } from "../config/db.js";
import { canTransition } from "../utils/statusPipeline.js";

const STATUSES = ["requested", "accepted", "rejected", "in-progress", "completed", "cancelled"];

// Loads a booking by id. Sends 404 itself and returns null when the request must stop.
async function loadBooking(req, res) {
    if (!ObjectId.isValid(req.params.id)) {
        res.status(404).json({ message: "Booking not found" });
        return null;
    }
    const bookings = await col("bookings");
    const booking = await bookings.findOne({ _id: new ObjectId(req.params.id) });
    if (!booking) {
        res.status(404).json({ message: "Booking not found" });
        return null;
    }
    return booking;
}

// Changes the status atomically: the filter includes the OLD status, so two
// simultaneous requests cannot both succeed.
async function applyStatus(booking, next, extra = {}) {
    const bookings = await col("bookings");
    return bookings.updateOne(
        { _id: booking._id, status: booking.status },
        {
            $set: { status: next, ...extra },
            $push: { statusHistory: { status: next, changedAt: new Date() } },
        }
    );
}

// GET /api/bookings/technician?status=requested  (technician only)
export const getTechnicianBookings = async (req, res, next) => {
    try {
        const filter = { technicianEmail: req.user.email };
        if (STATUSES.includes(req.query.status)) filter.status = req.query.status;

        const bookings = await col("bookings");
        const items = await bookings.find(filter).sort({ createdAt: -1 }).toArray();
        res.json(items);
    } catch (err) {
        next(err);
    }
};

// PATCH /api/bookings/:id/status  body: { status, finalAmount? }  (technician only)
export const updateBookingStatus = async (req, res, next) => {
    try {
        const booking = await loadBooking(req, res);
        if (!booking) return;

        // only the technician who owns the job
        if (booking.technicianEmail !== req.user.email) {
            return res.status(403).json({ message: "Forbidden: this is not your job" });
        }

        const next_ = req.body.status;
        if (!STATUSES.includes(next_)) return res.status(400).json({ message: "Invalid status" });

        if (!canTransition(booking.status, next_, "technician")) {
            return res
                .status(400)
                .json({ message: `Cannot change a job from "${booking.status}" to "${next_}"` });
        }

        const extra = {};
        if (next_ === "completed") {
            const amount = Number(req.body.finalAmount);
            if (!Number.isFinite(amount) || amount <= 0) {
                return res.status(400).json({ message: "finalAmount must be a number greater than 0" });
            }
            extra.finalAmount = amount;
            extra.completedAt = new Date();
        }

        const result = await applyStatus(booking, next_, extra);
        if (!result.matchedCount) {
            return res.status(409).json({ message: "This job was just updated. Please refresh." });
        }
        res.json({ message: `Job marked as ${next_}` });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/bookings/:id/cancel  (customer only, while still "requested")
export const cancelBooking = async (req, res, next) => {
    try {
        const booking = await loadBooking(req, res);
        if (!booking) return;

        if (booking.customerEmail !== req.user.email) {
            return res.status(403).json({ message: "Forbidden: this is not your booking" });
        }
        if (!canTransition(booking.status, "cancelled", "customer")) {
            return res
                .status(400)
                .json({ message: "Only a request that is still pending can be cancelled" });
        }

        const result = await applyStatus(booking, "cancelled");
        if (!result.matchedCount) {
            return res.status(409).json({ message: "This job was just updated. Please refresh." });
        }
        res.json({ message: "Booking cancelled" });
    } catch (err) {
        next(err);
    }
};