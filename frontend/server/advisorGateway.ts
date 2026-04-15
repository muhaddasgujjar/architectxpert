/**
 * Chat + Architecture Advisor on the main API gateway.
 *
 * Uses the same Postgres pool and Passport session as the rest of the app
 * (no x-user-id / microservice hop). Keeps paths identical to the old
 * floorplan-advisor service: /api/chat/* and POST /api/tools/architecture-advisor.
 */
import type { Express, Request, Response } from "express";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";
import { eq, desc, and } from "drizzle-orm";
import { db } from "./db";
import { conversations, messages } from "@shared/schema";
import { buildRagContext } from "./rag";

const execFileAsync = promisify(execFile);

const SYSTEM_PROMPT = `You are ArchitectXpert AI — a premium architectural assistant specializing in building design, construction methods, and building codes in Pakistan. Give concise, practical answers. Prefer bullet points when listing options.

When "Retrieved knowledge" sections are provided, ground factual claims in them and mention when something is general guidance versus project-specific.`;

const openaiApiKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY ||
  "";

const openai = new OpenAI({
  apiKey: openaiApiKey || "missing",
  baseURL:
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    undefined,
});

function scriptPath(): string {
  const base =
    typeof import.meta.dirname !== "undefined"
      ? import.meta.dirname
      : path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
  return path.resolve(base, "..", "..", "floorplan-advisor", "architecture_advisor.py");
}

function requireSessionUser(req: Request, res: Response): string | null {
  if (typeof req.isAuthenticated !== "function" || !req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const u = req.user as { id?: string } | undefined;
  if (!u?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return u.id;
}

async function verifyConversationOwnership(
  conversationId: number,
  userId: string,
): Promise<boolean> {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
  return !!conv;
}

async function runArchitecturePython(inputJson: string): Promise<{ stdout: string; stderr: string }> {
  const pyScript = scriptPath();
  const pyOpts = { timeout: 25_000, maxBuffer: 5 * 1024 * 1024 };
  if (process.platform === "win32") {
    try {
      return await execFileAsync("py", ["-3", pyScript, inputJson], pyOpts);
    } catch {
      return await execFileAsync("python", [pyScript, inputJson], pyOpts);
    }
  }
  return await execFileAsync("python3", [pyScript, inputJson], pyOpts);
}

export function registerAdvisorGatewayRoutes(app: Express): void {
  // ── Chat ──────────────────────────────────────────────────────────────

  app.get("/api/chat/conversations", async (req: Request, res: Response) => {
    try {
      const userId = requireSessionUser(req, res);
      if (!userId) return;
      const convs = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.createdAt));
      res.json(convs);
    } catch (e: any) {
      console.error("[gateway:chat] list:", e?.message || e);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/chat/conversations", async (req: Request, res: Response) => {
    try {
      const userId = requireSessionUser(req, res);
      if (!userId) return;
      const { title } = req.body ?? {};
      const [conv] = await db
        .insert(conversations)
        .values({ title: (typeof title === "string" && title) || "New Chat", userId })
        .returning();
      res.status(201).json(conv);
    } catch (e: any) {
      console.error("[gateway:chat] create:", e?.message || e);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/chat/conversations/:id", async (req: Request, res: Response) => {
    try {
      const userId = requireSessionUser(req, res);
      if (!userId) return;
      const raw = req.params.id;
      const id = parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: "Invalid conversation ID" });
        return;
      }
      const ok = await verifyConversationOwnership(id, userId);
      if (!ok) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      await db.delete(messages).where(eq(messages.conversationId, id));
      await db.delete(conversations).where(eq(conversations.id, id));
      res.status(204).send();
    } catch (e: any) {
      console.error("[gateway:chat] delete:", e?.message || e);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.get("/api/chat/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const userId = requireSessionUser(req, res);
      if (!userId) return;
      const raw = req.params.id;
      const id = parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: "Invalid conversation ID" });
        return;
      }
      const ok = await verifyConversationOwnership(id, userId);
      if (!ok) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(messages.createdAt);
      res.json(msgs);
    } catch (e: any) {
      console.error("[gateway:chat] messages get:", e?.message || e);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const userId = requireSessionUser(req, res);
      if (!userId) return;
      const raw = req.params.id;
      const conversationId = parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
      if (Number.isNaN(conversationId)) {
        res.status(400).json({ error: "Invalid conversation ID" });
        return;
      }
      const ok = await verifyConversationOwnership(conversationId, userId);
      if (!ok) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      const { content } = req.body ?? {};
      if (!content || typeof content !== "string" || content.length > 5000) {
        res.status(400).json({ error: "Message content is required (max 5000 chars)" });
        return;
      }
      if (!openaiApiKey) {
        res.status(503).json({
          error:
            "OpenAI API key missing. Set AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY in frontend/.env",
        });
        return;
      }

      await db.insert(messages).values({ conversationId, role: "user", content });

      const existingMsgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

      const ragBlock = await buildRagContext(content, openai);
      const systemContent = ragBlock
        ? `${SYSTEM_PROMPT}\n\n## Retrieved knowledge\n${ragBlock}`
        : SYSTEM_PROMPT;

      const chatHistory: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemContent },
        ...existingMsgs.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content || "",
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: chatHistory,
        stream: true,
        max_tokens: 500,
        temperature: 0.7,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const piece = chunk.choices[0]?.delta?.content || "";
        if (piece) {
          fullResponse += piece;
          res.write(`data: ${JSON.stringify({ content: piece })}\n\n`);
        }
      }

      await db.insert(messages).values({ conversationId, role: "assistant", content: fullResponse });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (e: any) {
      console.error("[gateway:chat] stream:", e?.message || e);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  // ── Architecture advisor (Python) ─────────────────────────────────────

  app.post("/api/tools/architecture-advisor", async (req: Request, res: Response) => {
    try {
      const userId = requireSessionUser(req, res);
      if (!userId) return;

      const { projectType, area, floors, location, budget, style, priorities, description } = req.body ?? {};

      if (!projectType || !area) {
        res.status(400).json({ error: "Project type and area are required" });
        return;
      }

      const inputJson = JSON.stringify({
        projectType,
        area,
        floors,
        location,
        budget,
        style,
        priorities,
        description,
      });

      console.log(`[gateway:advisor] Analyzing: ${projectType}, ${area} sqft, ${floors || 1} floors`);

      const { stdout, stderr } = await runArchitecturePython(inputJson);
      if (stderr) console.warn("[gateway:advisor] Python stderr:", stderr);

      let result: any;
      try {
        result = JSON.parse(stdout.trim());
      } catch {
        console.error("[gateway:advisor] Invalid JSON:", stdout.slice(0, 400));
        res.status(500).json({ error: "Analysis engine returned invalid output" });
        return;
      }
      if (result.error) {
        console.error("[gateway:advisor] Python error:", result.error);
        res.status(500).json({ error: result.error || "Analysis engine encountered an error" });
        return;
      }
      console.log(
        `[gateway:advisor] OK — ${result.design_recommendations?.length || 0} recommendations`,
      );
      res.json(result);
    } catch (e: any) {
      console.error("[gateway:advisor]", e?.message || e);
      const hint =
        process.platform === "win32"
          ? " Ensure Python 3 is installed (`py -3` or `python` in PATH)."
          : " Ensure `python3` is on PATH.";
      res.status(500).json({ error: `Failed to generate architectural analysis.${hint}` });
    }
  });
}
