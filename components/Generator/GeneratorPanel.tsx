"use client";

import { useState, useEffect } from "react";
import { Sparkles, Search, Loader2, AlertCircle, Image, Wand2, Crown, Zap } from "lucide-react";
import { GeneratedContent, SearchResult, Slide, WritingStyle } from "@/types";
import { v4 as uuid } from "uuid";

interface Props {
  onGenerate: (slides: Slide[]) => void;
}

const SLIDE_W = 1080;
const SLIDE_H = 1350;

type ImageStyle = "realista" | "cartoon" | "anime" | "stock" | "cinematico" | "abstrato";

const IMAGE_STYLES: { value: ImageStyle; label: string; desc: string; emoji: string }[] = [
  { value: "realista",   label: "Realista",    desc: "Fotografia real, HDR",         emoji: "📷" },
  { value: "cinematico", label: "Cinemático",  desc: "Filme, iluminação dramática",  emoji: "🎬" },
  { value: "stock",      label: "Stock",       desc: "Profissional, corporativo",    emoji: "💼" },
  { value: "cartoon",    label: "Cartoon",     desc: "Ilustração animada, colorida", emoji: "🎨" },
  { value: "anime",      label: "Anime",       desc: "Estilo japonês, mangá",        emoji: "⛩️" },
  { value: "abstrato",   label: "Abstrato",    desc: "Arte digital, geométrico",     emoji: "🌀" },
];

const STYLE_PROMPTS: Record<ImageStyle, string> = {
  realista:   "ultra-realistic photography, natural lighting, shallow depth of field, sharp focus, 8k DSLR photo, photojournalism quality, authentic emotion",
  cinematico: "cinematic still, dramatic moody lighting, film grain, anamorphic lens flare, Blade Runner color grading, dark atmospheric, hyper-detailed, IMAX quality",
  stock:      "professional stock photography, clean bright studio lighting, corporate editorial style, high-key lighting, sharp and polished, Getty Images quality",
  cartoon:    "vibrant cartoon illustration, bold outlines, flat colors with cel shading, Disney/Pixar style, expressive characters, clean vector art",
  anime:      "anime illustration style, manga aesthetic, studio Ghibli quality, detailed linework, vivid colors, dramatic sky, Japanese animation",
  abstrato:   "abstract digital art, geometric shapes, neon color palette, fluid dynamics, futuristic data visualization, award-winning generative art",
};

function applyAccent(text: string, accentColor: string): string {
  return text.replace(/\[([^\]]+)\]/g, `<span style="color:${accentColor};font-style:normal">$1</span>`);
}

