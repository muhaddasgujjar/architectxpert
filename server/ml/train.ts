import * as fs from "fs";
import * as path from "path";

interface Sample {
  features: number[];
  target: number;
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

  for (let i = 0; i < count; i++) {
    const area = 600 + Math.random() * 9400;
    const floors = Math.random() < 0.3 ? 1 : Math.random() < 0.7 ? 2 : 3;
    const qualityRng = Math.random();
    const qualityKey = qualityRng < 0.4 ? "standard" : qualityRng < 0.75 ? "premium" : "luxury";
    const qStd = qualityKey === "standard" ? 1 : 0;
    const qPrem = qualityKey === "premium" ? 1 : 0;
    const qLux = qualityKey === "luxury" ? 1 : 0;
    const bedrooms = Math.floor(2 + Math.random() * 5);
    const bathrooms = Math.floor(1 + Math.random() * 4);
    const hasBasement = Math.random() < 0.2 ? 1 : 0;
    const hasGarage = Math.random() < 0.35 ? 1 : 0;
    const locTier = Math.random() < 0.4 ? 1 : Math.random() < 0.7 ? 2 : 3;

    const rates = qualityRates[qualityKey];
    const baseRate = rates.base * (0.92 + Math.random() * 0.16);
    const floorArea = area * (1 + 0.88 * (floors - 1));
    let cost = floorArea * baseRate * rates.finishMul;

    cost *= locationMul[locTier] || 1.0;

    if (hasBasement) cost *= 1.28 + Math.random() * 0.08;
    if (hasGarage) cost += area * 0.15 * baseRate * 0.6;

    cost += bedrooms * 85000 * (qLux ? 2.5 : qPrem ? 1.6 : 1);
    cost += bathrooms * 120000 * (qLux ? 3.0 : qPrem ? 1.8 : 1);

    const noise = 0.90 + Math.random() * 0.20;
    cost *= noise;

    const features = [
      area, floors, qStd, qPrem, qLux,
      bedrooms, bathrooms, hasBasement, hasGarage, locTier,
      area * floors,
      Math.log(area + 1),
    ];

    samples.push({ features, target: cost });
  }
  return samples;
}

