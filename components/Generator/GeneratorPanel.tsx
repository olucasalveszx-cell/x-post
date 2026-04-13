"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Sparkles, Search, Loader2, AlertCircle, Image, Wand2, Crown, Zap, LogIn, ImagePlus, X, Terminal, Wand } from "lucide-react";
import LoginModal from "@/components/LoginModal";
import ImageSearchModal from "@/components/ImageSearchModal";
import { GeneratedContent, SearchResult, Slide, WritingStyle } from "@/types";
import { v4 as uuid } from "uuid";

interface Props {
  onGenerate: (slides: Slide[]) => void;
}

const SLIDE_W = 1080;
const SLIDE_H = 1350;

type ImageStyle = "realista" | "cartoon" | "anime" | "stock" | "cinematico" | "abstrato" | "foto_real";

const IMAGE_STYLES: { value: ImageStyle; label: string; desc: string; emoji: string; free?: boolean }[] = [
  { value: "foto_real",  label: "Foto Real",   desc: "Foto real do Google",            emoji: "🔍", free: true },
  { value: "realista",   label: "Realista",    desc: "Foto 8K, luz natural, HDR",      emoji: "📷" },
  { value: "cinematico", label: "Cinemático",  desc: "Filme épico, luz dramática",      emoji: "🎬" },
  { value: "stock",      label: "Stock",       desc: "Editorial limpo, corporativo",    emoji: "💼" },
  { value: "cartoon",    label: "Cartoon",     desc: "Disney/Pixar, cores vibrantes",   emoji: "🎨" },
  { value: "anime",      label: "Anime",       desc: "Ghibli, mangá detalhado",         emoji: "⛩️" },
  { value: "abstrato",   label: "Abstrato",    desc: "Formas geométricas, neon",        emoji: "🌀" },
];

