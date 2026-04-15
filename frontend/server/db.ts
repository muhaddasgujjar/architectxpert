import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Parse the URL manually so individual options (especially ssl) can never
// be silently overridden by the connection-string parser inside pg.
const _dbUrl = new URL(process.env.DATABASE_URL);

/** Local Postgres does not use TLS; Supabase pooler needs relaxed SSL. */
export function sslForPgHost(hostname: string): false | { rejectUnauthorized: false } {
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
  ssl: sslForPgHost(_dbUrl.hostname),
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis:       30_000,
  max: 10,
});

pool.on("error", (err) => {
  console.error("[db] pool error:", err.message);
});

export const db = drizzle(pool, { schema });
