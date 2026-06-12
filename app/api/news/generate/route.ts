import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { consumeCredits } from "@/lib/credits";
import { getNewsById } from "@/lib/news";
import { geminiText } from "@/lib/gemini-text";

export const maxDuration = 60;

export type GenerationType = "carousel" | "reels" | "post" | "ideas";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const { newsId, type }: { newsId: string; type: GenerationType } = await req.json();
    if (!newsId || !type) {
      return NextResponse.json({ error: "newsId e type são obrigatórios" }, { status: 400 });
    }

    // Consome crédito
    const credit = await consumeCredits(session.user.email, "carousel");
    if (!credit.ok) {
      return NextResponse.json(
        { error: `Créditos insuficientes. Faça upgrade para continuar.` },
        { status: 402 },
      );
    }

    const news = await getNewsById(newsId);
    if (!news) return NextResponse.json({ error: "Notícia não encontrada" }, { status: 404 });

    const fullText = [news.title, news.description, news.content]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 2500);

    let prompt = "";
    if (type === "carousel") {
      prompt = buildCarouselPrompt(news.title, news.category, fullText);
    } else if (type === "reels") {
      prompt = buildReelsPrompt(news.title, news.category, fullText);
    } else if (type === "post") {
      prompt = buildPostPrompt(news.title, news.category, fullText);
    } else if (type === "ideas") {
      prompt = buildIdeasPrompt(news.title, news.category, fullText);
    }

    const raw = await geminiText(prompt, { maxTokens: 2000, temperature: 0.85 });
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error("Resposta inválida da IA");

    const result = JSON.parse(match[0]);
    return NextResponse.json({ type, result });
  } catch (err: any) {
    console.error("[api/news/generate]", err);
    const msg = err?.message ?? "Erro desconhecido";
    if (/overload|overloaded|503|529/i.test(msg)) {
      return NextResponse.json({ error: "IA sobrecarregada. Tente novamente em instantes." }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildCarouselPrompt(title: string, category: string, content: string): string {
  return `Você cria carrosséis virais para Instagram baseados em notícias reais.

NOTÍCIA:
Título: ${title}
Categoria: ${category}
Conteúdo: ${content}

Crie um carrossel de 6 slides transformando esta notícia em conteúdo viral.

Estrutura obrigatória:
- Slide 1: O que aconteceu? (gancho, para o scroll)
- Slide 2: Quem/Onde/Quando?
- Slide 3: O contexto ou o diferencial
- Slide 4: O impacto / O que muda?
- Slide 5: O que você precisa saber?
- Slide 6: CTA + opinião/reflexão

Retorne APENAS este JSON:
{
  "topic": "${title}",
  "slides": [
    {
      "title": "TÍTULO COM [PALAVRA] DESTACADA",
      "body": "2 frases curtas e impactantes com dados reais da notícia",
      "imageContext": "descrição do que mostrar visualmente neste slide",
      "colorScheme": { "background": "#0a0a0a", "text": "#ffffff", "accent": "#ff6b35" }
    }
  ]
}

Regras: títulos em MAIÚSCULAS (max 6 palavras), 1 palavra entre [colchetes], sem numeração, sem emojis.`;
}

function buildReelsPrompt(title: string, category: string, content: string): string {
  return `Você cria roteiros de Reels virais baseados em notícias reais.

NOTÍCIA:
Título: ${title}
Categoria: ${category}
Conteúdo: ${content}

Crie um roteiro completo de Reels de 30-60 segundos.

Retorne APENAS este JSON:
{
  "hook": "Primeira frase que prende nos primeiros 3 segundos (curiosidade, choque ou pergunta)",
  "script": [
    { "time": "0-5s", "text": "fala do criador", "visual": "o que mostrar na tela" },
    { "time": "5-15s", "text": "fala do criador", "visual": "o que mostrar na tela" },
    { "time": "15-25s", "text": "fala do criador", "visual": "o que mostrar na tela" },
    { "time": "25-35s", "text": "fala do criador", "visual": "o que mostrar na tela" },
    { "time": "35-45s", "text": "fala do criador", "visual": "o que mostrar na tela" }
  ],
  "cta": "Call to action no final (seguir, comentar, salvar)",
  "caption": "Legenda completa para o Reels com hashtags relevantes",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}`;
}

function buildPostPrompt(title: string, category: string, content: string): string {
  return `Você cria posts otimizados para diferentes redes sociais.

NOTÍCIA:
Título: ${title}
Categoria: ${category}
Conteúdo: ${content}

Crie posts adaptados para cada plataforma.

Retorne APENAS este JSON:
{
  "instagram": "Post para Instagram (150-200 palavras, engajante, com emojis e hashtags)",
  "linkedin": "Post para LinkedIn (profissional, insights de negócio, sem exagero de emojis, 200-300 palavras)",
  "facebook": "Post para Facebook (conversacional, gera discussão, 100-150 palavras)",
  "twitter": "Tweet/Thread inicial para X (máx 280 caracteres, impactante)",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"]
}`;
}

function buildIdeasPrompt(title: string, category: string, content: string): string {
  return `Você é um estrategista de conteúdo especialista em criação viral.

NOTÍCIA:
Título: ${title}
Categoria: ${category}
Conteúdo: ${content}

Gere 5 ideias criativas de conteúdo baseadas nesta notícia. Cada ideia deve ser única e explorável.

Retorne APENAS este JSON:
{
  "ideas": [
    {
      "type": "carrossel",
      "title": "Título da ideia",
      "angle": "Ângulo/abordagem única (1 frase)",
      "hook": "Gancho do primeiro slide/frame",
      "slides": ["Tópico slide 1", "Tópico slide 2", "Tópico slide 3", "Tópico slide 4", "Tópico slide 5"],
      "viralPotential": "alta"
    },
    {
      "type": "reels",
      "title": "Título da ideia",
      "angle": "Ângulo/abordagem única",
      "hook": "Primeira frase que prende",
      "slides": ["Cena 1", "Cena 2", "Cena 3"],
      "viralPotential": "media"
    },
    {
      "type": "carrossel",
      "title": "Título da ideia 3",
      "angle": "Ângulo diferente",
      "hook": "Gancho 3",
      "slides": ["Tópico 1", "Tópico 2", "Tópico 3", "Tópico 4"],
      "viralPotential": "alta"
    },
    {
      "type": "post",
      "title": "Título da ideia 4",
      "angle": "Para LinkedIn/Instagram profissional",
      "hook": "Abertura do post",
      "slides": ["Ponto 1", "Ponto 2", "Ponto 3"],
      "viralPotential": "media"
    },
    {
      "type": "reels",
      "title": "Título da ideia 5",
      "angle": "Abordagem nichada",
      "hook": "Hook nicho",
      "slides": ["Cena 1", "Cena 2", "Cena 3", "Cena 4"],
      "viralPotential": "nichado"
    }
  ]
}

viralPotential deve ser: "alta", "media" ou "nichado"`;
}
