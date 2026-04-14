import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { Express } from "express";
import type { User } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { pool } from "./db";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), buf);
}

declare global {
  namespace Express {
    interface User extends Omit<import("@shared/schema").User, "password"> {}
  }
}

/**
 * Probe the DB with a 3-second timeout BEFORE creating PgSession.
 * connect-pg-simple calls _rawEnsureSessionStoreTable on the first request
 * (not at construction time), so a try/catch around `new PgSession()` is
 * not sufficient — we must test the connection ourselves first.
 */
async function buildSessionStore(): Promise<session.Store> {
  const _url = new URL(process.env.DATABASE_URL!);
  const probe = new Pool({
    host:     _url.hostname,
    port:     parseInt(_url.port || "5432", 10),
    database: _url.pathname.replace(/^\//, ""),
    user:     decodeURIComponent(_url.username),
    password: decodeURIComponent(_url.password),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8_000,
    max: 1,
  });

  try {
    const client = await probe.connect();
    client.release();
    await probe.end();

    const PgSession = connectPgSimple(session);
    const store = new PgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    });
    console.log("[auth] DB reachable — using PostgreSQL session store");
    return store;
  } catch (err: any) {
    await probe.end().catch(() => {});
    console.warn(
      "[auth] DB unreachable, using in-memory session store (sessions won't persist across restarts):",
      err.message
    );
    return new session.MemoryStore();
  }
}

export async function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set");
  }

  const store = await buildSessionStore();

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, { id: user.id, username: user.username, createdAt: user.createdAt });
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, { id: user.id, username: user.username, createdAt: user.createdAt });
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({ username, password: hashedPassword });

      req.login({ id: user.id, username: user.username, createdAt: user.createdAt }, (err) => {
        if (err) return next(err);
        return res.status(201).json({ id: user.id, username: user.username });
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string }) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        return res.json({ id: user.id, username: user.username });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out" });
      });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
}
