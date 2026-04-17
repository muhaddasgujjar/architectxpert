import express, { type Request, type Response } from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { db } from "./db.js";
import { conversations, messages } from "@architect/shared";
import { eq, desc, and } from "drizzle-orm";

const execFileAsync = promisify(execFile);

const app = express();
app.use(cors());
app.use(express.json());

const openaiApiKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY ||
  "";

const openai = new OpenAI({
  apiKey: openaiApiKey,
  baseURL:
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    undefined,
});

// ─────────────────────────────────────────────────────────────────────────────
//  RAG Engine — calls Python rag_engine.py to retrieve relevant knowledge
// ─────────────────────────────────────────────────────────────────────────────

const RAG_SCRIPT = path.join(import.meta.dirname, "rag_engine.py");
const PY_OPTS = { timeout: 15_000, maxBuffer: 2 * 1024 * 1024 };

async function runPython(args: string[]): Promise<string> {
  try {
    if (process.platform === "win32") {
      const { stdout } = await execFileAsync("py", ["-3", ...args], PY_OPTS);
      return stdout;
    } else {
      const { stdout } = await execFileAsync("python3", args, PY_OPTS);
      return stdout;
    }
  } catch (firstErr: any) {
    if (process.platform === "win32") {
      const { stdout } = await execFileAsync("python", args, PY_OPTS);
      return stdout;
    }
    throw firstErr;
  }
}

interface RagResult {
  system_prompt: string;
  retrieved_chunks: { id: string; category: string; tags: string[] }[];
}

async function buildRagPrompt(
  query: string,
  history: { role: string; content: string }[]
): Promise<RagResult> {
  const inputJson = JSON.stringify({ query, history });
  const stdout = await runPython([RAG_SCRIPT, inputJson]);
  const result = JSON.parse(stdout.trim()) as RagResult & { error?: string };
  if (result.error) {
    throw new Error(`RAG engine error: ${result.error}`);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Auth helpers
// ─────────────────────────────────────────────────────────────────────────────

function requireAuth(req: Request, res: Response): string | null {
  const userId = req.header("x-user-id");
  if (!userId) {
    res.status(401).json({ error: "Unauthorized API Gateway Request" });
    return null;
  }
  return userId;
}

async function verifyConversationOwnership(conversationId: number, userId: string): Promise<boolean> {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
  return !!conv;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Chat Conversations CRUD
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/chat/conversations", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const convs = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));
    res.json(convs);
  } catch {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

app.post("/api/chat/conversations", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { title } = req.body;
    const [conv] = await db
      .insert(conversations)
      .values({ title: title || "New Chat", userId })
      .returning();
    res.status(201).json(conv);
  } catch (error: any) {
    console.error("[floorplan-advisor] create conversation:", error?.message || error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

app.delete("/api/chat/conversations/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }
    const isOwner = await verifyConversationOwnership(id, userId);
    if (!isOwner) { res.status(404).json({ error: "Conversation not found" }); return; }
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

app.get("/api/chat/conversations/:id/messages", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }
    const isOwner = await verifyConversationOwnership(id, userId);
    if (!isOwner) { res.status(404).json({ error: "Conversation not found" }); return; }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json(msgs);
  } catch {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  RAG-Powered Chat  (POST /api/chat/conversations/:id/messages)
// ─────────────────────────────────────────────────────────────────────────────

app.post("/api/chat/conversations/:id/messages", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }

    const isOwner = await verifyConversationOwnership(conversationId, userId);
    if (!isOwner) { res.status(404).json({ error: "Conversation not found" }); return; }

    const { content } = req.body;
    if (!content || typeof content !== "string" || content.length > 5000) {
      res.status(400).json({ error: "Message content is required (max 5000 chars)" });
      return;
    }

    if (!openaiApiKey) {
      res.status(503).json({
        error: "OpenAI API key missing. Set AI_INTEGRATIONS_OPENAI_API_KEY in floorplan-advisor/.env",
      });
      return;
    }

    // 1. Save user message to DB
    await db.insert(messages).values({ conversationId, role: "user", content });

    // 2. Load full conversation history for context
    const existingMsgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    const historyForRag = existingMsgs.map((m) => ({
      role: m.role,
      content: m.content || "",
    }));

    // 3. RAG: retrieve relevant knowledge and build enriched system prompt
    let systemPrompt: string;
    let retrievedChunks: { id: string; category: string }[] = [];

    try {
      const ragResult = await buildRagPrompt(content, historyForRag.slice(-6));
      systemPrompt = ragResult.system_prompt;
      retrievedChunks = ragResult.retrieved_chunks;
      console.log(
        `[floor-plan-advisor] RAG retrieved ${retrievedChunks.length} chunks: ${retrievedChunks.map((c) => c.id).join(", ")}`
      );
    } catch (ragErr: any) {
      // Fallback: use a basic system prompt if RAG engine fails
      console.warn("[floor-plan-advisor] RAG engine failed, using fallback prompt:", ragErr?.message);
      systemPrompt =
        "You are ArchitectXpert AI, a premium architectural assistant specializing in building design, construction materials, cost estimation, and architectural planning for Pakistan. Provide detailed, practical, and accurate advice.";
    }

    // 4. Build chat history for OpenAI
    const chatHistory: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...existingMsgs.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content || "",
      })),
    ];

    // 5. Stream response via SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatHistory,
      stream: true,
      max_tokens: 800,
      temperature: 0.7,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    // 6. Save assistant response to DB
    await db.insert(messages).values({ conversationId, role: "assistant", content: fullResponse });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: "Failed to send message" });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  Architecture Advisor — Python expert system (project analysis)
