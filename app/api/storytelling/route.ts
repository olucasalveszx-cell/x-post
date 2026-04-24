import { NextRequest, NextResponse } from "next/server";
import { geminiText } from "@/lib/gemini-text";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { topic, tone, format, slides } = await req.json();

  if (!topic?.trim()) {
    return NextResponse.json({ error: "Tema obrigatório" }, { status: 400 });
  }

  const numSlides = Math.min(Math.max(parseInt(slides) || 5, 3), 10);

  const prompt = `Você é um especialista em storytelling para Instagram Stories.

Crie um roteiro de Stories para o seguinte tema:
- **Tema/Produto:** ${topic}
- **Tom:** ${tone}
- **Formato:** ${format}
- **Número de Stories:** ${numSlides}

Responda APENAS com um JSON válido neste formato exato (sem markdown, sem explicações):
{
  "hook": "texto do story de abertura — máx 80 caracteres — deve parar o scroll",
  "scenes": [
    { "text": "texto do story — máx 100 caracteres por cena", "tip": "dica de design ou visual para este story" }
  ],
  "cta": "texto do story final com call-to-action — máx 80 caracteres"
}

Regras:
- Textos curtos e impactantes (Stories são visuais)
- O hook deve criar curiosidade imediata
- Cada scene deve ter uma única ideia clara
- Tips de design devem ser práticas (ex: "use fundo escuro com texto branco", "adicione emoji relevante")
- O CTA deve ser claro e gerar ação (seguir, salvar, responder, clicar no link)
- Escreva tudo em português brasileiro`;

  try {
    const raw = await geminiText(prompt, { maxTokens: 1024 });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta inválida da IA");

    const script = JSON.parse(jsonMatch[0]);
    if (!script.hook || !Array.isArray(script.scenes) || !script.cta) {
      throw new Error("Estrutura inválida");
    }

    // Garante que temos o número certo de cenas
    while (script.scenes.length < numSlides - 2) {
      script.scenes.push({ text: "...", tip: "" });
    }
    script.scenes = script.scenes.slice(0, numSlides - 2);

    return NextResponse.json({ script });
  } catch (err: any) {
    console.error("[storytelling]", err);
    return NextResponse.json({ error: err.message ?? "Erro ao gerar roteiro" }, { status: 500 });
  }
}
