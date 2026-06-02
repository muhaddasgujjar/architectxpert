import express, { type Request, Response } from "express";
import cors from "cors";
import OpenAI from "openai";
import { generateFloorplanDxf, generateFloorplanSvg, layoutRooms, generateLocalLayout } from "./floorplanSvg.js";

// ─── AI Clients ─────────────────────────────────────────────────────────────

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function engineerPrompt(params: {
  bedrooms: number;
  bathrooms: number;
  area: number;
  floors: number;
  style: string;
  city: string;
  extras: string[];
  description: string;
}): Promise<string> {
  const { bedrooms, bathrooms, area, floors, style, city, extras, description } = params;
  const specialRooms = extras.length > 0 ? `Special rooms: ${extras.join(", ")}.` : "";
  const userDescription = description ? `\nAdditional requirements from user: "${description}"` : "";

  const plotWidth = Math.round(Math.sqrt(area * 0.6));
  const plotDepth = Math.round(area / plotWidth);

  const systemPrompt = `You are an expert Pakistani architectural floor plan prompt engineer. You produce prompts for an AI image generator that MUST output floor plans identical in style to professional "naqsha" drawings used by Pakistani architects and engineers.

CRITICAL STYLE REQUIREMENTS (the output image MUST look like this):
- Pure white background, NO gray, NO gradient, NO texture
- THICK solid black walls (wall thickness ~6-8 inches at scale)
- ALL rooms labeled in BOLD uppercase English text (e.g., "BED ROOM", "KITCHEN", "T.V LOUNGE", "DRAWING", "BATH", "PORCH")
- Dimension lines with measurements in FEET and INCHES format (e.g., 14', 11', 8'-3", 13'-6¾")
- Door swings shown as quarter-circle arcs
- Stairs shown with parallel lines and "UP" arrow
- Windows shown as double-line breaks in walls
- Title at bottom: "GROUND FLOOR PLAN" (or "FIRST FLOOR PLAN" for upper floors)
- If the house has a car porch/garage, draw a TOP-DOWN outline of a car (simple sedan shape from above) parked inside the porch area
- NO colors, NO shading, NO 3D effects, NO perspective
- NO people, NO trees, NO landscaping outside the plan
- Strictly 2D top-down orthographic architectural blueprint
- Black lines on white background ONLY — like a printed construction drawing
- The floor plan must FILL the entire image canvas edge-to-edge with minimal margins (like a full-page architectural print)

PAKISTANI LAYOUT CONVENTIONS:
- Drawing room (guest reception) near front entrance, separated from private areas
- Kitchen at rear with service entrance/open area
- T.V Lounge as family living area, distinct from drawing room
- Car porch at front if plot > 5 marla — ALWAYS draw a top-down car outline (sedan from above) parked inside
- Stairs in central location for multi-story
- Bathrooms attached to bedrooms where possible
- PWD (powder room / half bath) near drawing room for guests
- Servant quarter at rear or separate from main areas

CRITICAL RULES:
- EXACT room count: if spec says 3 bedrooms, draw EXACTLY 3 bedrooms, NOT more, NOT fewer
- EXACT bathroom count: match the specification precisely
- CORRECT SPELLING: "BED ROOM", "KITCHEN", "BATHROOM", "T.V LOUNGE", "DRAWING", "PORCH", "CAR PORCH" — no typos
- The plan must fill the ENTIRE image canvas edge-to-edge (minimal white margins)
- Include "GROUND FLOOR PLAN" title clearly visible at the bottom

Output ONLY the image generation prompt. No explanations, no markdown, no prefixes.`;

  const userMsg = `Generate a professional Pakistani architectural floor plan prompt:

Specifications:
- Bedrooms: EXACTLY ${bedrooms} (not more, not fewer)
- Bathrooms: EXACTLY ${bathrooms} (not more, not fewer)
- Plot Size: approximately ${plotWidth}' × ${plotDepth}' (${area} sq ft total)
- Floors: ${floors} (generate ground floor plan)
- Style: ${style}
- City: ${city}, Pakistan
${specialRooms}${userDescription}

MANDATORY in prompt: thick black walls on pure white background, room labels in BOLD uppercase with CORRECT spelling, feet-inch dimensions on EVERY wall, door swing arcs, car outline drawn in porch/garage. Plan fills entire image edge-to-edge. "GROUND FLOOR PLAN" title at bottom. Professional Pakistani naqsha style.`;

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        temperature: 0.4,
        max_tokens: 700,
      }),
    });

    if (!response.ok) throw new Error(`Groq returned ${response.status}`);
    const data = await response.json() as any;
    const engineered = data.choices?.[0]?.message?.content?.trim() || "";

    const suffix = ` Style: professional Pakistani architectural construction drawing (naqsha). Pure white background, thick black walls, bold room labels in English, dimension annotations in feet-inches, door swing arcs, staircase with UP arrow, top-down car outline in porch/garage area. NO colors, NO shading, NO 3D, NO perspective. The floor plan MUST fill the entire image from edge to edge like a full-page architectural print with minimal margins. Top-down 2D orthographic floor plan blueprint.`;
    return engineered + suffix;
  } catch (err) {
    console.error("[prompt-engineer] Groq failed, using fallback:", err);
    return `Professional 2D architectural floor plan, top-down orthographic view, Pakistani naqsha construction drawing style. ${bedrooms} bedrooms, ${bathrooms} bathrooms, ${area} sq ft plot (approximately ${plotWidth}' x ${plotDepth}'). ${floors} floor(s), ${style} style, ${city} Pakistan. ${specialRooms} ${userDescription} Pure white background, thick solid black walls, bold uppercase room labels (BED ROOM, KITCHEN, T.V LOUNGE, DRAWING, BATH, PORCH), dimension lines with feet-inch measurements on every wall, door swing arcs as quarter circles, staircase with parallel lines and UP arrow, windows as double-line breaks. Title "GROUND FLOOR PLAN" at bottom. NO furniture, NO colors, NO shading, NO 3D perspective. Black lines on white only.`;
  }
}

