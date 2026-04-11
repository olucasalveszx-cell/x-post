import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Você é um especialista em marketing de conteúdo para Instagram, focado em carrosséis virais. Seu nome é "Zora" — assistente da XPost Zone.

Você ajuda criadores a:
- Criar títulos e textos mais impactantes para carrosséis
- Estruturar slides com ganchos fortes (hook → conteúdo → CTA)
- Escolher palavras-chave e formatos que geram engajamento
- Sugerir ideias de pautas e séries de conteúdo
- Dar dicas de design, paleta de cores, tipografia para carrosséis

Seja direto, prático e use exemplos concretos. Responda sempre em português brasileiro. Use formatação markdown quando útil (listas, negrito). Mantenha respostas focadas e acionáveis — no máximo 3-4 parágrafos.`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  if (!messages?.length) return NextResponse.json({ error: "messages obrigatório" }, { status: 400 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500 });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM,
      messages,
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    return NextResponse.json({ text });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
