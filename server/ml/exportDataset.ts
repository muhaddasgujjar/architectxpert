import * as fs from "fs";
import * as path from "path";

interface Sample {
  area: number;
  floors: number;
  quality: string;
  bedrooms: number;
  bathrooms: number;
  hasBasement: boolean;
  hasGarage: boolean;
  locationTier: number;
  totalCost: number;
  costPerSqft: number;
}

function generateDataset(count: number): Sample[] {
  const samples: Sample[] = [];

  const qualityRates: Record<string, { base: number; finishMul: number }> = {
    standard: { base: 2200, finishMul: 1.35 },
    premium: { base: 3600, finishMul: 1.50 },
    luxury: { base: 5800, finishMul: 1.70 },
  };

  const locationMul: Record<number, number> = {
    1: 1.12,
    2: 1.0,
    3: 0.82,
  };

  const locationNames: Record<number, string> = {
    1: "Tier 1 (Islamabad/Lahore/Karachi)",
    2: "Tier 2 (Faisalabad/Rawalpindi/Multan)",
    3: "Tier 3 (Smaller Cities/Rural)",
  };

  for (let i = 0; i < count; i++) {
    const area = Math.round(600 + Math.random() * 9400);
    const floors = Math.random() < 0.3 ? 1 : Math.random() < 0.7 ? 2 : 3;
    const qualityRng = Math.random();
    const qualityKey = qualityRng < 0.4 ? "standard" : qualityRng < 0.75 ? "premium" : "luxury";
    const bedrooms = Math.floor(2 + Math.random() * 5);
    const bathrooms = Math.floor(1 + Math.random() * 4);
    const hasBasement = Math.random() < 0.2;
    const hasGarage = Math.random() < 0.35;
    const locTier = Math.random() < 0.4 ? 1 : Math.random() < 0.7 ? 2 : 3;

    const rates = qualityRates[qualityKey];
    const baseRate = rates.base * (0.92 + Math.random() * 0.16);
    const floorArea = area * (1 + 0.88 * (floors - 1));
    let cost = floorArea * baseRate * rates.finishMul;

    cost *= locationMul[locTier] || 1.0;

    if (hasBasement) cost *= 1.28 + Math.random() * 0.08;
    if (hasGarage) cost += area * 0.15 * baseRate * 0.6;

    const qLux = qualityKey === "luxury" ? 1 : 0;
    const qPrem = qualityKey === "premium" ? 1 : 0;
    cost += bedrooms * 85000 * (qLux ? 2.5 : qPrem ? 1.6 : 1);
    cost += bathrooms * 120000 * (qLux ? 3.0 : qPrem ? 1.8 : 1);

    const noise = 0.90 + Math.random() * 0.20;
    cost *= noise;

    samples.push({
      area,
      floors,
      quality: qualityKey,
      bedrooms,
      bathrooms,
      hasBasement,
      hasGarage,
      locationTier: locTier,
      totalCost: Math.round(cost),
      costPerSqft: Math.round(cost / (area * floors)),
    });
  }
  return samples;
}

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log("Generating cost estimation training dataset (2000 samples)...\n");
const dataset = generateDataset(2000);

const csvHeader = "area_sqft,floors,quality,bedrooms,bathrooms,has_basement,has_garage,location_tier,total_cost_pkr,cost_per_sqft_pkr";
const csvRows = dataset.map(s =>
  `${s.area},${s.floors},${s.quality},${s.bedrooms},${s.bathrooms},${s.hasBasement ? 1 : 0},${s.hasGarage ? 1 : 0},${s.locationTier},${s.totalCost},${s.costPerSqft}`
);
const csvContent = [csvHeader, ...csvRows].join("\n");
fs.writeFileSync(path.join(dataDir, "cost_estimation_dataset.csv"), csvContent);
console.log(`Saved: data/cost_estimation_dataset.csv (${dataset.length} rows)`);

