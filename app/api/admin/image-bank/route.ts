import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/adminAuth";
import { ADMIN_COOKIE } from "@/lib/adminCookie";
import { redisSet, redisLPush } from "@/lib/redis";
import { put } from "@vercel/blob";

export const maxDuration = 60;

type Style = "gemini" | "foto_real";

const STYLE_SUFFIX: Record<Style, string> = {
  gemini:
    "cinematic high-quality image, dramatic lighting, rich colors, sharp focus, ultra-detailed, professional photography, Instagram editorial aesthetic, no text, no watermarks, no logos. Portrait orientation 4:5.",
  foto_real:
    "ultra-realistic documentary photograph, natural light, sharp focus, authentic candid moment, photojournalism quality, true-to-life colors, no retouching, no text, no watermarks. Portrait orientation 4:5.",
};

function getGeminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];
}

function buildPrompt(prompt: string, style: Style) {
  return `${prompt}. ${STYLE_SUFFIX[style]}`;
}

async function fromImagen4(prompt: string, style: Style): Promise<{ b64: string; mimeType: string; source: string }> {
  const keys = getGeminiKeys();
  let lastError = "";
  for (const key of keys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${key}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: buildPrompt(prompt, style) }],
          parameters: { sampleCount: 1, aspectRatio: "3:4", safetyFilterLevel: "block_few", personGeneration: "allow_adult" },
        }),
        signal: AbortSignal.timeout(50000),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) { lastError = data.error?.message ?? `Imagen4 HTTP ${res.status}`; continue; }
      const pred = data.predictions?.[0];
      if (!pred?.bytesBase64Encoded) { lastError = "Imagen4: sem imagem"; continue; }
      console.log(`[admin/image-bank] Imagen 4 OK (key${keys.indexOf(key) + 1})`);
      return { b64: pred.bytesBase64Encoded, mimeType: pred.mimeType ?? "image/png", source: "imagen4" };
    } catch (e: any) { lastError = e.message; }
  }
  throw new Error(lastError || "Imagen4: falha em todas as chaves");
}

async function fromImagen4Fast(prompt: string, style: Style): Promise<{ b64: string; mimeType: string; source: string }> {
  const keys = getGeminiKeys();
  let lastError = "";
  for (const key of keys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${key}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: buildPrompt(prompt, style) }],
          parameters: { sampleCount: 1, aspectRatio: "3:4", safetyFilterLevel: "block_few", personGeneration: "allow_adult" },
        }),
        signal: AbortSignal.timeout(40000),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) { lastError = data.error?.message ?? `Imagen4Fast HTTP ${res.status}`; continue; }
      const pred = data.predictions?.[0];
      if (!pred?.bytesBase64Encoded) { lastError = "Imagen4Fast: sem imagem"; continue; }
      console.log(`[admin/image-bank] Imagen 4 Fast OK (key${keys.indexOf(key) + 1})`);
      return { b64: pred.bytesBase64Encoded, mimeType: pred.mimeType ?? "image/png", source: "imagen4fast" };
    } catch (e: any) { lastError = e.message; }
  }
  throw new Error(lastError || "Imagen4Fast: falha em todas as chaves");
}

async function fromGeminiFlash(prompt: string, style: Style): Promise<{ b64: string; mimeType: string; source: string }> {
  const keys = getGeminiKeys();
  const MODELS = ["gemini-2.5-flash-image", "gemini-3.1-flash-image-preview", "gemini-2.0-flash-exp"];
  let lastError = "";
  for (const key of keys) {
    for (const model of MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: buildPrompt(prompt, style) }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
          signal: AbortSignal.timeout(25000),
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) { lastError = data.error?.message ?? `HTTP ${res.status}`; if (res.status === 429) break; continue; }
        const parts = data.candidates?.[0]?.content?.parts ?? [];
        const imgPart = parts.find((p: any) => p.inlineData);
        if (!imgPart?.inlineData) { lastError = `${model}: sem imagem`; continue; }
        console.log(`[admin/image-bank] Gemini Flash OK (${model})`);
        return { b64: imgPart.inlineData.data, mimeType: imgPart.inlineData.mimeType, source: model };
      } catch (e: any) { lastError = e.message; }
    }
  }
  throw new Error(lastError || "GeminiFlash: falha em todos os modelos/chaves");
}

