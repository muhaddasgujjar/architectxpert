import express, { type Request, Response } from "express";
import cors from "cors";
import OpenAI from "openai";
import { db } from "./db.js";
import { conversations, messages } from "@architect/shared";
import { eq, desc, and } from "drizzle-orm";

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

function requireAuth(req: Request, res: Response): string | null {
  const userId = req.header("x-user-id");
  if (!userId) {
    res.status(401).json({ error: "Unauthorized API Gateway Request" });
    return null;
  }
  return userId;
}

async function verifyConversationOwnership(conversationId: number, userId: string): Promise<boolean> {
  const [conv] = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
  return !!conv;
}

const SYSTEM_PROMPT = `You are ArchitectXpert AI — a premium architectural assistant specializing in building design...
(Microservice extracted from original routes)`;

app.get("/api/chat/conversations", async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const convs = await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.createdAt));
    res.json(convs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

app.post("/api/chat/conversations", async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { title } = req.body;
    const [conv] = await db.insert(conversations).values({ title: title || "New Chat", userId }).returning();
    res.status(201).json(conv);
  } catch (error) {
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

app.delete("/api/chat/conversations/:id", async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid conversation ID" });
    const isOwner = await verifyConversationOwnership(id, userId);
    if (!isOwner) return res.status(404).json({ error: "Conversation not found" });
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

app.get("/api/chat/conversations/:id/messages", async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid conversation ID" });
    const isOwner = await verifyConversationOwnership(id, userId);
    if (!isOwner) return res.status(404).json({ error: "Conversation not found" });
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
    res.json(msgs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/chat/conversations/:id/messages", async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) return res.status(400).json({ error: "Invalid conversation ID" });
    const isOwner = await verifyConversationOwnership(conversationId, userId);
    if (!isOwner) return res.status(404).json({ error: "Conversation not found" });
    const { content } = req.body;

    if (!content || typeof content !== "string" || content.length > 5000) {
      return res.status(400).json({ error: "Message content is required (max 5000 chars)" });
    }

    await db.insert(messages).values({ conversationId, role: "user", content });

    const existingMsgs = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
    const chatHistory: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
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
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

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

app.post("/api/tools/architecture-advisor", async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { projectType, area, floors, location, budget, style, priorities, description } = req.body;

    if (!projectType || !area) {
      return res.status(400).json({ error: "Project type and area are required" });
    }

    const prompt = `You are ArchitectXpert AI — a world-class architectural advisor specializing in Pakistan's construction market. A client has described their building project. Provide expert analysis and recommendations using Pakistani construction standards, local materials, and PKR (Pakistani Rupees) pricing.

PROJECT DETAILS:
- Building Type: ${projectType}
- Total Area: ${area} sq ft
- Floors: ${floors || "Not specified"}
- Location/Climate: ${location || "Not specified (assume Pakistan)"}
- Budget Range: ${budget || "Not specified"}
- Preferred Style: ${style || "Not specified"}
- Priorities: ${priorities || "Not specified"}
- Additional Notes: ${description || "None"}

Return ONLY valid JSON with exactly 9 specified keys representing overview, recommendations, materials, sustainability, codes, cost breakdown, timeline, risks, and space optimization.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1200,
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    let result: Record<string, any> = {};
    try {
      result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    } catch {
      result = { project_overview: "Analysis could not be completed." };
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate architectural analysis" });
  }
});

const port = process.env.PORT || 8003;
app.listen(port, () => {
  console.log(`[floor-plan-advisor] serving on port ${port}`);
});
