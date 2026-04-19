import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyToken } from "@/lib/activation";
import { getUserPlan } from "@/lib/credits";
import { consumeCredits } from "@/lib/credits";

export const maxDuration = 55;

/* ── Paletas ── */
const THEMES: Record<number, { desc: string; accent: string }> = {
  0: { desc: "vibrant teal-to-emerald gradient (#00C9FF to #00B894)",          accent: "bright orange-yellow (#FFB300)" },
  1: { desc: "energetic orange-to-deep-red gradient (#FF6B35 to #c62828)",     accent: "golden yellow (#FFD166)" },
  2: { desc: "royal purple-to-violet gradient (#667eea to #764ba2)",           accent: "gold (#FFD700)" },
  3: { desc: "fresh lime-to-emerald gradient (#11998e to #38ef7d)",            accent: "gold (#FFD700)" },
  4: { desc: "hot-pink-to-magenta gradient (#f953c6 to #b91d73)",             accent: "gold (#FFD700)" },
  5: { desc: "deep navy-to-midnight-blue gradient (#1a1a2e to #16213e)",      accent: "neon red (#E94560)" },
};

function buildPrompt(opts: {
  productName: string; price: string; promoTitle: string;
  promoSubtitle: string; colorPreset: number;
  website: string; instagram: string; phone: string;
}): string {
  const theme = THEMES[opts.colorPreset] ?? THEMES[0];
  const lines: string[] = [
    `Ultra-premium Brazilian promotional social media flyer, Instagram square 1:1 format, hyper-realistic 3D render quality.`,
    `Background: ${theme.desc}, with radial light burst from center, volumetric rays, deep glossy reflective surface, luxury commercial feel.`,
    `Overall composition: dramatic asymmetric layout, bold visual hierarchy, cinematic lighting with rim light and key light, high contrast, pixel-perfect detail.`,
  ];

  if (opts.promoSubtitle)
    lines.push(`Elegant italic white uppercase text "${opts.promoSubtitle}" at top-left with subtle glow — category label style.`);

  if (opts.promoTitle)
    lines.push(`MASSIVE 3D extruded bold title text "${opts.promoTitle}" on the left side — white with thick black outline, neon ${theme.accent} inner glow, strong drop shadow, perspective tilt for dynamism.`);

  lines.push(
    `Hero product "${opts.productName || "featured product"}" displayed on a hyper-reflective shiny golden 3D circular podium on the right, product dramatically lit with specular highlights, floating slightly above pedestal, casting shadow below, studio product photography quality with bokeh background.`,
    `3D floating decorative elements: large glowing % symbols in ${theme.accent} with neon aura, scattered star/sparkle bursts, confetti-like accent dots — all adding energy and sale urgency.`,
    `"OFERTA ESPECIAL" ribbon or banner element in ${theme.accent} color, diagonally placed, bold uppercase text.`,
  );

  if (opts.price)
    lines.push(`Prominent price badge: large ${theme.accent} pill/rounded-rectangle with thick white border and subtle glow, showing "R$ ${opts.price}" in extra-bold black numerals, placed at bottom-left — visually the most attention-grabbing element after the product.`);

  if (opts.website)
    lines.push(`Semi-transparent frosted glass top bar with small clean white text "${opts.website}" and subtle separator line.`);

  if (opts.instagram || opts.phone) {
    const contact = [opts.instagram ? `@${opts.instagram}` : "", opts.phone].filter(Boolean).join("  •  ");
    lines.push(`Semi-transparent frosted glass bottom bar with white text "${contact}" — social proof footer style.`);
  }

  lines.push(
    `Art direction: Top-tier Brazilian retail advertising (like Magazine Luiza, Americanas, Mercado Livre promotional banners) — bold, vibrant, unmistakably sales-driven. Every element fights for attention. Zero dead space.`,
    `Render quality: 4K, no blur, crisp edges, vivid saturated colors, premium finish.`,
    `No watermarks. Strictly only the text elements described above — no invented text.`,
  );

  return lines.join(" ");
}

