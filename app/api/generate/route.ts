import { NextRequest, NextResponse } from "next/server";
import { GenerateRequest, GeneratedContent, WritingStyle } from "@/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { consumeCredits } from "@/lib/credits";
import { redisIncr } from "@/lib/redis";
import { geminiText } from "@/lib/gemini-text";

export const maxDuration = 60;

// Extrai slides individuais completos de uma resposta JSON truncada
function extractPartialSlides(str: string): any[] {
  const slides: any[] = [];
  // Regex para encontrar objetos de slide completos (com title pelo menos)
  const slideRegex = /\{[^{}]*"title"\s*:\s*"[^"]*"[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g;
  let match;
  while ((match = slideRegex.exec(str)) !== null) {
    try {
      const obj = JSON.parse(match[0]);
      if (obj.title) slides.push(obj);
    } catch {}
  }
  return slides;
}

function repairJson(str: string): string {
  let inString = false;
  let escaped = false;
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === "\\") { escaped = true; result += ch; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString && (ch === "\n" || ch === "\r" || ch === "\t")) {
      result += " "; continue;
    }
    result += ch;
  }
  return result.replace(/,(\s*[}\]])/g, "$1");
}

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
    const body: GenerateRequest & { imageStyle?: string; withFace?: boolean } = await req.json();
    const { topic, searchResults, slideCount, writingStyle = "viral", imageStyle, withFace = false } = body;

    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (email) {
      const action = imageStyle === "foto_real" ? "carousel" : "carousel_ai";
      const credit = await consumeCredits(email, action);
      if (!credit.ok) {
        return NextResponse.json(
          { error: `Créditos insuficientes. Você usou todos os créditos do plano ${credit.plan} este mês. Faça upgrade para continuar.` },
          { status: 402 }
        );
      }
    }

    const sourcesText = searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet.slice(0, 300)}\nFonte: ${r.link}`)
      .join("\n\n")
      .slice(0, 4000);

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

PROCESSO OBRIGATÓRIO PARA IMAGEM DE CADA SLIDE (3 passos em sequência):

PASSO 1 — imageContext (raciocínio interno):
Leia o título + body deste slide específico. Escreva em 1 frase o que está acontecendo NESTE SLIDE:
quem/o quê é o sujeito, qual ação/momento específico, em qual cenário.
Exemplo slide "MJ revolucionou o pop com o Moonwalk": "Michael Jackson executando o Moonwalk em palco iluminado, luva branca, jaqueta sequenciada, multidão em êxtase"
Este campo é OBRIGATÓRIO — nunca deixe vazio ou genérico como "pessoa no palco" ou "cena relacionada ao tema".

PASSO 2 — imagePrompt (derivado do imageContext):
${withFace ? `- SEMPRE coloque UMA PESSOA como sujeito principal da cena — a pessoa DEVE ser o foco
- A pessoa deve estar FAZENDO exatamente o que o texto/título do slide descreve
- Formato: "[pessoa] [ação específica do texto], [ambiente concreto], [iluminação natural]"
- Derive DIRETAMENTE do texto: "publicar conteúdo" → pessoa com câmera/celular; "investir" → pessoa com gráficos; "vender" → pessoa em reunião
- NUNCA gere cenas sem pessoa visível` : `- Derive DIRETAMENTE do imageContext — não invente cenas não relacionadas ao texto
- Escreva em INGLÊS, detalhado como prompt Midjourney/Stable Diffusion
- NUNCA use nomes próprios de pessoas reais — descreva elementos visuais ICÔNICOS reconhecíveis:
  * Michael Jackson moonwalk → "performer in white sequined glove and black fedora executing iconic backwards slide on spotlit stage, concert fog, 80s arena atmosphere, dramatic single spotlight, cinematic"
  * Neymar gol → "Brazilian forward with blond hair #10 jersey celebrating decisive goal, stadium crowd in yellow-green, confetti rain, emotional close-up, documentary photography"
  * Steve Jobs iPhone → "visionary presenter in black turtleneck holding minimalist glass device on white stage, single spotlight, attentive crowd silhouettes, product launch atmosphere"
  * Copa do Mundo troféu → "golden FIFA trophy raised by gloved hands amid stadium confetti explosion, team jerseys blur in background, golden hour lighting"
  * Eleições → "political rally podium with national flag backdrop, crowd waving banners under flood lights, photojournalism style"