export default function GeneratorPanel({ onGenerate }: Props) {
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState(7);
  const [writingStyle, setWritingStyle] = useState<WritingStyle>("viral");
  const [imageStyle, setImageStyle] = useState<ImageStyle>("cinematico");
  const [status, setStatus] = useState<"idle" | "searching" | "generating" | "images" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [sources, setSources] = useState<SearchResult[]>([]);
  const [imageProgress, setImageProgress] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const cid = localStorage.getItem("xpz_customer_id");
    if (!cid) return;
    setCustomerId(cid);
    fetch(`/api/stripe/verify?customer_id=${cid}`)
      .then((r) => r.json())
      .then((d) => setIsPro(d.active ?? false))
      .catch(() => {});
  }, []);

  const writingStyleOptions: { value: WritingStyle; label: string; desc: string }[] = [
    { value: "viral",        label: "⚡ Viral",        desc: "Chocante, para o scroll" },
    { value: "noticias",     label: "📰 Notícia",      desc: "Breaking news, urgente" },
    { value: "informativo",  label: "📊 Informativo",  desc: "Dados e fatos objetivos" },
    { value: "educativo",    label: "🎓 Educativo",    desc: "Didático, passo a passo" },
    { value: "motivacional", label: "🔥 Motivacional", desc: "Emocional, inspirador" },
  ];

  const buildSlides = (generated: GeneratedContent): Slide[] => {
    return generated.slides.map((gs, i) => {
      const bg = gs.colorScheme.background;
      const accent = gs.colorScheme.accent;
      const elements = [];

      elements.push({
        id: uuid(), type: "text" as const,
        x: 60, y: 60, width: 200, height: 40,
        content: String(i + 1).padStart(2, "0"),
        style: { fontSize: 20, fontWeight: "bold" as const, fontFamily: "sans-serif", color: accent, textAlign: "left" as const, lineHeight: 1 },
      });

      elements.push({
        id: uuid(), type: "text" as const,
        x: 60, y: SLIDE_H - 500, width: SLIDE_W - 120, height: 320,
        content: applyAccent(gs.title, accent),
        style: { fontSize: 80, fontWeight: "bold" as const, fontFamily: "sans-serif", color: "#ffffff", textAlign: "left" as const, lineHeight: 1.05 },
      });

      elements.push({
        id: uuid(), type: "text" as const,
        x: 60, y: SLIDE_H - 175, width: SLIDE_W - 120, height: 130,
        content: gs.body,
        style: { fontSize: 28, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.70)", textAlign: "left" as const, lineHeight: 1.45 },
      });

      const imagePrompt = gs.imagePrompt || topic;
      return {
        id: uuid(),
        backgroundColor: bg,
        backgroundImageUrl: undefined,
        backgroundImageLoading: true,
        elements,
        width: SLIDE_W,
        height: SLIDE_H,
        _imagePrompt: imagePrompt,
      } as Slide & { _imagePrompt: string };
    });
  };

  const generateImages = async (
    slides: (Slide & { _imagePrompt?: string })[],
    onProgress: (done: number) => void
  ): Promise<Slide[]> => {
    let done = 0;
    const withImages = await Promise.all(
      slides.map(async (slide) => {
        const prompt = (slide as any)._imagePrompt ?? topic;
        try {
          const res = await fetch("/api/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, imageStyle, customerId }),
          });
          const data = await res.json();
          done++;
          onProgress(done);
          const { _imagePrompt, ...cleanSlide } = slide as any;
          if (data.imageUrl) return { ...cleanSlide, backgroundImageUrl: data.imageUrl, backgroundImageLoading: false };
          return { ...cleanSlide, backgroundImageLoading: false };
        } catch {
          done++;
          onProgress(done);
          const { _imagePrompt, ...cleanSlide } = slide as any;
          return { ...cleanSlide, backgroundImageLoading: false };
        }
      })
    );
    return withImages;
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setError("");
    setSources([]);
    setImageProgress(0);

    try {
      setStatus("searching");
      const searchRes = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const searchData = await searchRes.json();
      if (!searchRes.ok) throw new Error(searchData.error);
      setSources(searchData.results);

      setStatus("generating");
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, searchResults: searchData.results, slideCount, writingStyle }),
      });
      const genData: GeneratedContent = await genRes.json();
      if (!genRes.ok) throw new Error((genData as any).error);

      setStatus("images");
      setImageProgress(0);
      const slidesWithoutImages = buildSlides(genData);
      onGenerate(slidesWithoutImages);

      const slidesWithImages = await generateImages(slidesWithoutImages, (done) => setImageProgress(done));
      onGenerate(slidesWithImages);
      setStatus("done");
    } catch (err: any) {
      setError(err.message ?? "Erro desconhecido");
      setStatus("error");
    }
  };

  const isLoading = ["searching", "generating", "images"].includes(status);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Sparkles size={18} className="text-brand-500" />
          Gerar com IA
        </h2>
        <p className="text-xs text-gray-500">Pesquisa na web + texto + imagens Gemini.</p>
      </div>

      {/* Tópico */}
      <div>
        <label className="text-sm text-gray-400 mb-1 block">Tema / Tópico</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="ex: Marketing digital para pequenas empresas"
          className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600"
          onKeyDown={(e) => e.key === "Enter" && !isLoading && handleGenerate()}
        />
      </div>

      {/* Quantidade de slides */}
      <div>
        <label className="text-sm text-gray-400 mb-1 block">
          Slides: <span className="text-white font-medium">{slideCount}</span>
        </label>
        <input type="range" min={1} max={15} value={slideCount}
          onChange={(e) => setSlideCount(Number(e.target.value))}
          className="w-full accent-brand-500" />
        <div className="flex justify-between text-xs text-gray-600 mt-1"><span>1</span><span>15</span></div>
      </div>

      {/* Estilo de imagem */}
      <div>
        <label className="text-sm text-gray-400 mb-2 block flex items-center gap-1.5">
          <Wand2 size={13} className="text-brand-400" /> Estilo das imagens
          {isPro
            ? <span className="text-[10px] text-yellow-400 ml-1 flex items-center gap-0.5"><Crown size={10} /> Pro · Gemini IA</span>
            : <span className="text-[10px] text-gray-500 ml-1">· Pexels (grátis)</span>
          }
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {IMAGE_STYLES.map((opt) => (
            <button key={opt.value} onClick={() => setImageStyle(opt.value)}
              className={`flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg border text-left transition-colors relative ${
                imageStyle === opt.value ? "border-brand-500 bg-brand-500/10" : "border-[#1e1e1e] bg-[#0f0f0f] hover:border-[#333]"
              } ${!isPro ? "opacity-60" : ""}`}>
              <span className="text-xs font-semibold text-white">{opt.emoji} {opt.label}</span>
              <span className="text-[10px] text-gray-500">{opt.desc}</span>
              {!isPro && <Crown size={9} className="absolute top-2 right-2 text-yellow-500/60" />}
            </button>
          ))}
        </div>
        {!isPro && (
          <button
            onClick={async () => {
              const res = await fetch("/api/stripe/checkout", { method: "POST" });
              const { url } = await res.json();
              window.location.href = url;
            }}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-xs font-medium transition-colors"
          >
            <Zap size={12} /> Fazer upgrade para imagens IA · Pro
          </button>
        )}
      </div>

      {/* Estilo de escrita */}
      <div>
        <label className="text-sm text-gray-400 mb-2 block">Estilo de texto</label>
        <div className="flex flex-col gap-1.5">
          {writingStyleOptions.map((opt) => (
            <button key={opt.value} onClick={() => setWritingStyle(opt.value)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors ${
                writingStyle === opt.value ? "border-brand-500 bg-brand-500/10 text-white" : "border-[#1e1e1e] bg-[#0f0f0f] text-gray-400 hover:border-[#333]"
              }`}>
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-xs text-gray-600">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Botão */}
      <button onClick={handleGenerate} disabled={!topic.trim() || isLoading}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {status === "searching" && "Pesquisando na web..."}
        {status === "generating" && "Gerando conteúdo com IA..."}
        {status === "images" && `Gerando imagens... (${imageProgress}/${slideCount})`}
        {(status === "idle" || status === "done" || status === "error") && "Gerar Carrossel"}
      </button>

      {/* Progresso imagens */}
      {status === "images" && (
        <div className="w-full bg-[#1e1e1e] rounded-full h-1.5 overflow-hidden">
          <div className="bg-brand-500 h-full transition-all duration-300"
            style={{ width: `${(imageProgress / slideCount) * 100}%` }} />
        </div>
      )}

      {status === "done" && (
        <div className="flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-lg p-3 text-xs text-brand-400">
          <Image size={13} />
          {isPro
            ? <>Imagens geradas com Gemini IA · estilo {IMAGE_STYLES.find(s => s.value === imageStyle)?.label}</>
            : <>Imagens do Pexels · <button onClick={async () => { const r = await fetch("/api/stripe/checkout", { method: "POST" }); const { url } = await r.json(); window.location.href = url; }} className="text-yellow-400 underline">upgrade para IA</button></>
          }
        </div>
      )}

      {status === "error" && (
        <div className="flex items-start gap-2 bg-red-900/30 border border-red-800/50 rounded-lg p-3 text-sm text-red-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {sources.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Search size={11} /> Fontes ({sources.length})
          </p>
          <div className="flex flex-col gap-2">
            {sources.map((s, i) => (
              <a key={i} href={s.link} target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-brand-400 bg-[#0f0f0f] rounded p-2 block truncate border border-[#1e1e1e] hover:border-brand-500/30 transition-colors"
                title={s.title}>
                {s.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
