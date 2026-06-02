/**
 * Chat + Architecture Advisor on the main API gateway.
 *
 * Uses the same Postgres pool and Passport session as the rest of the app
 * (no x-user-id / microservice hop). Keeps paths identical to the old
 * floorplan-advisor service: /api/chat/* and POST /api/tools/architecture-advisor.
 */
import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { eq, desc, and } from "drizzle-orm";
import { db } from "./db";
import { conversations, messages } from "@shared/schema";
import { buildRagContext } from "./rag";

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

function analyzeArchitecture(params: any): any {
  const LOCATION_DATA: Record<string, any> = {
    lahore: { zone: "hot_humid", seismic: 2, label: "Lahore, Punjab" },
    karachi: { zone: "hot_arid_coastal", seismic: 2, label: "Karachi, Sindh" },
    islamabad: { zone: "moderate", seismic: 3, label: "Islamabad" },
    rawalpindi: { zone: "moderate", seismic: 3, label: "Rawalpindi" },
    peshawar: { zone: "hot_arid", seismic: 4, label: "Peshawar, KPK" },
    quetta: { zone: "extreme_arid", seismic: 4, label: "Quetta, Balochistan" },
    multan: { zone: "hot_arid", seismic: 2, label: "Multan, Punjab" },
    faisalabad: { zone: "hot_humid", seismic: 2, label: "Faisalabad, Punjab" },
  };

  const COST_PER_SQFT: Record<string, any> = {
    "Residential Home": { standard: 2800, premium: 4500, luxury: 7000 },
    "Apartment Complex": { standard: 3200, premium: 5000, luxury: 7500 },
    "Commercial Office": { standard: 3500, premium: 5500, luxury: 8000 },
    "Retail Store": { standard: 3000, premium: 4800, luxury: 7200 },
    "Restaurant": { standard: 4000, premium: 6000, luxury: 9000 },
    "Warehouse": { standard: 1800, premium: 2800, luxury: 4000 },
    "Hospital / Clinic": { standard: 5000, premium: 7500, luxury: 12000 },
    "School / University": { standard: 2500, premium: 4000, luxury: 6000 },
    "Hotel": { standard: 4500, premium: 7000, luxury: 11000 },
    "Mixed-Use Development": { standard: 3800, premium: 5800, luxury: 8500 },
  };

  const projectType = params.projectType || "Residential Home";
  const area = Math.max(100, parseInt(String(params.area || 1200).replace(/,/g, "")) || 1200);
  const floors = Math.max(1, parseInt(params.floors) || 1);
  const locationStr = (params.location || "").toLowerCase();
  const style = params.style || "Modern / Contemporary";
  const priorities = params.priorities || "";

  const loc = Object.entries(LOCATION_DATA).find(([k]) => locationStr.includes(k))?.[1]
    || { zone: "hot_humid", seismic: 2, label: params.location || "Pakistan" };

  const tier = "standard";
  const costs = COST_PER_SQFT[projectType] || COST_PER_SQFT["Residential Home"];
  const costSqft = costs[tier];
  const totalCost = area * floors * costSqft;
  const totalArea = area * floors;

  const overview = `This ${projectType.toLowerCase()} project encompasses ${totalArea.toLocaleString()} sq ft across ${floors} floor${floors > 1 ? "s" : ""} in ${loc.label}. Based on the ${tier} construction tier at PKR ${costSqft.toLocaleString()}/sqft, the estimated construction cost is PKR ${totalCost.toLocaleString()} (${totalCost >= 10000000 ? `PKR ${(totalCost / 10000000).toFixed(2)} Crore` : `PKR ${(totalCost / 100000).toFixed(2)} Lac`}). The ${loc.zone.replace(/_/g, " ")} climate zone requires careful attention to thermal insulation, waterproofing, and ventilation. Seismic Zone ${loc.seismic} ${loc.seismic >= 3 ? "requires enhanced structural detailing per PEC Building Code 2021" : "follows standard structural provisions"}.${priorities ? ` Priority areas include ${priorities}.` : ""}`;

  const recs: string[] = [];
  if (projectType.includes("Residential") || projectType.includes("Apartment")) {
    recs.push(
      `Orient the main living areas towards the south-southeast for optimal winter sun exposure in ${loc.label}. North-facing bedrooms stay cooler in summer.`,
      "Implement a 3-foot deep chajja (overhang) on south and west facades to reduce direct solar heat gain by 40-60% during peak summer months.",
      `Design the master bedroom at minimum ${Math.max(180, Math.floor(area / 8))} sqft with an attached bathroom. PBC 2021 recommends minimum 120 sqft for habitable rooms.`,
      "Include a dedicated servant quarter with separate entrance — standard requirement for premium Pakistani residential projects.",
      "Position the kitchen adjacent to the dining area with a service corridor to the main entrance for grocery delivery access.",
    );
  } else {
    recs.push(
      "Design open-plan workspaces with 80-100 sqft per workstation, following international density standards.",
      `Plan for at least ${Math.max(2, Math.floor(area / 2000))} conference rooms of varying sizes.`,
      "Provide dedicated prayer room (minimum 200 sqft) with ablution area — mandatory for commercial buildings in Pakistan.",
      "Install raised access flooring for flexible cable management and future reconfiguration.",
      "Ensure all corridors meet minimum 5-foot width requirement per Pakistan Building Code.",
    );
  }
  if (loc.zone.includes("hot")) recs.push("Install solar reflective roof coating (SRI > 78) to reduce rooftop temperatures by 15-20°C during summers exceeding 45°C.");
  if (loc.seismic >= 3) recs.push(`Seismic Zone ${loc.seismic}: Use moment-resisting RCC frames with detailing per PEC Chapter 21.`);

  const materials = [
    { name: "AAC Blocks (Autoclaved Aerated Concrete)", use: "Walls & Partitions", benefit: "30% lighter than clay bricks, excellent thermal insulation, reduces AC costs by 15-20%." },
    { name: "Grade 60 Steel Reinforcement (ASTM A615)", use: "RCC Framework", benefit: "Higher yield strength means 15% less steel vs Grade 40. PEC approved for seismic zones." },
    { name: "Thermopane Double-Glazed Windows", use: "Fenestration", benefit: "Reduces heat gain by 40% compared to single glazing. Essential for extreme summers." },
    { name: "Dr. Fixit Waterproofing System", use: "Foundation & Roof", benefit: "Prevents 90% of seepage issues in monsoon season. PKR 35-50/sqft applied cost." },
    { name: "Portland Cement (Type-I, OPC)", use: "Foundation & Structure", benefit: "Available from Lucky, DG Khan, Bestway. PKR 1,100-1,350 per 50kg bag." },
  ];

  const sustainability = [
    `Install a ${Math.max(3, Math.floor(area / 400))} kW solar panel system — generates ~${Math.max(3, Math.floor(area / 400)) * 4} kWh/day, offsetting 40-60% electricity costs.`,
    "Implement rainwater harvesting with underground storage — supplies 30% of non-potable water needs.",
    "Use LED lighting throughout (minimum 100 lm/W) with occupancy sensors. Reduces energy by 60%.",
    "Install grey water recycling for irrigation and toilet flushing — reduces water consumption by 35%.",
    "Plant native trees (Neem, Peepal, Amaltas) on boundaries for natural shading.",
  ];

  const codes = [
    `Pakistan Building Code (PBC) 2021: Maximum FAR ${floors <= 2 ? "1.5" : Math.min(3.5, floors * 0.8).toFixed(1)}.`,
    `Seismic Design: Zone ${loc.seismic} — ${loc.seismic >= 3 ? "enhanced ductile detailing required" : "standard provisions apply"}.`,
    `Fire Safety: ${floors > 3 ? "Sprinkler system mandatory for buildings > 3 floors." : "Minimum 2 fire extinguishers per floor."}`,
    `Minimum setbacks: Front ${area > 2000 ? "15 ft" : "10 ft"}, Sides ${area > 1500 ? "5 ft" : "3 ft"}, Back ${area > 2000 ? "8 ft" : "5 ft"}.`,
    "Electrical: Minimum 3-phase connection for buildings > 1,500 sqft. Main DB with MCBs/RCDs per WAPDA standards.",
  ];

  const costBreakdown = projectType.includes("Residential")
    ? { structure: 35, interior: 25, mechanical: 20, exterior: 12, permits_fees: 8 }
    : { structure: 30, interior: 22, mechanical: 26, exterior: 13, permits_fees: 9 };

  const monthsBase = Math.max(6, Math.ceil(totalArea / 800));
  const timeline = `Estimated total duration: ${monthsBase} months. Phase 1 — Design & Approvals: ${Math.max(2, Math.floor(monthsBase / 5))} months. Phase 2 — Foundation & Structure: ${Math.max(3, Math.floor(monthsBase / 3))} months. Phase 3 — Brick Work & Plumbing: ${Math.max(2, Math.floor(monthsBase / 4))} months. Phase 4 — Finishing: ${Math.max(3, Math.floor(monthsBase / 3))} months. Phase 5 — External Works: ${Math.max(1, Math.floor(monthsBase / 6))} months.`;

  const risks = [
    "Material price volatility: Steel/cement prices fluctuate 10-25% annually. Budget 15% contingency.",
    `Load-shedding: 8-12 hours daily power outages typical. Budget for ${area < 2000 ? "5" : "15"} kVA generator.`,
    "Contractor reliability: Verify PEC registration. Obtain performance bonds for projects > PKR 50 lac.",
    "Regulatory delays: Authority approvals may take 2-6 months. Factor into timeline.",
    `Monsoon flooding risk: ${loc.zone.includes("humid") ? "High — ensure plinth level 2ft above road." : "Moderate — standard drainage adequate."}`,
  ];

  return {
    project_overview: overview,
    design_recommendations: recs.slice(0, 8),
    material_suggestions: materials,
    sustainability_tips: sustainability,
    building_codes: codes,
    cost_breakdown: costBreakdown,
    estimated_timeline: timeline,
    risk_factors: risks,
    space_optimization: `For ${area.toLocaleString()} sqft, allocate 25-30% to living/dining, 40-45% to bedrooms, and 25-30% to services (kitchen, bathrooms, circulation). Use service core approach for vertical services.`,
  };
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

      const result = analyzeArchitecture({ projectType, area, floors, location, budget, style, priorities, description });

      console.log(`[gateway:advisor] OK — ${result.design_recommendations?.length || 0} recommendations`);
      res.json(result);
    } catch (e: any) {
      console.error("[gateway:advisor]", e?.message || e);
      res.status(500).json({ error: "Failed to generate architectural analysis." });
    }
  });
}
