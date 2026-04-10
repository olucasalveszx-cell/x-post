import { NextRequest, NextResponse } from "next/server";

const GRAPH = "https://graph.facebook.com/v20.0";

async function uploadCarouselItem(igAccountId: string, imageUrl: string, token: string): Promise<string> {
  const res = await fetch(`${GRAPH}/${igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      media_type: "IMAGE",
      is_carousel_item: true,
      access_token: token,
    }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Erro ao fazer upload: ${JSON.stringify(data.error ?? data)}`);
  return data.id;
}

async function createCarousel(igAccountId: string, childIds: string[], caption: string, token: string): Promise<string> {
  const res = await fetch(`${GRAPH}/${igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption,
      access_token: token,
    }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Erro ao criar carrossel: ${JSON.stringify(data.error ?? data)}`);
  return data.id;
}

async function publishCarousel(igAccountId: string, carouselId: string, token: string): Promise<string> {
  const res = await fetch(`${GRAPH}/${igAccountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: carouselId, access_token: token }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Erro ao publicar: ${JSON.stringify(data.error ?? data)}`);
  return data.id;
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrls, caption, igToken, igAccountId } = await req.json();

    if (!igToken || !igAccountId) {
      return NextResponse.json({ error: "Conta Instagram não conectada" }, { status: 400 });
    }
    if (!imageUrls?.length) {
      return NextResponse.json({ error: "Nenhuma imagem para publicar" }, { status: 400 });
    }
    if (imageUrls.length < 2 || imageUrls.length > 10) {
      return NextResponse.json({ error: "O carrossel precisa ter entre 2 e 10 imagens" }, { status: 400 });
    }

    // 1. Upload de cada imagem como item do carrossel
    console.log(`[publish] Fazendo upload de ${imageUrls.length} imagens...`);
    const childIds: string[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      // Aceita URLs públicas ou URLs do nosso servidor
      const id = await uploadCarouselItem(igAccountId, url, igToken);
      childIds.push(id);
      console.log(`[publish] Imagem ${i + 1}/${imageUrls.length} enviada: ${id}`);
    }

    // 2. Cria container do carrossel
    console.log("[publish] Criando container do carrossel...");
    const carouselId = await createCarousel(igAccountId, childIds, caption ?? "", igToken);

    // 3. Publica
    console.log("[publish] Publicando...");
    const postId = await publishCarousel(igAccountId, carouselId, igToken);

    console.log(`[publish] Publicado! Post ID: ${postId}`);
    return NextResponse.json({
      success: true,
      postId,
      message: `Carrossel publicado com sucesso! (ID: ${postId})`,
    });
  } catch (err: any) {
    console.error("[publish]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
