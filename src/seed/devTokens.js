import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { col, getDb } from "../config/db.js";

const people = [
  { name: "Test Tech", email: "tech@test.com", role: "technician" },
  { name: "Test Admin", email: "admin@test.com", role: "admin" },
];

const users = await col("user");
for (const p of people) {
  await users.updateOne(
    { email: p.email },
    { $set: { ...p, emailVerified: true, createdAt: new Date() } },
    { upsert: true }
  );
  const token = jwt.sign({ email: p.email, role: p.role }, env.jwtSecret, { expiresIn: "1d" });
  console.log(`\n${p.role.toUpperCase()} TOKEN:\n${token}`);
}
process.exit(0);