- A cena deve ser IMEDIATAMENTE reconhecível como o assunto sem precisar do nome
- Inclua: assinatura visual (objeto, roupa, gesto), ambiente específico do momento, iluminação dramática, estilo fotográfico
- NUNCA use prompts genéricos desconectados do texto do slide`}

PASSO 3 — searchQuery (derivado do imageContext):
- Extraia do imageContext o SUJEITO REAL + MOMENTO ESPECÍFICO para busca no Google Images
- 2 a 5 palavras, objetivas, em inglês ou português conforme o assunto
- Se o slide fala de um momento específico, inclua esse momento: não "Michael Jackson" mas "Michael Jackson moonwalk Billie Jean 1983"
- Se é evento recente, inclua ano: "Copa do Mundo 2026 troféu"
- NUNCA use termos genéricos: "palco", "estádio", "pessoa", "profissional", "apresentação"
- NUNCA inclua: cinematic, dark, moody, photorealistic, 8k, dramatic, lighting

Responda APENAS com JSON válido (sem markdown, sem comentários):
{
  "topic": "${topic}",
  "slides": [
    {
      "title": "TÍTULO COM [PALAVRA] DESTACADA",
      "body": "1-2 frases curtas e diretas com dados reais",
      "callToAction": "apenas no último slide, senão omita este campo",
      "imageContext": "1 frase: quem/o quê está acontecendo neste slide especificamente, derivado do texto acima",
      "imagePrompt": "prompt detalhado em inglês derivado do imageContext, elementos icônicos, cinematic lighting, dark moody background, high contrast, photorealistic",
      "searchQuery": "sujeito + momento específico do slide para Google Images, 2-5 palavras",
      "colorScheme": {
        "background": "#0a0a0a",
        "text": "#ffffff",
        "accent": "#ff6b35"
      }
    }
  ]
}`;

    const rawText = await geminiText(prompt, { maxTokens: 3000 });

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Resposta inválida da IA" }, { status: 500 });
    }

    let generated: GeneratedContent;
    try {
      generated = JSON.parse(jsonMatch[0]);
    } catch {
      // Repair common LLM JSON issues using a state machine
      const repaired = repairJson(jsonMatch[0]);
      try {
        generated = JSON.parse(repaired);
      } catch {
        // Último recurso: extrai slides completos da resposta truncada
        const partialSlides = extractPartialSlides(repaired);
        if (partialSlides.length === 0) throw new Error("Não foi possível interpretar a resposta da IA. Tente novamente.");
        generated = { topic, slides: partialSlides } as GeneratedContent;
      }
    }

    // Remove numeração/bullets que o modelo às vezes adiciona mesmo sendo proibido
    const stripNumbering = (text: string) =>
      text.replace(/^(\d+[\.\)]\s*|[•\-\*]\s*|#\d+\s*|Slide\s*\d+:?\s*|Passo\s*\d+:?\s*)/gim, "").trim();

    generated.slides = generated.slides.map((s) => ({
      ...s,
      title: stripNumbering(s.title ?? ""),
      body:  stripNumbering(s.body  ?? ""),
    }));

    const today = new Date().toISOString().slice(0, 10);
    redisIncr(`stats:carousels:${today}`).catch(() => {});
    return NextResponse.json(generated);
  } catch (err: any) {
    console.error("[generate] catch:", err);
    const msg = err?.message ?? "Erro desconhecido";
    if (/overload|overloaded|high demand|unavailable|503|529/i.test(msg)) {
      return NextResponse.json(
        { error: "A IA está sobrecarregada no momento. Aguarde alguns segundos e tente novamente." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: `Erro ao gerar: ${msg}` }, { status: 500 });
  }
}
