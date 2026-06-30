import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConnectedAccount, IG_GRAPH } from "@/lib/instagram-server";
import { trackPublishedPost } from "@/lib/performance-loop";

export const maxDuration = 120;

function igPost(path: string, params: Record<string, string>, token: string) {
  const url = path.startsWith("http") ? path : `${IG_GRAPH}/${path}`;
  return fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${token}` },
    body:    new URLSearchParams(params),
  });
}

function igGet(path: string, params: Record<string, string>, token: string) {
  const url = path.startsWith("http") ? path : `${IG_GRAPH}/${path}`;
  return fetch(`${url}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function checkError(data: any, context: string) {
  if (!data.id) {
    const code = data.error?.code ?? 0;
    const msg  = data.error?.message ?? JSON.stringify(data);
    if (code === 190 || msg.includes("OAuthException")) {
      throw new Error("Token expirado — reconecte sua conta Instagram no seu Perfil");
    }
    if (code === 10) throw new Error("Permissão negada — reconecte sua conta com as permissões corretas");
    throw new Error(`${context}: ${msg}`);
  }
}

async function waitUntilReady(mediaId: string, token: string): Promise<void> {
  const deadline = Date.now() + 90_000;
  let attempt    = 0;
  while (Date.now() < deadline) {
    const data = await igGet(mediaId, { fields: "status_code" }, token).then(r => r.json());
    if (data.error) {
      if (data.error.code === 190) throw new Error("Token expirado — reconecte sua conta Instagram");
      throw new Error(`Instagram API: ${data.error.message}`);
    }
    const status: string = data.status_code ?? "";
    console.log(`[publish] ${mediaId} → ${status} (tentativa ${++attempt})`);
    if (status === "FINISHED") return;
    if (status === "ERROR")    throw new Error(`Processamento da mídia falhou: ${mediaId}`);
    if (status === "EXPIRED")  throw new Error(`Mídia expirou antes de ser publicada: ${mediaId}`);
    await new Promise(r => setTimeout(r, attempt < 10 ? 3000 : 5000));
  }
  throw new Error("Instagram demorou demais para processar. Tente novamente.");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email   = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    // Token vem sempre do servidor (nunca do cliente)
    const account = await getConnectedAccount(email);
    if (!account) {
      return NextResponse.json({ error: "Conta Instagram não conectada. Conecte sua conta no Perfil." }, { status: 400 });
    }

    const igToken     = account.access_token;
    const igAccountId = account.instagram_id ?? "";

    const { imageUrls, caption, postType = "carousel", category, newsId, hook } = await req.json();

    if (!imageUrls?.length) return NextResponse.json({ error: "Nenhuma imagem para publicar" }, { status: 400 });

    console.log(`[publish] user:${email} imgs:${imageUrls.length} tipo:${postType}`);

    // ── Stories ───────────────────────────────────────────────────────────────
    if (postType === "stories") {
      const postIds: string[] = [];
      for (const url of imageUrls as string[]) {
        const upData = await igPost(`${igAccountId}/media`, { image_url: url, media_type: "STORIES" }, igToken).then(r => r.json());
        checkError(upData, "Erro ao criar story");
        await waitUntilReady(upData.id, igToken);
        const pubData = await igPost(`${igAccountId}/media_publish`, { creation_id: upData.id }, igToken).then(r => r.json());
        if (!pubData.id) throw new Error(`Erro ao publicar story: ${JSON.stringify(pubData.error ?? pubData)}`);
        postIds.push(pubData.id);
      }
      return NextResponse.json({ success: true, postId: postIds[0], permalink: "", message: `${postIds.length} story(s) publicado(s)!` });
    }

    // ── Post único ────────────────────────────────────────────────────────────
    if (imageUrls.length === 1) {
      const upData = await igPost(`${igAccountId}/media`, { image_url: imageUrls[0], caption: caption ?? "" }, igToken).then(r => r.json());
      checkError(upData, "Erro ao criar mídia");
      await waitUntilReady(upData.id, igToken);
      const pubData = await igPost(`${igAccountId}/media_publish`, { creation_id: upData.id }, igToken).then(r => r.json());
      if (!pubData.id) throw new Error(`Erro ao publicar: ${JSON.stringify(pubData.error ?? pubData)}`);
      let permalink = "";
      try { permalink = (await igGet(pubData.id, { fields: "permalink" }, igToken).then(r => r.json())).permalink ?? ""; } catch {}
      trackPublishedPost({ userEmail: email, igMediaId: pubData.id, contentType: postType, category, newsId, hook }).catch(() => {});
      return NextResponse.json({ success: true, postId: pubData.id, permalink, message: "Publicado com sucesso!" });
    }

    // ── Carrossel ─────────────────────────────────────────────────────────────
    if (imageUrls.length > 10) {
      return NextResponse.json({ error: "O carrossel suporta no máximo 10 imagens" }, { status: 400 });
    }

    const childIds = await Promise.all(
      (imageUrls as string[]).map(async (url, i) => {
        const data = await igPost(`${igAccountId}/media`, { image_url: url, media_type: "IMAGE", is_carousel_item: "true" }, igToken).then(r => r.json());
        console.log(`[publish] item ${i + 1}:`, JSON.stringify(data));
        checkError(data, "Erro ao fazer upload");
        return data.id as string;
      })
    );

    await Promise.all(childIds.map(id => waitUntilReady(id, igToken)));

    const carousel = await igPost(`${igAccountId}/media`, { media_type: "CAROUSEL", children: childIds.join(","), caption: caption ?? "" }, igToken).then(r => r.json());
    checkError(carousel, "Erro ao criar carrossel");
    await waitUntilReady(carousel.id, igToken);

    const pub = await igPost(`${igAccountId}/media_publish`, { creation_id: carousel.id }, igToken).then(r => r.json());
    if (!pub.id) throw new Error(`Erro ao publicar carrossel: ${JSON.stringify(pub.error ?? pub)}`);

    let permalink = "";
    try { permalink = (await igGet(pub.id, { fields: "permalink" }, igToken).then(r => r.json())).permalink ?? ""; } catch {}

    // Rastreia o post para o Performance Loop (fire-and-forget)
    trackPublishedPost({ userEmail: email, igMediaId: pub.id, contentType: postType, category, newsId, hook }).catch(() => {});

    return NextResponse.json({ success: true, postId: pub.id, permalink, message: "Carrossel publicado com sucesso!" });

  } catch (err: any) {
    console.error("[publish]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
