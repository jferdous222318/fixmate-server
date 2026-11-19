import { col } from "../config/db.js";

const STATUSES = ["requested", "accepted", "in-progress", "completed", "rejected", "cancelled"];

// [{_id:"completed",count:3}] -> { requested:0, ..., completed:3 }
const toCounts = (rows) => {
  const out = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  rows.forEach((r) => (out[r._id] = r.count));
  return out;
};

const byStatus = (bookings, match) =>
  bookings.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]).toArray();

// payments grouped by month, for line / bar charts
const monthly = (payments, match) =>
  payments
    .aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$paidAt" } }, total: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, month: "$_id", total: 1 } },
    ])
    .toArray();

// GET /api/stats/public  (home page "Why choose us")
export const publicStats = async (req, res, next) => {
  try {
    const [users, services, bookings] = await Promise.all([col("user"), col("services"), col("bookings")]);
    const [technicians, activeServices, completedJobs] = await Promise.all([
      users.countDocuments({ role: "technician" }),
      services.countDocuments({ approvalStatus: "approved", isAvailable: true }),
      bookings.countDocuments({ status: "completed" }),
    ]);
    res.json({ technicians, services: activeServices, completedJobs });
  } catch (err) {
    next(err);
  }
};

// GET /api/stats/customer
export const customerStats = async (req, res, next) => {
  try {
    const [bookings, payments] = await Promise.all([col("bookings"), col("payments")]);
    const email = req.user.email;
    const counts = toCounts(await byStatus(bookings, { customerEmail: email }));

    res.json({
      totalRequests: Object.values(counts).reduce((a, b) => a + b, 0),
      activeJobs: counts.requested + counts.accepted + counts["in-progress"],
      completedJobs: counts.completed,
      statusCounts: counts,
      monthlySpending: await monthly(payments, { customerEmail: email }),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/stats/technician
export const technicianStats = async (req, res, next) => {
  try {
    const [services, bookings, payments] = await Promise.all([
      col("services"), col("bookings"), col("payments"),
    ]);
    const email = req.user.email;
    const counts = toCounts(await byStatus(bookings, { technicianEmail: email }));

    const [totalServices, approvedServices, earnings] = await Promise.all([
      services.countDocuments({ technicianEmail: email }),
      services.countDocuments({ technicianEmail: email, approvalStatus: "approved" }),
      payments.aggregate([
        { $match: { technicianEmail: email } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).toArray(),
    ]);

    res.json({
      totalServices,
      approvedServices,
      pendingRequests: counts.requested,
      totalEarnings: earnings[0]?.total || 0,
      statusCounts: counts,
      monthlyEarnings: await monthly(payments, { technicianEmail: email }),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/stats/admin
export const adminStats = async (req, res, next) => {
  try {
    const [users, services, bookings, payments] = await Promise.all([
      col("user"), col("services"), col("bookings"), col("payments"),
    ]);

    const [totalUsers, totalTechnicians, pendingServices, revenue, statusRows, categories] =
      await Promise.all([
        users.countDocuments({}),
        users.countDocuments({ role: "technician" }),
        services.countDocuments({ approvalStatus: "pending" }),
        payments.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]).toArray(),
        byStatus(bookings, {}),
        services.aggregate([
          { $match: { approvalStatus: "approved" } },
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, category: "$_id", count: 1 } },
        ]).toArray(),
      ]);

    res.json({
      totalUsers,
      totalTechnicians,
      pendingServices,
      totalRevenue: revenue[0]?.total || 0,
      statusCounts: toCounts(statusRows),
      servicesByCategory: categories,
      monthlyRevenue: await monthly(payments, {}),
    });
  } catch (err) {
    next(err);
  }
};