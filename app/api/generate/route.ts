import { NextRequest, NextResponse } from "next/server";
import { GenerateRequest, GeneratedContent, WritingStyle } from "@/types";

export const maxDuration = 60;

const styleInstructions: Record<WritingStyle, string> = {
  viral: `
- Títulos CURTOS, em MAIÚSCULAS, chocantes e que param o scroll (máx 7 palavras)
- Use números e estatísticas de forma impactante: "72% DAS EMPRESAS JÁ FAZEM ISSO"
- Linguagem direta, urgente, quase sensacionalista mas baseada em fatos reais
- Corpo: 2 frases curtas e impactantes. Sem rodeios.
- Crie senso de urgência ou revelação: "O que ninguém te contou sobre..."
- SEM emojis`,

  informativo: `
- Títulos claros e objetivos, descritivos
- Linguagem neutra, jornalística, baseada em dados
- Corpo: 2-3 frases explicativas com contexto e fontes
- Inclua estatísticas e percentuais quando disponíveis
- Tom profissional e educado
- SEM emojis`,

  educativo: `
- Títulos no formato "Como fazer X", "X passos para Y", "O que é X"
- Linguagem didática e acessível, como se estivesse ensinando
- Corpo: explique o conceito de forma simples, com exemplos práticos
- Use progressão lógica entre os slides (passo 1, passo 2...)
- Tom de professor amigável
- SEM emojis`,

  motivacional: `
- Títulos inspiradores, emocionais, que tocam na dor ou no sonho do leitor
- Linguagem em 2ª pessoa: "Você pode...", "Sua vida vai mudar..."
- Corpo: misture dados reais com narrativa emocional
- Crie identificação e esperança
- Tom de coach motivacional
- SEM emojis`,

  noticias: `
- Títulos no estilo breaking news: "BREAKING:", "URGENTE:", ou direto ao ponto
- Linguagem de telejornal/reportagem: quem, o que, quando, onde, por quê
- Corpo: fatos objetivos, sem opinião
- Use os dados mais recentes das fontes
- Tom sério e imparcial
- SEM emojis`,
};

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { topic, searchResults, slideCount, writingStyle = "viral" } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log("[generate] key presente:", !!apiKey, "prefix:", apiKey?.slice(0, 14));

    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada no Vercel" }, { status: 500 });
    }

    const sourcesText = searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nFonte: ${r.link}`)
      .join("\n\n");

    const prompt = `Você é um especialista em criação de conteúdo viral para Instagram.

Com base nas informações reais abaixo sobre "${topic}", crie um carrossel de ${slideCount} slides.

INFORMAÇÕES REAIS DA WEB:
${sourcesText}

ESTILO DE ESCRITA: ${writingStyle.toUpperCase()}
${styleInstructions[writingStyle]}

REGRAS GERAIS:
- Use apenas dados das fontes acima
- O primeiro slide é o mais importante: deve parar o scroll imediatamente
- O último slide tem CTA claro e direto
- Varie os accent colors entre slides (exemplos: #ff6b35, #00d4ff, #ff3366, #ffd700, #7c3aed, #10b981)
- Background sempre escuro (#0a0a0a, #0d1117, #1a0a2e, #0f1a0f, #1a0000)

REGRA CRÍTICA PARA TÍTULO:
- Coloque exatamente UMA palavra-chave entre [colchetes] para destacar em cor de acento
- Exemplo: "SEU [CHURRASCO] PODE ESTAR ERRADO" ou "A [CIÊNCIA] EXPLICA TUDO"
- O título deve ter máx 6 palavras no total

Responda APENAS com JSON válido (sem markdown, sem comentários):
{
  "topic": "${topic}",
  "slides": [
    {
      "title": "TÍTULO COM [PALAVRA] DESTACADA",
      "body": "1-2 frases curtas e diretas com dados reais",
      "callToAction": "apenas no último slide, senão omita este campo",
      "imagePrompt": "close-up portrait of person directly related to the topic, dramatic cinematic lighting, dark moody background, editorial magazine style, intense emotional expression, high contrast",
      "colorScheme": {
        "background": "#0a0a0a",
        "text": "#ffffff",
        "accent": "#ff6b35"
      }
    }
  ]
}`;

    // Fetch direto — sem SDK
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
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
    });

    const anthropicData = await anthropicRes.json();
    console.log("[generate] anthropic status:", anthropicRes.status, "error:", anthropicData.error);

    if (!anthropicRes.ok) {
      const errMsg = anthropicData?.error?.message ?? anthropicRes.statusText;
      return NextResponse.json({ error: `API Anthropic: ${errMsg}` }, { status: 500 });
    }

    const rawText: string = anthropicData.content?.[0]?.text ?? "";

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Resposta inválida da IA" }, { status: 500 });
    }

    const generated: GeneratedContent = JSON.parse(jsonMatch[0]);
    return NextResponse.json(generated);
  } catch (err: any) {
    console.error("[generate] catch:", err);
    const msg = err?.message ?? "Erro desconhecido";
    return NextResponse.json({ error: `Erro ao gerar: ${msg}` }, { status: 500 });
  }
}
