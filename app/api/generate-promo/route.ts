import { NextRequest, NextResponse } from "next/server";
import { GeneratedContent } from "@/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { productName, price, description, benefit, slideCount = 7 } = await req.json();

    if (!productName?.trim()) {
      return NextResponse.json({ error: "Nome do produto obrigatório" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500 });
    }

    const priceText = price ? `R$ ${price}` : "preço a definir";
    const descText = description?.trim() ? `Descrição: ${description}` : "";
    const benefitText = benefit?.trim() ? `Principal benefício/diferencial: ${benefit}` : "";

    const prompt = `Você é um especialista em copywriting de alta conversão para Instagram, especializado em posts promocionais para lojas e empreendedores.

PRODUTO: ${productName}
PREÇO: ${priceText}
${descText}
${benefitText}

Crie um carrossel de EXATAMENTE ${slideCount} slides para vender este produto no Instagram usando a fórmula AIDA + PAS (Problem-Agitate-Solution).

ESTRUTURA OBRIGATÓRIA:
- Slide 1: HOOK — Título que para o scroll. Toca na dor ou no desejo do cliente ideal. Ex: "CANSADO DE [problema]?" ou "SEU [produto] CHEGOU"
- Slides 2-3: AGITAÇÃO — Amplifique o problema ou desejo. Mostre que o cliente precisa disso
- Slides 4-${Math.max(4, slideCount - 3)}: SOLUÇÃO/BENEFÍCIOS — Apresente o produto com seus benefícios reais, diferenciais, o que transforma na vida do cliente
- Slide ${slideCount - 1}: PROVA SOCIAL / VALOR — Valor percebido, o que o cliente ganha, garantia, qualidade
- Slide ${slideCount} (último): OFERTA + CTA — Preço, urgência, chamada para ação clara

REGRAS DE COPY:
- Linguagem em 2ª pessoa: "Você", "Seu/Sua"
- Títulos curtos, impactantes, máx 6 palavras, em MAIÚSCULAS
- Coloque exatamente UMA palavra-chave entre [colchetes] para destacar em cor de acento
- Corpo: 1-2 frases curtas e persuasivas com benefício claro
- Use gatilhos mentais: escassez, prova social, autoridade, benefício emocional
- SEM emojis, SEM numeração nos títulos

REGRA CRÍTICA PARA imagePrompt:
- NUNCA mencione nomes de pessoas reais no imagePrompt
- Descreva o PRODUTO em cena: composição, iluminação, contexto de uso, ambiente
- Se o produto for roupa: "stylish clothing item on clean surface, soft shadow, premium product photography"
- Se for eletrônico: "sleek device on minimal surface, dramatic lighting, tech product showcase"
- Se for alimento: "delicious food product, natural lighting, appetite appeal, commercial food photography"
- Adapte ao contexto do produto: "${productName}"
- Cada slide deve ter imagePrompt ÚNICO, mostrando o produto de ângulo ou contexto diferente

REGRA CRÍTICA PARA searchQuery:
- Busca curta para foto real do produto no Google
- Ex para tênis Nike: "tênis Nike produto foto"
- Ex para bolo: "bolo artesanal confeitaria"
- Foque no produto, não na pessoa
- 2 a 5 palavras em português

CORES: Prefira paletas que transmitem confiança e desejo:
- Fundos escuros premium: #0a0a0a, #0d1117, #1a0a2e
- Acentos que convertem: #ff6b35 (urgência), #ffd700 (premium), #10b981 (confiança), #7c3aed (luxo)

Responda APENAS com JSON válido (sem markdown):
{
  "topic": "${productName}",
  "slides": [
    {
      "title": "TÍTULO COM [PALAVRA] DESTACADA",
      "body": "1-2 frases de copy persuasivo focado no benefício",
      "callToAction": "apenas no último slide: ex: 'Garanta o seu agora · ${priceText}'",
      "imagePrompt": "product photography prompt specific to this slide context, cinematic lighting, high contrast",
      "searchQuery": "busca curta do produto em português",
      "colorScheme": {
        "background": "#0a0a0a",
        "text": "#ffffff",
        "accent": "#ff6b35"
      }
    }
  ]
}`;

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
    console.error("[generate-promo] catch:", err);
    return NextResponse.json({ error: `Erro ao gerar: ${err?.message ?? "Erro desconhecido"}` }, { status: 500 });
  }
}
