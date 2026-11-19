import { ObjectId } from "mongodb";
import { col } from "../config/db.js";

// Saves the payment and marks the booking paid. Safe to call many times
// for the same session: the second call just returns the existing record.
export async function savePaidSession(session) {
  const payments = await col("payments");
  const bookings = await col("bookings");

  const existing = await payments.findOne({ stripeSessionId: session.id });
  if (existing) return existing;

  const booking = await bookings.findOne({ _id: new ObjectId(session.metadata.bookingId) });
  if (!booking) throw new Error("Booking not found for this payment");

  const doc = {
    bookingId: String(booking._id),
    serviceTitle: booking.serviceTitle,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    technicianName: booking.technicianName,
    technicianEmail: booking.technicianEmail,
    amount: session.amount_total / 100,
    currency: "usd",
    transactionId: session.payment_intent,
    stripeSessionId: session.id,
    paymentStatus: "paid",
    paidAt: new Date(),
  };

  try {
    await payments.insertOne(doc);
  } catch (err) {
    // duplicate key: another request (webhook / success page) saved it first
    if (err.code === 11000) return payments.findOne({ stripeSessionId: session.id });
    throw err;
  }

  await bookings.updateOne(
    { _id: booking._id },
    { $set: { paymentStatus: "paid", paidAt: doc.paidAt } }
  );
  return doc;
}