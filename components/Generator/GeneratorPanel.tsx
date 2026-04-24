"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { Sparkles, Search, Loader2, AlertCircle, Crown, Zap, LogIn, CheckCircle2, Clock, X } from "lucide-react";
import LoginModal from "@/components/LoginModal";
import { GeneratedContent, SearchResult, Slide, WritingStyle } from "@/types";
import { v4 as uuid } from "uuid";
import GeneratorWizard, { WizardSettings, ImageLayout } from "./GeneratorWizard";

interface Props {
  onGenerate: (slides: Slide[]) => void;
  onLayoutChange?: (slides: Slide[]) => void;
  currentSlides?: Slide[];
}

const SLIDE_W = 1080;
const SLIDE_H = 1350;

type ImageStyle = "gemini" | "foto_real";

function applyAccent(text: string, accentColor: string): string {
  return text.replace(/\[([^\]]+)\]/g, `<span style="color:${accentColor};font-style:normal">$1</span>`);
}

// Templates: 0=Cover(full bg), 1=Cinematic(full bg), 2=Content(solid+img element), 3=Mixed(solid+img element)
const LAYOUT_BG_POSITIONS = [
  { x: 50, y: 50 },  // 0 classic
  { x: 42, y: 36 },  // 1 cinematic
];
const LAYOUT_BG_ZOOMS = [100, 115];

// Reduz fonte quando o título tem muitas palavras para evitar corte
function adaptTitleSize(title: string, base: number): number {
  const plain = title.replace(/<[^>]+>/g, "").replace(/\[|\]/g, "");
  const words = plain.trim().split(/\s+/).length;
  if (words <= 5) return base;
  if (words <= 7) return Math.round(base * 0.88);
  return Math.round(base * 0.76);
}

