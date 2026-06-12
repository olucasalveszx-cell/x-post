// Embedding com fallback entre modelos Gemini disponíveis
const EMBEDDING_MODELS = [
  { model: "text-embedding-004",          version: "v1beta" },
  { model: "gemini-embedding-exp-03-07",  version: "v1beta" },
  { model: "embedding-001",               version: "v1beta" },
  { model: "text-embedding-004",          version: "v1"     },
];

export async function generateEmbedding(text: string): Promise<number[]> {
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean) as string[];
  if (!keys.length) throw new Error("GEMINI_API_KEY não configurada");

  const truncated = text.substring(0, 8000);
  let lastError = "Serviço de embedding indisponível";

  for (const { model, version } of EMBEDDING_MODELS) {
    for (const key of keys) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/${version}/models/${model}:embedContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: { parts: [{ text: truncated }] } }),
          }
        );
        const data = await res.json();
        if (res.ok && data.embedding?.values) return data.embedding.values as number[];
        lastError = data.error?.message ?? `Embedding error ${res.status}`;
        // Só tenta próximo modelo se for erro de "não encontrado"
        if (/quota|429|rate/i.test(lastError)) continue;
        if (/not found|not supported|unsupported/i.test(lastError)) break; // tenta próximo modelo
      } catch (e: any) {
        lastError = e.message ?? lastError;
      }
    }
  }

  throw new Error(lastError);
}

// Split text into overlapping chunks (word-based)
export function chunkText(text: string, chunkSize = 400, overlap = 60): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.length > 30) chunks.push(chunk);
    i += chunkSize - overlap;
    if (i + overlap >= words.length) break;
  }
  // Add the last remaining words if not already included
  const tail = words.slice(Math.max(0, words.length - chunkSize)).join(" ");
  if (tail.length > 30 && !chunks.at(-1)?.includes(tail.substring(0, 50))) {
    chunks.push(tail);
  }
  return chunks;
}
