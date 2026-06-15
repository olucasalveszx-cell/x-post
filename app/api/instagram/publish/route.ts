import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const BASE = "https://graph.instagram.com/v22.0";

function igPost(path: string, params: Record<string, string>, token: string) {
  return fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`,
    },
    body: new URLSearchParams(params),
  });
}

function igGet(path: string, params: Record<string, string>, token: string) {
  return fetch(`${BASE}/${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function checkError(data: any, context: string) {
  if (!data.id) {
    const code = data.error?.code ?? 0;
    const msg  = data.error?.message ?? JSON.stringify(data);
    if (code === 190 || msg.includes("OAuthException")) throw new Error("Token expirado — reconecte sua conta Instagram");
    throw new Error(`${context}: ${msg}`);
  }
}

async function waitUntilReady(mediaId: string, token: string): Promise<void> {
  const deadline = Date.now() + 90000;
  let attempt = 0;
  while (Date.now() < deadline) {
    const data = await igGet(mediaId, { fields: "status_code" }, token).then(r => r.json());
    if (data.error) {
      if (data.error.code === 190) throw new Error("Token expirado — reconecte sua conta Instagram");
      throw new Error(`Instagram API: ${data.error.message}`);
    }
    const status: string = data.status_code ?? "";
    console.log(`[publish] ${mediaId} → ${status} (tentativa ${++attempt})`);
    if (status === "FINISHED") return;
    if (status === "ERROR")    throw new Error(`Processamento falhou: ${mediaId}`);
    if (status === "EXPIRED")  throw new Error(`Mídia expirou: ${mediaId}`);
    await new Promise(r => setTimeout(r, attempt < 10 ? 3000 : 5000));
  }
  throw new Error("Instagram demorou demais. Tente novamente.");
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrls, caption, igToken, igAccountId, postType = "carousel" } = await req.json();

    if (!igToken)           return NextResponse.json({ error: "Conta Instagram não conectada" }, { status: 400 });
    if (!imageUrls?.length) return NextResponse.json({ error: "Nenhuma imagem para publicar" }, { status: 400 });

    console.log(`[publish] ${imageUrls.length} img(s), tipo: ${postType}`);

    // ── Stories ──────────────────────────────────────────────
    if (postType === "stories") {
      const postIds: string[] = [];
      for (const url of imageUrls as string[]) {
        const upData = await igPost("me/media", { image_url: url, media_type: "STORIES" }, igToken).then(r => r.json());
        console.log("[publish] story upload:", JSON.stringify(upData));
        checkError(upData, "Erro ao criar story");
        await waitUntilReady(upData.id, igToken);
        const pubData = await igPost("me/media_publish", { creation_id: upData.id }, igToken).then(r => r.json());
        if (!pubData.id) throw new Error(`Erro ao publicar story: ${JSON.stringify(pubData.error ?? pubData)}`);
        postIds.push(pubData.id);
      }
      return NextResponse.json({ success: true, postId: postIds[0], permalink: "", message: `${postIds.length} story(s) publicado(s)!` });
    }

    // ── Single image ──────────────────────────────────────────
    if (imageUrls.length === 1) {
      const upData = await igPost("me/media", { image_url: imageUrls[0], caption: caption ?? "" }, igToken).then(r => r.json());
      console.log("[publish] single upload:", JSON.stringify(upData));
      checkError(upData, "Erro ao criar mídia");
      await waitUntilReady(upData.id, igToken);
      const pubData = await igPost("me/media_publish", { creation_id: upData.id }, igToken).then(r => r.json());
      console.log("[publish] single publish:", JSON.stringify(pubData));
      if (!pubData.id) throw new Error(`Erro ao publicar: ${JSON.stringify(pubData.error ?? pubData)}`);
      let permalink = "";
      try { permalink = (await igGet(pubData.id, { fields: "permalink" }, igToken).then(r => r.json())).permalink ?? ""; } catch {}
      return NextResponse.json({ success: true, postId: pubData.id, permalink, message: "Publicado com sucesso!" });
    }

    // ── Carrossel ─────────────────────────────────────────────
    if (imageUrls.length > 10) {
      return NextResponse.json({ error: "O carrossel suporta no máximo 10 imagens" }, { status: 400 });
    }

    const childIds = await Promise.all(
      (imageUrls as string[]).map(async (url, i) => {
        const data = await igPost("me/media", { image_url: url, media_type: "IMAGE", is_carousel_item: "true" }, igToken).then(r => r.json());
        console.log(`[publish] item ${i + 1}:`, JSON.stringify(data));
        checkError(data, "Erro ao fazer upload");
        return data.id as string;
      })
    );

    await Promise.all(childIds.map(id => waitUntilReady(id, igToken)));

    const carousel = await igPost("me/media", { media_type: "CAROUSEL", children: childIds.join(","), caption: caption ?? "" }, igToken).then(r => r.json());
    console.log("[publish] carousel:", JSON.stringify(carousel));
    checkError(carousel, "Erro ao criar carrossel");
    await waitUntilReady(carousel.id, igToken);

    const pub = await igPost("me/media_publish", { creation_id: carousel.id }, igToken).then(r => r.json());
    console.log("[publish] publish:", JSON.stringify(pub));
    if (!pub.id) throw new Error(`Erro ao publicar: ${JSON.stringify(pub.error ?? pub)}`);

    let permalink = "";
    try { permalink = (await igGet(pub.id, { fields: "permalink" }, igToken).then(r => r.json())).permalink ?? ""; } catch {}

    return NextResponse.json({ success: true, postId: pub.id, permalink, message: "Carrossel publicado com sucesso!" });

  } catch (err: any) {
    console.error("[publish]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
