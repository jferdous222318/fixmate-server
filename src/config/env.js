import "dotenv/config";

const required = ["MONGODB_URI", "JWT_SECRET", "CLIENT_URL"];
for (const key of required) {
  if (!process.env[key]) console.warn(`[env] Missing ${key}`);
}

export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI,
  dbName: process.env.DB_NAME || "fixmate",
  jwtSecret: process.env.JWT_SECRET,
  clientUrl: process.env.CLIENT_URL,
  stripeKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};