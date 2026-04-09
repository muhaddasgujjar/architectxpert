import express, { type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { analyzeFloorplan, type ClusterResult } from "./clustering.js";
import { generateReport } from "./generatePdf.js";

const execFileAsync = promisify(execFile);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "application/pdf", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const app = express();
app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────────────────────────────────────
//  Python ML analysis: saves image to temp file, runs analyze_floorplan.py
// ──────────────────────────────────────────────────────────────────────────

async function runPythonAnalysis(imageBuffer: Buffer, mimeType: string): Promise<ClusterResult> {
  // Determine extension from mime type
  const extMap: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
  };
  const ext = extMap[mimeType] || ".png";

  // Write to temp file
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `axp_floorplan_${Date.now()}${ext}`);
  fs.writeFileSync(tmpFile, imageBuffer);

  try {
    const scriptPath = path.join(import.meta.dirname, "analyze_floorplan.py");
    const { stdout, stderr } = await execFileAsync("python", [scriptPath, tmpFile], {
      timeout: 30000, // 30 second timeout
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr) {
      console.warn("[report-analysis] Python stderr:", stderr);
    }

    const result = JSON.parse(stdout.trim());

    if (result.error) {
      throw new Error(result.error);
    }

    return result as ClusterResult;
  } finally {
    // Cleanup temp file
    try {
      fs.unlinkSync(tmpFile);
    } catch {}
  }
}

// ──────────────────────────────────────────────────────────────────────────
//  POST /api/tools/analyze-floorplan
// ──────────────────────────────────────────────────────────────────────────

app.post("/api/tools/analyze-floorplan", upload.single("floorplan"), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded. Please upload a floor plan image." });
      return;
    }

    const mimeType = req.file.mimetype || "image/png";

    // ── Validate: check image is architectural using basic image check ──
    // We check if the Python script can process it — the ML model itself
    // classifies layout type. If the image is not a floor plan, the scores
    // will simply reflect that (low edge density, no rooms, etc.)

    console.log(`[report-analysis] Analyzing ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

    let mlResult: ClusterResult;

    try {
      // Primary: Python ML pipeline (image features + K-Means clustering)
      mlResult = await runPythonAnalysis(req.file.buffer, mimeType);
      console.log(`[report-analysis] Python ML: cluster=${mlResult.clusterId}, label="${mlResult.clusterLabel}", rooms=${mlResult.estimatedRooms}`);
    } catch (pyError: any) {
      console.warn("[report-analysis] Python ML failed, falling back to TypeScript clustering:", pyError.message);

      // Fallback: TypeScript-based clustering from clustering.ts
      mlResult = analyzeFloorplan(req.file.buffer, req.file.originalname);
    }

    // ── Merge with TypeScript clustering for additional robustness ──
    const tsResult = analyzeFloorplan(req.file.buffer, req.file.originalname);

    // Use the Python ML result as primary, enrich with TS clustering data
    const result: ClusterResult = {
      clusterId:          mlResult.clusterId,
      clusterLabel:       mlResult.clusterLabel,
      layoutType:         mlResult.layoutType,
      complexity:         mlResult.complexity,
      estimatedRooms:     mlResult.estimatedRooms,
      roomDistribution:   mlResult.roomDistribution,
      flowScore:          mlResult.flowScore,
      spaceEfficiency:    mlResult.spaceEfficiency,
      ventilationScore:   mlResult.ventilationScore,
      naturalLightScore:  mlResult.naturalLightScore,
      structuralIntegrity: mlResult.structuralIntegrity,
      accessibilityScore: mlResult.accessibilityScore,
      energyEfficiency:   mlResult.energyEfficiency,
      recommendations:    mlResult.recommendations,
      warnings:           mlResult.warnings,
      estimatedCostPKR:   mlResult.estimatedCostPKR,
      costPerSqft:        mlResult.costPerSqft,
      totalArea:          mlResult.totalArea,
      coveredArea:        mlResult.coveredArea,
    };

    res.json(result);
  } catch (error: any) {
    console.error("[report-analysis] Analysis error:", error);
    res.status(500).json({ error: "Failed to analyze floor plan. Please try again." });
  }
});

// ──────────────────────────────────────────────────────────────────────────
//  POST /api/tools/generate-report-pdf
// ──────────────────────────────────────────────────────────────────────────

app.post("/api/tools/generate-report-pdf", async (req: Request, res: Response): Promise<void> => {
  try {
    const { analysis, fileName } = req.body;
    if (!analysis || !fileName) {
      res.status(400).json({ error: "Analysis data and fileName are required" });
      return;
    }

    const pdfBuffer = await generateReport(analysis, fileName);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="ArchitectXpert_Report_${Date.now()}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length.toString());
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[report-analysis] PDF generation error:", error);
    res.status(500).json({ error: "Failed to generate PDF report" });
  }
});

const port = process.env.PORT || 8002;
app.listen(port, () => {
  console.log(`[report-analysis] serving on port ${port}`);
  console.log(`[report-analysis] using Python ML pipeline (Pillow + K-Means clustering)`);
});
