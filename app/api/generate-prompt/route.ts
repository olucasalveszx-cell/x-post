import { NextRequest, NextResponse } from "next/server";
import { GeneratedContent } from "@/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { customPrompt, slideCount = 5 } = await req.json();

    if (!customPrompt?.trim()) {
      return NextResponse.json({ error: "Prompt obrigatório" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500 });
    }

    const systemInstructions = `Você é um gerador de carrosséis para Instagram. O usuário vai descrever exatamente como quer os slides — siga as instruções dele fielmente.

REGRAS OBRIGATÓRIAS (independente do prompt do usuário):
1. Responda APENAS com JSON válido, sem markdown, sem comentários
2. NUNCA adicione numeração nos títulos (sem "1.", "Passo 1:", "#1", etc.)
3. Coloque exatamente UMA palavra entre [colchetes] no título para destacar em cor de acento
4. O título deve ter máx 7 palavras
5. imagePrompt: descrição visual em inglês para gerador de imagem IA, SEM nomes de pessoas reais
6. searchQuery: busca curta em português (2-5 palavras) para foto real no Google
7. Gere exatamente ${slideCount} slides

FORMATO DE RESPOSTA:
{
  "topic": "tema geral do carrossel",
  "slides": [
    {
      "title": "TÍTULO COM [PALAVRA] DESTACADA",
      "body": "texto do corpo do slide",
      "callToAction": "apenas no último slide, senão omita",
      "imagePrompt": "visual description in english for AI image generator",
      "searchQuery": "busca curta em português",
      "colorScheme": {
        "background": "#0a0a0a",
        "text": "#ffffff",
        "accent": "#ff6b35"
      }
    }
  ]
}`;

    const userMessage = `Crie um carrossel com ${slideCount} slides seguindo estas instruções:

${customPrompt}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        system: systemInstructions,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const anthropicData = await anthropicRes.json();
    if (!anthropicRes.ok) {
      return NextResponse.json(
        { error: anthropicData?.error?.message ?? anthropicRes.statusText },
        { status: 500 }
      );
    }

    const rawText: string = anthropicData.content?.[0]?.text ?? "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Resposta inválida da IA" }, { status: 500 });
    }

    const generated: GeneratedContent = JSON.parse(jsonMatch[0]);
    return NextResponse.json(generated);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Erro desconhecido" }, { status: 500 });
  }
}
