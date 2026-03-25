import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import OpenAI from "openai";
import { db } from "./db";
import { conversations, messages } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { predict } from "./ml/model";
import { analyzeFloorplan } from "./ml/clustering";
import { generateReport } from "./ml/generatePdf";
import { generateFloorplanSvg, layoutRooms, generateLocalLayout, type FloorplanSpec } from "./ml/floorplanSvg";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "application/pdf", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function requireAuth(req: Request, res: Response): string | null {
  const userId = (req.user as any)?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

async function verifyConversationOwnership(conversationId: number, userId: string): Promise<boolean> {
  const [conv] = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
  return !!conv;
}

const SYSTEM_PROMPT = `You are ArchitectXpert AI — a premium architectural assistant specializing in building design, floorplan generation, construction, interior design, structural engineering, building codes, zoning, materials, cost estimation, sustainability (LEED/green building), urban planning, and all architecture-related topics.

STRICT RULES:
1. ONLY answer questions related to architecture, buildings, construction, interior design, structural engineering, urban planning, real estate development, building materials, building codes/regulations, sustainability in construction, floorplan design, cost estimation, and the ArchitectXpert platform.
2. If a user asks about ANY unrelated topic (sports, celebrities, cooking, programming unrelated to architecture, politics, entertainment, personal questions, etc.), respond EXACTLY with: "I'm ArchitectXpert AI, specialized exclusively in architecture and building design. I can help you with floorplans, construction planning, material selection, cost estimation, building codes, and more. Please ask me something related to architecture or building design."
3. Be professional, knowledgeable, and provide detailed architectural insights.
4. When discussing floorplans, reference room dimensions, flow efficiency, natural lighting, ventilation, and accessibility.
5. For cost estimation, consider location factors, material grades, labor costs, and market conditions.
6. Cite building codes (IBC, IRC) and standards (ADA, ASHRAE) when relevant.
7. Format responses with clear headings, bullet points, and structured information when appropriate.
8. Use markdown formatting for better readability.

You represent the ArchitectXpert platform — an AI-powered architectural floorplan generation and analysis tool.`;



export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  app.get("/api/chat/conversations", async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const convs = await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.createdAt));
      res.json(convs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/chat/conversations", async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
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
          content: m.content,
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
      console.error("Chat error:", error);
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

IMPORTANT CONTEXT:
- All costs and material prices must be in PKR (Pakistani Rupees) at current 2024-25 market rates
- Reference Pakistani building codes (PBC 2021, NBC Pakistan) and relevant local regulations (LDA, CDA, KDA, etc.)
- Suggest materials commonly available in Pakistan (e.g., OPC cement, Ravi/Chenab sand, Sargodha stone, local marble, T-iron girders, etc.)
- Use Pakistani construction terminology where appropriate (marla, kanal, thekedar, etc.)

Return ONLY valid JSON with these exact keys:
{
  "project_overview": "A 2-sentence summary of the project scope and vision, referencing Pakistani context.",
  "design_recommendations": ["Array of exactly 4 specific design recommendations suitable for Pakistani climate and construction practices"],
  "material_suggestions": [{"name": "Material name (Pakistani market)", "use": "Where to use it", "benefit": "Why this material, with approximate PKR rate"}] (exactly 4 items),
  "sustainability_tips": ["Array of exactly 3 green building / energy efficiency recommendations relevant to Pakistan's climate"],
  "building_codes": ["Array of 3 relevant building code considerations (PBC 2021, NBC Pakistan, LDA/CDA/KDA bylaws, seismic zone requirements)"],
  "cost_breakdown": {"structure": 30, "interior": 25, "mechanical": 20, "exterior": 15, "permits_fees": 10} (approximate percentage breakdown totaling 100),
  "estimated_timeline": "Estimated project timeline from design to completion in Pakistani construction context",
  "risk_factors": ["Array of exactly 3 potential risks or challenges specific to building in Pakistan"],
  "space_optimization": "A paragraph on how to optimize the layout for Pakistan's climate — cross ventilation, natural light, privacy considerations, courtyard usage"
}`;

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
        result = {
          project_overview: "Analysis could not be completed.",
          design_recommendations: [],
          material_suggestions: [],
          sustainability_tips: [],
          building_codes: [],
          cost_breakdown: {},
          estimated_timeline: "N/A",
          risk_factors: [],
          space_optimization: "N/A",
        };
      }

      res.json(result);
    } catch (error) {
      console.error("Architecture advisor error:", error);
      res.status(500).json({ error: "Failed to generate architectural analysis" });
    }
  });

  app.post("/api/tools/analyze-floorplan", upload.single("floorplan"), async (req: Request, res: Response) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded. Please upload a floor plan image." });
      }

      const base64Image = req.file.buffer.toString("base64");
      const mimeType = req.file.mimetype || "image/png";

      const validationResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an architectural image validator. Determine if the uploaded image is an architectural floor plan, blueprint, site plan, building layout, or architectural drawing. 
            
Respond ONLY with a JSON object (no markdown):
{"isArchitectural": true/false, "reason": "brief explanation", "confidence": 0.0-1.0}

Architectural images include: floor plans, blueprints, site plans, building layouts, elevation drawings, section drawings, architectural sketches of buildings/rooms, CAD drawings, construction plans.

NOT architectural: selfies, notes, handwriting, screenshots of code, food photos, landscapes, animals, random objects, text documents, memes, social media posts.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Is this image an architectural floor plan or building drawing?" },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.1,
      });

      let validation;
      try {
        const rawText = validationResponse.choices[0]?.message?.content || "";
        const jsonStr = rawText.replace(/```json\n?|\n?```/g, "").trim();
        validation = JSON.parse(jsonStr);
      } catch {
        validation = { isArchitectural: false, reason: "Could not validate image", confidence: 0 };
      }

      if (!validation.isArchitectural) {
        return res.status(400).json({
          error: "not_architectural",
          message: `This doesn't appear to be an architectural floor plan. ${validation.reason}. Please upload a floor plan, blueprint, or architectural drawing.`,
        });
      }

      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert Pakistani architectural analyst. Analyze the floor plan image and return a detailed JSON analysis.

