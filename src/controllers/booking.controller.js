import { ObjectId } from "mongodb";
import { col } from "../config/db.js";
import { validateBooking } from "../utils/validateBooking.js";

const ACTIVE = ["requested", "accepted", "in-progress"];

// POST /api/bookings  (customer only)
export const createBooking = async (req, res, next) => {
  try {
    const { errors, data } = validateBooking(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    if (!ObjectId.isValid(data.serviceId)) {
      return res.status(404).json({ message: "Service not found" });
    }

    const services = await col("services");
    const service = await services.findOne({
      _id: new ObjectId(data.serviceId),
      approvalStatus: "approved",
      isAvailable: true,
    });
    if (!service) return res.status(404).json({ message: "Service not available" });

    if (service.technicianEmail === req.user.email) {
      return res.status(400).json({ message: "You cannot request your own service" });
    }

    const bookings = await col("bookings");

    // duplicate active request guard
    const existing = await bookings.findOne({
      serviceId: data.serviceId,
      customerEmail: req.user.email,
      status: { $in: ACTIVE },
    });
    if (existing) {
      return res.status(409).json({ message: "You already have an active request for this service" });
    }

    const now = new Date();
    const doc = {
      serviceId: data.serviceId,
      // copied, so the booking still displays correctly if the service is edited or deleted
      serviceTitle: service.title,
      serviceImage: service.image,
      category: service.category,
      basePrice: service.basePrice,
      technicianName: service.technicianName,
      technicianEmail: service.technicianEmail,
      // identity comes from the database, never from the request body
      customerName: req.dbUser.name,
      customerEmail: req.dbUser.email,
      customerPhone: data.customerPhone,
      address: data.address,
      preferredDate: data.preferredDate,
      problemDescription: data.problemDescription,
      status: "requested",
      finalAmount: service.basePrice,
      paymentStatus: "unpaid",
      statusHistory: [{ status: "requested", changedAt: now }], // for the timeline tracker
      createdAt: now,
    };

    const result = await bookings.insertOne(doc);
    res.status(201).json({ message: "Repair request sent", _id: result.insertedId });
  } catch (err) {
    next(err);
  }
};

// GET /api/bookings/my  (customer only)
// The email comes from the token, so a customer can never read someone else's bookings.
export const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await col("bookings");
    const items = await bookings
      .find({ customerEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(items);
  } catch (err) {
    next(err);
  }
};