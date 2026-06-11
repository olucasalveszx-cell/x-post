import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisGet, redisSet, redisListAdd } from "@/lib/redis";
import { geminiText } from "@/lib/gemini-text";
import { transcriptionKey } from "@/app/api/transcricao/process/route";
import { Slide, SlideElement } from "@/types";
import { v4 as uuid } from "uuid";

export const maxDuration = 60;

export type CarouselFormat =
  | "educativo"
  | "storytelling"
  | "twitter"
  | "viral"
  | "lista"
  | "passo_a_passo"
  | "executivo";

interface RawSlide { title: string; body: string; bgColor: string; textColor: string; accent: string }

interface ProfileData { name: string; handle: string; avatarSrc?: string; verified?: boolean }

const FORMAT_PROMPTS: Record<CarouselFormat, string> = {
  educativo: "Crie um carrossel EDUCATIVO que ensine algo de forma clara e estruturada. Slide 1 = gancho/problema, slides intermediários = lições/conceitos, último = resumo + CTA.",
  storytelling: "Crie um carrossel de STORYTELLING com narrativa envolvente. Slide 1 = situação inicial, slides intermediários = conflito e virada, último = resolução + CTA.",
  twitter: "Crie um carrossel estilo TWITTER/X com frases curtas e impactantes. Máximo 50 chars por slide. Linguagem direta e provocativa.",
  viral: "Crie um carrossel VIRAL com ganchos poderosos. Slide 1 deve parar o scroll. Use curiosidade, controvérsia ou dados surpreendentes. Linguagem informal e energética.",
  lista: "Crie um carrossel de LISTA numerada. Slide 1 = título da lista, cada slide intermediário = um item da lista com dica curta, último = bônus + CTA.",
  passo_a_passo: "Crie um carrossel PASSO A PASSO. Slide 1 = resultado final desejado, cada slide = um passo com ação clara, último = recapitulação + CTA.",
  executivo: "Crie um carrossel RESUMO EXECUTIVO profissional. Slide 1 = principal conclusão, slides = dados/argumentos chave, último = recomendação + CTA.",
};

const FORMAT_PALETTES: Record<CarouselFormat, { bg: string; text: string; accent: string }> = {
  educativo:     { bg: "#0f172a", text: "#f1f5f9", accent: "#6366f1" },
  storytelling:  { bg: "#1a0a2e", text: "#fce7f3", accent: "#d946ef" },
  twitter:       { bg: "#030712", text: "#f9fafb", accent: "#1d9bf0" },
  viral:         { bg: "#0c0a09", text: "#fef7ec", accent: "#f97316" },
  lista:         { bg: "#052e16", text: "#dcfce7", accent: "#22c55e" },
  passo_a_passo: { bg: "#0c1445", text: "#eff6ff", accent: "#38bdf8" },
  executivo:     { bg: "#1c1917", text: "#fafaf9", accent: "#d4a017" },
};