You MUST respond with ONLY a valid JSON object (no markdown, no backticks). Use these exact fields:

{
  "layoutType": "open-plan" | "traditional" | "compact" | "luxury" | "commercial",
  "layoutLabel": "descriptive label like Open-Plan Modern, Traditional Pakistani, etc.",
  "complexity": "Simple" | "Moderate" | "Complex" | "Highly Complex",
  "rooms": [{"name": "Room Name", "area": estimated_sqft_number, "rating": "Excellent" | "Good" | "Adequate"}],
  "totalArea": total_sqft_number,
  "coveredArea": covered_sqft_number,
  "flowScore": 0-100,
  "spaceEfficiency": 0-100,
  "ventilationScore": 0-100,
  "naturalLightScore": 0-100,
  "structuralIntegrity": 0-100,
  "accessibilityScore": 0-100,
  "energyEfficiency": "A+" | "A" | "B" | "C",
  "estimatedCostPerSqft": number_in_PKR,
  "recommendations": ["recommendation 1", "recommendation 2", ...max 8],
  "warnings": ["warning 1", ...if any]
}

Important Pakistani construction context:
- Cost rates: Standard PKR 2,500/sqft, Premium PKR 3,800/sqft, Luxury PKR 5,500/sqft
- Reference Pakistani building codes: PBC 2021, LDA/CDA regulations
- Marla/Kanal system: 5 Marla ≈ 1125 sqft, 10 Marla ≈ 2250 sqft, 1 Kanal ≈ 4500 sqft
- Consider local materials: brick masonry, RCC frame, Grade 60 steel
- Reference SBCA/PEC guidelines for structural recommendations
- Be realistic about room sizes and areas based on what you see in the image
- Score fairly — don't inflate scores. If layout has issues, reflect them.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this architectural floor plan in detail. Identify all rooms, estimate areas, score the layout, and provide Pakistani market cost estimates and recommendations." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      let aiAnalysis;
      try {
        const rawText = analysisResponse.choices[0]?.message?.content || "";
        const jsonStr = rawText.replace(/```json\n?|\n?```/g, "").trim();
        aiAnalysis = JSON.parse(jsonStr);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI analysis. Please try again." });
      }

      const totalArea = aiAnalysis.totalArea || aiAnalysis.rooms?.reduce((s: number, r: any) => s + (r.area || 0), 0) || 0;
      const costPerSqft = aiAnalysis.estimatedCostPerSqft || 3000;
      const estimatedCostPKR = totalArea * costPerSqft;

      const clusterFeatures = analyzeFloorplan(req.file.buffer, req.file.originalname);

      const result = {
        clusterId: clusterFeatures.clusterId,
        clusterLabel: aiAnalysis.layoutLabel || aiAnalysis.layoutType || clusterFeatures.clusterLabel,
        layoutType: aiAnalysis.layoutType || clusterFeatures.layoutType,
        complexity: aiAnalysis.complexity || clusterFeatures.complexity,
        estimatedRooms: aiAnalysis.rooms?.length || clusterFeatures.estimatedRooms,
        roomDistribution: aiAnalysis.rooms || clusterFeatures.roomDistribution,
        flowScore: aiAnalysis.flowScore ?? clusterFeatures.flowScore,
        spaceEfficiency: aiAnalysis.spaceEfficiency ?? clusterFeatures.spaceEfficiency,
        ventilationScore: aiAnalysis.ventilationScore ?? clusterFeatures.ventilationScore,
        naturalLightScore: aiAnalysis.naturalLightScore ?? clusterFeatures.naturalLightScore,
        structuralIntegrity: aiAnalysis.structuralIntegrity ?? clusterFeatures.structuralIntegrity,
        accessibilityScore: aiAnalysis.accessibilityScore ?? clusterFeatures.accessibilityScore,
        energyEfficiency: aiAnalysis.energyEfficiency || clusterFeatures.energyEfficiency,
        recommendations: aiAnalysis.recommendations || clusterFeatures.recommendations,
        warnings: aiAnalysis.warnings || clusterFeatures.warnings,
        estimatedCostPKR,
        costPerSqft,
        totalArea,
        coveredArea: aiAnalysis.coveredArea || Math.round(totalArea * 0.82),
      };

      res.json(result);
    } catch (error: any) {
      console.error("Floorplan analysis error:", error);
      if (error?.status === 429) {
        return res.status(429).json({ error: "Rate limit reached. Please wait a moment and try again." });
      }
      res.status(500).json({ error: "Failed to analyze floor plan" });
    }
  });

  app.post("/api/tools/generate-report-pdf", async (req: Request, res: Response) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      const { analysis, fileName } = req.body;
      if (!analysis || !fileName) {
        return res.status(400).json({ error: "Analysis data and fileName are required" });
      }

      const pdfBuffer = await generateReport(analysis, fileName);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="ArchitectXpert_Report_${Date.now()}.pdf"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate PDF report" });
    }
  });

  app.post("/api/tools/predict-cost", async (req: Request, res: Response) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      const { area, floors, quality, bedrooms, bathrooms, hasBasement, hasGarage, locationTier } = req.body;

      const validQualities = ["standard", "premium", "luxury"];
      const numArea = Number(area);
      const numFloors = Number(floors);
      const numBedrooms = Number(bedrooms);
      const numBathrooms = Number(bathrooms);
      const numLocation = Number(locationTier);

      if (!numArea || numArea < 100 || numArea > 100000) {
        return res.status(400).json({ error: "Area must be between 100 and 100,000 sq ft" });
      }
      if (!numFloors || numFloors < 1 || numFloors > 5) {
        return res.status(400).json({ error: "Floors must be between 1 and 5" });
      }
      if (!validQualities.includes(quality)) {
        return res.status(400).json({ error: "Quality must be standard, premium, or luxury" });
      }

      const result = await predict({
        area: numArea,
        floors: numFloors,
        quality: quality as "standard" | "premium" | "luxury",
        bedrooms: Math.min(Math.max(numBedrooms || 3, 1), 10),
        bathrooms: Math.min(Math.max(numBathrooms || 2, 1), 8),
        hasBasement: Boolean(hasBasement),
        hasGarage: Boolean(hasGarage),
        locationTier: Math.min(Math.max(numLocation || 2, 1), 3),
      });

      if (!isFinite(result.predictedCost) || result.predictedCost <= 0) {
        return res.status(500).json({ error: "Model returned invalid prediction" });
      }

      res.json(result);
    } catch (error) {
      console.error("ML prediction error:", error);
      res.status(500).json({ error: "Failed to predict cost" });
    }
  });

  app.post("/api/tools/generate-floorplan", async (req: Request, res: Response) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      const { bedrooms, bathrooms, totalArea, floors, style, specialRooms, plotSize, location, quality } = req.body;

      const numBedrooms = Math.min(Math.max(Number(bedrooms) || 3, 1), 8);
      const numBathrooms = Math.min(Math.max(Number(bathrooms) || 2, 1), 6);
      const numArea = Math.min(Math.max(Number(totalArea) || 1800, 400), 20000);
      const numFloors = Math.min(Math.max(Number(floors) || 1, 1), 3);
      const extras = Array.isArray(specialRooms) ? specialRooms : [];
      const houseStyle = style || "Modern";
      const city = location || "Lahore";

      const rawLayout = generateLocalLayout(numBedrooms, numBathrooms, numArea, extras);
      rawLayout.style = houseStyle;
      rawLayout.floors = numFloors;

      const positionedRooms = layoutRooms(rawLayout);
      const svg = generateFloorplanSvg(positionedRooms, rawLayout);

      const pkrCost = rawLayout.costEstimatePKR || 0;
      const lac = (pkrCost / 100000).toFixed(1);

      res.json({
        svg,
        rooms: rawLayout.rooms,
        totalArea: rawLayout.totalArea || numArea,
        floors: numFloors,
        style: houseStyle,
        location: city,
        costEstimatePKR: pkrCost,
        costFormatted: `PKR ${lac} Lac`,
        layoutNotes: rawLayout.layoutNotes || "",
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Floorplan generation error:", error);
      res.status(500).json({ error: "Failed to generate floor plan. Please try again." });
    }
  });

  return httpServer;
}
