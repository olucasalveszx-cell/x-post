import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v4 as uuid } from "uuid";
import {
  saveAutoPost,
  registerAutoPostForUser,
  listAutoPosts,
  searchWeb,
  generateSlides,
  buildCaption,
} from "@/lib/auto-post";
import { enrichSlidesWithImages } from "@/lib/fetch-slide-images";
import { generateSlideImages } from "@/lib/generate-slide-images";
import { sendPreviewEmail } from "@/lib/email";
import { AutoPostItem, ImageSource, WritingStyle } from "@/types";

export const maxDuration = 60;

// GET — lista todos os auto-posts do usuário
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const items = await listAutoPosts(session.user.email);
  return NextResponse.json({ items });
}

// POST — cria um novo auto-post (gera conteúdo + imagens + salva rascunho)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const email = session.user.email;
  const body = await req.json();

  const {
    topic,
    scheduledAt,
    slideCount = 5,
    writingStyle = "viral",
    imageSource = "ai",
  }: {
    topic: string;
    scheduledAt: string;
    slideCount?: number;
    writingStyle?: WritingStyle;
    imageSource?: ImageSource;
  } = body;

  if (!topic?.trim())
    return NextResponse.json({ error: "Campo 'topic' é obrigatório." }, { status: 400 });
  if (!scheduledAt)
    return NextResponse.json({ error: "Campo 'scheduledAt' é obrigatório." }, { status: 400 });

  const scheduled = new Date(scheduledAt);
  if (isNaN(scheduled.getTime()))
    return NextResponse.json({ error: "scheduledAt inválido." }, { status: 400 });
  if (scheduled.getTime() < Date.now() + 10 * 60 * 1000)
    return NextResponse.json(
      { error: "Agendamento deve ser pelo menos 10 minutos no futuro." },
      { status: 400 }
    );

  const id = uuid();

  const draft: AutoPostItem = {
    id,
    userId: email,
    topic: topic.trim(),
    slideCount,
    writingStyle,
    imageSource,
    scheduledAt,
    status: "generating",
    createdAt: new Date().toISOString(),
  };
  await saveAutoPost(draft);
  await registerAutoPostForUser(email, id);

  try {
    // 1. Busca na web
    const searchResults = await searchWeb(topic);

    // 2. Gera conteúdo com Claude
    const slides = await generateSlides(topic, searchResults, slideCount, writingStyle);

    // 3. Gera imagens (Gemini IA ou fotos reais em paralelo com texto)
    let slideImageUrls: (string | null)[];
    if (imageSource === "ai") {
      slideImageUrls = await generateSlideImages(slides, id);
    } else {
      const enriched = await enrichSlidesWithImages(slides);
      slideImageUrls = enriched.map((e) => e.imagem?.url ?? null);
    }

    // 4. Gera legenda
    const caption = buildCaption(slides, topic);

    // 5. Persiste
    const ready: AutoPostItem = {
      ...draft,
      status: "pending_approval",
      slides,
      slideImageUrls,
      caption,
    };
    await saveAutoPost(ready);

    // 6. E-mail de preview (não bloqueia)
    sendPreviewEmail(email, id, topic, scheduledAt).catch((e) =>
      console.error("[auto-post] email error:", e)
    );

    return NextResponse.json({ id, status: "pending_approval", slideImageUrls });
  } catch (err: any) {
    console.error("[auto-post POST]", err);
    await saveAutoPost({ ...draft, status: "failed", error: err?.message ?? "Erro desconhecido" });
    return NextResponse.json(
      { error: err?.message ?? "Erro ao gerar conteúdo." },
      { status: 500 }
    );
  }
}
