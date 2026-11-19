import { ObjectId } from "mongodb";
import { col } from "../config/db.js";
import { validateService } from "../utils/validateService.js";

// Loads a service and makes sure the logged-in technician owns it.
// Sends the 404 / 403 itself and returns null when the request must stop.
async function loadOwnedService(req, res) {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    res.status(404).json({ message: "Service not found" });
    return null;
  }
  const services = await col("services");
  const service = await services.findOne({ _id: new ObjectId(id) });
  if (!service) {
    res.status(404).json({ message: "Service not found" });
    return null;
  }
  if (service.technicianEmail !== req.user.email) {
    res.status(403).json({ message: "Forbidden: this is not your service" });
    return null;
  }
  return service;
}

// POST /api/services
export const createService = async (req, res, next) => {
  try {
    const { errors, data } = validateService(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const doc = {
      ...data,
      // identity comes from the database, never from the request body
      technicianName: req.dbUser.name,
      technicianEmail: req.dbUser.email,
      approvalStatus: "pending",
      isAvailable: true,
      createdAt: new Date(),
    };

    const services = await col("services");
    const result = await services.insertOne(doc);
    res.status(201).json({ message: "Service submitted for admin approval", _id: result.insertedId });
  } catch (err) {
    next(err);
  }
};

// GET /api/services/my
export const getMyServices = async (req, res, next) => {
  try {
    const services = await col("services");
    const items = await services
      .find({ technicianEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/services/:id  (editing sends the service back to "pending")
export const updateService = async (req, res, next) => {
  try {
    const service = await loadOwnedService(req, res);
    if (!service) return;

    const { errors, data } = validateService(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const services = await col("services");
    await services.updateOne(
      { _id: service._id },
      { $set: { ...data, approvalStatus: "pending", updatedAt: new Date() } }
    );
    res.json({ message: "Service updated and sent for re-approval" });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/services/:id/availability  (does NOT reset approval)
export const toggleAvailability = async (req, res, next) => {
  try {
    const service = await loadOwnedService(req, res);
    if (!service) return;

    if (typeof req.body.isAvailable !== "boolean") {
      return res.status(400).json({ message: "isAvailable must be true or false" });
    }
    const services = await col("services");
    await services.updateOne(
      { _id: service._id },
      { $set: { isAvailable: req.body.isAvailable } }
    );
    res.json({ message: req.body.isAvailable ? "Service is now available" : "Service hidden" });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/services/:id
export const deleteService = async (req, res, next) => {
  try {
    const service = await loadOwnedService(req, res);
    if (!service) return;

    const services = await col("services");
    await services.deleteOne({ _id: service._id });
    res.json({ message: "Service deleted" });
  } catch (err) {
    next(err);
  }
};