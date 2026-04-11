"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { Download, ArrowLeft, User, LogIn, Sparkles, Layers, X } from "lucide-react";
import Link from "next/link";
import { Slide } from "@/types";
import { renderSlide } from "@/lib/render-slide";
import SidePanel from "@/components/Generator/SidePanel";
import SlideCanvas from "@/components/Editor/SlideCanvas";
import Toolbar from "@/components/Editor/Toolbar";
import SlidePanel from "@/components/Editor/SlidePanel";
import PublishModal from "@/components/Actions/PublishModal";

interface IGAccount {
  token: string;
  accountId: string;
  username: string;
}

// ── Formatos disponíveis ──────────────────────────────────────
const FORMATS = [
  { label: "1:1",  width: 1080, height: 1080 },
  { label: "4:5",  width: 1080, height: 1350 },
  { label: "9:16", width: 1080, height: 1920 },
  { label: "16:9", width: 1920, height: 1080 },
] as const;
type Format = typeof FORMATS[number];

// ── Componente principal ──────────────────────────────────────
export default function EditorPage() {
  const [format, setFormat] = useState<Format>(FORMATS[1]); // 4:5 padrão
  const SLIDE_W = format.width;
  const SLIDE_H = format.height;

  const newBlankSlide = useCallback((): Slide => ({
    id: uuid(),
    backgroundColor: "#1a0533",
    elements: [],
    width: SLIDE_W,
    height: SLIDE_H,
  }), [SLIDE_W, SLIDE_H]);

  const [slides, setSlides] = useState<Slide[]>(() => [{
    id: uuid(), backgroundColor: "#1a0533", elements: [], width: 1080, height: 1350,
  }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPublish, setShowPublish] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [igAccount, setIgAccount] = useState<IGAccount | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const historyRef = useRef<Slide[][]>([[{ id: uuid(), backgroundColor: "#1a0533", elements: [], width: 1080, height: 1350 }]]);
  const historyIndexRef = useRef(0);
  const slidesRef = useRef<Slide[]>(slides);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSlide = slides[currentIndex];
  const selectedElement = selectedElementId
    ? currentSlide?.elements.find((el) => el.id === selectedElementId) ?? null
    : null;

  const pushHistory = useCallback((newSlides: Slide[]) => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(newSlides);
    if (historyRef.current.length > 50) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    setSlides(historyRef.current[historyIndexRef.current]);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    setSlides(historyRef.current[historyIndexRef.current]);
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("ig_success");
    const error = params.get("ig_error");

    if (success === "1") {
      const account: IGAccount = {
        token: params.get("ig_token") ?? "",
        accountId: params.get("ig_account") ?? "",
        username: params.get("ig_username") ?? "",
      };
      setIgAccount(account);
      localStorage.setItem("ig_account", JSON.stringify(account));
      window.history.replaceState({}, "", "/editor");
    } else if (error) {
      if (error === "no_business_account") {
        const pages = params.get("pages") ?? "nenhuma";
        alert(`Conta Instagram Business não encontrada.\n\nPáginas do Facebook encontradas: ${pages}\n\nVerifique se você é ADMIN da página e se o Instagram Business está conectado a ela.`);
      } else {
        const msgs: Record<string, string> = { cancelled: "Login cancelado", token: "Erro ao obter token de acesso" };
        alert(msgs[error] ?? `Erro: ${error}`);
      }
      window.history.replaceState({}, "", "/editor");
    }

    const saved = localStorage.getItem("ig_account");
    if (saved && !success) {
      try { setIgAccount(JSON.parse(saved)); } catch {}
    }
  }, []);

  const handleIGLogin = () => { window.location.href = "/api/instagram/auth"; };

  const updateSlide = useCallback((updated: Slide) => {
    setSlides((prev) => {
      const next = prev.map((s) => (s.id === updated.id ? updated : s));
      slidesRef.current = next;
      return next;
    });
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => { pushHistory(slidesRef.current); }, 500);
  }, [pushHistory]);

  const addSlide = useCallback(() => {
    const slide = newBlankSlide();
    setSlides((prev) => { setCurrentIndex(prev.length); return [...prev, slide]; });
  }, [newBlankSlide]);

  const deleteSlide = () => {
    if (slides.length <= 1) return;
    const next = slides.filter((_, i) => i !== currentIndex);
    setSlides(next);
    setCurrentIndex(Math.min(currentIndex, next.length - 1));
  };

  const handleGenerate = (generated: Slide[]) => {
    setSlides(generated);
    slidesRef.current = generated;
    setCurrentIndex(0);
    pushHistory(generated);
  };

  const handleFormatChange = (f: Format) => {
    setFormat(f);
    setSlides((prev) => prev.map((s) => ({ ...s, width: f.width, height: f.height })));
  };

  // ── Export via Canvas 2D — sem html2canvas ────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      for (let i = 0; i < slides.length; i++) {
        const canvas = await renderSlide(slides[i]);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `slide-${String(i + 1).padStart(2, "0")}.jpg`;
        a.click();
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch (err) {
      console.error("Erro ao exportar:", err);
      alert("Erro ao exportar. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  const [mobilePanel, setMobilePanel] = useState<"side" | "slides" | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [displayScale, setDisplayScale] = useState(560 / 1350);

  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!canvasContainerRef.current) return;
      const { width, height } = canvasContainerRef.current.getBoundingClientRect();
      const pad = 32;
      const s = Math.min((width - pad) / SLIDE_W, (height - pad) / SLIDE_H, 560 / SLIDE_H);
      setDisplayScale(s);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [SLIDE_W, SLIDE_H]);

  const DISPLAY_W = SLIDE_W * displayScale;
  const DISPLAY_H = SLIDE_H * displayScale;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 md:px-5 py-2 md:py-3 bg-[#070707] border-b border-[#161616] z-10">
        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/" className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png.png" alt="XPost Zone" className="h-7 w-7 md:h-8 md:w-8 object-contain" />
            <span className="font-black text-lg md:text-xl tracking-widest uppercase" style={{ fontFamily: "'Bebas Neue', 'Impact', sans-serif", letterSpacing: "0.15em" }}>XPOST ZONE</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-2 md:px-4 py-2 rounded-lg bg-[#111] hover:bg-[#1a1a1a] text-sm border border-[#222] disabled:opacity-40"
          >
            <Download size={14} />
            <span className="hidden md:inline">{exporting ? "Exportando..." : "Exportar JPG"}</span>
          </button>

          {igAccount ? (
            <button onClick={() => setShowPublish(true)}
              className="flex items-center gap-1.5 px-2 md:px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm font-medium">
              <User size={14} />
              <span className="hidden md:inline">@{igAccount.username}</span>
            </button>
          ) : (
            <button onClick={handleIGLogin}
              className="flex items-center gap-1.5 px-2 md:px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm font-medium">
              <LogIn size={14} />
              <span className="hidden md:inline">Login Instagram</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {isMobile && mobilePanel && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 30 }} onClick={() => setMobilePanel(null)} />
        )}

        {/* Painel esquerdo */}
        {isMobile ? (
          <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 320, zIndex: 40, background: "#080808", borderRight: "1px solid #161616", display: "flex", flexDirection: "column", transform: mobilePanel === "side" ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.3s" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #161616" }}>
              <span style={{ fontSize: 14, color: "#d1d5db" }}>Gerar / Traduzir</span>
              <button onClick={() => setMobilePanel(null)}><X size={18} color="#9ca3af" /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
              <SidePanel onGenerate={(s) => { handleGenerate(s); setMobilePanel(null); }} />
            </div>
          </div>
        ) : (
          <div style={{ width: 320, background: "#080808", borderRight: "1px solid #161616", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <SidePanel onGenerate={handleGenerate} />
          </div>
        )}

        {/* Área principal */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Toolbar
            slide={currentSlide}
            onUpdate={updateSlide}
            onAddSlide={addSlide}
            onDeleteSlide={deleteSlide}
            slideIndex={currentIndex}
            totalSlides={slides.length}
            onPrev={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            onNext={() => setCurrentIndex((i) => Math.min(slides.length - 1, i + 1))}
            selectedElement={selectedElement}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            format={format.label}
            onFormatChange={(label) => {
              const f = FORMATS.find((f) => f.label === label);
              if (f) handleFormatChange(f);
            }}
          />

          <div ref={canvasContainerRef} className="flex-1 overflow-auto flex items-center justify-center bg-[#0a0a0a] p-4">
            <div ref={canvasRef} style={{ width: DISPLAY_W, height: DISPLAY_H, position: "relative" }} className="shadow-2xl rounded overflow-hidden">
              {slides.map((slide, i) => (
                <div key={slide.id} id={`slide-render-${slide.id}`} style={{ display: i === currentIndex ? "block" : "none", width: SLIDE_W, height: SLIDE_H }}>
                  <SlideCanvas slide={slide} onUpdate={updateSlide} scale={displayScale} onSelectElement={(el) => setSelectedElementId(el?.id ?? null)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Painel direito */}
        {isMobile ? (
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 128, zIndex: 40, background: "#080808", borderLeft: "1px solid #161616", display: "flex", flexDirection: "column", transform: mobilePanel === "slides" ? "translateX(0)" : "translateX(100%)", transition: "transform 0.3s" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", borderBottom: "1px solid #161616" }}>
              <span style={{ fontSize: 12, color: "#d1d5db" }}>Slides</span>
              <button onClick={() => setMobilePanel(null)}><X size={16} color="#9ca3af" /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              <SlidePanel slides={slides} currentIndex={currentIndex} onSelect={(i) => { setCurrentIndex(i); setMobilePanel(null); }} />
            </div>
          </div>
        ) : (
          <div style={{ width: 128, background: "#080808", borderLeft: "1px solid #161616", display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <SlidePanel slides={slides} currentIndex={currentIndex} onSelect={setCurrentIndex} />
          </div>
        )}
      </div>

      {/* Barra inferior mobile */}
      {isMobile && (
        <div style={{ display: "flex", borderTop: "1px solid #161616", background: "#080808", zIndex: 20 }}>
          <button onClick={() => setMobilePanel(mobilePanel === "side" ? null : "side")}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 0", fontSize: 12, color: mobilePanel === "side" ? "#a855f7" : "#6b7280" }}>
            <Sparkles size={18} />IA
          </button>
          <button onClick={() => setMobilePanel(mobilePanel === "slides" ? null : "slides")}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 0", fontSize: 12, color: mobilePanel === "slides" ? "#a855f7" : "#6b7280" }}>
            <Layers size={18} />Slides
          </button>
          <button onClick={() => setShowPublish(true)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 0", fontSize: 12, color: "#6b7280" }}>
            <User size={18} />Publicar
          </button>
        </div>
      )}

      {showPublish && (
        <PublishModal
          slides={slides}
          account={igAccount}
          onClose={() => setShowPublish(false)}
          onLoginClick={handleIGLogin}
        />
      )}
    </div>
  );
}
