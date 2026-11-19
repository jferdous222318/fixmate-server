import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";
import serviceRoutes from "./routes/service.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import { stripeWebhook } from "./controllers/webhook.controller.js";

const app = express();

const allowed = [env.clientUrl, "http://localhost:3000"];
app.use(
    cors({
        origin: (origin, cb) =>
            !origin || allowed.includes(origin) ? cb(null, true) : cb(new Error("CORS blocked")),
        credentials: true,
    })
);

// RAW body, must come BEFORE express.json()
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json());

app.get("/", (req, res) => res.json({ app: "FixMate API", status: "ok" }));

app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;