/* ── Imagen 4 (1:1) ── */
async function fromImagen3(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: "1:1", safetyFilterLevel: "block_few", personGeneration: "allow_adult" },
      }),
      signal: AbortSignal.timeout(45000),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Imagen3 HTTP ${res.status}`);
  const pred = data.predictions?.[0];
  if (!pred?.bytesBase64Encoded) throw new Error("Imagen3: sem imagem");
  return `data:${pred.mimeType ?? "image/png"};base64,${pred.bytesBase64Encoded}`;
}

/* ── Gemini 2.5 Flash texto→imagem ── */
async function fromGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
      signal: AbortSignal.timeout(45000),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Gemini HTTP ${res.status}`);
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p: any) => p.inlineData);
  if (!img?.inlineData) throw new Error("Gemini: sem imagem na resposta");
  return `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
}

/* ── Gemini com foto do produto ── */
async function fromGeminiWithProduct(prompt: string, refB64: string, refMime: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const instruction = `You are a world-class Brazilian advertising designer specializing in high-conversion social media creatives.
Using the product photo provided as the HERO product, create a stunning promotional Instagram flyer (square 1:1 format).
${prompt}
CRITICAL: Extract the product from the reference image, enhance it with professional product retouching (remove background, add dramatic lighting, specular highlights), and place it prominently on a shiny golden 3D podium on the right side.
The final result must look like a top-tier Brazilian retail advertisement — bold, vibrant, unmistakably persuasive, with visual urgency that makes viewers stop scrolling.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: refMime, data: refB64 } },
            { text: instruction },
          ],
        }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
      signal: AbortSignal.timeout(50000),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `GeminiRef HTTP ${res.status}`);
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p: any) => p.inlineData);
  if (!img?.inlineData) throw new Error("GeminiRef: sem imagem");
  return `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
}

/* ── Handler principal ── */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    productName = "", price = "", promoTitle = "", promoSubtitle = "",
    colorPreset = 0, website = "", instagram = "", phone = "",
    productPhotoBase64, productPhotoMime,
    customerId, activationToken,
  } = body;

  /* Auth */
  let isPro = false;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (email) {
    const plan = await getUserPlan(email).catch(() => "free");
    isPro = plan !== "free";
  }
  if (!isPro && activationToken) { const { valid } = verifyToken(activationToken); isPro = valid; }

  /* Créditos */
  if (email) {
    const credit = await consumeCredits(email, "flyer");
    if (!credit.ok) {
      return NextResponse.json(
        { error: `Créditos insuficientes. Você usou todos os créditos do plano ${credit.plan} este mês. Faça upgrade para continuar.` },
        { status: 402 }
      );
    }
  }

  const prompt = buildPrompt({ productName, price, promoTitle, promoSubtitle, colorPreset, website, instagram, phone });
  const errors: string[] = [];

  /* 1. Com foto do produto → Gemini multimodal */
  if (productPhotoBase64 && productPhotoMime) {
    try {
      const url = await fromGeminiWithProduct(prompt, productPhotoBase64, productPhotoMime);
      console.log("[flyer] GeminiRef OK");
      return NextResponse.json({ imageUrl: url, source: "gemini_ref" });
    } catch (e: any) {
      errors.push(`GeminiRef: ${e.message}`);
      console.error("[flyer] GeminiRef falhou:", e.message);
    }
  }

  /* 2. Gemini texto→imagem */
  try {
    const url = await fromGemini(prompt);
    console.log("[flyer] Gemini OK");
    return NextResponse.json({ imageUrl: url, source: "gemini" });
  } catch (e: any) {
    errors.push(`Gemini: ${e.message}`);
    console.error("[flyer] Gemini falhou:", e.message);
  }

  /* 3. Imagen 4 */
  try {
    const url = await fromImagen3(prompt);
    console.log("[flyer] Imagen4 OK");
    return NextResponse.json({ imageUrl: url, source: "imagen4" });
  } catch (e: any) {
    errors.push(`Imagen4: ${e.message}`);
    console.error("[flyer] Imagen4 falhou:", e.message);
  }

  return NextResponse.json({ error: errors.join(" | ") }, { status: 500 });
}