// ─────────────────────────────────────────────────────────────────────────────

const ADVISOR_SCRIPT = path.join(import.meta.dirname, "architecture_advisor.py");

app.post("/api/tools/architecture-advisor", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { projectType, area, floors, location, budget, style, priorities, description } = req.body;

    if (!projectType || !area) {
      res.status(400).json({ error: "Project type and area are required" });
      return;
    }

    const inputJson = JSON.stringify({
      projectType, area, floors, location, budget, style, priorities, description,
    });

    console.log(`[floor-plan-advisor] Analyzing: ${projectType}, ${area} sqft, ${floors || 1} floors`);

    let stdout: string;
    let stderr: string;
    try {
      if (process.platform === "win32") {
        ({ stdout, stderr } = await execFileAsync("py", ["-3", ADVISOR_SCRIPT, inputJson], PY_OPTS));
      } else {
        ({ stdout, stderr } = await execFileAsync("python3", [ADVISOR_SCRIPT, inputJson], PY_OPTS));
      }
    } catch (firstErr: any) {
      if (process.platform === "win32") {
        ({ stdout, stderr } = await execFileAsync("python", [ADVISOR_SCRIPT, inputJson], PY_OPTS));
      } else {
        throw firstErr;
      }
    }

    if (stderr) {
      console.warn("[floor-plan-advisor] Python stderr:", stderr);
    }

    let result: any;
    try {
      result = JSON.parse(stdout.trim());
    } catch {
      console.error("[floor-plan-advisor] Invalid JSON from Python:", stdout.slice(0, 500));
      res.status(500).json({ error: "Analysis engine returned invalid output" });
      return;
    }

    if (result.error) {
      console.error("[floor-plan-advisor] Python error:", result.error);
      res.status(500).json({ error: result.error || "Analysis engine encountered an error" });
      return;
    }

    console.log(`[floor-plan-advisor] Analysis complete: ${result.design_recommendations?.length || 0} recommendations`);
    res.json(result);
  } catch (error: any) {
    console.error("[floor-plan-advisor] Error:", error?.message || error);
    const hint =
      process.platform === "win32"
        ? " Ensure Python 3 is installed (`py -3` or `python` in PATH)."
        : " Ensure `python3` is installed and on PATH.";
    res.status(500).json({ error: `Failed to generate architectural analysis. ${hint}` });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
const port = process.env.PORT || 8003;
app.listen(port, () => {
  console.log(`[floor-plan-advisor] serving on port ${port}`);
  console.log(`[floor-plan-advisor] RAG-powered chatbot: OpenAI + local knowledge base`);
  console.log(`[floor-plan-advisor] OpenAI key: ${openaiApiKey ? "✓ configured" : "✗ MISSING"}`);
});