function buildSlides(generated: GeneratedContent, ws: WizardSettings): (Slide & { _imagePrompt: string; _searchQuery: string; _elementImageId?: string })[] {
  const W = SLIDE_W;
  const H = SLIDE_H;
  const N = generated.slides.length;
  const handle = ws.handle ? `@${ws.handle.replace(/^@/, "")}` : "";
  const brand = ws.brandName || "";
  const ctitle = ws.carouselTitle || "";

  return generated.slides.map((gs, i) => {
    const accent = gs.colorScheme.accent;
    const isLast = i === N - 1;

    // Determina variante com base no imageLayout escolhido pelo usuário
    const layout: ImageLayout = ws.imageLayout ?? "mixed";
    let variant: 0 | 1 | 2 | 3 | 4 | 5;
    if (layout === "full") {
      variant = i % 2 === 0 ? 0 : 1;
    } else if (layout === "square") {
      variant = 4;
    } else if (layout === "top") {
      variant = 5;
    } else if (layout === "base") {
      variant = (i === 0 || isLast) ? 0 : 2;
    } else {
      // mixed: capa e última = 0, demais ciclam 1,2,3
      variant = (i === 0 || isLast) ? 0 : (((i - 1) % 3) + 1) as 1 | 2 | 3;
    }
    const useBgImage = variant <= 1;
    const elementImageId = !useBgImage ? uuid() : undefined;

    const elements: any[] = [];

    // ── Header ───────────────────────────────────────────
    if (handle) {
      elements.push({
        id: uuid(), type: "text" as const,
        x: 60, y: 36, width: W * 0.44, height: 52,
        content: handle,
        style: { fontSize: 27, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.55)", textAlign: "left" as const, lineHeight: 1 },
      });
    }
    if (ctitle) {
      elements.push({
        id: uuid(), type: "text" as const,
        x: W * 0.44, y: 36, width: W * 0.52, height: 52,
        content: ctitle,
        style: { fontSize: 27, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.55)", textAlign: "right" as const, lineHeight: 1 },
      });
    }

    // ── Layout-specific ───────────────────────────────────
    let gradient = "";
    let titleY: number, titleH = 280, titleSize = 90;
    let titleAlign: "left" | "center" | "right" = "center";
    let bodyY: number, bodyH = 110, bodySize = 28;
    let bodyAlign: "left" | "center" | "right" = "center";

    if (variant === 1) {
      // Cinemático: imagem de fundo, faixas escuras, título esquerda no 1/3 superior
      gradient = "linear-gradient(180deg, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.14) 30%, rgba(0,0,0,0.14) 55%, rgba(0,0,0,0.93) 100%)";
      titleY = Math.round(H * 0.28); titleAlign = "left"; titleSize = 82; titleH = 300;
      bodyY = Math.min(titleY + 310, H - 210);
      elements.push({ id: uuid(), type: "text" as const, x: W - 220, y: 56, width: 200, height: 200,
        content: String(i + 1).padStart(2, "0"),
        style: { fontSize: 160, fontWeight: "bold" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.06)", textAlign: "right" as const, lineHeight: 1 } });
      elements.push({ id: uuid(), type: "shape" as const, x: 60, y: titleY - 28, width: 56, height: 6, content: "",
        style: { fill: accent, stroke: "transparent", strokeWidth: 0, borderRadius: 3 } });

    } else if (variant === 2) {
      // Content: fundo sólido, título grande esquerda, corpo, imagem contida na base
      titleY = 110; titleAlign = "left"; titleSize = 76; titleH = 230;
      bodyY = 360; bodyH = 130; bodySize = 30; bodyAlign = "left";
      // Imagem como elemento (landscape, base do slide)
      elements.push({ id: elementImageId, type: "image" as const,
        x: 60, y: 510, width: W - 120, height: 660, imageObjectPositionY: 25 });

    } else if (variant === 3) {
      // Mixed: fundo sólido, título bold grande, texto curto, imagem maior no centro-base
      titleY = 110; titleAlign = "left"; titleSize = 84; titleH = 210;
      bodyY = 340; bodyH = 110; bodySize = 30; bodyAlign = "left";
      elements.push({ id: elementImageId, type: "image" as const,
        x: 60, y: 470, width: W - 120, height: 700, imageObjectPositionY: 25 });

    } else if (variant === 4) {
      // Quadrado central: título topo, imagem quadrada centralizada, corpo abaixo
      titleY = 90; titleAlign = "center"; titleSize = 72; titleH = 200;
      const sqSize = Math.round(W * 0.72);
      const sqX = Math.round((W - sqSize) / 2);
      const sqY = Math.round(H * 0.3);
      bodyY = sqY + sqSize + 40; bodyH = 130; bodySize = 28; bodyAlign = "center";
      elements.push({ id: elementImageId, type: "image" as const,
        x: sqX, y: sqY, width: sqSize, height: sqSize, imageObjectPositionY: 50 });

    } else if (variant === 5) {
      // Imagem no topo: imagem ocupa metade superior, texto na metade inferior
      const imgH = Math.round(H * 0.5);
      titleY = imgH + 60; titleAlign = "left"; titleSize = 72; titleH = 220;
      bodyY = titleY + 230; bodyH = 120; bodySize = 28; bodyAlign = "left";
      elements.push({ id: elementImageId, type: "image" as const,
        x: 0, y: 0, width: W, height: imgH, imageObjectPositionY: 40 });

    } else {
      // Clássico (Cover/CTA): gradiente forte, título base
      gradient = "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.97) 28%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.1) 72%, rgba(0,0,0,0) 100%)";
      titleY = H - 510; bodyY = H - 192;
    }

    // ── Title ─────────────────────────────────────────────
    const finalTitleSize = adaptTitleSize(gs.title, titleSize);
    elements.push({
      id: uuid(), type: "text" as const,
      x: 60, y: titleY, width: W - 120, height: titleH,
      content: applyAccent(gs.title, accent),
      style: { fontSize: finalTitleSize, fontWeight: "bold" as const, fontFamily: "sans-serif", color: "#ffffff", textAlign: titleAlign, lineHeight: 1.05 },
    });

    // ── Body ──────────────────────────────────────────────
    elements.push({
      id: uuid(), type: "text" as const,
      x: 60, y: bodyY, width: W - 120, height: bodyH,
      content: isLast && gs.callToAction ? gs.callToAction : gs.body,
      style: { fontSize: bodySize, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.72)", textAlign: bodyAlign, lineHeight: 1.45 },
    });

    // ── Footer ────────────────────────────────────────────
    const FY = H - 82;
    if (brand) {
      elements.push({ id: uuid(), type: "text" as const, x: 60, y: FY, width: W * 0.32, height: 70, content: brand,
        style: { fontSize: 25, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.4)", textAlign: "left" as const, lineHeight: 1 } });
    }
    const dots = Array.from({ length: N }, (_, di) =>
      di === i ? `<span style="color:rgba(255,255,255,0.9)">●</span>` : `<span style="color:rgba(255,255,255,0.18)">●</span>`
    ).join(" ");
    elements.push({ id: uuid(), type: "text" as const, x: W * 0.28, y: FY + 8, width: W * 0.44, height: 56, content: dots,
      style: { fontSize: 20, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.25)", textAlign: "center" as const, lineHeight: 1 } });
    elements.push({ id: uuid(), type: "text" as const, x: W * 0.6, y: FY, width: W * 0.35, height: 70,
      content: isLast ? "salva ❤️" : "arrasta →",
      style: { fontSize: 25, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.4)", textAlign: "right" as const, lineHeight: 1 } });

    return {
      id: uuid(),
      backgroundColor: useBgImage ? "#0a0a0a" : "#0d0d0d",
      backgroundImageUrl: undefined,
      backgroundImageLoading: useBgImage,
      backgroundGradient: useBgImage && gradient ? gradient : undefined,
      backgroundPosition: useBgImage ? LAYOUT_BG_POSITIONS[variant] : undefined,
      backgroundZoom: useBgImage ? LAYOUT_BG_ZOOMS[variant] : undefined,
      elements,
      width: W,
      height: H,
      _imagePrompt: gs.imagePrompt || ws.topic,
      _searchQuery: gs.searchQuery || ws.topic,
      _elementImageId: elementImageId,
    };
  });
}

async function generateImages(
  slides: (Slide & { _imagePrompt?: string; _searchQuery?: string })[],
  ws: WizardSettings,
  customerId: string | null,
  activationToken: string | null,
  onProgress: (done: number) => void
): Promise<Slide[]> {
  let done = 0;
  return Promise.all(
    slides.map(async (slide) => {
      const prompt = ws.imageStyle === "foto_real"
        ? ((slide as any)._searchQuery ?? ws.topic)
        : ((slide as any)._imagePrompt ?? ws.topic);
      try {
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            imageStyle: ws.imageStyle,
            customerId,
            activationToken,
            ...(ws.refImageBase64 && ws.imageStyle !== "foto_real"
              ? { referenceImageBase64: ws.refImageBase64, referenceImageMime: ws.refImageMime }
              : {}),
          }),
        });
        const data = await res.json();
        done++; onProgress(done);
        const { _imagePrompt, _searchQuery, _elementImageId, ...clean } = slide as any;
        if (data.imageUrl && _elementImageId) {
          return { ...clean, elements: clean.elements.map((el: any) =>
            el.id === _elementImageId ? { ...el, src: data.imageUrl } : el
          ), backgroundImageLoading: false };
        }
        return data.imageUrl
          ? { ...clean, backgroundImageUrl: data.imageUrl, backgroundImageLoading: false }
          : { ...clean, backgroundImageLoading: false };
      } catch {
        done++; onProgress(done);
        const { _imagePrompt, _searchQuery, _elementImageId, ...clean } = slide as any;
        return { ...clean, backgroundImageLoading: false };
      }
    })
  );
}

export default function GeneratorPanel({ onGenerate }: Props) {
  const [status, setStatus] = useState<"idle" | "searching" | "generating" | "images" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [sources, setSources] = useState<SearchResult[]>([]);
  const [imageProgress, setImageProgress] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [lastSettings, setLastSettings] = useState<WizardSettings | null>(null);
  const [lastGenContent, setLastGenContent] = useState<GeneratedContent | null>(null);
  const [slideImages, setSlideImages] = useState<Array<string | null>>([]);

  const { data: session } = useSession();
  const [isPro, setIsPro] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [loginOpen, setLoginOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [activationToken, setActivationToken] = useState<string | null>(null);
  const [credits, setCredits] = useState<{ remaining: number; limit: number; unlimited: boolean } | null>(null);
  const [creditToast, setCreditToast] = useState<{ spent: number; remaining: number } | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardTwitterMode, setWizardTwitterMode] = useState(false);
  const [recentTopics, setRecentTopics] = useState<string[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("xpz_recent_topics");
      if (stored) setRecentTopics(JSON.parse(stored));
      if (localStorage.getItem("xpz_banner_dismissed")) setBannerDismissed(true);
    } catch {}
  }, []);

  // Listen for external trigger (canvas overlay button / onboarding)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      if (detail.topic) setLastSettings((prev) => ({ ...(prev ?? defaultSettings()), topic: detail.topic, inputMode: "topic" }));
      setWizardTwitterMode(!!detail.isTwitter);
      setShowWizard(true);
    };
    window.addEventListener("open-generator-wizard", handler);
    return () => window.removeEventListener("open-generator-wizard", handler);
  }, []);

  // Nexa IA prompt injection
  useEffect(() => {
    const handler = (e: Event) => {
      const prompt = (e as CustomEvent).detail?.prompt;
      if (!prompt) return;
      setLastSettings((prev) => ({ ...(prev ?? defaultSettings()), customPrompt: prompt, inputMode: "prompt" }));
      setShowWizard(true);
    };
    window.addEventListener("nexa-prompt", handler);
    return () => window.removeEventListener("nexa-prompt", handler);
  }, []);

  // Pro check via Kirvano
  useEffect(() => {
    if ((session?.user as any)?.role === "admin") { setIsPro(true); setUserPlan("god"); return; }
    const token = localStorage.getItem("xpz_activation_token");
    if (token) { setActivationToken(token); setIsPro(true); return; }
    if (session?.user?.email) {
      fetch("/api/credits")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d?.plan) {
            setUserPlan(d.plan);
            if (d.plan !== "free") setIsPro(true);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  const fetchCredits = () => {
    fetch("/api/credits").then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setCredits(d); window.dispatchEvent(new CustomEvent("credits-updated", { detail: d })); } })
      .catch(() => {});
  };
  useEffect(() => { fetchCredits(); }, [session]);

  const isLoading = ["searching", "generating", "images"].includes(status);

  const KIRVANO_URLS: Record<string, string> = {
    basic:    "https://pay.kirvano.com/d3f6da72-a6be-4d54-8268-20c725e4ab5b",
    pro:      "https://pay.kirvano.com/e5bdb60b-3d05-4338-bbb7-59e17b1b636f",
    business: "https://pay.kirvano.com/2aca1343-9b14-48d4-aedc-8f532b509abd",
  };

  const goToCheckout = (plan = "pro") => {
    window.open(KIRVANO_URLS[plan] ?? KIRVANO_URLS.pro, "_blank");
  };

  const handleWizardConfirm = async (ws: WizardSettings) => {
    setLastSettings(ws);
    setError(""); setSources([]); setImageProgress(0); setTotalImages(ws.slideCount);

    const extractImages = (slides: Slide[]): Array<string | null> =>
      slides.map((s) => {
        if (s.backgroundImageUrl) return s.backgroundImageUrl;
        const el = s.elements.find((e: any) => e.type === "image" && e.src);
        return (el as any)?.src ?? null;
      });

    if (ws.inputMode === "prompt") {
      try {
        setStatus("generating");
        const genRes = await fetch("/api/generate-prompt", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customPrompt: ws.customPrompt, slideCount: ws.slideCount }),
        });
        const genData: GeneratedContent = await genRes.json();
        if (!genRes.ok) throw new Error((genData as any).error);
        setStatus("images"); setImageProgress(0);
        const rawSlides = buildSlides(genData, ws);
        onGenerate(rawSlides);
        const withImages = await generateImages(rawSlides, ws, customerId, activationToken, (n) => setImageProgress(n));
        onGenerate(withImages);
        setLastGenContent(genData);
        setSlideImages(extractImages(withImages));
        setStatus("done");
      } catch (err: any) { setError(err.message ?? "Erro desconhecido"); setStatus("error"); }
      return;
    }

    try {
      setStatus("searching");
      const searchRes = await fetch("/api/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: ws.topic }),
      });
      const searchData = await searchRes.json();
      if (!searchRes.ok) throw new Error(searchData.error);
      setSources(searchData.results);

      setStatus("generating");
      const genRes = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: ws.topic, searchResults: searchData.results, slideCount: ws.slideCount, writingStyle: ws.writingStyle, imageStyle: ws.imageStyle }),
      });
      const genData: GeneratedContent = await genRes.json();
      if (genRes.status === 402) throw new Error((genData as any).error);
      if (!genRes.ok) throw new Error((genData as any).error);

      setStatus("images"); setImageProgress(0);
      const rawSlides = buildSlides(genData, ws);
      onGenerate(rawSlides);
      const withImages = await generateImages(rawSlides, ws, customerId, activationToken, (n) => setImageProgress(n));
      onGenerate(withImages);
      setLastGenContent(genData);
      setSlideImages(extractImages(withImages));
      setStatus("done");

      if (ws.topic) {
        setRecentTopics((prev) => {
          const updated = [ws.topic, ...prev.filter((t) => t !== ws.topic)].slice(0, 3);
          try { localStorage.setItem("xpz_recent_topics", JSON.stringify(updated)); } catch {}
          return updated;
        });
      }

      const prev = credits;
      fetchCredits();
      const cost = ws.imageStyle === "foto_real" ? 1 : 2;
      if (prev && !prev.unlimited) setCreditToast({ spent: cost, remaining: Math.max(0, prev.remaining - cost) });
    } catch (err: any) { setError(err.message ?? "Erro desconhecido"); setStatus("error"); }
  };

  const handleLayoutChange = (newLayout: ImageLayout) => {
    if (!lastGenContent || !lastSettings) return;
    const newSettings: WizardSettings = { ...lastSettings, imageLayout: newLayout };
    setLastSettings(newSettings);
    const rawSlides = buildSlides(lastGenContent, newSettings);
    const slidesWithImages = rawSlides.map((s, i) => {
      const imgUrl = slideImages[i] ?? null;
      const { _imagePrompt, _searchQuery, _elementImageId, ...clean } = s as any;
      if (!imgUrl) return { ...clean, backgroundImageLoading: false };
      if (_elementImageId) {
        return {
          ...clean,
          backgroundImageLoading: false,
          elements: clean.elements.map((el: any) =>
            el.id === _elementImageId ? { ...el, src: imgUrl } : el
          ),
        };
      }
      return { ...clean, backgroundImageUrl: imgUrl, backgroundImageLoading: false };
    });
    onGenerate(slidesWithImages);
  };

  const loadingPopup = isLoading && typeof window !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center md:hidden" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}>
          <div className="flex flex-col items-center gap-5 px-8 py-10 rounded-3xl bg-[var(--bg-2)] border border-[var(--border)] shadow-2xl mx-4 w-full max-w-xs">
            {/* Animated icon */}
            <div className="relative">
              <div className="p-5 rounded-full bg-brand-500/10 border border-brand-500/20">
                <Loader2 size={36} className="animate-spin text-brand-400" />
              </div>
              <div className="absolute inset-0 rounded-full bg-brand-500/5 animate-ping" />
            </div>

            {/* Status text */}
            <div className="text-center">
              <p className="text-base font-semibold text-[var(--text)]">
                {status === "searching" && "Pesquisando na web..."}
                {status === "generating" && "Gerando com I.A..."}
                {status === "images" && "Gerando imagens com I.A"}
              </p>
              <p className="text-xs text-[var(--text-3)] mt-1.5">
                {status === "searching" && "Buscando informações atualizadas"}
                {status === "generating" && "Criando o conteúdo dos slides"}
                {status === "images" && totalImages > 0 ? `${imageProgress} de ${totalImages} slides` : "Aguarde um momento..."}
              </p>
            </div>

            {/* Progress bar */}
            {status === "images" && totalImages > 0 && (
              <div className="w-full flex flex-col gap-1.5">
                <div className="w-full bg-[var(--bg-4)] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-500 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${(imageProgress / totalImages) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-[var(--text-3)] text-right">{Math.round((imageProgress / totalImages) * 100)}%</p>
              </div>
            )}

            {/* Steps indicator */}
            <div className="flex items-center gap-2 mt-1">
              {["searching", "generating", "images"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full transition-all duration-300"
                    style={{
                      background: status === s ? "#4c6ef5" : ["searching", "generating", "images"].indexOf(status) > i ? "#6b21a8" : "#1f1f1f",
                      boxShadow: status === s ? "0 0 8px #4c6ef5" : "none",
                    }}
                  />
                  {i < 2 && <div className="w-6 h-px bg-[#222]" />}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="flex flex-col h-full">
      {loadingPopup}
      {/* User badge */}
      <div className="p-4 shrink-0 border-b border-[var(--border)]">
        {!session?.user ? (
          <button
            onClick={() => setLoginOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-[var(--border-2)] bg-[var(--bg-3)] hover:bg-[var(--bg-4)] text-sm text-[var(--text-2)] transition-colors"
          >
            <LogIn size={14} /> Entrar para gerar
          </button>
        ) : (() => {
          const PLAN_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
            god:      { label: "God",      color: "#4c6ef5", bg: "rgba(76,110,245,0.10)",  border: "rgba(76,110,245,0.25)" },
            business: { label: "Business", color: "#f59e0b", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.25)" },
            pro:      { label: "Pro",      color: "#ec4899", bg: "rgba(236,72,153,0.10)",  border: "rgba(236,72,153,0.25)" },
            basic:    { label: "Básico",   color: "#60a5fa", bg: "rgba(96,165,250,0.10)",  border: "rgba(96,165,250,0.25)" },
            free:     { label: "Grátis",  color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.15)" },
          };
          const ps = PLAN_STYLE[userPlan] ?? PLAN_STYLE.free;
          const firstName = session.user.name?.split(" ")[0];
          return (
            <div
              className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ background: ps.bg, border: `1px solid ${ps.border}` }}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: ps.color }}>
                <Crown size={12} /> {ps.label} · {firstName}
              </span>
              {userPlan === "free" ? (
                <button onClick={() => goToCheckout()} className="text-[11px] underline transition-colors" style={{ color: ps.color, opacity: 0.7 }}>
                  Upgrade
                </button>
              ) : (
                <a href="/credits" className="text-[11px] underline transition-colors" style={{ color: ps.color, opacity: 0.7 }}>
                  Gerenciar
                </a>
              )}
            </div>
          );
        })()}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
        {isLoading ? (
          /* Loading state */
          <div className="w-full flex flex-col items-center gap-5">
            <div className="relative">
              <div className="p-5 rounded-full bg-brand-500/10 border border-brand-500/20">
                <Loader2 size={28} className="animate-spin text-brand-400" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--text)]">
                {status === "searching" && "Pesquisando na web..."}
                {status === "generating" && "Gerando conteúdo com IA..."}
                {status === "images" && "Gerando imagens..."}
              </p>
              {status === "images" && totalImages > 0 && (
                <p className="text-xs text-[var(--text-3)] mt-1">{imageProgress}/{totalImages} slides</p>
              )}
            </div>
            {status === "images" && totalImages > 0 && (
              <div className="w-full bg-[var(--bg-4)] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-brand-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(imageProgress / totalImages) * 100}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          /* Idle / done / error */
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => session?.user ? setShowWizard(true) : setLoginOpen(true)}
              disabled={credits !== null && !credits.unlimited && credits.remaining <= 0}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30"
            >
              <Sparkles size={16} />
              {status === "done" ? "Gerar Novo Carrossel" : "Gerar Carrossel"}
            </button>

            {status === "done" && lastSettings && (
              <>
                <div className="flex items-start gap-2 bg-brand-500/8 border border-brand-500/20 rounded-xl p-3 text-xs text-brand-400">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Carrossel gerado!</p>
                    {lastSettings.topic && <p className="text-brand-400/60 mt-0.5 truncate">"{lastSettings.topic}"</p>}
                  </div>
                </div>

                {/* Layout switcher pós-geração */}
                {lastGenContent && (
                  <div className="flex flex-col gap-2 px-1">
                    <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider font-semibold">Trocar layout</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {([
                        { value: "mixed",  label: "Auto"    },
                        { value: "full",   label: "Fundo"   },
                        { value: "square", label: "Quad."   },
                        { value: "top",    label: "Topo"    },
                        { value: "base",   label: "Base"    },
                      ] as { value: ImageLayout; label: string }[]).map((lyt) => {
                        const active = (lastSettings.imageLayout ?? "mixed") === lyt.value;
                        return (
                          <button
                            key={lyt.value}
                            onClick={() => handleLayoutChange(lyt.value)}
                            className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${
                              active ? "border-brand-500 bg-brand-500/10" : "border-[var(--border-2)] bg-[var(--bg)] hover:border-brand-500/30"
                            }`}
                          >
                            <div className="w-6 h-8 rounded-sm overflow-hidden bg-[var(--bg-3)] border border-[var(--border-2)] relative">
                              {lyt.value === "full"   && <div className="absolute inset-0 bg-brand-500/25" />}
                              {lyt.value === "mixed"  && (<><div className="absolute inset-0 bg-brand-500/15" /><div className="absolute bottom-0 inset-x-0 h-1/3 bg-[var(--bg-3)]" /></>)}
                              {lyt.value === "square" && (<><div className="absolute inset-x-0.5 top-0.5 bottom-2 bg-brand-500/25 rounded-sm" /><div className="absolute bottom-0 inset-x-0 h-1.5 bg-[var(--bg-3)]" /></>)}
                              {lyt.value === "top"    && (<><div className="absolute top-0 inset-x-0 h-1/2 bg-brand-500/25" /><div className="absolute bottom-0 inset-x-0 h-1/2 bg-[var(--bg-3)]" /></>)}
                              {lyt.value === "base"   && (<><div className="absolute top-0 inset-x-0 h-2/5 bg-[var(--bg-3)]" /><div className="absolute bottom-0 inset-x-0 h-3/5 bg-brand-500/25" /></>)}
                            </div>
                            <span className={`text-[8px] font-medium ${active ? "text-[var(--text)]" : "text-[var(--text-3)]"}`}>{lyt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Banner de novidade */}
            {!bannerDismissed && status !== "done" && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs" style={{ background: "rgba(139,92,246,0.07)", borderColor: "rgba(139,92,246,0.22)" }}>
                <Sparkles size={12} className="mt-0.5 shrink-0" style={{ color: "#a78bfa" }} />
                <div className="flex-1">
                  <p className="font-medium" style={{ color: "#c4b5fd" }}>Novo: imagem de referência</p>
                  <p className="mt-0.5" style={{ color: "rgba(196,181,253,0.55)" }}>Use sua foto como base para as imagens geradas.</p>
                </div>
                <button
                  onClick={() => { setBannerDismissed(true); try { localStorage.setItem("xpz_banner_dismissed", "1"); } catch {} }}
                  className="shrink-0 transition-opacity opacity-40 hover:opacity-80"
                  style={{ color: "#a78bfa" }}
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Tópicos recentes */}
            {recentTopics.length > 0 && status !== "done" && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider font-semibold">Recentes</p>
                <div className="flex flex-col gap-1.5">
                  {recentTopics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => {
                        setLastSettings((prev) => ({ ...(prev ?? defaultSettings()), topic, inputMode: "topic" }));
                        setShowWizard(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] hover:border-brand-500/30 text-left text-xs text-[var(--text-2)] transition-colors"
                    >
                      <Clock size={11} className="shrink-0 text-[var(--text-3)]" />
                      <span className="truncate">{topic}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex items-start gap-2 bg-red-900/20 border border-red-800/40 rounded-xl p-3 text-xs text-red-300">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {credits && !credits.unlimited && (
              <div
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                style={{
                  background: credits.remaining > 5 ? "rgba(76,110,245,0.07)" : credits.remaining > 0 ? "rgba(251,191,36,0.07)" : "rgba(239,68,68,0.07)",
                  border: `1px solid ${credits.remaining > 5 ? "rgba(76,110,245,0.2)" : credits.remaining > 0 ? "rgba(251,191,36,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}
              >
                <span
                  style={{ color: credits.remaining > 5 ? "##818cf8" : credits.remaining > 0 ? "#fbbf24" : "#f87171" }}
                  className="flex items-center gap-1"
                >
                  <Zap size={11} />
                  {credits.remaining > 0 ? `${credits.remaining}/${credits.limit} créditos` : "Sem créditos"}
                </span>
                {credits.remaining <= 0 && (
                  <button onClick={() => goToCheckout()} className="text-[11px] text-brand-400 hover:text-brand-300 underline">Upgrade</button>
                )}
              </div>
            )}

            {creditToast && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-500/8 border border-green-500/20 text-xs">
                <span className="text-green-400 flex items-center gap-1">
                  <Zap size={11} /> {creditToast.spent} crédito{creditToast.spent > 1 ? "s" : ""} usado{creditToast.spent > 1 ? "s" : ""}
                </span>
                <span className="text-[var(--text-3)]">{creditToast.remaining} restantes</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sources */}
      {sources.length > 0 && (
        <div className="px-4 pb-4 shrink-0">
          <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
            <Search size={10} /> Fontes ({sources.length})
          </p>
          <div className="flex flex-col gap-1">
            {sources.map((s, i) => (
              <a
                key={i}
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                title={s.title}
                className="text-xs text-[var(--text-3)] hover:text-brand-400 bg-[var(--bg)] rounded-lg p-2 block truncate border border-[var(--border)] hover:border-brand-500/30 transition-colors"
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      <GeneratorWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onConfirm={handleWizardConfirm}
        isPro={isPro}
        initial={lastSettings ?? undefined}
        isTwitterMode={wizardTwitterMode}
      />
    </div>
  );
}

function defaultSettings(): WizardSettings {
  const safe = (key: string) => { try { return localStorage.getItem(key) ?? ""; } catch { return ""; } };
  return {
    topic: "", inputMode: "topic", customPrompt: "",
    slideCount: 7, writingStyle: "viral", imageStyle: "gemini", imageLayout: "mixed",
    refImageBase64: null, refImageMime: "image/jpeg", refImagePreview: null,
    handle: safe("xpz_handle"), brandName: safe("xpz_brand"), carouselTitle: safe("xpz_carousel_title"),
  };
}
