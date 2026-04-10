import { NextRequest, NextResponse } from "next/server";

// Esta rota recebe HTML de cada slide e retorna as URLs das imagens geradas.
// O export real acontece no frontend via html2canvas.
// Esta rota serve para validar e armazenar temporariamente as imagens em base64.

export async function POST(req: NextRequest) {
  try {
    const { slides } = await req.json();

    // slides é um array de { id, dataUrl } vindos do frontend (html2canvas)
    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: "Slides inválidos" }, { status: 400 });
    }

    // Retorna as imagens prontas para download ou publicação
    return NextResponse.json({
      success: true,
      images: slides.map((s: { id: string; dataUrl: string }, i: number) => ({
        index: i + 1,
        id: s.id,
        dataUrl: s.dataUrl,
      })),
    });
  } catch (err) {
    console.error("[export]", err);
    return NextResponse.json({ error: "Erro ao exportar" }, { status: 500 });
  }
}
