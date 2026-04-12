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
- Use progressão lógica entre os slides, mas NUNCA numere: sem "Passo 1:", "1.", "01" etc.
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

REGRA OBRIGATÓRIA — SEM NUMERAÇÃO:
- NUNCA adicione números, bullets ou prefixos nos títulos ou corpo dos slides
- Proibido: "1.", "01", "Passo 1:", "• ", "- ", "#1", "Slide 1" ou qualquer variação
- Os slides devem fluir como peças independentes, não como uma lista numerada

REGRA CRÍTICA PARA TÍTULO:
- Coloque exatamente UMA palavra-chave entre [colchetes] para destacar em cor de acento
- Exemplo: "SEU [CHURRASCO] PODE ESTAR ERRADO" ou "A [CIÊNCIA] EXPLICA TUDO"
- O título deve ter máx 6 palavras no total

REGRA CRÍTICA PARA imagePrompt:
- Cada slide DEVE ter um imagePrompt ÚNICO e ESPECÍFICO que descreve visualmente o conteúdo daquele slide
- O imagePrompt deve ser em INGLÊS, detalhado como um prompt de IA de imagem (Midjourney/Stable Diffusion)
- NUNCA mencione nomes de pessoas reais (políticos, atletas, celebridades) no imagePrompt — isso causa bloqueio pela IA geradora
- Em vez de nomear a pessoa, descreva o CENÁRIO, SÍMBOLO ou EMOÇÃO: "presidential podium with American flag", "soccer stadium golden celebration", "boxing ring dramatic moment"
- Descreva: ambiente, objetos icônicos, iluminação, emoção, atmosfera — sem rostos ou nomes reais
- Exemplo para slide sobre eleições americanas: "American flag waving dramatically, presidential podium, crowd in background, powerful spotlight, patriotic atmosphere, cinematic wide shot, 8k"
- Exemplo para slide sobre Copa do Mundo: "golden FIFA World Cup trophy on pedestal, stadium crowd, confetti falling, green field, intense floodlights, celebration atmosphere, photorealistic"
- Exemplo para slide sobre marketing: "businessman looking at holographic social media analytics dashboard, neon lights, dark office background, futuristic, high contrast, dramatic lighting"
- NUNCA use prompts genéricos. Cada prompt deve ser único e diretamente ligado ao conteúdo do slide

REGRA CRÍTICA PARA searchQuery:
- Campo SEPARADO do imagePrompt, usado para buscar FOTOS REAIS no Google Images
- Deve ser uma busca curta, objetiva, em português, de 2 a 5 palavras
- Foque no SUJEITO REAL: nome da pessoa, evento ou produto — sem termos de IA ou fotografia
- Exemplo para slide sobre Neymar jogando: "Neymar Santos 2025"
- Exemplo para slide sobre Copa do Mundo: "Copa do Mundo 2026 Brasil"
- Exemplo para slide sobre marketing digital: "marketing digital estratégia"
- Exemplo para slide sobre Lula: "Lula presidente 2025"
- NUNCA inclua palavras como: cinematic, dark, moody, photorealistic, 8k, dramatic, lighting

Responda APENAS com JSON válido (sem markdown, sem comentários):
{
  "topic": "${topic}",
  "slides": [
    {
      "title": "TÍTULO COM [PALAVRA] DESTACADA",
      "body": "1-2 frases curtas e diretas com dados reais",
      "callToAction": "apenas no último slide, senão omita este campo",
      "imagePrompt": "descrição visual detalhada e específica do conteúdo deste slide em inglês, cinematic lighting, dark moody background, high contrast, photorealistic",
      "searchQuery": "busca curta e objetiva em português para foto real no Google, ex: Neymar Santos 2025",
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
