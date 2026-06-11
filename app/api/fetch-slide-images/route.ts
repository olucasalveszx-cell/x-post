import { NextRequest, NextResponse } from "next/server";
import { enrichSlidesWithImages } from "@/lib/fetch-slide-images";
import { GeneratedSlide } from "@/types";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slides: GeneratedSlide[] = body.slides;

    if (!Array.isArray(slides) || slides.length === 0) {
      return NextResponse.json(
        { error: "Campo 'slides' é obrigatório e deve ser um array não vazio." },
        { status: 400 }
      );
    }

    if (slides.length > 20) {
      return NextResponse.json(
        { error: "Máximo de 20 slides por requisição." },
        { status: 400 }
      );
    }

    const enriched = await enrichSlidesWithImages(slides);
    return NextResponse.json({ slides: enriched });
  } catch (err: any) {
    console.error("[fetch-slide-images]", err);
    return NextResponse.json(
      { error: err?.message ?? "Erro ao buscar imagens." },
      { status: 500 }
    );
  }
}
