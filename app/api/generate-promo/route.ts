import { NextRequest, NextResponse } from "next/server";
import { GeneratedContent } from "@/types";
import { geminiText } from "@/lib/gemini-text";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { productName, price, description, benefit, slideCount = 7 } = await req.json();

    if (!productName?.trim()) {
      return NextResponse.json({ error: "Nome do produto obrigatório" }, { status: 400 });
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
- Descreva cenas cinematográficas de produto com alto impacto visual e apelo emocional
- Exemplos por categoria:
  - Roupa/moda: "fashion product dramatically lit on glossy black surface, specular highlights, editorial style, luxury fashion photography, deep shadows, hero shot"
  - Eletrônico: "sleek device floating in dark studio, blue-white rim lighting, tech product showcase, neon reflection on surface, cinematic depth of field"
  - Alimento: "delicious food product with steam/condensation, soft warm golden light, macro detail, appetite appeal, five-star restaurant plating, commercial food photography"
  - Cosmético/beleza: "luxury beauty product on marble surface, golden hour light, bokeh background with sparkles, premium lifestyle aesthetic"
  - Genérico: "hero product shot on dramatic dark gradient background, volumetric lighting, rim light silhouette, 3D render quality, commercial advertising"
- Adapte ao contexto do produto: "${productName}"
- Cada slide deve ter imagePrompt ÚNICO, variando: ângulo (frontal/45°/overhead), contexto (studio/lifestyle/ambiente), iluminação (dramática/suave/colorida), mood (urgência/desejo/exclusividade)
- Inclua sempre: iluminação específica, qualidade de render (4K/hyperrealistic), atmosfera emocional

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

    const rawText = await geminiText(prompt, { maxTokens: 2048 });
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
