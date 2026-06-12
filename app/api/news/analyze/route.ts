import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNewsById } from "@/lib/news";
import { geminiText } from "@/lib/gemini-text";

export const maxDuration = 45;

export interface NewsAnalysis {
  summary: string;
  keyPoints: string[];
  keywords: string[];
  opportunities: string[];
  viralPotential: string;
  targetAudience: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const { newsId } = await req.json();
    if (!newsId) return NextResponse.json({ error: "newsId obrigatório" }, { status: 400 });

    const news = await getNewsById(newsId);
    if (!news) return NextResponse.json({ error: "Notícia não encontrada" }, { status: 404 });

    const fullText = [news.title, news.description, news.content]
      .filter(Boolean)
      .join("\n\n");

    const prompt = `Você é um analista de conteúdo especialista em tendências e criação de conteúdo viral para redes sociais.

Analise esta notícia e retorne um JSON com a análise:

TÍTULO: ${news.title}
CATEGORIA: ${news.category}
FONTE: ${news.source}
CONTEÚDO:
${fullText.slice(0, 3000)}

Retorne APENAS este JSON:
{
  "summary": "Resumo inteligente em 2-3 frases, captando o que realmente importa. Não apenas resuma — analise o impacto.",
  "keyPoints": ["Ponto essencial 1", "Ponto essencial 2", "Ponto essencial 3", "Ponto essencial 4"],
  "keywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"],
  "opportunities": ["Oportunidade de conteúdo 1", "Oportunidade de conteúdo 2", "Oportunidade de conteúdo 3"],
  "viralPotential": "Explique em 1 frase por que esse assunto pode viralizar (ou não) agora",
  "targetAudience": "Quem se beneficia mais desse conteúdo: o público-alvo ideal"
}`;

    const raw = await geminiText(prompt, { maxTokens: 800, temperature: 0.7 });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Resposta inválida da IA");

    const analysis: NewsAnalysis = JSON.parse(match[0]);
    return NextResponse.json({ analysis });
  } catch (err: any) {
    console.error("[api/news/analyze]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
