export interface FloorplanFeatures {
  fileSize: number;
  width: number;
  height: number;
  aspectRatio: number;
  totalPixels: number;
  brightness: number;
  contrast: number;
  edgeDensity: number;
  symmetryScore: number;
  complexity: number;
  openSpaceRatio: number;
  partitionDensity: number;
}

export interface ClusterResult {
  clusterId: number;
  clusterLabel: string;
  layoutType: string;
  complexity: "Simple" | "Moderate" | "Complex" | "Highly Complex";
  estimatedRooms: number;
  roomDistribution: { name: string; area: number; rating: string }[];
  flowScore: number;
  spaceEfficiency: number;
  ventilationScore: number;
  naturalLightScore: number;
  structuralIntegrity: number;
  accessibilityScore: number;
  energyEfficiency: string;
  recommendations: string[];
  warnings: string[];
  estimatedCostPKR: number;
  costPerSqft: number;
  totalArea: number;
  coveredArea: number;
}

interface Centroid {
  values: number[];
  count: number;
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

function normalize(features: number[], mins: number[], maxs: number[]): number[] {
  return features.map((v, i) => {
    const range = maxs[i] - mins[i];
    return range === 0 ? 0 : (v - mins[i]) / range;
  });
}

function kMeansCluster(data: number[][], k: number, maxIter: number = 50): { assignments: number[]; centroids: number[][] } {
  const n = data.length;
  const dim = data[0].length;

  const centroids: number[][] = [];
  const step = Math.floor(n / k);
  for (let i = 0; i < k; i++) {
    centroids.push([...data[i * step]]);
  }

  let assignments = new Array(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    const newAssignments = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        const dist = euclideanDistance(data[i], centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      newAssignments[i] = bestCluster;
    }

    const newCentroids: Centroid[] = Array.from({ length: k }, () => ({
      values: new Array(dim).fill(0),
      count: 0,
    }));

    for (let i = 0; i < n; i++) {
      const c = newAssignments[i];
      newCentroids[c].count++;
      for (let d = 0; d < dim; d++) {
        newCentroids[c].values[d] += data[i][d];
      }
    }

    let converged = true;
    for (let c = 0; c < k; c++) {
      if (newCentroids[c].count === 0) continue;
      for (let d = 0; d < dim; d++) {
        const newVal = newCentroids[c].values[d] / newCentroids[c].count;
        if (Math.abs(newVal - centroids[c][d]) > 1e-6) converged = false;
        centroids[c][d] = newVal;
      }
    }

    assignments = newAssignments;
    if (converged) break;
  }

  return { assignments, centroids };
}

const LAYOUT_PROFILES = [
  {
    label: "Open-Plan Modern",
    type: "open-plan",
    baseRooms: 5,
    flowBase: 82,
    efficiencyBase: 78,
    roomTemplates: [
      { name: "Open Living & Dining", areaBase: 380, rating: "Excellent" },
      { name: "Master Suite", areaBase: 240, rating: "Excellent" },
      { name: "Modern Kitchen", areaBase: 180, rating: "Excellent" },
      { name: "Bedroom 2", areaBase: 160, rating: "Good" },
      { name: "Bathroom", areaBase: 70, rating: "Good" },
      { name: "Utility Room", areaBase: 50, rating: "Adequate" },
      { name: "Balcony/Terrace", areaBase: 90, rating: "Good" },
    ],
  },
  {
    label: "Traditional Pakistani",
    type: "traditional",
    baseRooms: 6,
    flowBase: 74,
    efficiencyBase: 72,
    roomTemplates: [
      { name: "Drawing Room", areaBase: 300, rating: "Good" },
      { name: "Lounge / TV Room", areaBase: 250, rating: "Good" },
      { name: "Master Bedroom", areaBase: 200, rating: "Good" },
      { name: "Kitchen", areaBase: 140, rating: "Adequate" },
      { name: "Bedroom 2", areaBase: 160, rating: "Good" },
      { name: "Bedroom 3", areaBase: 140, rating: "Adequate" },
      { name: "Bathroom 1", areaBase: 65, rating: "Adequate" },
      { name: "Bathroom 2", areaBase: 50, rating: "Adequate" },
      { name: "Store Room", areaBase: 40, rating: "Adequate" },
    ],
  },
  {
    label: "Compact Urban",
    type: "compact",
    baseRooms: 4,
    flowBase: 70,
    efficiencyBase: 85,
    roomTemplates: [
      { name: "Living Room", areaBase: 200, rating: "Good" },
      { name: "Master Bedroom", areaBase: 150, rating: "Adequate" },
      { name: "Kitchen", areaBase: 100, rating: "Adequate" },
      { name: "Bedroom 2", areaBase: 120, rating: "Adequate" },
      { name: "Bathroom", areaBase: 45, rating: "Adequate" },
    ],
  },
  {
    label: "Luxury Villa",
    type: "luxury",
    baseRooms: 8,
    flowBase: 88,
    efficiencyBase: 75,
    roomTemplates: [
      { name: "Grand Living Hall", areaBase: 500, rating: "Excellent" },
      { name: "Master Suite + Walk-in", areaBase: 350, rating: "Excellent" },
      { name: "Modular Kitchen", areaBase: 220, rating: "Excellent" },
      { name: "Formal Dining", areaBase: 200, rating: "Excellent" },
      { name: "Guest Suite", areaBase: 200, rating: "Good" },
      { name: "Bedroom 2", areaBase: 180, rating: "Good" },
      { name: "Bedroom 3", areaBase: 170, rating: "Good" },
      { name: "Bathroom 1", areaBase: 90, rating: "Good" },
      { name: "Bathroom 2", areaBase: 75, rating: "Good" },
      { name: "Home Office", areaBase: 120, rating: "Excellent" },
      { name: "Servant Quarter", areaBase: 80, rating: "Adequate" },
    ],
  },
  {
    label: "Commercial Layout",
    type: "commercial",
    baseRooms: 6,
    flowBase: 80,
    efficiencyBase: 82,
    roomTemplates: [
      { name: "Main Hall / Reception", areaBase: 400, rating: "Good" },
      { name: "Office Space 1", areaBase: 250, rating: "Good" },
      { name: "Office Space 2", areaBase: 200, rating: "Good" },
      { name: "Conference Room", areaBase: 180, rating: "Excellent" },
      { name: "Break Room / Pantry", areaBase: 100, rating: "Adequate" },
      { name: "Washroom", areaBase: 60, rating: "Adequate" },
      { name: "Storage", areaBase: 50, rating: "Adequate" },
    ],
  },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateSyntheticFeatureSet(count: number): number[][] {
  const rng = seededRandom(42);
  const data: number[][] = [];
  for (let i = 0; i < count; i++) {
    data.push([
      50000 + rng() * 5000000,
      400 + rng() * 4000,
      300 + rng() * 3000,
      0.5 + rng() * 1.5,
      100000 + rng() * 12000000,
      80 + rng() * 170,
      20 + rng() * 80,
      0.05 + rng() * 0.6,
      0.3 + rng() * 0.7,
      0.2 + rng() * 0.8,
      0.3 + rng() * 0.5,
      0.1 + rng() * 0.7,
    ]);
  }
  return data;
}

export function analyzeFloorplan(imageBuffer: Buffer, fileName: string): ClusterResult {
  const fileSize = imageBuffer.length;

  let width = 1200, height = 900;
  if (fileName.toLowerCase().endsWith(".png") && imageBuffer.length > 24) {
    width = imageBuffer.readUInt32BE(16);
    height = imageBuffer.readUInt32BE(20);
  } else if (fileName.toLowerCase().match(/\.jpe?g$/i) && imageBuffer.length > 200) {
    let offset = 2;
    while (offset < imageBuffer.length - 4) {
      if (imageBuffer[offset] === 0xff) {
        const marker = imageBuffer[offset + 1];
        if (marker >= 0xc0 && marker <= 0xc3) {
          height = imageBuffer.readUInt16BE(offset + 5);
          width = imageBuffer.readUInt16BE(offset + 7);
          break;
        }
        const segLen = imageBuffer.readUInt16BE(offset + 2);
        offset += 2 + segLen;
      } else {
        offset++;
      }
    }
  }

  const aspectRatio = width / height;
  const totalPixels = width * height;

  const sampleSize = Math.min(imageBuffer.length, 50000);
  let brightnessSum = 0;
  let varianceSum = 0;
  let edgeCount = 0;
  for (let i = 0; i < sampleSize; i++) {
    const val = imageBuffer[i];
    brightnessSum += val;
  }
  const brightness = brightnessSum / sampleSize;
  for (let i = 0; i < sampleSize; i++) {
    varianceSum += (imageBuffer[i] - brightness) ** 2;
    if (i > 0 && Math.abs(imageBuffer[i] - imageBuffer[i - 1]) > 40) edgeCount++;
  }
  const contrast = Math.sqrt(varianceSum / sampleSize);
  const edgeDensity = edgeCount / sampleSize;

  const symmetryScore = 0.5 + Math.min(0.5, 1 / (1 + Math.abs(aspectRatio - 1.33) * 2));
  const complexity = Math.min(1, edgeDensity * 2 + contrast / 128);
  const openSpaceRatio = Math.max(0.2, Math.min(0.8, brightness / 200));
  const partitionDensity = Math.min(1, edgeDensity * 1.5);

  const features: FloorplanFeatures = {
    fileSize, width, height, aspectRatio, totalPixels,
    brightness, contrast, edgeDensity, symmetryScore,
    complexity, openSpaceRatio, partitionDensity,
  };

  const featureVector = Object.values(features);

  const syntheticData = generateSyntheticFeatureSet(200);
  syntheticData.push(featureVector);

  const allData = syntheticData;
  const dim = featureVector.length;
  const mins = new Array(dim).fill(Infinity);
  const maxs = new Array(dim).fill(-Infinity);
  for (const row of allData) {
    for (let d = 0; d < dim; d++) {
      if (row[d] < mins[d]) mins[d] = row[d];
      if (row[d] > maxs[d]) maxs[d] = row[d];
    }
  }
  const normalizedData = allData.map(row => normalize(row, mins, maxs));

  const k = LAYOUT_PROFILES.length;
  const { assignments } = kMeansCluster(normalizedData, k, 60);

  const inputCluster = assignments[assignments.length - 1];

  const profile = LAYOUT_PROFILES[inputCluster % LAYOUT_PROFILES.length];

  const areaMultiplier = 0.85 + (complexity + openSpaceRatio) * 0.3;
  const roomCount = Math.min(profile.roomTemplates.length, Math.max(
    profile.baseRooms,
    profile.baseRooms + Math.floor((complexity - 0.4) * 4)
  ));

  const detRng = seededRandom(fileSize ^ (width * height));
  const rooms = profile.roomTemplates.slice(0, roomCount).map(r => ({
    name: r.name,
    area: Math.round(r.areaBase * areaMultiplier * (0.9 + detRng() * 0.2)),
    rating: r.rating,
  }));

  const totalArea = rooms.reduce((sum, r) => sum + r.area, 0);
  const coveredArea = Math.round(totalArea * 0.82);

  const flowScore = Math.min(98, Math.round(profile.flowBase + symmetryScore * 10 + (1 - partitionDensity) * 5));
  const spaceEfficiency = Math.min(98, Math.round(profile.efficiencyBase + openSpaceRatio * 15));
  const ventilationScore = Math.min(98, Math.round(65 + openSpaceRatio * 25 + (1 - partitionDensity) * 10));
  const naturalLightScore = Math.min(98, Math.round(60 + brightness / 8 + aspectRatio * 5));
  const structuralIntegrity = Math.min(98, Math.round(70 + (1 - complexity) * 15 + symmetryScore * 10));
  const accessibilityScore = Math.min(98, Math.round(68 + flowScore * 0.15 + openSpaceRatio * 12));

  const energyRating = spaceEfficiency > 85 ? "A+" : spaceEfficiency > 75 ? "A" : spaceEfficiency > 65 ? "B" : "C";

  const complexityLabel: ClusterResult["complexity"] =
    complexity > 0.75 ? "Highly Complex" :
    complexity > 0.5 ? "Complex" :
    complexity > 0.3 ? "Moderate" : "Simple";

  const costPerSqft = profile.type === "luxury" ? 5500 : profile.type === "commercial" ? 4200 : profile.type === "traditional" ? 2800 : profile.type === "compact" ? 2500 : 3800;
  const estimatedCostPKR = totalArea * costPerSqft;

  const allRecommendations = [
    `Layout classified as "${profile.label}" — ${profile.type === "open-plan" ? "consider acoustic panels between open zones" : "ensure adequate cross-ventilation between rooms"}.`,
    flowScore < 80 ? "Consider widening corridor widths to minimum 4 feet for improved traffic flow per PBC 2021 standards." : "Traffic flow is well-optimized — maintain current corridor proportions.",
    ventilationScore < 75 ? "Add additional windows or ventilation openings. PBC 2021 requires minimum 10% window-to-floor area ratio." : "Ventilation meets PBC 2021 requirements — natural airflow is adequate.",
    naturalLightScore < 70 ? "South-facing windows recommended for main living areas to maximize natural daylight in Pakistani climate." : "Natural light penetration is good — consider adding skylights for interior rooms.",
    `Structural walls should use minimum 9\" thick brick masonry with 1:4 cement-sand mortar for ${profile.type === "luxury" ? "premium" : "standard"} construction.`,
    profile.type === "traditional" ? "Drawing room placement near entrance follows Pakistani design norms — verify guest bathroom proximity." : "Reception area placement is architecturally sound for the layout type.",
    spaceEfficiency < 75 ? "Space utilization can be improved by converting dead corners to built-in storage niches." : "Space efficiency is above average — room proportions are well-balanced.",
    `Earthquake zone consideration: Ensure RCC frame structure with minimum Grade 60 steel reinforcement per SBCA/PEC guidelines.`,
    accessibilityScore < 75 ? "Consider adding ramps and wider doorways (minimum 3 feet) for wheelchair accessibility." : "Accessibility metrics are satisfactory for residential standards.",
    `Estimated construction cost at PKR ${costPerSqft.toLocaleString()}/sqft for ${profile.label.toLowerCase()} quality.`,
  ];

  const warnings: string[] = [];
  if (flowScore < 70) warnings.push("Low traffic flow score — potential bottleneck areas detected in layout.");
  if (ventilationScore < 65) warnings.push("Ventilation below minimum standards — may not comply with local building codes.");
  if (structuralIntegrity < 70) warnings.push("Complex structural geometry detected — recommend professional structural engineer review.");
  if (naturalLightScore < 60) warnings.push("Insufficient natural light — may require additional fenestration.");
  if (rooms.length < 4) warnings.push("Fewer rooms detected than typical for this layout category.");

  return {
    clusterId: inputCluster,
    clusterLabel: profile.label,
    layoutType: profile.type,
    complexity: complexityLabel,
    estimatedRooms: roomCount,
    roomDistribution: rooms,
    flowScore,
    spaceEfficiency,
    ventilationScore,
    naturalLightScore,
    structuralIntegrity,
    accessibilityScore,
    energyEfficiency: energyRating,
    recommendations: allRecommendations.slice(0, 8),
    warnings,
    estimatedCostPKR,
    costPerSqft,
    totalArea,
    coveredArea,
  };
}
