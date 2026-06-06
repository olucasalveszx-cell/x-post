// Gemini text-embedding-004 — 768 dimensions

export async function generateEmbedding(text: string): Promise<number[]> {
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean) as string[];
  if (!keys.length) throw new Error("GEMINI_API_KEY não configurada");

  const body = {
    model: "models/text-embedding-004",
    content: { parts: [{ text: text.substring(0, 8000) }] },
  };

  for (const key of keys) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${key}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    const data = await res.json();
    if (res.ok) return data.embedding.values as number[];
    const msg: string = data.error?.message ?? `Embedding error ${res.status}`;
    if (!msg.includes("quota") && !msg.includes("429")) throw new Error(msg);
  }

  throw new Error("Serviço de embedding indisponível. Verifique a GEMINI_API_KEY.");
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
