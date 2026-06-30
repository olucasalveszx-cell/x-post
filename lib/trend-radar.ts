import { supabaseAdmin } from "./supabase";
import { geminiText } from "./gemini-text";

export interface TrendPrediction {
  id: string;
  topic: string;
  category: string;
  confidence: number;
  reasoning: string;
  signals: string[];
  predicted_for_hours: number;
  created_at: string;
}

const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 horas

export async function getTrendPredictions(): Promise<TrendPrediction[]> {
  const freshSince = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  const { data: cached } = await supabaseAdmin
    .from("trend_predictions")
    .select("*")
    .gte("created_at", freshSince)
    .order("confidence", { ascending: false })
    .limit(8);

  if (cached && cached.length >= 4) return cached as TrendPrediction[];
  return generateTrendPredictions();
}

export async function generateTrendPredictions(): Promise<TrendPrediction[]> {
  // Busca manchetes das últimas 8h para alimentar a análise
  const { data: recentNews } = await supabaseAdmin
    .from("news_cache")
    .select("title, category, viral_score, published_at")
    .gte("created_at", new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString())
    .order("viral_score", { ascending: false })
    .limit(80);

  if (!recentNews?.length) return [];

  const newsContext = recentNews
    .map((n: any) => `[${n.category}] ${n.title}`)
    .join("\n");

  const prompt = `Você é um analista de tendências especialista em comportamento digital brasileiro.

Analise estas manchetes das últimas 8 horas e identifique quais tópicos vão EXPLODIR nas próximas 24-48 horas no Brasil:

${newsContext}

Raciocine sobre:
- Qual tema está ganhando momentum mas ainda não atingiu o pico?
- Quais assuntos têm ciclo curto e vão viralizar amanhã (esportes, política, entretenimento)?
- O que a mídia vai amplificar nas próximas horas com base no que está nascendo agora?

Retorne APENAS este JSON (sem markdown, sem texto extra):
[
  {
    "topic": "Nome do tópico (max 5 palavras)",
    "category": "categoria",
    "confidence": 87,
    "reasoning": "Por que vai explodir nas próximas horas — 1 frase direta e específica",
    "signals": ["manchete que suporta esta previsão", "outra manchete de suporte"],
    "predicted_for_hours": 24
  }
]

Retorne 6 a 8 previsões ordenadas por confidence (maior primeiro).
confidence: 0-100 (seja realista).
predicted_for_hours: 12, 24 ou 48.
Categorias válidas: geral, tecnologia, inteligencia_artificial, negocios, marketing, politica, esportes, futebol, entretenimento, saude, financas, criptomoedas, startups, musica, brasil, mundo`;

  try {
    const raw = await geminiText(prompt, { maxTokens: 1500, temperature: 0.55 });
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("JSON não encontrado na resposta");

    const predictions: Omit<TrendPrediction, "id" | "created_at">[] = JSON.parse(match[0]);
    const valid = predictions
      .filter((p) => p.topic && p.category && typeof p.confidence === "number")
      .slice(0, 8)
      .map((p) => ({
        ...p,
        confidence: Math.min(100, Math.max(0, p.confidence)),
        predicted_for_hours: [12, 24, 48].includes(p.predicted_for_hours) ? p.predicted_for_hours : 24,
        signals: Array.isArray(p.signals) ? p.signals.slice(0, 3) : [],
      }));

    if (!valid.length) return [];

    // Remove previsões antigas e insere novas
    await supabaseAdmin
      .from("trend_predictions")
      .delete()
      .lt("created_at", new Date(Date.now() - CACHE_TTL_MS).toISOString());

    const { data } = await supabaseAdmin
      .from("trend_predictions")
      .insert(valid)
      .select();

    return (data as TrendPrediction[]) ?? [];
  } catch (e: any) {
    console.warn("[trend-radar] Falha na geração:", e.message);
    return [];
  }
}
