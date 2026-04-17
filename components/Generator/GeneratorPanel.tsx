"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { Sparkles, Search, Loader2, AlertCircle, Crown, Zap, LogIn, CheckCircle2 } from "lucide-react";
import LoginModal from "@/components/LoginModal";
import { GeneratedContent, SearchResult, Slide, WritingStyle } from "@/types";
import { v4 as uuid } from "uuid";
import GeneratorWizard, { WizardSettings } from "./GeneratorWizard";

interface Props {
  onGenerate: (slides: Slide[]) => void;
}

const SLIDE_W = 1080;
const SLIDE_H = 1350;

type ImageStyle = "gemini" | "foto_real";

function applyAccent(text: string, accentColor: string): string {
  return text.replace(/\[([^\]]+)\]/g, `<span style="color:${accentColor};font-style:normal">$1</span>`);
}

function buildSlides(generated: GeneratedContent, ws: WizardSettings): (Slide & { _imagePrompt: string; _searchQuery: string })[] {
  return generated.slides.map((gs, i) => {
    const bg = gs.colorScheme.background;
    const accent = gs.colorScheme.accent;
    const isLast = i === generated.slides.length - 1;
    const elements = [];

    elements.push({
      id: uuid(), type: "text" as const,
      x: 64, y: SLIDE_H - 520, width: SLIDE_W - 128, height: 340,
      content: applyAccent(gs.title, accent),
      style: { fontSize: 92, fontWeight: "bold" as const, fontFamily: "sans-serif", color: "#ffffff", textAlign: "left" as const, lineHeight: 1.0 },
    });

    elements.push({
      id: uuid(), type: "text" as const,
      x: 64, y: SLIDE_H - 172, width: SLIDE_W - 128, height: 108,
      content: gs.body,
      style: { fontSize: 26, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.65)", textAlign: "left" as const, lineHeight: 1.45 },
    });

    if (isLast && gs.callToAction) {
      elements.push({
        id: uuid(), type: "text" as const,
        x: 64, y: SLIDE_H - 64, width: SLIDE_W - 128, height: 48,
        content: `<span style="color:${accent}">${gs.callToAction}</span>`,
        style: { fontSize: 24, fontWeight: "bold" as const, fontFamily: "sans-serif", color: accent, textAlign: "left" as const, lineHeight: 1 },
      });
    }

    return {
      id: uuid(),
      backgroundColor: bg,
      backgroundImageUrl: undefined,
      backgroundImageLoading: true,
      backgroundGradient: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.80) 40%, rgba(0,0,0,0.30) 70%, rgba(0,0,0,0.10) 100%)",
      elements,
      width: SLIDE_W,
      height: SLIDE_H,
      _imagePrompt: gs.imagePrompt || ws.topic,
      _searchQuery: gs.searchQuery || ws.topic,
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
        const { _imagePrompt, _searchQuery, ...clean } = slide as any;
        return data.imageUrl
          ? { ...clean, backgroundImageUrl: data.imageUrl, backgroundImageLoading: false }
          : { ...clean, backgroundImageLoading: false };
      } catch {
        done++; onProgress(done);
        const { _imagePrompt, _searchQuery, ...clean } = slide as any;
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

  const { data: session } = useSession();
  const [isPro, setIsPro] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [activationToken, setActivationToken] = useState<string | null>(null);
  const [credits, setCredits] = useState<{ remaining: number; limit: number; unlimited: boolean } | null>(null);
  const [creditToast, setCreditToast] = useState<{ spent: number; remaining: number } | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Listen for external trigger (canvas overlay button)
  useEffect(() => {
    const handler = () => setShowWizard(true);
    window.addEventListener("open-generator-wizard", handler);
    return () => window.removeEventListener("open-generator-wizard", handler);
  }, []);

  // Zora IA prompt injection
  useEffect(() => {
    const handler = (e: Event) => {
      const prompt = (e as CustomEvent).detail?.prompt;
      if (!prompt) return;
      setLastSettings((prev) => ({ ...(prev ?? defaultSettings()), customPrompt: prompt, inputMode: "prompt" }));
      setShowWizard(true);
    };
    window.addEventListener("zora-prompt", handler);
    return () => window.removeEventListener("zora-prompt", handler);
  }, []);

  // Pro check
  useEffect(() => {
    if ((session?.user as any)?.role === "admin") { setIsPro(true); return; }
    if (session?.user?.email) {
      fetch(`/api/stripe/verify?email=${encodeURIComponent(session.user.email)}`)
        .then((r) => r.json()).then((d) => setIsPro(d.active ?? false)).catch(() => {});
      return;
    }
    const token = localStorage.getItem("xpz_activation_token");
    if (token) { setActivationToken(token); setIsPro(true); return; }
    const cid = localStorage.getItem("xpz_customer_id");
    if (!cid) return;
    setCustomerId(cid);
    fetch(`/api/stripe/verify?customer_id=${cid}`)
      .then((r) => r.json()).then((d) => setIsPro(d.active ?? false)).catch(() => {});
  }, [session]);

  const fetchCredits = () => {
    fetch("/api/credits").then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setCredits(d); window.dispatchEvent(new CustomEvent("credits-updated", { detail: d })); } })
      .catch(() => {});
  };
  useEffect(() => { fetchCredits(); }, [session]);

  const isLoading = ["searching", "generating", "images"].includes(status);

  const goToCheckout = async (plan = "pro") => {
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      const data = await res.json();
      if (!res.ok || !data.url) { alert("Erro: " + (data.error ?? res.status)); return; }
      window.location.href = data.url;
    } catch (e: any) { alert("Erro: " + e.message); }
  };

  const handleWizardConfirm = async (ws: WizardSettings) => {
    setLastSettings(ws);
    setError(""); setSources([]); setImageProgress(0); setTotalImages(ws.slideCount);

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
      setStatus("done");

      const prev = credits;
      fetchCredits();
      const cost = ws.imageStyle === "foto_real" ? 1 : 2;
      if (prev && !prev.unlimited) setCreditToast({ spent: cost, remaining: Math.max(0, prev.remaining - cost) });
    } catch (err: any) { setError(err.message ?? "Erro desconhecido"); setStatus("error"); }
  };

  const loadingPopup = isLoading && typeof window !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center md:hidden" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}>
          <div className="flex flex-col items-center gap-5 px-8 py-10 rounded-3xl bg-[#0f0f0f] border border-[#1e1e1e] shadow-2xl mx-4 w-full max-w-xs">
            {/* Animated icon */}
            <div className="relative">
              <div className="p-5 rounded-full bg-brand-500/10 border border-brand-500/20">
                <Loader2 size={36} className="animate-spin text-brand-400" />
              </div>
              <div className="absolute inset-0 rounded-full bg-brand-500/5 animate-ping" />
            </div>

            {/* Status text */}
            <div className="text-center">
              <p className="text-base font-semibold text-white">
                {status === "searching" && "Pesquisando na web..."}
                {status === "generating" && "Gerando com I.A..."}
                {status === "images" && "Gerando imagens com I.A"}
              </p>
              <p className="text-xs text-gray-500 mt-1.5">
                {status === "searching" && "Buscando informações atualizadas"}
                {status === "generating" && "Criando o conteúdo dos slides"}
                {status === "images" && totalImages > 0 ? `${imageProgress} de ${totalImages} slides` : "Aguarde um momento..."}
              </p>
            </div>

            {/* Progress bar */}
            {status === "images" && totalImages > 0 && (
              <div className="w-full flex flex-col gap-1.5">
                <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-500 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${(imageProgress / totalImages) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-600 text-right">{Math.round((imageProgress / totalImages) * 100)}%</p>
              </div>
            )}

            {/* Steps indicator */}
            <div className="flex items-center gap-2 mt-1">
              {["searching", "generating", "images"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full transition-all duration-300"
                    style={{
                      background: status === s ? "#a855f7" : ["searching", "generating", "images"].indexOf(status) > i ? "#6b21a8" : "#1f1f1f",
                      boxShadow: status === s ? "0 0 8px #a855f7" : "none",
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
      <div className="p-4 shrink-0 border-b border-[#161616]">
        {!session?.user ? (
          <button
            onClick={() => setLoginOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors"
          >
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
                const res = await fetch("/api/stripe/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId }) });
                const { url } = await res.json();
                window.location.href = url;
              }}
              className="text-[11px] text-yellow-500/60 hover:text-yellow-400 underline transition-colors"
            >
              Gerenciar
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2">
            <span className="text-xs text-gray-500">Grátis · {session.user.name?.split(" ")[0]}</span>
            <button onClick={() => goToCheckout()} className="text-[11px] text-brand-400 hover:text-brand-300 underline transition-colors">
              Upgrade Pro
            </button>
          </div>
        )}
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
              <p className="text-sm font-medium text-white">
                {status === "searching" && "Pesquisando na web..."}
                {status === "generating" && "Gerando conteúdo com IA..."}
                {status === "images" && "Gerando imagens..."}
              </p>
              {status === "images" && totalImages > 0 && (
                <p className="text-xs text-gray-500 mt-1">{imageProgress}/{totalImages} slides</p>
              )}
            </div>
            {status === "images" && totalImages > 0 && (
              <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden">
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
              <div className="flex items-start gap-2 bg-brand-500/8 border border-brand-500/20 rounded-xl p-3 text-xs text-brand-400">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Carrossel gerado!</p>
                  {lastSettings.topic && <p className="text-brand-400/60 mt-0.5 truncate">"{lastSettings.topic}"</p>}
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
                  background: credits.remaining > 5 ? "rgba(168,85,247,0.07)" : credits.remaining > 0 ? "rgba(251,191,36,0.07)" : "rgba(239,68,68,0.07)",
                  border: `1px solid ${credits.remaining > 5 ? "rgba(168,85,247,0.2)" : credits.remaining > 0 ? "rgba(251,191,36,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}
              >
                <span
                  style={{ color: credits.remaining > 5 ? "#c084fc" : credits.remaining > 0 ? "#fbbf24" : "#f87171" }}
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
                <span className="text-gray-500">{creditToast.remaining} restantes</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sources */}
      {sources.length > 0 && (
        <div className="px-4 pb-4 shrink-0">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
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
                className="text-xs text-gray-500 hover:text-brand-400 bg-[#0f0f0f] rounded-lg p-2 block truncate border border-[#1a1a1a] hover:border-brand-500/30 transition-colors"
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
      />
    </div>
  );
}

function defaultSettings(): WizardSettings {
  return {
    topic: "", inputMode: "topic", customPrompt: "",
    slideCount: 7, writingStyle: "viral", imageStyle: "gemini",
    refImageBase64: null, refImageMime: "image/jpeg", refImagePreview: null,
  };
}
