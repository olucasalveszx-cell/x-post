import { NextRequest, NextResponse } from "next/server";
import { geminiText } from "@/lib/gemini-text";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { topic, context } = await req.json();

  if (!topic?.trim()) {
    return NextResponse.json({ error: "Tema obrigatório" }, { status: 400 });
  }

  const contextLine = context?.trim()
    ? `\n\nCONTEXTO DO CARROSSEL (slides existentes):\n${context}`
    : "";

  const prompt = `Você é especialista em conteúdo viral para Instagram.

Crie o conteúdo para UM ÚNICO SLIDE sobre: "${topic}"${contextLine}

Responda APENAS com JSON válido (sem markdown):
{
  "title": "título impactante com UMA palavra entre [colchetes] para destaque — máx 6 palavras",
  "body": "2 frases curtas e impactantes que complementam o título",
  "imagePrompt": "descrição em inglês para gerar imagem cinematográfica de fundo — seja visual e específico",
  "accentColor": "#hexcolor (cor vibrante que combina com o tema)",
  "backgroundColor": "#0a0a0a"
}

Regras:
- Título: sem numeração, sem emojis, máx 6 palavras, impactante
- Corpo: direto, complementa o título, max 20 palavras
- imagePrompt: cena visual impressionante relacionada ao tema, em inglês
- accentColor: escolha uma cor vibrante (ex: #ff6b35, #00d4ff, #ff3366, #ffd700, #7c3aed, #10b981)
- Escreva título e corpo em português brasileiro`;

  try {
    const raw = await geminiText(prompt, { maxTokens: 512 });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Resposta inválida");

    const data = JSON.parse(match[0]);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erro ao gerar" }, { status: 500 });
  }
}
