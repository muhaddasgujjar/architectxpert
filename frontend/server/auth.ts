import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { Express, Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { pool, sslForPgHost } from "./db";

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
    interface User {
      id: string;
      fullName: string;
      email: string;
      role: string;
      isVerified: boolean;
      createdAt: Date | null;
    }
  }
}

function sanitizeUser(user: any) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
}

async function buildSessionStore(): Promise<session.Store> {
  const _url = new URL(process.env.DATABASE_URL!);
  const probe = new Pool({
    host: _url.hostname,
    port: parseInt(_url.port || "5432", 10),
    database: _url.pathname.replace(/^\//, ""),
    user: decodeURIComponent(_url.username),
    password: decodeURIComponent(_url.password),
    ssl: sslForPgHost(_url.hostname),
    connectionTimeoutMillis: 15_000,
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
    console.warn("[auth] DB unreachable, using in-memory session store:", err.message);
    return new session.MemoryStore();
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if ((req.user as any).role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
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
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }
          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, sanitizeUser(user));
        } catch (err) {
          return done(err);
        }
      }
    )
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
      done(null, sanitizeUser(user));
    } catch (err) {
      done(err);
    }
  });

  // ─── Register ─────────────────────────────────────────────────────────────

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { fullName, email, password } = req.body;

      if (!fullName || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (fullName.trim().length < 2) {
        return res.status(400).json({ message: "Full name must be at least 2 characters" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
      });

      req.login(sanitizeUser(user), (err) => {
        if (err) return next(err);
        return res.status(201).json(sanitizeUser(user));
      });
    } catch (err) {
      next(err);
    }
  });

  // ─── Login ────────────────────────────────────────────────────────────────

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string }) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        return res.json(user);
      });
    })(req, res, next);
  });

  // ─── Logout ───────────────────────────────────────────────────────────────

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

  // ─── Get Current User ─────────────────────────────────────────────────────

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // ─── Forgot Password ──────────────────────────────────────────────────────

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal whether user exists
        return res.json({ message: "If an account exists with this email, a reset link has been sent." });
      }

      const resetToken = randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.updateUser(user.id, { resetToken, resetTokenExpiry });

      // In production, send email with reset link
      // For now, log the token (development mode)
      console.log(`[auth] Password reset token for ${email}: ${resetToken}`);
      console.log(`[auth] Reset link: ${process.env.APP_URL || 'http://localhost:5000'}/auth/reset-password?token=${resetToken}`);

      res.json({ message: "If an account exists with this email, a reset link has been sent." });
    } catch (err) {
      console.error("[auth] forgot-password error:", err);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ─── Reset Password ───────────────────────────────────────────────────────

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      res.json({ message: "Password has been reset successfully. You can now sign in." });
    } catch (err) {
      console.error("[auth] reset-password error:", err);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ─── Change Password (authenticated) ─────────────────────────────────────

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req.user as any).id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValid = await comparePasswords(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashedPassword });

      res.json({ message: "Password changed successfully" });
    } catch (err) {
      console.error("[auth] change-password error:", err);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ─── Admin Routes ─────────────────────────────────────────────────────────

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers.map(u => sanitizeUser(u)));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Role must be 'user' or 'admin'" });
      }

      const updated = await storage.updateUser(id, { role });
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(sanitizeUser(updated));
    } catch (err) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const requesterId = (req.user as any).id;

      if (id === requesterId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(id);
      res.json({ message: "User deleted" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
}
