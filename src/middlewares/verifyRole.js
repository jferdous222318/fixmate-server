import { col } from "../config/db.js";

// 403 = valid user, wrong role.
// The role is re-read from the database, so when an admin changes a role
// it takes effect immediately, even if the user still holds an old token.
const requireRole = (role) => async (req, res, next) => {
  try {
    const users = await col("user"); // BetterAuth's user collection
    const dbUser = await users.findOne({ email: req.user?.email });
    if (!dbUser) return res.status(401).json({ message: "Unauthorized: user not found" });
    if (dbUser.role !== role) {
      return res.status(403).json({ message: `Forbidden: ${role} access only` });
    }
    req.user.role = dbUser.role;
    req.dbUser = dbUser;
    next();
  } catch (err) {
    next(err);
  }
};

export const verifyCustomer = requireRole("customer");
export const verifyTechnician = requireRole("technician");
export const verifyAdmin = requireRole("admin");