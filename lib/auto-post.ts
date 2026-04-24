import { redisGet, redisSet, redisListAdd, redisListAll, redisDel, redisLRem } from "@/lib/redis";
import { AutoPostItem, AutoPostStatus, GeneratedSlide, SearchResult, WritingStyle } from "@/types";

// ─── Chaves Redis ──────────────────────────────────────────────────────────────

const itemKey = (id: string) => `autopost:item:${id}`;
const userKey = (email: string) => `autopost:user:${email}`;

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function saveAutoPost(item: AutoPostItem): Promise<void> {
  await redisSet(itemKey(item.id), JSON.stringify(item));
}

export async function getAutoPost(id: string): Promise<AutoPostItem | null> {
  const raw = await redisGet(itemKey(id));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function updateAutoPostStatus(
  id: string,
  status: AutoPostStatus,
  extra?: Partial<AutoPostItem>
): Promise<AutoPostItem | null> {
  const item = await getAutoPost(id);
  if (!item) return null;
  const updated: AutoPostItem = { ...item, ...extra, status };
  await saveAutoPost(updated);
  return updated;
}

export async function listAutoPosts(email: string): Promise<AutoPostItem[]> {
  const ids = await redisListAll(userKey(email));
  const items: AutoPostItem[] = [];
  for (const id of ids.slice(-50).reverse()) {
    const item = await getAutoPost(id);
    if (item) items.push(item);
  }
  return items;
}

export async function registerAutoPostForUser(email: string, id: string): Promise<void> {
  await redisListAdd(userKey(email), id);
}

export async function deleteAutoPost(email: string, id: string): Promise<void> {
  await redisDel(itemKey(id));
  await redisLRem(userKey(email), 0, id);
}

// ─── Busca na web (Serper) ────────────────────────────────────────────────────

export async function searchWeb(topic: string): Promise<SearchResult[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: topic, gl: "br", hl: "pt", num: 10 }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const organic: any[] = data.organic ?? [];
    return organic.map((r) => ({
      title: r.title ?? "",
      snippet: r.snippet ?? "",
      link: r.link ?? "",
    }));
  } catch {
    return [];
  }
}

// ─── Geração de slides com Claude ────────────────────────────────────────────

const styleInstructions: Record<WritingStyle, string> = {
  viral: "Títulos curtos em MAIÚSCULAS, impactantes (máx 7 palavras). Corpo: 2 frases curtas. Senso de urgência.",
  informativo: "Títulos descritivos. Linguagem neutra, jornalística. Corpo: 2-3 frases com dados.",
  educativo: "Títulos no formato 'Como fazer X'. Tom didático. Progressão lógica.",
  motivacional: "Títulos inspiradores. Linguagem em 2ª pessoa. Tom de coach.",
  noticias: "Estilo breaking news. Quem, o quê, quando, onde, por quê. Tom sério.",
};

export async function generateSlides(
  topic: string,
  searchResults: SearchResult[],
  slideCount: number,
  writingStyle: WritingStyle
): Promise<GeneratedSlide[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  const sources = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nFonte: ${r.link}`)
    .join("\n\n");

  const prompt = `Você é um especialista em conteúdo viral para Instagram.

Com base nas informações abaixo sobre "${topic}", crie ${slideCount} slides.

FONTES:
${sources || "Sem fontes disponíveis — use seu conhecimento geral."}

ESTILO: ${writingStyle.toUpperCase()} — ${styleInstructions[writingStyle]}

REGRAS:
- Coloque exatamente UMA palavra entre [colchetes] no título para destaque
- Título máx 6 palavras, SEM numeração
- searchQuery: busca curta em português para foto real (ex: "Neymar Santos 2025")
- Background escuro, accent colorido e variado entre slides
- SEM emojis

Responda APENAS com JSON válido:
{
  "slides": [
    {
      "title": "TÍTULO COM [PALAVRA]",
      "body": "1-2 frases curtas com dados reais",
      "imagePrompt": "visual description in English, cinematic, 8k",
      "searchQuery": "busca curta em português",
      "colorScheme": { "background": "#0a0a0a", "text": "#ffffff", "accent": "#ff6b35" }
    }
  ]
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message ?? "Erro na API Anthropic");
  }

  const data = await res.json();
  const raw: string = data.content?.[0]?.text ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Resposta inválida da IA");

  const parsed = JSON.parse(match[0]);
  const slides: GeneratedSlide[] = parsed.slides ?? [];

  // Remove numeração que o modelo às vezes insere
  const strip = (t: string) =>
    t.replace(/^(\d+[\.\)]\s*|[•\-\*]\s*|#\d+\s*)/gim, "").trim();

  return slides.map((s) => ({ ...s, title: strip(s.title), body: strip(s.body) }));
}

// ─── Gera legenda para o post ─────────────────────────────────────────────────

export function buildCaption(slides: GeneratedSlide[], topic: string): string {
  const lines = slides
    .map((s) => `${s.title.replace(/\[|\]/g, "")}\n${s.body}`)
    .join("\n\n");
  const tag = topic.replace(/\s+/g, "").replace(/[^a-zA-Z0-9À-ÿ]/g, "");
  return `${lines}\n\n#${tag} #Instagram #carrossel`;
}
