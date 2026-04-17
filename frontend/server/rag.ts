import { readFileSync } from "fs";
import path from "path";
import type OpenAI from "openai";

function dirname(): string {
  // When running the server, cwd is the frontend directory.
  return path.join(process.cwd(), "server");
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

let cachedChunks: string[] | null = null;
let cachedEmbeddings: number[][] | null = null;

function loadChunks(): string[] {
  if (cachedChunks) return cachedChunks;
  const fp = path.join(dirname(), "architect_knowledge.md");
  const raw = readFileSync(fp, "utf8");
  cachedChunks = raw
    .split(/\n---\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40);
  return cachedChunks;
}

/**
 * Retrieves top knowledge chunks for the user query using OpenAI embeddings (RAG).
 * Returns empty string if embeddings fail or no API access.
 */
export async function buildRagContext(
  userQuery: string,
  openai: OpenAI,
  topK = 3,
): Promise<string> {
  const chunks = loadChunks();
  if (chunks.length === 0) return "";

  try {
    if (!cachedEmbeddings) {
      const emb = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunks,
      });
      const sorted = [...emb.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      cachedEmbeddings = sorted.map((d) => d.embedding);
    }

    const qEmb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userQuery.slice(0, 8000),
    });
    const q = qEmb.data[0].embedding;

    const scored = cachedEmbeddings.map((vec, i) => ({
      i,
      s: cosineSim(q, vec),
    }));
    scored.sort((a, b) => b.s - a.s);
    const picked = scored.slice(0, topK).map((x) => chunks[x.i]);

    return picked.map((text, idx) => `[${idx + 1}] ${text}`).join("\n\n");
  } catch (e) {
    console.warn("[rag] retrieval skipped:", (e as Error)?.message || e);
    return "";
  }
}