function makeSlide(raw: RawSlide, index: number, total: number, profile: ProfileData | null): Slide {
  const isCover = index === 0;
  const isCTA = index === total - 1;
  const isEven = index % 2 === 0;
  const W = 1080, H = 1350;
  const hasProfile = !!(profile && (profile.name || profile.handle));
  const elements: SlideElement[] = [];

  // ── Background decorations ───────────────────────────────────────────────
  // Main large circle — alternates side for visual rhythm on inner slides
  const circleSize = isCover ? 760 : 560;
  const circleX = isCover ? W * 0.28 : (isEven ? W * 0.42 : -circleSize * 0.15);
  elements.push({
    id: uuid(), type: "shape",
    x: circleX, y: isCover ? -200 : -180,
    width: circleSize, height: circleSize,
    opacity: 0.12,
    style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: circleSize / 2 },
    zIndex: 0,
  } as SlideElement);

  // Secondary circle — bottom opposite side
  const sec = 340;
  elements.push({
    id: uuid(), type: "shape",
    x: isEven ? -sec * 0.35 : W - sec * 0.65, y: H - sec * 0.85,
    width: sec, height: sec,
    opacity: 0.07,
    style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: sec / 2 },
    zIndex: 0,
  } as SlideElement);

  // ── Slide counter pill (all slides except cover) ─────────────────────────
  if (!isCover) {
    const counterW = 110;
    elements.push({
      id: uuid(), type: "shape",
      x: W - 80 - counterW, y: H - 80,
      width: counterW, height: 40,
      opacity: 0.55,
      style: { fill: raw.accent + "33", stroke: raw.accent + "66", strokeWidth: 1, borderRadius: 20 },
      zIndex: 8,
    } as SlideElement);
    elements.push({
      id: uuid(), type: "text",
      x: W - 80 - counterW, y: H - 80,
      width: counterW, height: 40,
      content: `<p style="text-align:center">${String(index).padStart(2,"0")} / ${String(total - 1).padStart(2,"0")}</p>`,
      style: { fontSize: 18, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: raw.accent, textAlign: "center", lineHeight: 1 },
      zIndex: 9,
    } as SlideElement);
  }

  // ── Profile element ──────────────────────────────────────────────────────
  if (hasProfile) {
    const profileY = isCover ? H - 215 : 50;
    elements.push({
      id: uuid(), type: "profile",
      x: 80, y: profileY, width: W - 160, height: 90,
      src: profile!.avatarSrc || undefined,
      profileName: profile!.name,
      profileHandle: profile!.handle,
      profileVerified: profile!.verified ?? false,
      profileNameColor: "#ffffff",
      profileHandleColor: "rgba(255,255,255,0.50)",
      zIndex: 10,
    } as SlideElement);
  }

  // ── Cover slide ──────────────────────────────────────────────────────────
  if (isCover) {
    // Tag chip
    elements.push({
      id: uuid(), type: "shape",
      x: 80, y: 115, width: 170, height: 46,
      style: { fill: raw.accent + "20", stroke: raw.accent + "55", strokeWidth: 1, borderRadius: 23 },
      zIndex: 3,
    } as SlideElement);
    elements.push({
      id: uuid(), type: "text",
      x: 80, y: 115, width: 170, height: 46,
      content: `<p style="text-align:center"><strong>● CARROSSEL</strong></p>`,
      style: { fontSize: 16, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: raw.accent, textAlign: "center", lineHeight: 1 },
      zIndex: 4,
    } as SlideElement);

    // Ghost large number "1" in background
    elements.push({
      id: uuid(), type: "text",
      x: W - 380, y: 150,
      width: 380, height: 520,
      content: `<p style="text-align:right"><strong>1</strong></p>`,
      opacity: 0.04,
      style: { fontSize: 480, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: raw.textColor, textAlign: "right", lineHeight: 1 },
      zIndex: 1,
    } as SlideElement);

    // Main title
    elements.push({
      id: uuid(), type: "text",
      x: 80, y: 205, width: W - 160, height: 400,
      content: `<p><strong>${raw.title}</strong></p>`,
      style: { fontSize: 78, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: raw.textColor, textAlign: "left", lineHeight: 1.08 },
      zIndex: 5,
    } as SlideElement);

    // Double accent line
    elements.push({
      id: uuid(), type: "shape",
      x: 80, y: 630, width: 130, height: 5,
      style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 2.5 },
      zIndex: 4,
    } as SlideElement);
    elements.push({
      id: uuid(), type: "shape",
      x: 224, y: 630, width: 50, height: 5,
      opacity: 0.38,
      style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 2.5 },
      zIndex: 4,
    } as SlideElement);

    // Subtitle
    if (raw.body) {
      elements.push({
        id: uuid(), type: "text",
        x: 80, y: 668, width: W - 160, height: 290,
        content: `<p>${raw.body}</p>`,
        style: { fontSize: 31, fontWeight: "normal", fontFamily: "'Inter', sans-serif", color: raw.textColor + "bb", textAlign: "left", lineHeight: 1.55 },
        zIndex: 5,
      } as SlideElement);
    }

    // "Deslize →"
    elements.push({
      id: uuid(), type: "text",
      x: 80, y: hasProfile ? H - 272 : H - 160,
      width: 230, height: 50,
      content: `<p><strong>Deslize →</strong></p>`,
      style: { fontSize: 20, fontWeight: "bold", fontFamily: "'Inter', sans-serif", color: raw.accent + "88", textAlign: "left", lineHeight: 1 },
      zIndex: 5,
    } as SlideElement);

    return { id: uuid(), backgroundColor: raw.bgColor, elements, width: W, height: H };
  }

  // ── CTA slide ────────────────────────────────────────────────────────────
  if (isCTA) {
    const baseY = hasProfile ? 195 : 110;

    // Ghost "✓" or star accent in background
    elements.push({
      id: uuid(), type: "text",
      x: W - 340, y: baseY - 40,
      width: 320, height: 400,
      content: `<p style="text-align:right"><strong>★</strong></p>`,
      opacity: 0.04,
      style: { fontSize: 380, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: raw.accent, textAlign: "right", lineHeight: 1 },
      zIndex: 1,
    } as SlideElement);

    // Accent bar
    elements.push({
      id: uuid(), type: "shape",
      x: 80, y: baseY, width: 90, height: 5,
      style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 2.5 },
      zIndex: 3,
    } as SlideElement);
    elements.push({
      id: uuid(), type: "shape",
      x: 184, y: baseY, width: 36, height: 5,
      opacity: 0.38,
      style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 2.5 },
      zIndex: 3,
    } as SlideElement);

    // CTA title
    elements.push({
      id: uuid(), type: "text",
      x: 80, y: baseY + 38, width: W - 160, height: 380,
      content: `<p><strong>${raw.title}</strong></p>`,
      style: { fontSize: 70, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: raw.textColor, textAlign: "left", lineHeight: 1.12 },
      zIndex: 5,
    } as SlideElement);

    if (raw.body) {
      // Left accent bar on body (pull quote style)
      elements.push({
        id: uuid(), type: "shape",
        x: 80, y: baseY + 438, width: 4, height: 160,
        style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 2 },
        zIndex: 4,
      } as SlideElement);
      elements.push({
        id: uuid(), type: "text",
        x: 104, y: baseY + 438, width: W - 184, height: 240,
        content: `<p>${raw.body}</p>`,
        style: { fontSize: 29, fontWeight: "normal", fontFamily: "'Inter', sans-serif", color: raw.textColor + "aa", textAlign: "left", lineHeight: 1.6 },
        zIndex: 5,
      } as SlideElement);
    }

    // CTA pill button
    elements.push({
      id: uuid(), type: "shape",
      x: 80, y: baseY + 730, width: 400, height: 82,
      style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 41 },
      zIndex: 4,
    } as SlideElement);
    elements.push({
      id: uuid(), type: "text",
      x: 80, y: baseY + 730, width: 400, height: 82,
      content: `<p style="text-align:center"><strong>Seguir agora ↗</strong></p>`,
      style: { fontSize: 27, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: "#ffffff", textAlign: "center", lineHeight: 1 },
      zIndex: 5,
    } as SlideElement);

    return { id: uuid(), backgroundColor: raw.bgColor, elements, width: W, height: H };
  }

  // ── Inner slides ─────────────────────────────────────────────────────────
  const baseY = hasProfile ? 182 : 78;

  // Ghost number in background (large, very low opacity)
  elements.push({
    id: uuid(), type: "text",
    x: isEven ? W - 420 : -60, y: baseY - 20,
    width: 420, height: 520,
    content: `<p style="text-align:${isEven ? "right" : "left"}"><strong>${index}</strong></p>`,
    opacity: 0.045,
    style: { fontSize: 460, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: raw.textColor, textAlign: isEven ? "right" : "left", lineHeight: 1 },
    zIndex: 1,
  } as SlideElement);

  // Number badge (small, on top of ghost number)
  elements.push({
    id: uuid(), type: "shape",
    x: 80, y: baseY, width: 64, height: 64,
    style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 32 },
    zIndex: 3,
  } as SlideElement);
  elements.push({
    id: uuid(), type: "text",
    x: 80, y: baseY, width: 64, height: 64,
    content: `<p style="text-align:center"><strong>${index}</strong></p>`,
    style: { fontSize: 26, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: "#ffffff", textAlign: "center", lineHeight: 1 },
    zIndex: 4,
  } as SlideElement);

  // Short accent line under badge
  elements.push({
    id: uuid(), type: "shape",
    x: 80, y: baseY + 82, width: 64, height: 4,
    style: { fill: raw.accent + "88", stroke: "transparent", strokeWidth: 0, borderRadius: 2 },
    zIndex: 3,
  } as SlideElement);

  // Title
  elements.push({
    id: uuid(), type: "text",
    x: 80, y: baseY + 108, width: W - 160, height: 295,
    content: `<p><strong>${raw.title}</strong></p>`,
    style: { fontSize: 58, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: raw.textColor, textAlign: "left", lineHeight: 1.15 },
    zIndex: 5,
  } as SlideElement);

  // Body with left accent bar (pull quote style)
  if (raw.body) {
    elements.push({
      id: uuid(), type: "shape",
      x: 80, y: baseY + 425, width: 4, height: 170,
      style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 2 },
      zIndex: 4,
    } as SlideElement);
    elements.push({
      id: uuid(), type: "text",
      x: 104, y: baseY + 420, width: W - 184, height: 320,
      content: `<p>${raw.body}</p>`,
      style: { fontSize: 30, fontWeight: "normal", fontFamily: "'Inter', sans-serif", color: raw.textColor + "cc", textAlign: "left", lineHeight: 1.6 },
      zIndex: 5,
    } as SlideElement);
  }

  // Bottom accent bar full width
  elements.push({
    id: uuid(), type: "shape",
    x: 80, y: H - 100, width: W - 160, height: 3,
    opacity: 0.18,
    style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 1.5 },
    zIndex: 3,
  } as SlideElement);

  return { id: uuid(), backgroundColor: raw.bgColor, elements, width: W, height: H };
}

