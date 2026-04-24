import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { put } from "@vercel/blob";
import { getAutoPost, updateAutoPostStatus } from "@/lib/auto-post";
import { enrichSlidesWithImages } from "@/lib/fetch-slide-images";
import { generateSlideImages } from "@/lib/generate-slide-images";

export const maxDuration = 60;

// Faz proxy de uma URL externa para o Vercel Blob (garante URL estável)
async function proxyToBlob(url: string, name: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
    const blob = await put(`autopost/${name}.${ext}`, Buffer.from(buffer), {
      access: "public",
      contentType,
    });
    return blob.url;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const item = await getAutoPost(params.id);
  if (!item) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (item.userId !== session.user.email)
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  if (item.status !== "pending_approval")
    return NextResponse.json(
      { error: `Não é possível aprovar um item com status "${item.status}".` },
      { status: 400 }
    );
  if (!item.slides?.length)
    return NextResponse.json({ error: "Item sem slides gerados." }, { status: 400 });

  const { igAccountId, igToken, scheduledAt: scheduledAtOverride } = await req.json();
  if (!igAccountId || !igToken)
    return NextResponse.json(
      { error: "Campos obrigatórios: igAccountId, igToken" },
      { status: 400 }
    );

  const scheduledAt = scheduledAtOverride ?? item.scheduledAt;
  const scheduledDate = new Date(scheduledAt);
  if (scheduledDate.getTime() < Date.now() + 10 * 60 * 1000)
    return NextResponse.json(
      { error: "Horário de publicação deve ser pelo menos 10 minutos no futuro." },
      { status: 400 }
    );

  try {
    const imageUrls: string[] = [];

    // 1. Usa imagens já geradas/buscadas se disponíveis
    const existing = item.slideImageUrls?.filter((u): u is string => !!u) ?? [];

    if (existing.length > 0) {
      // Imagens do Gemini já estão no Blob — usar direto
      // Imagens de fotos reais (Wikimedia/Pexels) precisam de proxy para URL estável
      for (let i = 0; i < existing.length; i++) {
        const url = existing[i];
        if (url.includes("vercel-storage") || url.includes("blob.vercel")) {
          // Já é Blob — usar direto
          imageUrls.push(url);
        } else {
          // URL externa — faz proxy para Blob
          const proxied = await proxyToBlob(url, `${item.id}/approve-${i + 1}`);
          if (proxied) imageUrls.push(proxied);
        }
      }
    }

    // 2. Fallback: gera/busca imagens agora se não tiver nenhuma
    if (imageUrls.length === 0) {
      if (item.imageSource === "ai") {
        const generated = await generateSlideImages(item.slides, item.id);
        for (const url of generated) {
          if (url) imageUrls.push(url);
        }
      } else {
        const enriched = await enrichSlidesWithImages(item.slides);
        for (let i = 0; i < enriched.length; i++) {
          const url = enriched[i].imagem?.url;
          if (!url) continue;
          const proxied = await proxyToBlob(url, `${item.id}/approve-${i + 1}`);
          if (proxied) imageUrls.push(proxied);
        }
      }
    }

    if (imageUrls.length === 0)
      return NextResponse.json({ error: "Nenhuma imagem pôde ser processada." }, { status: 500 });

    // 3. Cria containers no Instagram e agenda
    const scheduledUnix = Math.floor(scheduledDate.getTime() / 1000);
    const caption = item.caption ?? "";

    const containerIds: string[] = [];
    for (const url of imageUrls) {
      const r = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: igToken }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message ?? "Erro ao criar item do carrossel");
      containerIds.push(d.id);
    }

    const carouselRes = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "CAROUSEL",
        children: containerIds.join(","),
        caption,
        published: false,
        scheduled_publish_time: scheduledUnix,
        access_token: igToken,
      }),
    });
    const carouselData = await carouselRes.json();
    if (!carouselRes.ok)
      throw new Error(carouselData.error?.message ?? "Erro ao criar container do carrossel");

    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: carouselData.id, access_token: igToken }),
      }
    );
    const publishData = await publishRes.json();
    if (!publishRes.ok)
      throw new Error(publishData.error?.message ?? "Erro ao publicar");

    // 4. Persiste aprovação
    const updated = await updateAutoPostStatus(params.id, "approved", {
      approvedAt: new Date().toISOString(),
      imageUrls,
      igPostId: publishData.id,
    });

    return NextResponse.json({ ok: true, igPostId: publishData.id, item: updated });
  } catch (err: any) {
    console.error("[auto-post approve]", err);
    await updateAutoPostStatus(params.id, "failed", { error: err?.message });
    return NextResponse.json({ error: err?.message ?? "Erro ao aprovar" }, { status: 500 });
  }
}
