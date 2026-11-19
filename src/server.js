import app from "./app.js";
import { env } from "./config/env.js";
import { getDb } from "./config/db.js";

getDb()
  .then(() => app.listen(env.port, () => console.log(`FixMate API on :${env.port}`)))
  .catch((e) => {
    console.error("DB connection failed", e);
    process.exit(1);
  });