"""
ArchitectXpert RAG Engine
==========================
Retrieval-Augmented Generation engine for the architecture chatbot.
- Uses TF-IDF similarity to retrieve relevant knowledge chunks
- Builds an enriched system prompt from the retrieved context
- Returns the assembled prompt as JSON (the TS backend feeds it to OpenAI)

Usage:
    python rag_engine.py '<JSON: {"query": "...", "history": [...]}>'
Output:
    JSON: {"system_prompt": "...", "retrieved_chunks": [...]}
"""

import sys
import json
import math
import re
from typing import List, Dict, Tuple
from rag_knowledge_base import KNOWLEDGE_CHUNKS


# ─────────────────────────────────────────────────────────────────────────────
#  TF-IDF Retriever (no external dependencies)
# ─────────────────────────────────────────────────────────────────────────────

def _tokenize(text: str) -> List[str]:
    """Lowercase, remove punctuation, split on whitespace."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return [t for t in text.split() if len(t) > 1]


def _build_idf(chunks: List[Dict]) -> Dict[str, float]:
    """Compute inverse document frequency for all terms across all chunks."""
    N = len(chunks)
    df: Dict[str, int] = {}
    for chunk in chunks:
        terms = set(_tokenize(chunk["content"] + " " + " ".join(chunk["tags"]) + " " + chunk["category"]))
        for term in terms:
            df[term] = df.get(term, 0) + 1
    return {term: math.log(N / (1 + freq)) for term, freq in df.items()}


def _tf(tokens: List[str]) -> Dict[str, float]:
    """Compute term frequency for a list of tokens."""
    freq: Dict[str, int] = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    total = len(tokens) if tokens else 1
    return {t: c / total for t, c in freq.items()}


def _tfidf_vector(tokens: List[str], idf: Dict[str, float]) -> Dict[str, float]:
    tf = _tf(tokens)
    return {t: tf[t] * idf.get(t, 0.0) for t in tf}


def _cosine_similarity(a: Dict[str, float], b: Dict[str, float]) -> float:
    keys = set(a) & set(b)
    if not keys:
        return 0.0
    dot = sum(a[k] * b[k] for k in keys)
    mag_a = math.sqrt(sum(v * v for v in a.values()))
    mag_b = math.sqrt(sum(v * v for v in b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


# Pre-build IDF at module load time (fast — runs once per process)
_IDF = _build_idf(KNOWLEDGE_CHUNKS)

# Pre-build TF-IDF vectors for all chunks
_CHUNK_VECTORS: List[Dict[str, float]] = []
for _chunk in KNOWLEDGE_CHUNKS:
    _text = (_chunk["content"] + " " + " ".join(_chunk["tags"]) + " " + _chunk["category"]) * 1
    _tokens = _tokenize(_text)
    _CHUNK_VECTORS.append(_tfidf_vector(_tokens, _IDF))


def retrieve(query: str, top_k: int = 5) -> List[Dict]:
    """Return the top-K most relevant knowledge chunks for the given query."""
    query_tokens = _tokenize(query)
    query_vec = _tfidf_vector(query_tokens, _IDF)

    scored: List[Tuple[float, int]] = []
    for i, chunk_vec in enumerate(_CHUNK_VECTORS):
        score = _cosine_similarity(query_vec, chunk_vec)
        # Boost score if query keywords appear in chunk tags
        for tag in KNOWLEDGE_CHUNKS[i]["tags"]:
            if tag in query.lower():
                score += 0.15
        scored.append((score, i))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_indices = [i for _, i in scored[:top_k]]
    return [KNOWLEDGE_CHUNKS[i] for i in top_indices]


# ─────────────────────────────────────────────────────────────────────────────
#  System Prompt Builder
# ─────────────────────────────────────────────────────────────────────────────

BASE_SYSTEM_PROMPT = """You are **ArchitectXpert AI** — a premium architectural assistant specializing in building design, construction, and real estate for Pakistan and the broader South Asian context.

## Your Expertise
- Architectural design (floor plans, space planning, building typologies)
- Structural engineering (foundations, RCC frames, seismic design)
- Construction materials (concrete, steel, brick, finishes, waterproofing)
- Building codes & regulations (PBC 2021, PEC, LDA, SBCA, CDA approvals)
- MEP systems (plumbing, electrical, HVAC, solar)
- Cost estimation in PKR with local market rates
- Sustainability & green building
- Interior design and architectural styles

## Communication Style
- Be knowledgeable, specific, and practical
- Use real product names, prices in PKR, and Pakistani building standards
- Provide structured responses with clear headings or bullet points where helpful
- When referencing costs, note they are approximate and subject to market fluctuation
- Keep answers focused and actionable
- If you don't know something specific, say so honestly

## Context from Knowledge Base
The following curated knowledge has been retrieved as most relevant to the user's question. Use this as your primary reference:

---
{retrieved_context}
---

Answer using the knowledge above combined with your general architectural expertise. Stay focused on architecture, construction, and building design topics."""


def build_system_prompt(query: str, history: List[Dict]) -> Tuple[str, List[Dict]]:
    """
    Retrieve relevant chunks for the query (and recent history context)
    and return the enriched system prompt plus the retrieved chunks.
    """
    # Combine recent history for retrieval context
    history_text = " ".join(
        msg.get("content", "")
        for msg in (history[-3:] if len(history) > 3 else history)
    )
    combined_query = f"{query} {history_text}".strip()

    # Retrieve top-5 relevant chunks
    top_chunks = retrieve(combined_query, top_k=5)

    # Format retrieved context for the prompt
    context_parts = []
    for i, chunk in enumerate(top_chunks, 1):
        context_parts.append(
            f"### [{i}] {chunk['category'].replace('_', ' ').title()} — (tags: {', '.join(chunk['tags'][:4])})\n"
            f"{chunk['content']}"
        )
    retrieved_context = "\n\n".join(context_parts)

    # Fill in the system prompt
    system_prompt = BASE_SYSTEM_PROMPT.format(retrieved_context=retrieved_context)
    return system_prompt, top_chunks


# ─────────────────────────────────────────────────────────────────────────────
#  Main entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input JSON provided"}))
        sys.exit(1)

    try:
        params = json.loads(sys.argv[1])
        query = params.get("query", "")
        history = params.get("history", [])

        if not query:
            print(json.dumps({"error": "No query provided"}))
            sys.exit(1)

        system_prompt, chunks = build_system_prompt(query, history)

        result = {
            "system_prompt": system_prompt,
            "retrieved_chunks": [
                {"id": c["id"], "category": c["category"], "tags": c["tags"][:4]}
                for c in chunks
            ],
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