async function fromFal(prompt: string, style: Style): Promise<{ b64: string; mimeType: string; source: string }> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY não configurada");
  const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: buildPrompt(prompt, style), image_size: { width: 1080, height: 1350 }, num_images: 1, sync_mode: true }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? data.error ?? `fal.ai HTTP ${res.status}`);
  const imageUrl: string = data.images?.[0]?.url;
  if (!imageUrl) throw new Error("fal.ai: sem URL");
  // Fetch URL e converte para base64
  const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
  if (!imgRes.ok) throw new Error(`fal.ai fetch imagem HTTP ${imgRes.status}`);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  console.log("[admin/image-bank] fal.ai OK");
  return { b64: buf.toString("base64"), mimeType: "image/jpeg", source: "fal" };
}

function makeCacheKey(prompt: string, style: Style) {
  const norm = prompt.toLowerCase().trim().replace(/[^\w\sà-ÿ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
  return `img:v1:${style}:${norm}`;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { prompt, style = "gemini", imageBase64, imageMimeType } = body;
  const s: Style = style === "foto_real" ? "foto_real" : "gemini";

  // ── Modo upload direto ──────────────────────────────────────
  if (imageBase64 && imageMimeType) {
    try {
      const ext = imageMimeType.split("/")[1]?.split("+")[0] ?? "jpg";
      const buffer = Buffer.from(imageBase64, "base64");
      const blob = await put(
        `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
        buffer,
        { access: "public" as any, contentType: imageMimeType }
      );
      const tag = (prompt?.trim() || "uploaded").slice(0, 80);
      await redisSet(makeCacheKey(tag, s), blob.url);
      const entry = JSON.stringify({ url: blob.url, email: "admin", prompt: tag, style: s, source: "upload", createdAt: new Date().toISOString() });
      await redisLPush("images:global", entry);
      console.log(`[admin/image-bank] upload direto: ${blob.url.slice(0, 80)}`);
      return NextResponse.json({ url: blob.url, source: "upload" });
    } catch (e: any) {
      console.error("[admin/image-bank] upload erro:", e.message);
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // ── Modo geração ────────────────────────────────────────────
  if (!prompt?.trim()) return NextResponse.json({ error: "Prompt obrigatório" }, { status: 400 });

  const generators = [
    () => fromImagen4(prompt.trim(), s),
    () => fromImagen4Fast(prompt.trim(), s),
    () => fromFal(prompt.trim(), s),
    () => fromGeminiFlash(prompt.trim(), s),
  ];

  const errors: string[] = [];
  let result: { b64: string; mimeType: string; source: string } | null = null;

  for (const gen of generators) {
    try { result = await gen(); break; } catch (e: any) { errors.push(e.message); }
  }

  if (!result) {
    console.error("[admin/image-bank] todos os geradores falharam:", errors.join(" | "));
    return NextResponse.json({ error: errors.join(" | ") }, { status: 500 });
  }

  try {
    const ext = result.mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
    const buffer = Buffer.from(result.b64, "base64");
    const blob = await put(
      `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
      buffer,
      { access: "public" as any, contentType: result.mimeType }
    );
    await redisSet(makeCacheKey(prompt.trim(), s), blob.url);
    const entry = JSON.stringify({ url: blob.url, email: "admin", prompt: prompt.trim(), style: s, source: result.source, createdAt: new Date().toISOString() });
    await redisLPush("images:global", entry);
    console.log(`[admin/image-bank] gerada via ${result.source}: ${blob.url.slice(0, 80)}`);
    return NextResponse.json({ url: blob.url, source: result.source });
  } catch (e: any) {
    console.error("[admin/image-bank] blob upload erro:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
