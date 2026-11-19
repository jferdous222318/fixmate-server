import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// 401 = no token / invalid token / expired token
export const verifyToken = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: token missing" });
    }
    try {
        const decoded = jwt.verify(header.split(" ")[1], env.jwtSecret);
        req.user = { email: decoded.email, role: decoded.role };
        next();
    } catch {
        return res.status(401).json({ message: "Unauthorized: invalid or expired token" });
    }
};