async function generateSlides(format: CarouselFormat, transcript: string, summary: string, topics: string, cta: string): Promise<RawSlide[]> {
  const palette = FORMAT_PALETTES[format];
  const prompt = `${FORMAT_PROMPTS[format]}

CONTEÚDO BASE:
Resumo: ${summary}
Tópicos: ${topics}
Transcrição (trecho): ${transcript.substring(0, 2500)}
CTA sugerida: ${cta}

Gere entre 6 e 8 slides. Retorne APENAS este JSON válido sem markdown:
{
  "slides": [
    {
      "title": "texto do título (máx 60 chars)",
      "body": "texto do corpo (máx 110 chars, pode ser vazio string)",
      "bgColor": "${palette.bg}",
      "textColor": "${palette.text}",
      "accent": "${palette.accent}"
    }
  ]
}

Regras obrigatórias:
- Slide 1: capa/gancho que prende atenção
- Último slide: ${cta || "CTA com chamada para ação"}
- Use as cores fornecidas (não invente outras)
- Português brasileiro, linguagem natural
- Seja conciso e impactante`;

  const raw = await geminiText(prompt, { maxTokens: 1200, temperature: 0.75 });

  try {
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed.slides) ? parsed.slides : [];
  } catch {
    return [
      { title: "Conteúdo gerado com IA", body: summary.substring(0, 100), bgColor: palette.bg, textColor: palette.text, accent: palette.accent },
      { title: cta || "Siga para mais!", body: "Gostou? Compartilha com alguém.", bgColor: palette.bg, textColor: palette.text, accent: palette.accent },
    ];
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { transcriptionId, format = "educativo" } = await req.json();
  if (!transcriptionId) return NextResponse.json({ error: "transcriptionId obrigatório" }, { status: 400 });

  // Fetch transcription + user profile in parallel
  const [raw, profilesRaw] = await Promise.all([
    redisGet(transcriptionKey(transcriptionId)),
    redisGet(`user:profiles:${email}`),
  ]);

  if (!raw) return NextResponse.json({ error: "Transcrição não encontrada" }, { status: 404 });

  const record = JSON.parse(raw);
  if (record.email !== email) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  if (record.status !== "done") return NextResponse.json({ error: "Transcrição ainda não processada" }, { status: 400 });

  // Parse saved profile (first profile in list, if any)
  let profileData: ProfileData | null = null;
  if (profilesRaw) {
    try {
      const profiles = JSON.parse(profilesRaw);
      if (Array.isArray(profiles) && profiles.length > 0) {
        const p = profiles[0];
        if (p.name || p.handle) {
          profileData = { name: p.name ?? "", handle: p.handle ?? "", avatarSrc: p.avatarSrc, verified: p.verified };
        }
      }
    } catch {}
  }

  try {
    const rawSlides = await generateSlides(
      format as CarouselFormat,
      record.transcript,
      record.summary.medium,
      record.topics.subtopics.join(", ") || record.topics.main,
      record.topics.cta,
    );

    const slides: Slide[] = rawSlides.map((s, i) => makeSlide(s, i, rawSlides.length, profileData));

    // Save as draft
    const draftId = uuid();
    const draftName = `${record.title} — ${format.replace("_", " ")}`;
    await redisSet(`draft:${email}:${draftId}`, JSON.stringify(slides));
    await redisSet(`draftmeta:${email}:${draftId}`, JSON.stringify({
      id: draftId, name: draftName, slideCount: slides.length,
      thumbnail: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }));
    await redisListAdd(`drafts:${email}`, draftId);

    return NextResponse.json({ ok: true, slides, draftId, draftName });
  } catch (err: any) {
    console.error("[transcricao/carousel]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
