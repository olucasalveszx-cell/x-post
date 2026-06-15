import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const GRAPH = "https://graph.instagram.com/v22.0";

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
  if (!data.id) {
    const code = data.error?.code ?? 0;
    const msg  = data.error?.message ?? JSON.stringify(data);
    if (code === 190 || msg.includes("Authorization Error") || msg.includes("OAuthException")) {
      throw new Error(`Instagram API: Authorization Error — token expirado ou revogado (code ${code})`);
    }
    throw new Error(`Erro ao fazer upload: ${msg}`);
  }
  return data.id;
}

// Aguarda até o container estar FINISHED (pronto para publicar)
async function waitUntilReady(mediaId: string, token: string, maxWaitMs = 90000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    const res = await fetch(
      `${GRAPH}/${mediaId}?fields=status_code&access_token=${token}`
    );
    const data = await res.json();

    // Surface Instagram API errors immediately instead of timing out silently
    if (data.error) {
      const code = data.error.code ?? 0;
      const msg  = data.error.message ?? JSON.stringify(data.error);
      // code 190 = expired/invalid OAuth token
      if (code === 190 || msg.includes("Authorization Error") || msg.includes("OAuthException")) {
        throw new Error(`Instagram API: Authorization Error — token expirado ou revogado (code ${code})`);
      }
      throw new Error(`Instagram API: ${msg}`);
    }

    const status: string = data.status_code ?? "";
    console.log(`[publish] media ${mediaId} status: "${status}" (tentativa ${++attempt})`);

    if (status === "FINISHED") return;
    if (status === "ERROR")   throw new Error(`Mídia ${mediaId} falhou no processamento — verifique se a URL da imagem está pública e acessível`);
    if (status === "EXPIRED") throw new Error(`Mídia ${mediaId} expirou — a URL da imagem pode ter ficado inacessível`);
    if (status && status !== "IN_PROGRESS") console.warn(`[publish] status inesperado: ${status}`);

    // Poll: 3s for first 10 attempts, then 5s
    const interval = attempt < 10 ? 3000 : 5000;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Instagram demorou demais para processar a mídia ${mediaId}. Tente novamente.`);
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

async function uploadStory(igAccountId: string, imageUrl: string, token: string): Promise<string> {
  const res = await fetch(`${GRAPH}/${igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      media_type: "STORIES",
      access_token: token,
    }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Erro ao criar story: ${JSON.stringify(data.error ?? data)}`);
  return data.id;
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrls, caption, igToken, igAccountId, postType = "carousel" } = await req.json();

    if (!igToken || !igAccountId) {
      return NextResponse.json({ error: "Conta Instagram não conectada" }, { status: 400 });
    }
    if (!imageUrls?.length) {
      return NextResponse.json({ error: "Nenhuma imagem para publicar" }, { status: 400 });
    }

    console.log(`[publish] Iniciando publicação — ${imageUrls.length} imagem(ns), tipo: ${postType}`);

    // ── Stories ──────────────────────────────────────────────
    if (postType === "stories") {
      console.log(`[publish] Publicando ${imageUrls.length} story(ies)...`);
      const postIds: string[] = [];

      for (let i = 0; i < imageUrls.length; i++) {
        const mediaId = await uploadStory(igAccountId, imageUrls[i], igToken);
        await waitUntilReady(mediaId, igToken);
        const postId = await publishCarousel(igAccountId, mediaId, igToken);
        postIds.push(postId);
        console.log(`[publish] Story ${i + 1}/${imageUrls.length} publicado: ${postId}`);
      }

      return NextResponse.json({
        success: true,
        postId: postIds[0],
        permalink: "",
        message: `${postIds.length} story${postIds.length > 1 ? "s" : ""} publicado${postIds.length > 1 ? "s" : ""} com sucesso!`,
      });
    }

    // ── Carrossel (Feed) ─────────────────────────────────────
    if (imageUrls.length < 2 || imageUrls.length > 10) {
      return NextResponse.json({ error: "O carrossel precisa ter entre 2 e 10 imagens" }, { status: 400 });
    }

    console.log(`[publish] Criando ${imageUrls.length} containers em paralelo...`);
    // Create all containers in parallel — saves N×300ms compared to sequential
    const childIds = await Promise.all(
      (imageUrls as string[]).map((url: string, i: number) =>
        uploadCarouselItem(igAccountId, url, igToken).then((id) => {
          console.log(`[publish] Container ${i + 1}/${imageUrls.length}: ${id}`);
          return id;
        })
      )
    );

    console.log("[publish] Aguardando processamento...");
    await Promise.all(childIds.map((id) => waitUntilReady(id, igToken)));

    console.log("[publish] Criando carrossel...");
    const carouselId = await createCarousel(igAccountId, childIds, caption ?? "", igToken);
    await waitUntilReady(carouselId, igToken);

    console.log("[publish] Publicando...");
    const postId = await publishCarousel(igAccountId, carouselId, igToken);

    let permalink = "";
    try {
      const permRes = await fetch(`${GRAPH}/${postId}?fields=permalink&access_token=${igToken}`);
      const permData = await permRes.json();
      permalink = permData.permalink ?? "";
    } catch {}

    console.log(`[publish] Publicado! Post ID: ${postId}`);
    return NextResponse.json({ success: true, postId, permalink, message: "Carrossel publicado com sucesso!" });

  } catch (err: any) {
    console.error("[publish]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
