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

export interface MarketInput {
  area_sqft: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  city: string;
  location?: string;
  property_type?: string;
  purpose?: string;
  house_age?: number;
}

export interface MarketResult {
  predictedMarketValue: number;
  marketValueLow: number;
  marketValueHigh: number;
  pricePerSqft: number;
  modelInfo: {
    model: string;
    features: number;
    areaMarla: number;
    areaCategory: string;
  };
}

export async function predictMarketValue(input: MarketInput): Promise<MarketResult> {
  const scriptPath = path.join(import.meta.dirname, "market_model.py");

  try {
    const stdout = await runPythonScript(scriptPath, JSON.stringify(input));
    const result = JSON.parse(stdout.trim());
    if (result.error) {
      throw new Error(result.error);
    }
    return result as MarketResult;
  } catch (error: any) {
    throw new Error(`Market model prediction failed: ${error.message}`);
  }
}
