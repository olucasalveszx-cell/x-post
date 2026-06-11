import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageUrls, caption, accessToken, instagramAccountId } = await req.json();

    if (!accessToken || !instagramAccountId) {
      return NextResponse.json(
        { error: "Access Token e Instagram Account ID são obrigatórios" },
        { status: 400 }
      );
    }

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ error: "Nenhuma imagem fornecida" }, { status: 400 });
    }

    const BASE = "https://graph.facebook.com/v20.0";

    // Passo 1: Criar containers de mídia para cada imagem
    const containerIds: string[] = [];

    for (const imageUrl of imageUrls) {
      const res = await fetch(
        `${BASE}/${instagramAccountId}/media?image_url=${encodeURIComponent(imageUrl)}&is_carousel_item=true&access_token=${accessToken}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok || !data.id) {
        return NextResponse.json(
          { error: `Falha ao criar container: ${data.error?.message ?? "erro desconhecido"}` },
          { status: 500 }
        );
      }
      containerIds.push(data.id);
    }

    // Passo 2: Criar container do carrossel
    const carouselRes = await fetch(
      `${BASE}/${instagramAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "CAROUSEL",
          children: containerIds,
          caption,
          access_token: accessToken,
        }),
      }
    );
    const carouselData = await carouselRes.json();

    if (!carouselRes.ok || !carouselData.id) {
      return NextResponse.json(
        { error: `Falha ao criar carrossel: ${carouselData.error?.message ?? "erro desconhecido"}` },
        { status: 500 }
      );
    }

    // Passo 3: Publicar
    const publishRes = await fetch(
      `${BASE}/${instagramAccountId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: carouselData.id,
          access_token: accessToken,
        }),
      }
    );
    const publishData = await publishRes.json();

    if (!publishRes.ok) {
      return NextResponse.json(
        { error: `Falha ao publicar: ${publishData.error?.message ?? "erro desconhecido"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      postId: publishData.id,
      message: "Carrossel publicado com sucesso!",
    });
  } catch (err) {
    console.error("[publish]", err);
    return NextResponse.json({ error: "Erro interno ao publicar" }, { status: 500 });
  }
}