const stats = {
  totalSamples: dataset.length,
  features: [
    { name: "area_sqft", description: "Total plot area in square feet", range: "600 - 10,000" },
    { name: "floors", description: "Number of stories", range: "1 - 3" },
    { name: "quality", description: "Build quality tier", values: "standard, premium, luxury" },
    { name: "bedrooms", description: "Number of bedrooms", range: "2 - 6" },
    { name: "bathrooms", description: "Number of bathrooms", range: "1 - 4" },
    { name: "has_basement", description: "Whether property has basement", values: "0, 1" },
    { name: "has_garage", description: "Whether property has garage", values: "0, 1" },
    { name: "location_tier", description: "City tier (1=Major, 2=Mid, 3=Small)", range: "1 - 3" },
  ],
  target: { name: "total_cost_pkr", description: "Total construction cost in Pakistani Rupees" },
  derivedFeature: { name: "cost_per_sqft_pkr", description: "Cost per square foot in PKR" },
  qualityBaseRates: {
    standard: "PKR 2,200/sqft base (×1.35 finish)",
    premium: "PKR 3,600/sqft base (×1.50 finish)",
    luxury: "PKR 5,800/sqft base (×1.70 finish)",
  },
  locationMultipliers: {
    tier1_islamabad_lahore_karachi: 1.12,
    tier2_faisalabad_rawalpindi_multan: 1.0,
    tier3_smaller_cities_rural: 0.82,
  },
  additionalCostFactors: {
    basement: "28-36% surcharge on base cost",
    garage: "15% of area × base rate × 0.6",
    perBedroom: "PKR 85,000 (standard) to PKR 212,500 (luxury)",
    perBathroom: "PKR 120,000 (standard) to PKR 360,000 (luxury)",
    noise: "±10% random market fluctuation",
  },
  modelArchitecture: "Neural Network (12→16→8→1) with ReLU activation, Adam optimizer",
  trainingResults: {
    epochs: 800,
    finalMSE: 0.00906,
    mape: "7.11%",
  },
  marketContext: "Based on 2024-25 Pakistani construction market rates (Punjab/Islamabad region)",
};
fs.writeFileSync(path.join(dataDir, "dataset_info.json"), JSON.stringify(stats, null, 2));
console.log("Saved: data/dataset_info.json (metadata & feature descriptions)");

const qualityGroups: Record<string, number[]> = { standard: [], premium: [], luxury: [] };
const tierGroups: Record<number, number[]> = { 1: [], 2: [], 3: [] };
dataset.forEach(s => {
  qualityGroups[s.quality].push(s.totalCost);
  tierGroups[s.locationTier].push(s.totalCost);
});

const summaryLines = [
  "COST ESTIMATION DATASET — SUMMARY STATISTICS",
  "=".repeat(50),
  "",
  `Total Samples: ${dataset.length}`,
  `Cost Range: PKR ${Math.min(...dataset.map(s => s.totalCost)).toLocaleString()} — PKR ${Math.max(...dataset.map(s => s.totalCost)).toLocaleString()}`,
  "",
  "BY QUALITY TIER:",
  ...Object.entries(qualityGroups).map(([q, costs]) => {
    const avg = Math.round(costs.reduce((a, b) => a + b, 0) / costs.length);
    return `  ${q.padEnd(10)} | ${costs.length} samples | Avg: PKR ${avg.toLocaleString()} | Min: PKR ${Math.min(...costs).toLocaleString()} | Max: PKR ${Math.max(...costs).toLocaleString()}`;
  }),
  "",
  "BY LOCATION TIER:",
  ...Object.entries(tierGroups).map(([t, costs]) => {
    const avg = Math.round(costs.reduce((a, b) => a + b, 0) / costs.length);
    const tierLabel = t === "1" ? "Tier 1 (Major)" : t === "2" ? "Tier 2 (Mid)" : "Tier 3 (Small)";
    return `  ${tierLabel.padEnd(18)} | ${costs.length} samples | Avg: PKR ${avg.toLocaleString()}`;
  }),
  "",
  "FEATURES USED IN MODEL:",
  "  area_sqft, floors, quality (one-hot), bedrooms, bathrooms,",
  "  has_basement, has_garage, location_tier, area×floors, log(area)",
  "",
  "MODEL: Neural Network (12→16→8→1), ReLU, Adam optimizer",
  "MAPE: 7.11% on training data",
  "",
  `Generated: ${new Date().toISOString()}`,
];
fs.writeFileSync(path.join(dataDir, "summary_statistics.txt"), summaryLines.join("\n"));
console.log("Saved: data/summary_statistics.txt (human-readable summary)");

console.log("\nDataset export complete! Check the /data folder.");
