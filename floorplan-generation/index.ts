import express, { type Request, Response } from "express";
import cors from "cors";
import { generateFloorplanSvg, layoutRooms, generateLocalLayout } from "./floorplanSvg.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/tools/generate-floorplan", async (req: Request, res: Response) => {
  try {
    const { bedrooms, bathrooms, totalArea, floors, style, specialRooms, location } = req.body;

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

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`[floor-plan-generator] serving on port ${port}`);
});
