import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redisGet, redisSet, redisListAdd } from "@/lib/redis";
import { geminiText } from "@/lib/gemini-text";
import { transcriptionKey } from "@/app/api/transcricao/process/route";
import { Slide, SlideElement } from "@/types";
import { v4 as uuid } from "uuid";

export const maxDuration = 30;

export type CarouselFormat =
  | "educativo"
  | "storytelling"
  | "twitter"
  | "viral"
  | "lista"
  | "passo_a_passo"
  | "executivo";

interface RawSlide { title: string; body: string; bgColor: string; textColor: string; accent: string }

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

function makeSlide(raw: RawSlide, index: number, total: number): Slide {
  const isCover = index === 0;
  const isCTA = index === total - 1;
  const W = 1080, H = 1350;
  const elements: SlideElement[] = [];

  // Slide number badge (not on cover)
  if (!isCover && !isCTA) {
    elements.push({
      id: uuid(), type: "shape",
      x: 80, y: 80, width: 70, height: 70,
      style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 35 },
      zIndex: 1,
    } as SlideElement);
    elements.push({
      id: uuid(), type: "text",
      x: 80, y: 80, width: 70, height: 70,
      content: `<p style="text-align:center"><strong>${index}</strong></p>`,
      style: { fontSize: 28, fontWeight: "bold", fontFamily: "'Montserrat', sans-serif", color: "#ffffff", textAlign: "center", lineHeight: 1 },
      zIndex: 2,
    } as SlideElement);
  }

  // Title
  elements.push({
    id: uuid(), type: "text",
    x: 80,
    y: isCover ? 420 : isCTA ? 480 : 220,
    width: W - 160,
    height: isCover ? 260 : 220,
    content: `<p style="text-align:center"><strong>${raw.title}</strong></p>`,
    style: {
      fontSize: isCover ? 68 : isCTA ? 56 : 52,
      fontWeight: "bold",
      fontFamily: "'Montserrat', sans-serif",
      color: isCover ? raw.accent : raw.textColor,
      textAlign: "center",
      lineHeight: 1.15,
    },
    zIndex: 3,
  } as SlideElement);

  // Body
  if (raw.body) {
    elements.push({
      id: uuid(), type: "text",
      x: 80,
      y: isCover ? 710 : isCTA ? 750 : 490,
      width: W - 160,
      height: 280,
      content: `<p style="text-align:center">${raw.body}</p>`,
      style: {
        fontSize: isCover ? 34 : 30,
        fontWeight: "normal",
        fontFamily: "'Inter', sans-serif",
        color: raw.textColor + "cc",
        textAlign: "center",
        lineHeight: 1.55,
      },
      zIndex: 3,
    } as SlideElement);
  }

  // Accent line for cover
  if (isCover) {
    elements.push({
      id: uuid(), type: "shape",
      x: (W - 120) / 2, y: 390, width: 120, height: 6,
      style: { fill: raw.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 3 },
      zIndex: 2,
    } as SlideElement);
  }

  return {
    id: uuid(),
    backgroundColor: raw.bgColor,
    elements,
    width: W,
    height: H,
  };
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

  const raw = await redisGet(transcriptionKey(transcriptionId));
  if (!raw) return NextResponse.json({ error: "Transcrição não encontrada" }, { status: 404 });

  const record = JSON.parse(raw);
  if (record.email !== email) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  if (record.status !== "done") return NextResponse.json({ error: "Transcrição ainda não processada" }, { status: 400 });

  try {
    const rawSlides = await generateSlides(
      format as CarouselFormat,
      record.transcript,
      record.summary.medium,
      record.topics.subtopics.join(", ") || record.topics.main,
      record.topics.cta,
    );

    const slides: Slide[] = rawSlides.map((s, i) => makeSlide(s, i, rawSlides.length));

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
