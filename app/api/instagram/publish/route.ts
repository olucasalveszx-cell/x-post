import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

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

// Aguarda até o container estar FINISHED (pronto para publicar)
async function waitUntilReady(mediaId: string, token: string, maxWaitMs = 30000): Promise<void> {
  const interval = 2000;
  const maxAttempts = Math.ceil(maxWaitMs / interval);

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${GRAPH}/${mediaId}?fields=status_code&access_token=${token}`
    );
    const data = await res.json();
    const status: string = data.status_code ?? "";
    console.log(`[publish] media ${mediaId} status: ${status} (tentativa ${i + 1})`);

    if (status === "FINISHED") return;
    if (status === "ERROR") throw new Error(`Mídia ${mediaId} falhou no processamento`);

    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Timeout aguardando processamento da mídia ${mediaId}`);
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

    // 1. Upload de cada imagem
    console.log(`[publish] Fazendo upload de ${imageUrls.length} imagens...`);
    const childIds: string[] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const id = await uploadCarouselItem(igAccountId, imageUrls[i], igToken);
      childIds.push(id);
      console.log(`[publish] Imagem ${i + 1}/${imageUrls.length} enviada: ${id}`);
    }

    // 2. Aguarda todas as mídias ficarem prontas
    console.log("[publish] Aguardando processamento das mídias...");
    await Promise.all(childIds.map((id) => waitUntilReady(id, igToken)));
    console.log("[publish] Todas as mídias prontas!");

    // 3. Cria container do carrossel
    console.log("[publish] Criando container do carrossel...");
    const carouselId = await createCarousel(igAccountId, childIds, caption ?? "", igToken);

    // 4. Aguarda o carrossel ficar pronto
    await waitUntilReady(carouselId, igToken);

    // 5. Publica
    console.log("[publish] Publicando...");
    const postId = await publishCarousel(igAccountId, carouselId, igToken);

    console.log(`[publish] Publicado! Post ID: ${postId}`);

    // Busca permalink do post
    let permalink = "";
    try {
      const permRes = await fetch(`${GRAPH}/${postId}?fields=permalink&access_token=${igToken}`);
      const permData = await permRes.json();
      permalink = permData.permalink ?? "";
    } catch {}

    return NextResponse.json({
      success: true,
      postId,
      permalink,
      message: `Carrossel publicado com sucesso!`,
    });
  } catch (err: any) {
    console.error("[publish]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