// ─── App ─────────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// ─── Input validation helper ─────────────────────────────────────────────────

function validateFloorplanInput(body: any) {
  const numBedrooms = Math.min(Math.max(Number(body.bedrooms) || 3, 1), 8);
  const numBathrooms = Math.min(Math.max(Number(body.bathrooms) || 2, 1), 6);
  const numArea = Math.min(Math.max(Number(body.totalArea) || 1800, 400), 20000);
  const numFloors = Math.min(Math.max(Number(body.floors) || 1, 1), 3);
  const extras = Array.isArray(body.specialRooms) ? body.specialRooms : [];
  const houseStyle = body.style || "Modern";
  const city = body.location || "Lahore";
  const description = typeof body.description === "string" ? body.description.slice(0, 500) : "";

  return { numBedrooms, numBathrooms, numArea, numFloors, extras, houseStyle, city, description };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.post("/api/tools/generate-floorplan", async (req: Request, res: Response) => {
  const t0 = Date.now();

  try {
    const { numBedrooms, numBathrooms, numArea, numFloors, extras, houseStyle, city } = validateFloorplanInput(req.body);

    const rawLayout = generateLocalLayout(numBedrooms, numBathrooms, numArea, extras);
    rawLayout.style = houseStyle;
    rawLayout.floors = numFloors;
    const positionedRooms = layoutRooms(rawLayout);
    const pkrCost = rawLayout.costEstimatePKR || 0;
    const lac = (pkrCost / 100000).toFixed(1);
    const svg = generateFloorplanSvg(positionedRooms, rawLayout);

    res.json({
      svg,
      image_format: "svg",
      source: "algorithmic_svg",
      confidence: 0.3,
      rooms: rawLayout.rooms,
      totalArea: rawLayout.totalArea || numArea,
      bedroom_count: numBedrooms,
      bathroom_count: numBathrooms,
      special_rooms: extras,
      floors: numFloors,
      style: houseStyle,
      location: city,
      costEstimatePKR: pkrCost,
      costFormatted: `PKR ${lac} Lac`,
      generation_time_ms: Date.now() - t0,
      layoutNotes: rawLayout.layoutNotes || "",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[generate-floorplan] error:`, error);
    res.status(500).json({ error: "Failed to generate floor plan. Please try again." });
  }
});

// ─── ArchitectXpert Pro Generation ──────────────────────────────────────────

app.post("/api/tools/generate-floorplan-pro", async (req: Request, res: Response) => {
  const t0 = Date.now();

  try {
    const { numBedrooms, numBathrooms, numArea, numFloors, extras, houseStyle, city, description } = validateFloorplanInput(req.body);
    const { quality = "high", size = "1024x1536" } = req.body;

    const validSizes = ["1024x1024", "1024x1536", "1536x1024"] as const;
    const imageSize = validSizes.includes(size) ? size : "1024x1536";
    const imageQuality = (["low", "medium", "high"].includes(quality) ? quality : "high") as "low" | "medium" | "high";

    const prompt = await engineerPrompt({
      bedrooms: numBedrooms,
      bathrooms: numBathrooms,
      area: numArea,
      floors: numFloors,
      style: houseStyle,
      city,
      extras,
      description,
    });

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: imageSize,
      quality: imageQuality,
    });

    const imageData = response.data[0];
    if (!imageData?.b64_json) {
      res.status(500).json({ error: "Generation failed — model returned no output" });
      return;
    }

    const b64 = imageData.b64_json;
    const [widthStr, heightStr] = imageSize.split("x");

    res.json({
      image_base64: b64,
      image_format: "png",
      image_width: parseInt(widthStr),
      image_height: parseInt(heightStr),
      source: "architectxpert_pro",
      confidence: 0.92,
      rooms: [],
      totalArea: numArea,
      bedroom_count: numBedrooms,
      bathroom_count: numBathrooms,
      special_rooms: extras,
      floors: numFloors,
      style: houseStyle,
      location: city,
      quality: imageQuality,
      costEstimatePKR: 0,
      costFormatted: "",
      generation_time_ms: Date.now() - t0,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error("[generate-floorplan-pro] error:", msg);

    if (msg.includes("Incorrect API key") || msg.includes("invalid_api_key")) {
      res.status(500).json({ error: "ArchitectXpert Pro: API key not configured. Contact administrator." });
    } else if (msg.includes("billing") || msg.includes("quota") || msg.includes("insufficient_quota")) {
      res.status(500).json({ error: "ArchitectXpert Pro: Usage limit reached. Please try again later." });
    } else if (msg.includes("content_policy") || msg.includes("safety")) {
      res.status(400).json({ error: "ArchitectXpert Pro: Request was filtered. Please adjust your parameters." });
    } else {
      res.status(500).json({ error: "ArchitectXpert Pro generation failed. Please try again." });
    }
  }
});

// ─── DXF Export ──────────────────────────────────────────────────────────────

app.post("/api/tools/generate-floorplan-dxf", async (req: Request, res: Response) => {
  try {
    const { numBedrooms, numBathrooms, numArea, numFloors, extras, houseStyle } = validateFloorplanInput(req.body);

    const rawLayout = generateLocalLayout(numBedrooms, numBathrooms, numArea, extras);
    rawLayout.style = houseStyle;
    rawLayout.floors = numFloors;
    const positionedRooms = layoutRooms(rawLayout);
    const dxf = generateFloorplanDxf(positionedRooms, rawLayout);

    const filename = `ArchitectXpert_FloorPlan_${Date.now()}.dxf`;
    res.setHeader("Content-Type", "application/dxf; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(dxf);
  } catch (error) {
    console.error("[generate-floorplan-dxf] error:", error);
    res.status(500).json({ error: "Failed to export DXF. Please try again." });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`[floor-plan-generator] serving on port ${port}`);
});
