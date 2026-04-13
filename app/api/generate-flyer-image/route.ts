import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/stripe";
import { isEmailActive } from "@/lib/kv";
import { stripe } from "@/lib/stripe";
import { verifyToken } from "@/lib/activation";

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
    `Professional Brazilian social media marketing flyer, Instagram square format 1:1.`,
    `Background: ${theme.desc}, glossy premium finish, vibrant and saturated.`,
  ];

  if (opts.promoSubtitle)
    lines.push(`Small italic white text at top-left: "${opts.promoSubtitle}".`);

  if (opts.promoTitle)
    lines.push(`Large bold 3D promotional title text "${opts.promoTitle}" in white with thick black drop shadow, positioned prominently at left side.`);

  lines.push(
    `Hero product "${opts.productName || "featured product"}" displayed on a shiny golden 3D circular podium/pedestal at the right side, dramatically lit, product photography quality.`,
    `Decorative 3D floating percentage symbols (%) in ${theme.accent}, 2-3 scattered around the composition as visual accents.`,
  );

  if (opts.price)
    lines.push(`Price badge: ${theme.accent} rounded rectangle showing "R$ ${opts.price}" in large bold black text, at bottom-left area.`);

  if (opts.website)
    lines.push(`Top darkened bar with small white text "${opts.website}".`);

  if (opts.instagram || opts.phone) {
    const contact = [opts.instagram ? `@${opts.instagram}` : "", opts.phone].filter(Boolean).join("  •  ");
    lines.push(`Bottom darkened bar with small white text "${contact}".`);
  }

  lines.push(
    `Style: high-quality Brazilian retail advertisement, sharp, no blur, vivid commercial design.`,
    `No watermarks. No extra text beyond what is specified.`,
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

/* ── Gemini 2.0 Flash Preview texto→imagem ── */
async function fromGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${key}`,
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

  const instruction = `You are a professional Brazilian marketing designer.
Using the product photo provided as the HERO product, create a complete promotional Instagram flyer (square 1:1 format).
${prompt}
The product from the reference image must be displayed prominently on the right side on a golden 3D podium.
Make it look like a premium Brazilian social media advertisement.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${key}`,
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
    const kirvano = await isEmailActive(email).catch(() => false);
    if (kirvano) {
      isPro = true;
    } else {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) isPro = await hasActiveSubscription(customers.data[0].id);
    }
  }
  if (!isPro && customerId) isPro = await hasActiveSubscription(customerId).catch(() => false);
  if (!isPro && activationToken) { const { valid } = verifyToken(activationToken); isPro = valid; }

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
