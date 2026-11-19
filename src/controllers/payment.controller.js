import { ObjectId } from "mongodb";
import { col } from "../config/db.js";
import { stripe } from "../config/stripe.js";
import { env } from "../config/env.js";
import { savePaidSession } from "../utils/savePayment.js";

// POST /api/payments/create-checkout-session   body: { bookingId }
// Payment gate: booking must be owned by this customer, completed and unpaid.
// The amount ALWAYS comes from the database, never from the client.
export const createCheckoutSession = async (req, res, next) => {
    try {
        const { bookingId } = req.body;
        if (!ObjectId.isValid(bookingId)) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const bookings = await col("bookings");
        const booking = await bookings.findOne({ _id: new ObjectId(bookingId) });
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        if (booking.customerEmail !== req.user.email) {
            return res.status(403).json({ message: "Forbidden: this is not your booking" });
        }
        if (booking.status !== "completed") {
            return res.status(400).json({ message: "You can pay only after the job is completed" });
        }
        if (booking.paymentStatus === "paid") {
            return res.status(400).json({ message: "This booking is already paid" });
        }

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            customer_email: booking.customerEmail,
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: "usd",
                        unit_amount: Math.round(booking.finalAmount * 100),
                        product_data: { name: booking.serviceTitle },
                    },
                },
            ],
            metadata: { bookingId: String(booking._id), customerEmail: booking.customerEmail },
            success_url: `${env.clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${env.clientUrl}/payment/cancel`,
        });

        res.json({ url: session.url });
    } catch (err) {
        next(err);
    }
};

// GET /api/payments/verify?session_id=...
export const verifyPayment = async (req, res, next) => {
    try {
        const { session_id } = req.query;
        if (!session_id) return res.status(400).json({ message: "session_id is required" });

        const session = await stripe.checkout.sessions.retrieve(session_id);
        if (session.metadata?.customerEmail !== req.user.email) {
            return res.status(403).json({ message: "Forbidden: this is not your payment" });
        }
        if (session.payment_status !== "paid") {
            return res.status(400).json({ message: "Payment not completed" });
        }

        const payment = await savePaidSession(session);
        res.json({
            message: "Payment verified",
            amount: payment.amount,
            transactionId: payment.transactionId,
            serviceTitle: payment.serviceTitle,
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/payments/my  (customer payment history)
export const getMyPayments = async (req, res, next) => {
    try {
        const payments = await col("payments");
        const items = await payments
            .find({ customerEmail: req.user.email })
            .sort({ paidAt: -1 })
            .toArray();
        res.json(items);
    } catch (err) {
        next(err);
    }
};