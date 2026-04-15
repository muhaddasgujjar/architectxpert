import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@architect/shared";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Copy frontend/.env or run with: tsx --env-file=../frontend/.env index.ts",
  );
}

// Match frontend/server/db.ts — Supabase pooler + SSL hostname quirks
const _dbUrl = new URL(process.env.DATABASE_URL);

function sslForPgHost(hostname: string): false | { rejectUnauthorized: false } {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return false;
  return { rejectUnauthorized: false };
}

export const pool = new Pool({
  host:     _dbUrl.hostname,
  port:     parseInt(_dbUrl.port || "5432", 10),
  database: _dbUrl.pathname.replace(/^\//, ""),
  user:     decodeURIComponent(_dbUrl.username),
  password: decodeURIComponent(_dbUrl.password),
  ssl:      sslForPgHost(_dbUrl.hostname),
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis:       30_000,
  max: 10,
});

pool.on("error", (err) => {
  console.error("[floorplan-advisor db] pool error:", err.message);
});

export const db = drizzle(pool, { schema });
