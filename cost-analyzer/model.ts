import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";

const execFileAsync = promisify(execFile);

const PY_OPTS = { maxBuffer: 12 * 1024 * 1024, timeout: 45_000 };

async function runPythonScript(scriptPath: string, jsonArg: string): Promise<string> {
  if (process.platform === "win32") {
    try {
      const { stdout } = await execFileAsync("py", ["-3", scriptPath, jsonArg], PY_OPTS);
      return stdout;
    } catch {
      const { stdout } = await execFileAsync("python", [scriptPath, jsonArg], PY_OPTS);
      return stdout;
    }
  }
  try {
    const { stdout } = await execFileAsync("python3", [scriptPath, jsonArg], PY_OPTS);
    return stdout;
  } catch {
    const { stdout } = await execFileAsync("python", [scriptPath, jsonArg], PY_OPTS);
    return stdout;
  }
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



export async function predict(input: PredictionInput): Promise<PredictionResult> {
  const scriptPath = path.join(import.meta.dirname, "model.py");

  try {
    const stdout = await runPythonScript(scriptPath, JSON.stringify(input));
    const result = JSON.parse(stdout.trim());
    if (result.error) {
      throw new Error(result.error);
    }
    return result as PredictionResult;
  } catch (error: any) {
    throw new Error(`Python prediction failed: ${error.message}`);
  }
}
