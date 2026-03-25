interface ModelWeights {
  w1: number[][];
  b1: number[];
  w2: number[][];
  b2: number[];
  w3: number[][];
  b3: number[];
  featureMeans: number[];
  featureStds: number[];
  targetMean: number;
  targetStd: number;
}

function relu(x: number): number {
  return Math.max(0, x);
}

function matmulAddBias(input: number[], weights: number[][], bias: number[]): number[] {
  const output: number[] = [];
  for (let j = 0; j < weights[0].length; j++) {
    let sum = bias[j];
    for (let i = 0; i < input.length; i++) {
      sum += input[i] * weights[i][j];
    }
    output.push(sum);
  }
  return output;
}

function forward(input: number[], weights: ModelWeights): number {
  const normalized = input.map((v, i) => {
    const std = weights.featureStds[i] || 1;
    return (v - weights.featureMeans[i]) / std;
  });

  let h1 = matmulAddBias(normalized, weights.w1, weights.b1).map(relu);
  let h2 = matmulAddBias(h1, weights.w2, weights.b2).map(relu);
  let out = matmulAddBias(h2, weights.w3, weights.b3);

  return out[0] * weights.targetStd + weights.targetMean;
}

let loadedWeights: ModelWeights | null = null;

export function loadWeights(weightsJson: ModelWeights): void {
  loadedWeights = weightsJson;
}

export interface PredictionInput {
  area: number;
  floors: number;
  quality: "standard" | "premium" | "luxury";
  bedrooms: number;
  bathrooms: number;
  hasBasement: boolean;
  hasGarage: boolean;
  locationTier: number;
}

export interface PredictionResult {
  predictedCost: number;
  costPerSqft: number;
  confidenceLow: number;
  confidenceHigh: number;
  breakdown: {
    greyStructure: number;
    finishing: number;
    electrical: number;
    plumbing: number;
    fixtures: number;
  };
  modelInfo: {
    architecture: string;
    trainingDataPoints: number;
    features: string[];
  };
}

export function predict(input: PredictionInput): PredictionResult {
  if (!loadedWeights) throw new Error("Model weights not loaded");

  const features = [
    input.area,
    input.floors,
    input.quality === "standard" ? 1 : 0,
    input.quality === "premium" ? 1 : 0,
    input.quality === "luxury" ? 1 : 0,
    input.bedrooms,
    input.bathrooms,
    input.hasBasement ? 1 : 0,
    input.hasGarage ? 1 : 0,
    input.locationTier,
    input.area * input.floors,
    Math.log(input.area + 1),
  ];

  const rawPrediction = forward(features, loadedWeights);
  const predictedCost = Math.max(0, rawPrediction);

  const variance = 0.12;
  const confidenceLow = Math.round(predictedCost * (1 - variance));
  const confidenceHigh = Math.round(predictedCost * (1 + variance));

  const greyPct = input.quality === "luxury" ? 0.38 : input.quality === "premium" ? 0.42 : 0.48;
  const finishPct = input.quality === "luxury" ? 0.32 : input.quality === "premium" ? 0.28 : 0.22;
  const elecPct = 0.10;
  const plumbPct = 0.08;
  const fixPct = 1 - greyPct - finishPct - elecPct - plumbPct;

  return {
    predictedCost: Math.round(predictedCost),
    costPerSqft: Math.round(predictedCost / (input.area * input.floors)),
    confidenceLow,
    confidenceHigh,
    breakdown: {
      greyStructure: Math.round(predictedCost * greyPct),
      finishing: Math.round(predictedCost * finishPct),
      electrical: Math.round(predictedCost * elecPct),
      plumbing: Math.round(predictedCost * plumbPct),
      fixtures: Math.round(predictedCost * fixPct),
    },
    modelInfo: {
      architecture: "Neural Network (12→16→8→1) with ReLU activation",
      trainingDataPoints: 2000,
      features: [
        "area_sqft", "floors", "quality_standard", "quality_premium", "quality_luxury",
        "bedrooms", "bathrooms", "has_basement", "has_garage", "location_tier",
        "area_x_floors", "log_area",
      ],
    },
  };
}
