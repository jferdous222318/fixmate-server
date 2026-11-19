import Stripe from "stripe";
import { env } from "./env.js";

export const stripe = new Stripe(env.stripeKey || "sk_test_placeholder");