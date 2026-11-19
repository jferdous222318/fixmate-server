import { MongoClient } from "mongodb";
import { env } from "./env.js";

let client;
let db;

export async function getDb() {
  if (db) return db; // cached, important for serverless (Vercel)
  client = new MongoClient(env.mongoUri);
  await client.connect();
  db = client.db(env.dbName);

  await Promise.all([
    db.collection("services").createIndex({ approvalStatus: 1, isAvailable: 1, createdAt: -1 }),
    db.collection("services").createIndex({ technicianEmail: 1 }),
    db.collection("bookings").createIndex({ customerEmail: 1 }),
    db.collection("bookings").createIndex({ technicianEmail: 1 }),
    db.collection("bookings").createIndex({ serviceId: 1, customerEmail: 1 }),
    // guarantees the same Stripe session is never saved twice
    db.collection("payments").createIndex({ stripeSessionId: 1 }, { unique: true }),
  ]);
  return db;
}

export const col = async (name) => (await getDb()).collection(name);