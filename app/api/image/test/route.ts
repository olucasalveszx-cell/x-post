import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });

  // Lista todos os modelos disponíveis na chave
  const listRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`,
    { signal: AbortSignal.timeout(10000) }
  );
  const listData = await listRes.json();

  if (!listRes.ok) {
    return NextResponse.json({ error: listData.error?.message ?? "Erro ao listar modelos", keyPrefix: key.slice(0, 8) + "..." }, { status: 500 });
  }

  const models: any[] = listData.models ?? [];

  // Filtra apenas os que suportam geração de imagem
  const imageModels = models
    .filter((m: any) =>
      m.supportedGenerationMethods?.includes("generateContent") ||
      m.supportedGenerationMethods?.includes("predict")
    )
    .filter((m: any) =>
      m.name?.toLowerCase().includes("image") ||
      m.name?.toLowerCase().includes("imagen") ||
      m.displayName?.toLowerCase().includes("image") ||
      m.outputTokenLimit === 0 // modelos de imagem geralmente não têm tokens de saída
    )
    .map((m: any) => ({
      name: m.name,
      displayName: m.displayName,
      methods: m.supportedGenerationMethods,
    }));

  // Todos os modelos disponíveis (resumido)
  const allModels = models.map((m: any) => ({
    name: m.name,
    displayName: m.displayName,
    methods: m.supportedGenerationMethods,
  }));

  return NextResponse.json({
    keyPrefix: key.slice(0, 8) + "...",
    totalModels: models.length,
    imageModels,
    allModels,
  });
}
