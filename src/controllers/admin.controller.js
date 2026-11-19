import { ObjectId } from "mongodb";
import { col } from "../config/db.js";

const ROLES = ["customer", "technician", "admin"];

// BetterAuth may store _id as ObjectId or string, so match both
const userIdFilter = (id) =>
  ObjectId.isValid(id) ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] } : { _id: id };

// GET /api/admin/users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await col("user");
    const items = await users
      .find({}, { projection: { name: 1, email: 1, image: 1, role: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/role
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: "Role must be customer, technician or admin" });
    }

    const users = await col("user");
    const target = await users.findOne(userIdFilter(req.params.id));
    if (!target) return res.status(404).json({ message: "User not found" });

    if (target.email === req.user.email) {
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    await users.updateOne({ _id: target._id }, { $set: { role, updatedAt: new Date() } });
    res.json({ message: `${target.name} is now a ${role}` });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/services?status=pending|approved|rejected  (pending shown first)
export const getAllServices = async (req, res, next) => {
  try {
    const { status } = req.query;
    const match = ["pending", "approved", "rejected"].includes(status)
      ? { approvalStatus: status }
      : {};

    const services = await col("services");
    const items = await services
      .aggregate([
        { $match: match },
        { $addFields: { _order: { $cond: [{ $eq: ["$approvalStatus", "pending"] }, 0, 1] } } },
        { $sort: { _order: 1, createdAt: -1 } },
        { $project: { _order: 0 } },
      ])
      .toArray();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/services/:id/approval
export const updateApproval = async (req, res, next) => {
  try {
    const { approvalStatus } = req.body;
    if (!["approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).json({ message: "approvalStatus must be approved or rejected" });
    }
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Service not found" });
    }

    const services = await col("services");
    const result = await services.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { approvalStatus, reviewedAt: new Date() } }
    );
    if (!result.matchedCount) return res.status(404).json({ message: "Service not found" });

    res.json({ message: `Service ${approvalStatus}` });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/bookings?status=completed
export const getAllBookings = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const bookings = await col("bookings");
    const items = await bookings.find(filter).sort({ createdAt: -1 }).toArray();
    res.json(items);
  } catch (err) {
    next(err);
  }
};