const STYLE_PROMPTS: Record<ImageStyle, string> = {
  foto_real:  "real photograph from the web",
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
  const { data: session } = useSession();
  const [isPro, setIsPro] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [activationToken, setActivationToken] = useState<string | null>(null);
  const [refImageBase64, setRefImageBase64] = useState<string | null>(null);
  const [refImageMime, setRefImageMime] = useState<string>("image/jpeg");
  const [refImagePreview, setRefImagePreview] = useState<string | null>(null);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"topic" | "prompt">("topic");
  const [customPrompt, setCustomPrompt] = useState("");
  const [zoraHighlight, setZoraHighlight] = useState(false);
  const [credits, setCredits] = useState<{ remaining: number; limit: number; unlimited: boolean; plan: string } | null>(null);
  const [creditToast, setCreditToast] = useState<{ spent: number; remaining: number } | null>(null);

  // Recebe prompts gerados pela Zora
  useEffect(() => {
    const handler = (e: Event) => {
      const prompt = (e as CustomEvent).detail?.prompt;
      if (!prompt) return;
      setCustomPrompt(prompt);
      setInputMode("prompt");
      setZoraHighlight(true);
      setTimeout(() => setZoraHighlight(false), 2000);
    };
    window.addEventListener("zora-prompt", handler);
    return () => window.removeEventListener("zora-prompt", handler);
  }, []);

  useEffect(() => {
    // Se logado com Google, verifica pelo email da sessão
    if (session?.user?.email) {
      fetch(`/api/stripe/verify?email=${encodeURIComponent(session.user.email)}`)
        .then((r) => r.json())
        .then((d) => setIsPro(d.active ?? false))
        .catch(() => {});
      return;
    }
    // Fallback: token Kirvano no localStorage
    const token = localStorage.getItem("xpz_activation_token");
    if (token) { setActivationToken(token); setIsPro(true); return; }
    // Fallback: customerId Stripe no localStorage
    const cid = localStorage.getItem("xpz_customer_id");
    if (!cid) return;
    setCustomerId(cid);
    fetch(`/api/stripe/verify?customer_id=${cid}`)
      .then((r) => r.json())
      .then((d) => setIsPro(d.active ?? false))
      .catch(() => {});
  }, [session]);

  const fetchCredits = () => {
    fetch("/api/credits")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setCredits(d); window.dispatchEvent(new CustomEvent("credits-updated", { detail: d })); } })
      .catch(() => {});
  };

  useEffect(() => { fetchCredits(); }, [session]);

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
      const isLast = i === generated.slides.length - 1;
      const elements = [];

      // Título — grande, impactante, bottom-heavy
      elements.push({
        id: uuid(), type: "text" as const,
        x: 64, y: SLIDE_H - 520, width: SLIDE_W - 128, height: 340,
        content: applyAccent(gs.title, accent),
        style: { fontSize: 92, fontWeight: "bold" as const, fontFamily: "sans-serif", color: "#ffffff", textAlign: "left" as const, lineHeight: 1.0 },
      });

      // Corpo — compacto, logo abaixo do título
      elements.push({
        id: uuid(), type: "text" as const,
        x: 64, y: SLIDE_H - 172, width: SLIDE_W - 128, height: 108,
        content: gs.body,
        style: { fontSize: 26, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.65)", textAlign: "left" as const, lineHeight: 1.45 },
      });

      // CTA no último slide
      if (isLast && gs.callToAction) {
        elements.push({
          id: uuid(), type: "text" as const,
          x: 64, y: SLIDE_H - 64, width: SLIDE_W - 128, height: 48,
          content: `<span style="color:${accent}">${gs.callToAction}</span>`,
          style: { fontSize: 24, fontWeight: "bold" as const, fontFamily: "sans-serif", color: accent, textAlign: "left" as const, lineHeight: 1 },
        });
      }

      const imagePrompt  = gs.imagePrompt  || topic;
      const searchQuery  = gs.searchQuery  || topic;
      return {
        id: uuid(),
        backgroundColor: bg,
        backgroundImageUrl: undefined,
        backgroundImageLoading: true,
        backgroundGradient: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.80) 40%, rgba(0,0,0,0.30) 70%, rgba(0,0,0,0.10) 100%)",
        elements,
        width: SLIDE_W,
        height: SLIDE_H,
        _imagePrompt: imagePrompt,
        _searchQuery:  searchQuery,
      } as Slide & { _imagePrompt: string; _searchQuery: string };
    });
  };

  const generateImages = async (
    slides: (Slide & { _imagePrompt?: string })[],
    onProgress: (done: number) => void
  ): Promise<Slide[]> => {
    let done = 0;
    const withImages = await Promise.all(
      slides.map(async (slide) => {
        // Foto Real usa searchQuery (curto, natural); IA usa imagePrompt (descritivo)
        const prompt = imageStyle === "foto_real"
          ? ((slide as any)._searchQuery ?? topic)
          : ((slide as any)._imagePrompt ?? topic);
        try {
          const res = await fetch("/api/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              imageStyle,
              customerId,
              activationToken,
              ...(refImageBase64 && imageStyle !== "foto_real" ? { referenceImageBase64: refImageBase64, referenceImageMime: refImageMime } : {}),
            }),
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
    if (inputMode === "prompt") { handleGenerateFromPrompt(); return; }
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
      if (genRes.status === 402) throw new Error((genData as any).error);
      if (!genRes.ok) throw new Error((genData as any).error);

      setStatus("images");
      setImageProgress(0);
      const slidesWithoutImages = buildSlides(genData);
      onGenerate(slidesWithoutImages);

      const slidesWithImages = await generateImages(slidesWithoutImages, (done) => setImageProgress(done));
      onGenerate(slidesWithImages);
      setStatus("done");
      const prev = credits;
      fetchCredits();
      if (prev && !prev.unlimited) setCreditToast({ spent: 1, remaining: Math.max(0, prev.remaining - 1) });
    } catch (err: any) {
      setError(err.message ?? "Erro desconhecido");
      setStatus("error");
    }
  };

  const handleGenerateFromPrompt = async () => {
    if (!customPrompt.trim()) return;
    setError("");
    setSources([]);
    setImageProgress(0);

    try {
      setStatus("generating");
      const genRes = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPrompt, slideCount }),
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

  const goToCheckout = async (plan = "pro") => {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        alert("Erro ao abrir checkout: " + (data.error ?? res.status));
        return;
      }
      window.location.href = data.url;
    } catch (e: any) {
      alert("Erro: " + e.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Badge login / Pro / Free */}
      {!session?.user ? (
        <button onClick={() => setLoginOpen(true)}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors">
          <LogIn size={14} /> Entrar para gerar
        </button>
      ) : isPro ? (
        <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs text-yellow-400 font-medium">
            <Crown size={12} /> Pro · {session.user.name?.split(" ")[0]}
          </span>
          <button
            onClick={async () => {
              if (!customerId) return;
              const res = await fetch("/api/stripe/portal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customerId }),
              });
              const { url } = await res.json();
              window.location.href = url;
            }}
            className="text-[11px] text-yellow-500/70 hover:text-yellow-400 underline transition-colors"
          >
            Gerenciar assinatura
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2">
          <span className="text-xs text-gray-500">Grátis · {session.user.name?.split(" ")[0]}</span>
          <button onClick={goToCheckout} className="text-[11px] text-brand-400 hover:text-brand-300 underline transition-colors">
            Upgrade Pro
          </button>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Sparkles size={18} className="text-brand-500" />
          Gerar com IA
        </h2>
      </div>

      {/* Toggle Tópico / Prompt Livre */}
      <div className="flex rounded-xl border border-[#1e1e1e] overflow-hidden">
        <button
          onClick={() => setInputMode("topic")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            inputMode === "topic"
              ? "bg-brand-600 text-white"
              : "bg-[#0f0f0f] text-gray-500 hover:text-gray-300"
          }`}
        >
          <Search size={12} /> Por Tópico
        </button>
        <button
          onClick={() => setInputMode("prompt")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            inputMode === "prompt"
              ? "bg-brand-600 text-white"
              : "bg-[#0f0f0f] text-gray-500 hover:text-gray-300"
          }`}
        >
          <Terminal size={12} /> Prompt Livre
        </button>
      </div>

      {/* Modo Por Tópico */}
      {inputMode === "topic" && (
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
          <p className="text-[10px] text-gray-600 mt-1">A IA pesquisa na web e cria o conteúdo automaticamente.</p>
        </div>
      )}

      {/* Modo Prompt Livre */}
      {inputMode === "prompt" && (
        <div>
          <label className="text-sm text-gray-400 mb-1 block flex items-center gap-1.5">
            <Terminal size={12} className="text-brand-400" /> Seu prompt
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={`Descreva exatamente como quer cada slide. Exemplo:\n\nSlide 1: Título impactante sobre produtividade\nSlide 2: A maioria das pessoas perde 3h por dia em distrações\nSlide 3: Técnica Pomodoro — 25 min foco, 5 min pausa\nSlide 4: Como aplicar no trabalho remoto\nSlide 5: CTA para seguir o perfil`}
            rows={9}
            className={`w-full bg-[#0f0f0f] rounded-lg px-3 py-2 text-sm focus:outline-none placeholder:text-gray-600 resize-none font-mono text-xs leading-relaxed transition-all duration-500 ${
              zoraHighlight
                ? "border-2 border-purple-500 shadow-[0_0_16px_rgba(168,85,247,0.4)]"
                : "border border-[#1e1e1e] focus:border-brand-500"
            }`}
          />
          {zoraHighlight && (
            <p className="text-[11px] text-purple-400 flex items-center gap-1 mt-1">
              <Wand size={10} /> Prompt gerado pela Zora — pronto para usar!
            </p>
          )}
          <p className="text-[10px] text-gray-600 mt-1">A IA segue seu prompt à risca. Sem pesquisa na web.</p>
        </div>
      )}

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
          {IMAGE_STYLES.map((opt) => {
            const locked = !isPro && !opt.free;
            return (
              <button key={opt.value} onClick={() => { if (!locked) setImageStyle(opt.value); }}
                className={`flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg border text-left transition-colors relative ${
                  imageStyle === opt.value ? "border-brand-500 bg-brand-500/10" : "border-[#1e1e1e] bg-[#0f0f0f] hover:border-[#333]"
                } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}>
                <span className="text-xs font-semibold text-white">{opt.emoji} {opt.label}</span>
                <span className="text-[10px] text-gray-500">{opt.desc}</span>
                {opt.free && <span className="absolute top-1.5 right-2 text-[9px] text-green-400 font-bold">FREE</span>}
                {locked && <Crown size={9} className="absolute top-2 right-2 text-yellow-500/60" />}
              </button>
            );
          })}
        </div>
        {!isPro && (
          <button
            onClick={goToCheckout}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-xs font-medium transition-colors"
          >
            <Zap size={12} /> Fazer upgrade para imagens IA · Pro
          </button>
        )}
      </div>

      {/* Imagem de referência (Pro) */}
      {isPro && imageStyle !== "foto_real" && (
        <div>
          <label className="text-sm text-gray-400 mb-2 block flex items-center gap-1.5">
            <ImagePlus size={13} className="text-brand-400" /> Imagem de referência
            <span className="text-[10px] text-yellow-400 ml-1 flex items-center gap-0.5"><Crown size={10} /> Pro</span>
          </label>

          {refImagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-[#2a2a2a] group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={refImagePreview} alt="Referência" className="w-full h-28 object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => setImageSearchOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium"
                >
                  Trocar
                </button>
                <button
                  onClick={() => { setRefImageBase64(null); setRefImagePreview(null); }}
                  className="p-1.5 rounded-lg bg-black/60 text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                <p className="text-[10px] text-white/70">A IA vai usar esta imagem como base visual</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setImageSearchOpen(true)}
              className="w-full flex flex-col items-center justify-center gap-2 py-5 rounded-xl border border-dashed border-[#2a2a2a] hover:border-brand-500/50 hover:bg-brand-500/5 text-gray-500 hover:text-gray-300 transition-all"
            >
              <Search size={18} />
              <span className="text-xs">Buscar imagem de referência na web</span>
              <span className="text-[10px] text-gray-600">A IA recria o visual como arte para os slides</span>
            </button>
          )}
        </div>
      )}

      {/* Estilo de escrita — oculto no modo prompt (usuário define o tom no texto) */}
      {inputMode === "topic" && <div>
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
      </div>}

      {/* Indicador de créditos */}
      {credits && !credits.unlimited && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
          style={{
            background: credits.remaining > 5 ? "rgba(168,85,247,0.08)" : credits.remaining > 0 ? "rgba(251,191,36,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${credits.remaining > 5 ? "rgba(168,85,247,0.2)" : credits.remaining > 0 ? "rgba(251,191,36,0.2)" : "rgba(239,68,68,0.2)"}`,
          }}>
          <span style={{ color: credits.remaining > 5 ? "#c084fc" : credits.remaining > 0 ? "#fbbf24" : "#f87171" }}
            className="flex items-center gap-1">
            <Zap size={11} />
            {credits.remaining > 0 ? `Esta geração usa 1 crédito` : "Sem créditos disponíveis"}
          </span>
          <span className="text-gray-500">{credits.remaining}/{credits.limit} restantes</span>
        </div>
      )}

      {/* Toast de créditos após gerar */}
      {creditToast && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs animate-pulse">
          <span className="text-green-400 flex items-center gap-1"><Zap size={11} /> 1 crédito usado</span>
          <span className="text-gray-400">{creditToast.remaining} restantes este mês</span>
        </div>
      )}

      {/* Botão */}
      <button
        onClick={handleGenerate}
        disabled={(inputMode === "topic" ? !topic.trim() : !customPrompt.trim()) || isLoading || (credits !== null && !credits.unlimited && credits.remaining <= 0)}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : inputMode === "prompt" ? <Terminal size={16} /> : <Sparkles size={16} />}
        {status === "searching" && "Pesquisando na web..."}
        {status === "generating" && "Gerando com IA..."}
        {status === "images" && `Gerando imagens... (${imageProgress}/${slideCount})`}
        {(status === "idle" || status === "done" || status === "error") && (
          inputMode === "prompt" ? "Gerar pelo Prompt" : "Gerar Carrossel"
        )}
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
          {imageStyle === "foto_real"
            ? <>Fotos reais do Google · busca automática</>
            : isPro
            ? <>Imagens geradas com Gemini / DALL-E 3 · estilo {IMAGE_STYLES.find(s => s.value === imageStyle)?.label}</>
            : <>Imagens do Pexels · <button onClick={goToCheckout} className="text-yellow-400 underline">upgrade para IA</button></>
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

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      <ImageSearchModal
        open={imageSearchOpen}
        onClose={() => setImageSearchOpen(false)}
        defaultQuery={topic}
        onSelect={(b64, mime, previewUrl) => {
          setRefImageBase64(b64);
          setRefImageMime(mime);
          setRefImagePreview(previewUrl);
        }}
      />
    </div>
  );
}
