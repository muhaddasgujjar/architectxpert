import express, { type Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import { analyzeFloorplan } from "./clustering.js";
import { generateReport } from "./generatePdf.js";

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
});

const app = express();
app.use(cors());
app.use(express.json());

// Note: Removing the user auth check for the microservice temporarily, as auth is handled by the API Gateway
app.post("/api/tools/analyze-floorplan", upload.single("floorplan"), async (req: Request, res: Response) => {
  try {
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
          {"isArchitectural": true/false, "reason": "brief explanation", "confidence": 0.0-1.0}`
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
          content: `You are an expert Pakistani architectural analyst. Analyze the floor plan image and return a detailed JSON analysis.`
          // NOTE: Kept short for brevity since this is an extracted microservice. The exact prompt will be here.
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
    if (error?.status === 429) {
      return res.status(429).json({ error: "Rate limit reached. Please wait a moment and try again." });
    }
    res.status(500).json({ error: "Failed to analyze floor plan" });
  }
});

app.post("/api/tools/generate-report-pdf", async (req: Request, res: Response) => {
  try {
    const { analysis, fileName } = req.body;
    if (!analysis || !fileName) {
      return res.status(400).json({ error: "Analysis data and fileName are required" });
    }

    const pdfBuffer = await generateReport(analysis, fileName);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="ArchitectXpert_Report_${Date.now()}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length.toString());
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate PDF report" });
  }
});

const port = process.env.PORT || 8002;
app.listen(port, () => {
  console.log(`[report-analysis] serving on port ${port}`);
});