function trainModel(data: Sample[]) {
  const inputDim = 12;
  const h1Dim = 16;
  const h2Dim = 8;
  const outputDim = 1;

  const featureMeans = new Array(inputDim).fill(0);
  const featureStds = new Array(inputDim).fill(0);
  for (const s of data) {
    for (let i = 0; i < inputDim; i++) featureMeans[i] += s.features[i];
  }
  for (let i = 0; i < inputDim; i++) featureMeans[i] /= data.length;
  for (const s of data) {
    for (let i = 0; i < inputDim; i++) {
      featureStds[i] += (s.features[i] - featureMeans[i]) ** 2;
    }
  }
  for (let i = 0; i < inputDim; i++) featureStds[i] = Math.sqrt(featureStds[i] / data.length) || 1;

  let targetMean = 0;
  for (const s of data) targetMean += s.target;
  targetMean /= data.length;
  let targetStd = 0;
  for (const s of data) targetStd += (s.target - targetMean) ** 2;
  targetStd = Math.sqrt(targetStd / data.length) || 1;

  const normData = data.map(s => ({
    features: s.features.map((v, i) => (v - featureMeans[i]) / featureStds[i]),
    target: (s.target - targetMean) / targetStd,
  }));

  function initWeight(rows: number, cols: number): number[][] {
    const scale = Math.sqrt(2.0 / rows);
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale)
    );
  }

  let w1 = initWeight(inputDim, h1Dim);
  let b1 = new Array(h1Dim).fill(0);
  let w2 = initWeight(h1Dim, h2Dim);
  let b2 = new Array(h2Dim).fill(0);
  let w3 = initWeight(h2Dim, outputDim);
  let b3 = new Array(outputDim).fill(0);

  const mW1 = initWeight(inputDim, h1Dim).map(r => r.map(() => 0));
  const vW1 = initWeight(inputDim, h1Dim).map(r => r.map(() => 0));
  const mB1 = new Array(h1Dim).fill(0);
  const vB1 = new Array(h1Dim).fill(0);
  const mW2 = initWeight(h1Dim, h2Dim).map(r => r.map(() => 0));
  const vW2 = initWeight(h1Dim, h2Dim).map(r => r.map(() => 0));
  const mB2 = new Array(h2Dim).fill(0);
  const vB2 = new Array(h2Dim).fill(0);
  const mW3 = initWeight(h2Dim, outputDim).map(r => r.map(() => 0));
  const vW3 = initWeight(h2Dim, outputDim).map(r => r.map(() => 0));
  const mB3 = new Array(outputDim).fill(0);
  const vB3 = new Array(outputDim).fill(0);

  const lr = 0.001;
  const beta1 = 0.9, beta2 = 0.999, eps = 1e-8;
  const epochs = 800;
  const batchSize = 64;
  let t = 0;

  function adamUpdate(
    param: number[][], grad: number[][], m: number[][], v: number[][]
  ) {
    for (let i = 0; i < param.length; i++) {
      for (let j = 0; j < param[i].length; j++) {
        m[i][j] = beta1 * m[i][j] + (1 - beta1) * grad[i][j];
        v[i][j] = beta2 * v[i][j] + (1 - beta2) * grad[i][j] ** 2;
        const mHat = m[i][j] / (1 - beta1 ** t);
        const vHat = v[i][j] / (1 - beta2 ** t);
        param[i][j] -= lr * mHat / (Math.sqrt(vHat) + eps);
      }
    }
  }

  function adamUpdate1D(param: number[], grad: number[], m: number[], v: number[]) {
    for (let i = 0; i < param.length; i++) {
      m[i] = beta1 * m[i] + (1 - beta1) * grad[i];
      v[i] = beta2 * v[i] + (1 - beta2) * grad[i] ** 2;
      const mHat = m[i] / (1 - beta1 ** t);
      const vHat = v[i] / (1 - beta2 ** t);
      param[i] -= lr * mHat / (Math.sqrt(vHat) + eps);
    }
  }

  for (let epoch = 0; epoch < epochs; epoch++) {
    const shuffled = [...normData].sort(() => Math.random() - 0.5);
    let epochLoss = 0;

    for (let bStart = 0; bStart < shuffled.length; bStart += batchSize) {
      const batch = shuffled.slice(bStart, bStart + batchSize);
      t++;

      const gW1 = w1.map(r => r.map(() => 0));
      const gB1 = new Array(h1Dim).fill(0);
      const gW2 = w2.map(r => r.map(() => 0));
      const gB2 = new Array(h2Dim).fill(0);
      const gW3 = w3.map(r => r.map(() => 0));
      const gB3 = new Array(outputDim).fill(0);

      for (const sample of batch) {
        const x = sample.features;

        const z1 = new Array(h1Dim).fill(0);
        for (let j = 0; j < h1Dim; j++) {
          z1[j] = b1[j];
          for (let i = 0; i < inputDim; i++) z1[j] += x[i] * w1[i][j];
        }
        const a1 = z1.map(v => Math.max(0, v));

        const z2 = new Array(h2Dim).fill(0);
        for (let j = 0; j < h2Dim; j++) {
          z2[j] = b2[j];
          for (let i = 0; i < h1Dim; i++) z2[j] += a1[i] * w2[i][j];
        }
        const a2 = z2.map(v => Math.max(0, v));

        const z3 = new Array(outputDim).fill(0);
        for (let j = 0; j < outputDim; j++) {
          z3[j] = b3[j];
          for (let i = 0; i < h2Dim; i++) z3[j] += a2[i] * w3[i][j];
        }

        const error = z3[0] - sample.target;
        epochLoss += error ** 2;

        const dZ3 = [error / batch.length];
        for (let i = 0; i < h2Dim; i++) {
          for (let j = 0; j < outputDim; j++) {
            gW3[i][j] += a2[i] * dZ3[j];
          }
        }
        for (let j = 0; j < outputDim; j++) gB3[j] += dZ3[j];

        const dA2 = new Array(h2Dim).fill(0);
        for (let i = 0; i < h2Dim; i++) {
          for (let j = 0; j < outputDim; j++) dA2[i] += w3[i][j] * dZ3[j];
        }
        const dZ2 = dA2.map((v, i) => z2[i] > 0 ? v : 0);

        for (let i = 0; i < h1Dim; i++) {
          for (let j = 0; j < h2Dim; j++) {
            gW2[i][j] += a1[i] * dZ2[j];
          }
        }
        for (let j = 0; j < h2Dim; j++) gB2[j] += dZ2[j];

        const dA1 = new Array(h1Dim).fill(0);
        for (let i = 0; i < h1Dim; i++) {
          for (let j = 0; j < h2Dim; j++) dA1[i] += w2[i][j] * dZ2[j];
        }
        const dZ1 = dA1.map((v, i) => z1[i] > 0 ? v : 0);

        for (let i = 0; i < inputDim; i++) {
          for (let j = 0; j < h1Dim; j++) {
            gW1[i][j] += x[i] * dZ1[j];
          }
        }
        for (let j = 0; j < h1Dim; j++) gB1[j] += dZ1[j];
      }

      adamUpdate(w1, gW1, mW1, vW1);
      adamUpdate1D(b1, gB1, mB1, vB1);
      adamUpdate(w2, gW2, mW2, vW2);
      adamUpdate1D(b2, gB2, mB2, vB2);
      adamUpdate(w3, gW3, mW3, vW3);
      adamUpdate1D(b3, gB3, mB3, vB3);
    }

    epochLoss /= normData.length;
    if (epoch % 100 === 0) {
      console.log(`Epoch ${epoch}: MSE = ${epochLoss.toFixed(6)}`);
    }
  }

  let finalMSE = 0;
  for (const s of normData) {
    const z1 = new Array(h1Dim).fill(0);
    for (let j = 0; j < h1Dim; j++) {
      z1[j] = b1[j];
      for (let i = 0; i < inputDim; i++) z1[j] += s.features[i] * w1[i][j];
    }
    const a1 = z1.map(v => Math.max(0, v));
    const z2 = new Array(h2Dim).fill(0);
    for (let j = 0; j < h2Dim; j++) {
      z2[j] = b2[j];
      for (let i = 0; i < h1Dim; i++) z2[j] += a1[i] * w2[i][j];
    }
    const a2 = z2.map(v => Math.max(0, v));
    const z3 = b3[0];
    let pred = z3;
    for (let i = 0; i < h2Dim; i++) pred += a2[i] * w3[i][0];
    const actual = s.target;
    finalMSE += (pred - actual) ** 2;
  }
  finalMSE /= normData.length;
  console.log(`Final normalized MSE: ${finalMSE.toFixed(6)}`);

  let totalAbsErr = 0;
  for (const s of data) {
    const norm = s.features.map((v, i) => (v - featureMeans[i]) / featureStds[i]);
    const z1 = new Array(h1Dim).fill(0);
    for (let j = 0; j < h1Dim; j++) {
      z1[j] = b1[j];
      for (let i = 0; i < inputDim; i++) z1[j] += norm[i] * w1[i][j];
    }
    const a1 = z1.map(v => Math.max(0, v));
    const z2 = new Array(h2Dim).fill(0);
    for (let j = 0; j < h2Dim; j++) {
      z2[j] = b2[j];
      for (let i = 0; i < h1Dim; i++) z2[j] += a1[i] * w2[i][j];
    }
    const a2 = z2.map(v => Math.max(0, v));
    let pred = b3[0];
    for (let i = 0; i < h2Dim; i++) pred += a2[i] * w3[i][0];
    const predCost = pred * targetStd + targetMean;
    totalAbsErr += Math.abs(predCost - s.target) / s.target;
  }
  const mape = (totalAbsErr / data.length) * 100;
  console.log(`Mean Absolute Percentage Error: ${mape.toFixed(2)}%`);

  return {
    w1, b1, w2, b2, w3, b3,
    featureMeans, featureStds, targetMean, targetStd,
  };
}

console.log("Generating training dataset (2000 samples)...");
const dataset = generateDataset(2000);
console.log(`Dataset generated. Sample cost range: PKR ${Math.min(...dataset.map(d => d.target)).toFixed(0)} - ${Math.max(...dataset.map(d => d.target)).toFixed(0)}`);

console.log("\nTraining neural network (12→16→8→1) with Adam optimizer...");
const weights = trainModel(dataset);

const outputPath = path.join(path.dirname(new URL(import.meta.url).pathname), "weights.json");
fs.writeFileSync(outputPath, JSON.stringify(weights, null, 2));
console.log(`\nWeights saved to ${outputPath}`);
console.log("Training complete!");
