import express, { type Request, type Response } from "express";
import cors from "cors";
import { predict } from "./model.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/tools/predict-cost", async (req: Request, res: Response): Promise<void> => {
  try {
    const { area, floors, quality, bedrooms, bathrooms, hasBasement, hasGarage, locationTier } = req.body;

    const validQualities = ["standard", "premium", "luxury"];
    const numArea = Number(area);
    const numFloors = Number(floors);
    const numBedrooms = Number(bedrooms);
    const numBathrooms = Number(bathrooms);
    const numLocation = Number(locationTier);

    if (!numArea || numArea < 100 || numArea > 100000) {
      res.status(400).json({ error: "Area must be between 100 and 100,000 sq ft" });
      return;
    }
    if (!numFloors || numFloors < 1 || numFloors > 5) {
      res.status(400).json({ error: "Floors must be between 1 and 5" });
      return;
    }
    if (!validQualities.includes(quality)) {
      res.status(400).json({ error: "Quality must be standard, premium, or luxury" });
      return;
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
      res.status(500).json({ error: "Model returned invalid prediction" });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error("ML prediction error:", error);
    res.status(500).json({ error: "Failed to predict cost" });
  }
});

const port = process.env.PORT || 8001;
app.listen(port, () => {
  console.log(`[cost-analyzer] serving on port ${port}`);
});

