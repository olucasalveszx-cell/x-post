import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const BASE = "https://graph.instagram.com/v22.0";

function igPost(path: string, params: Record<string, string>, token: string) {
  return fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Bearer ${token}`,
    },
    body: new URLSearchParams(params),
  });
}

function igGet(path: string, params: Record<string, string>, token: string) {
  const qs = new URLSearchParams(params);
  return fetch(`${BASE}/${path}?${qs}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
}

function checkError(data: any, context: string) {
  if (!data.id) {
    const code = data.error?.code ?? 0;
    const msg  = data.error?.message ?? JSON.stringify(data);
    if (code === 190 || msg.includes("Authorization Error") || msg.includes("OAuthException")) {
      throw new Error(`Instagram API: Authorization Error — token expirado ou revogado (code ${code})`);
    }
    throw new Error(`${context}: ${msg}`);
  }
}

async function uploadCarouselItem(igAccountId: string, imageUrl: string, token: string): Promise<string> {
  const res = await igPost(`${igAccountId}/media`, {
    image_url: imageUrl,
    media_type: "IMAGE",
    is_carousel_item: "true",
  }, token);
  const data = await res.json();
  console.log("[publish] uploadCarouselItem:", JSON.stringify(data));
  checkError(data, "Erro ao fazer upload");
  return data.id;
}

async function waitUntilReady(mediaId: string, token: string, maxWaitMs = 90000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    const res = await igGet(`${mediaId}`, { fields: "status_code" }, token);
    const data = await res.json();

    if (data.error) {
      const code = data.error.code ?? 0;
      const msg  = data.error.message ?? JSON.stringify(data.error);
      if (code === 190 || msg.includes("Authorization Error") || msg.includes("OAuthException")) {
        throw new Error(`Instagram API: Authorization Error — token expirado ou revogado (code ${code})`);
      }
      throw new Error(`Instagram API: ${msg}`);
    }

    const status: string = data.status_code ?? "";
    console.log(`[publish] media ${mediaId} status: "${status}" (tentativa ${++attempt})`);

    if (status === "FINISHED") return;
    if (status === "ERROR")   throw new Error(`Mídia ${mediaId} falhou no processamento`);
    if (status === "EXPIRED") throw new Error(`Mídia ${mediaId} expirou`);

    await new Promise((r) => setTimeout(r, attempt < 10 ? 3000 : 5000));
  }
  throw new Error(`Instagram demorou demais para processar a mídia ${mediaId}. Tente novamente.`);
}

async function createCarousel(igAccountId: string, childIds: string[], caption: string, token: string): Promise<string> {
  const res = await igPost(`${igAccountId}/media`, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
  }, token);
  const data = await res.json();
  console.log("[publish] createCarousel:", JSON.stringify(data));
  checkError(data, "Erro ao criar carrossel");
  return data.id;
}

async function publishMedia(igAccountId: string, creationId: string, token: string): Promise<string> {
  const res = await igPost(`${igAccountId}/media_publish`, { creation_id: creationId }, token);
  const data = await res.json();
  console.log("[publish] publishMedia:", JSON.stringify(data));
  if (!data.id) throw new Error(`Erro ao publicar: ${JSON.stringify(data.error ?? data)}`);
  return data.id;
}

async function uploadStory(igAccountId: string, imageUrl: string, token: string): Promise<string> {
  const res = await igPost(`${igAccountId}/media`, {
    image_url: imageUrl,
    media_type: "STORIES",
  }, token);
  const data = await res.json();
  console.log("[publish] uploadStory:", JSON.stringify(data));
  checkError(data, "Erro ao criar story");
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

    console.log(`[publish] Iniciando — ${imageUrls.length} img(s), tipo: ${postType}, account: ${igAccountId}`);

    // ── Stories ──────────────────────────────────────────────
    if (postType === "stories") {
      const postIds: string[] = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const mediaId = await uploadStory(igAccountId, imageUrls[i], igToken);
        await waitUntilReady(mediaId, igToken);
        const postId = await publishMedia(igAccountId, mediaId, igToken);
        postIds.push(postId);
      }
      return NextResponse.json({
        success: true,
        postId: postIds[0],
        permalink: "",
        message: `${postIds.length} story${postIds.length > 1 ? "s" : ""} publicado${postIds.length > 1 ? "s" : ""} com sucesso!`,
      });
    }

    // ── Carrossel ─────────────────────────────────────────────
    if (imageUrls.length < 2 || imageUrls.length > 10) {
      return NextResponse.json({ error: "O carrossel precisa ter entre 2 e 10 imagens" }, { status: 400 });
    }

    const childIds = await Promise.all(
      (imageUrls as string[]).map((url: string, i: number) =>
        uploadCarouselItem(igAccountId, url, igToken).then((id) => {
          console.log(`[publish] Container ${i + 1}/${imageUrls.length}: ${id}`);
          return id;
        })
      )
    );

    await Promise.all(childIds.map((id) => waitUntilReady(id, igToken)));

    const carouselId = await createCarousel(igAccountId, childIds, caption ?? "", igToken);
    await waitUntilReady(carouselId, igToken);

    const postId = await publishMedia(igAccountId, carouselId, igToken);

    let permalink = "";
    try {
      const permRes = await igGet(postId, { fields: "permalink" }, igToken);
      const permData = await permRes.json();
      permalink = permData.permalink ?? "";
    } catch {}

    return NextResponse.json({ success: true, postId, permalink, message: "Carrossel publicado com sucesso!" });

  } catch (err: any) {
    console.error("[publish]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
