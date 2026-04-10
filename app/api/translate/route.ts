import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    signal: AbortSignal.timeout(10000),
  });
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 6000);
}

const slidesPrompt = (slideCount: number) => `
INSTRUÇÕES DOS SLIDES:
- Primeiro slide: o mais impactante, para parar o scroll
- Títulos: CURTOS, em maiúsculas, com exatamente UMA palavra entre [colchetes] para destaque colorido
- Máximo 6 palavras no título
- Corpo: 1-2 frases curtas com os dados mais impactantes
- Último slide: CTA claro
- Adapte exemplos e referências para o contexto brasileiro quando possível
- SEM emojis nos títulos

Responda APENAS com JSON válido (sem markdown):
{
  "topic": "tema do post em português",
  "slides": [
    {
      "title": "TÍTULO COM [PALAVRA] DESTACADA",
      "body": "1-2 frases adaptadas para o público BR",
      "callToAction": "apenas no último slide",
      "imagePrompt": "dramatic portrait or scene related to the topic, cinematic lighting, dark moody atmosphere, editorial photography",
      "colorScheme": {
        "background": "#0a0a0a",
        "text": "#ffffff",
        "accent": "#cor_hex_vibrante"
      }
    }
  ]
}

Crie exatamente ${slideCount} slides.`;

export async function POST(req: NextRequest) {
  try {
    const { url, text, imageBase64, imageMimeType, slideCount = 7 } = await req.json();

    if (!url && !text && !imageBase64) {
      return NextResponse.json({ error: "Informe URL, texto ou imagem" }, { status: 400 });
    }

    let message: Anthropic.Message;

    // --- Modo imagem: Claude lê o screenshot com visão ---
    if (imageBase64) {
      const mime = (imageMimeType ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

      message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mime, data: imageBase64 },
              },
              {
                type: "text",
                text: `Você é um especialista em marketing digital para Instagram no Brasil.

Esta é uma imagem de um post ou artigo estrangeiro. Sua tarefa é:
1. Ler e extrair todo o texto visível na imagem
2. Entender o tema e as informações principais
3. Traduzir e ADAPTAR o conteúdo para o público brasileiro (linguagem natural BR, não tradução literal)
4. Criar um carrossel de ${slideCount} slides impactantes para Instagram

${slidesPrompt(slideCount)}`,
              },
            ],
          },
        ],
      });
    } else {
      // --- Modo texto / URL ---
      let sourceContent = text ?? "";

      if (url) {
        try {
          sourceContent = await fetchPageText(url);
        } catch (err: any) {
          return NextResponse.json(
            { error: `Não foi possível acessar a URL: ${err.message}` },
            { status: 400 }
          );
        }
      }

      if (!sourceContent.trim()) {
        return NextResponse.json({ error: "Nenhum conteúdo encontrado" }, { status: 400 });
      }

      message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `Você é um especialista em marketing digital para Instagram no Brasil.

Abaixo está o conteúdo original de um post estrangeiro.
Sua tarefa é:
1. Entender o tema e as informações principais
2. Traduzir e ADAPTAR para o público brasileiro (linguagem natural BR, não tradução literal)
3. Criar um carrossel de ${slideCount} slides impactantes para Instagram

CONTEÚDO ORIGINAL:
${sourceContent}

${slidesPrompt(slideCount)}`,
          },
        ],
      });
    }

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Resposta inválida da IA" }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (err: any) {
    console.error("[translate]", err);
    return NextResponse.json({ error: err.message ?? "Erro ao traduzir" }, { status: 500 });
  }
}
