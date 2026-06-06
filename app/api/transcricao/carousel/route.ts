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
  const W = 1080, H = 1350;
  const hasProfile = !!(profile && (profile.name || profile.handle));
  const elements: SlideElement[] = [];

  // ── Background decorations ──────────────────────────────────────────────
  // Large blurred circle (top-right on cover, top-right on inner slides)
  elements.push({
    id: uuid(), type: "shape",
    x: isCover ? W * 0.3 : W * 0.45,
    y: isCover ? -180 : -200,
    width: isCover ? 720 : 580,
    height: isCover ? 720 : 580,
    opacity: 0.13,
    style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 360 },
    zIndex: 0,
  } as SlideElement);

  // Secondary smaller circle (bottom-left)
  elements.push({
    id: uuid(), type: "shape",
    x: -120, y: H - 380,
    width: 380, height: 380,
    opacity: 0.07,
    style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 190 },
    zIndex: 0,
  } as SlideElement);

  // Small decorative dot cluster (top-right corner)
  if (!isCover) {
    for (let i = 0; i < 3; i++) {
      elements.push({
        id: uuid(), type: "shape",
        x: W - 80 - i * 22, y: 80,
        width: 10, height: 10,
        opacity: 0.35,
        style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 5 },
        zIndex: 1,
      } as SlideElement);
    }
  }

  // ── Profile element ──────────────────────────────────────────────────────
  if (hasProfile) {
    const profileY = isCover ? H - 210 : 55;
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

  // ── Cover slide layout ───────────────────────────────────────────────────
  if (isCover) {
    // Decorative tag chip at top
    elements.push({
      id: uuid(), type: "shape",
      x: 80, y: 120, width: 160, height: 44,
      style: { fill: raw.accent + "22", stroke: raw.accent + "55", strokeWidth: 1, borderRadius: 22 },
      zIndex: 3,
    } as SlideElement);
    elements.push({
      id: uuid(), type: "text",
      x: 80, y: 120, width: 160, height: 44,
      content: `<p style="text-align:center"><strong>● CARROSSEL</strong></p>`,
      style: { fontSize: 16, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: raw.accent, textAlign: "center", lineHeight: 1 },
      zIndex: 4,
    } as SlideElement);

    // Main title
    elements.push({
      id: uuid(), type: "text",
      x: 80, y: 210, width: W - 160, height: 380,
      content: `<p><strong>${raw.title}</strong></p>`,
      style: { fontSize: 76, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: raw.textColor, textAlign: "left", lineHeight: 1.1 },
      zIndex: 5,
    } as SlideElement);

    // Accent line separator
    elements.push({
      id: uuid(), type: "shape",
      x: 80, y: 620, width: 120, height: 5,
      style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 2.5 },
      zIndex: 4,
    } as SlideElement);
    elements.push({
      id: uuid(), type: "shape",
      x: 212, y: 620, width: 50, height: 5,
      opacity: 0.4,
      style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 2.5 },
      zIndex: 4,
    } as SlideElement);

    // Subtitle / body
    if (raw.body) {
      elements.push({
        id: uuid(), type: "text",
        x: 80, y: 660, width: W - 160, height: 280,
        content: `<p>${raw.body}</p>`,
        style: { fontSize: 32, fontWeight: "normal", fontFamily: "'Inter', sans-serif", color: raw.textColor + "bb", textAlign: "left", lineHeight: 1.55 },
        zIndex: 5,
      } as SlideElement);
    }

    // "Deslize →" indicator at bottom
    elements.push({
      id: uuid(), type: "text",
      x: 80, y: hasProfile ? H - 270 : H - 160,
      width: 220, height: 50,
      content: `<p><strong>Deslize →</strong></p>`,
      style: { fontSize: 20, fontWeight: "bold", fontFamily: "'Inter', sans-serif", color: raw.accent + "99", textAlign: "left", lineHeight: 1 },
      zIndex: 5,
    } as SlideElement);

    return { id: uuid(), backgroundColor: raw.bgColor, elements, width: W, height: H };
  }

  // ── CTA slide layout ─────────────────────────────────────────────────────
  if (isCTA) {
    const baseY = hasProfile ? 200 : 120;

    // Accent top bar
    elements.push({
      id: uuid(), type: "shape",
      x: 80, y: baseY, width: 80, height: 5,
      style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 2.5 },
      zIndex: 3,
    } as SlideElement);

    // Big CTA title
    elements.push({
      id: uuid(), type: "text",
      x: 80, y: baseY + 40, width: W - 160, height: 360,
      content: `<p><strong>${raw.title}</strong></p>`,
      style: { fontSize: 68, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: raw.textColor, textAlign: "left", lineHeight: 1.15 },
      zIndex: 5,
    } as SlideElement);

    if (raw.body) {
      elements.push({
        id: uuid(), type: "text",
        x: 80, y: baseY + 420, width: W - 160, height: 260,
        content: `<p>${raw.body}</p>`,
        style: { fontSize: 30, fontWeight: "normal", fontFamily: "'Inter', sans-serif", color: raw.textColor + "aa", textAlign: "left", lineHeight: 1.6 },
        zIndex: 5,
      } as SlideElement);
    }

    // CTA pill button shape
    elements.push({
      id: uuid(), type: "shape",
      x: 80, y: baseY + 720, width: 380, height: 80,
      style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 40 },
      zIndex: 4,
    } as SlideElement);
    elements.push({
      id: uuid(), type: "text",
      x: 80, y: baseY + 720, width: 380, height: 80,
      content: `<p style="text-align:center"><strong>Seguir agora ↗</strong></p>`,
      style: { fontSize: 26, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: "#ffffff", textAlign: "center", lineHeight: 1 },
      zIndex: 5,
    } as SlideElement);

    return { id: uuid(), backgroundColor: raw.bgColor, elements, width: W, height: H };
  }

  // ── Inner slide layout ───────────────────────────────────────────────────
  const baseY = hasProfile ? 185 : 80;

  // Number badge
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

  // Accent line after badge
  elements.push({
    id: uuid(), type: "shape",
    x: 80, y: baseY + 82, width: 64, height: 4,
    style: { fill: raw.accent + "88", stroke: "transparent", strokeWidth: 0, borderRadius: 2 },
    zIndex: 3,
  } as SlideElement);

  // Title
  elements.push({
    id: uuid(), type: "text",
    x: 80, y: baseY + 110, width: W - 160, height: 280,
    content: `<p><strong>${raw.title}</strong></p>`,
    style: { fontSize: 58, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: raw.textColor, textAlign: "left", lineHeight: 1.15 },
    zIndex: 5,
  } as SlideElement);

  // Body
  if (raw.body) {
    elements.push({
      id: uuid(), type: "text",
      x: 80, y: baseY + 410, width: W - 160, height: 320,
      content: `<p>${raw.body}</p>`,
      style: { fontSize: 30, fontWeight: "normal", fontFamily: "'Inter', sans-serif", color: raw.textColor + "cc", textAlign: "left", lineHeight: 1.6 },
      zIndex: 5,
    } as SlideElement);
  }

  // Bottom thin accent bar
  elements.push({
    id: uuid(), type: "shape",
    x: 80, y: H - 80, width: W - 160, height: 3,
    opacity: 0.2,
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
