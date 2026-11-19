import { stripe } from "../config/stripe.js";
import { env } from "../config/env.js";
import { savePaidSession } from "../utils/savePayment.js";

// POST /api/payments/webhook  (raw body, verified with the Stripe signature)
export const stripeWebhook = async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw Buffer
      req.headers["stripe-signature"],
      env.stripeWebhookSecret
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.payment_status === "paid") await savePaidSession(session);
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handling failed", err);
    res.status(500).json({ message: "Webhook handler failed" });
  }
};