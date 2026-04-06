import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";

const execFileAsync = promisify(execFile);

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



export async function predict(input: PredictionInput): Promise<PredictionResult> {
  const scriptPath = path.join(process.cwd(), "server", "ml", "model.py");
  
  try {
    const { stdout } = await execFileAsync("python", [scriptPath, JSON.stringify(input)]);
    const result = JSON.parse(stdout.trim());
    if (result.error) {
      throw new Error(result.error);
    }
    return result as PredictionResult;
  } catch (error: any) {
    throw new Error(`Python prediction failed: ${error.message}`);
  }
}
