import { NextRequest, NextResponse } from "next/server";
import { GenerateRequest, GeneratedContent, WritingStyle } from "@/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { consumeCredits } from "@/lib/credits";
import { redisIncr } from "@/lib/redis";
import { geminiText } from "@/lib/gemini-text";

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

${withFace ? `REGRA CRÍTICA PARA imagePrompt (MODO COM ROSTO):
- SEMPRE coloque UMA PESSOA como sujeito principal da cena — a pessoa DEVE ser o foco
- A pessoa deve estar FAZENDO exatamente o que o texto/título do slide descreve
- Formato obrigatório: "[pessoa] [ação do texto], [ambiente], [iluminação natural]"
- NUNCA gere cenas sem pessoa (paisagens, objetos soltos, símbolos, troféus isolados)
- Exemplos CORRETOS:
  * Slide sobre produtividade: "person focused on laptop at clean modern desk, natural window light, shallow depth of field"
  * Slide sobre vendas: "person presenting confidently to small group in meeting room, corporate environment, warm light"
  * Slide sobre redes sociais: "person smiling holding smartphone, creating content, bright home studio background"
  * Slide sobre investimentos: "person analyzing financial charts on dual monitors, home office, focused expression"
  * Slide sobre saúde: "person doing yoga on mat in bright minimalist room, morning light"
- A ação deve ser DIRETAMENTE derivada do texto: leu "publicar conteúdo"? → pessoa com câmera/celular
- NUNCA use prompts genéricos ou cenas sem pessoa visível` : `REGRA CRÍTICA PARA imagePrompt:
- Cada slide DEVE ter um imagePrompt ÚNICO e ESPECÍFICO que descreve visualmente o conteúdo daquele slide
- O imagePrompt deve ser em INGLÊS, detalhado como um prompt de IA de imagem (Midjourney/Stable Diffusion)
- NUNCA use nomes próprios de pessoas reais (celebridades, políticos, atletas) — isso bloqueia a IA geradora
- Em vez do NOME, descreva os ELEMENTOS VISUAIS ICÔNICOS que tornam o assunto imediatamente reconhecível:
  * Michael Jackson → "performer in white glove and black fedora, sequined military jacket, moonwalk silhouette on neon-lit stage, single spotlight, concert fog, dramatic contrast"
  * Neymar → "Brazilian soccer player with distinctive blond hair, colorful boots, celebrating goal, green field, stadium crowd in yellow jerseys"
  * Steve Jobs → "presenter in black turtleneck holding sleek silver device, minimalist white stage, single spotlight, tech event atmosphere"
  * Copa do Mundo → "golden FIFA World Cup trophy held by gloved hands, stadium confetti rain, ecstatic crowd in team jerseys, green field"
  * Bitcoin → "gold coin with B symbol glowing in neon-lit dark room, rising price charts, digital matrix background"
  * Eleições → "presidential podium with national flag, crowd waving banners, dramatic spotlight, patriotic atmosphere"
- A imagem deve ser IMEDIATAMENTE RECONHECÍVEL como o assunto sem precisar do nome
- Descreva: objetos de assinatura, roupas/estilo característico, ambiente icônico, momento famoso, era/época, cores
- Inclua iluminação, ângulo de câmera, atmosfera, estilo fotográfico (cinematic, documentary, editorial)
- NUNCA use prompts genéricos ("concert stage", "man running"). Cada prompt deve ser único e visualmente conectado ao conteúdo`}

REGRA CRÍTICA PARA searchQuery:
- Campo SEPARADO do imagePrompt, usado para buscar FOTOS REAIS no Google Images
- Deve ser uma busca curta, objetiva, em português, de 2 a 5 palavras
- Foque no SUJEITO REAL e no CONTEÚDO ESPECÍFICO daquele slide: nome da pessoa + contexto do slide
- Exemplo slide sobre Michael Jackson dançando: "Michael Jackson moonwalk performance"
- Exemplo slide sobre Neymar gol importante: "Neymar gol Copa do Mundo"
- Exemplo slide sobre Copa do Mundo troféu: "Copa do Mundo 2026 troféu"
- Exemplo slide sobre Steve Jobs lançamento iPhone: "Steve Jobs iPhone lançamento 2007"
- NUNCA use termos genéricos como: "palco", "estádio", "pessoa", "profissional"
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

    const rawText = await geminiText(prompt, { maxTokens: 1500 });

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Resposta inválida da IA" }, { status: 500 });
    }

    const generated: GeneratedContent = JSON.parse(jsonMatch[0]);

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
    return NextResponse.json({ error: `Erro ao gerar: ${msg}` }, { status: 500 });
  }
}
