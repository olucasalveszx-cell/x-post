"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Search, Terminal, Crown, ChevronRight, ChevronLeft, Sparkles, Clipboard, Upload, LayoutTemplate } from "lucide-react";
import { WritingStyle } from "@/types";

type ImageStyle = "gemini" | "foto_real";

export type ImageLayout = "mixed" | "full" | "square" | "top" | "base";

export interface WizardSettings {
  topic: string;
  inputMode: "topic" | "prompt";
  customPrompt: string;
  slideCount: number;
  writingStyle: WritingStyle;
  imageStyle: ImageStyle;
  imageLayout: ImageLayout;
  refImageBase64: string | null;
  refImageMime: string;
  refImagePreview: string | null;
  // Branding
  handle: string;
  brandName: string;
  carouselTitle: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (settings: WizardSettings) => void;
  isPro: boolean;
  initial?: Partial<WizardSettings>;
  isTwitterMode?: boolean;
}

const WRITING_STYLES: { value: WritingStyle; emoji: string; label: string; desc: string }[] = [
  { value: "viral",        emoji: "⚡", label: "Viral",        desc: "Para o scroll, chocante" },
  { value: "noticias",     emoji: "📰", label: "Notícia",      desc: "Breaking news, urgente" },
  { value: "informativo",  emoji: "📊", label: "Informativo",  desc: "Dados e fatos objetivos" },
  { value: "educativo",    emoji: "🎓", label: "Educativo",    desc: "Didático, passo a passo" },
  { value: "motivacional", emoji: "🔥", label: "Motivacional", desc: "Emocional, inspirador" },
];

const SLIDE_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function GeneratorWizard({ open, onClose, onConfirm, isPro, initial, isTwitterMode }: Props) {
  const [step, setStep] = useState(0);
  const [inputMode, setInputMode] = useState<"topic" | "prompt">(initial?.inputMode ?? "topic");
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [customPrompt, setCustomPrompt] = useState(initial?.customPrompt ?? "");
  const [slideCount, setSlideCount] = useState(initial?.slideCount ?? 7);
  const [writingStyle, setWritingStyle] = useState<WritingStyle>(initial?.writingStyle ?? "viral");
  const [imageStyle, setImageStyle]   = useState<ImageStyle>(initial?.imageStyle ?? "gemini");
  const [imageLayout, setImageLayout] = useState<ImageLayout>(initial?.imageLayout ?? "mixed");
  const [refImageBase64, setRefImageBase64] = useState<string | null>(initial?.refImageBase64 ?? null);
  const [refImageMime, setRefImageMime] = useState(initial?.refImageMime ?? "image/jpeg");
  const [refImagePreview, setRefImagePreview] = useState<string | null>(initial?.refImagePreview ?? null);
  const [handle, setHandle] = useState(() => initial?.handle ?? (typeof localStorage !== "undefined" ? localStorage.getItem("xpz_handle") ?? "" : ""));
  const [brandName, setBrandName] = useState(() => initial?.brandName ?? (typeof localStorage !== "undefined" ? localStorage.getItem("xpz_brand") ?? "" : ""));
  const [carouselTitle, setCarouselTitle] = useState(() => initial?.carouselTitle ?? (typeof localStorage !== "undefined" ? localStorage.getItem("xpz_carousel_title") ?? "" : ""));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!initial) return;
    if (initial.topic !== undefined) setTopic(initial.topic);
    if (initial.customPrompt !== undefined) setCustomPrompt(initial.customPrompt);
    if (initial.inputMode !== undefined) setInputMode(initial.inputMode);
  }, [initial]);

  if (!open) return null;

  const canContinue = step === 0
    ? (inputMode === "topic" ? topic.trim().length > 0 : customPrompt.trim().length > 0)
    : true;

  const handlePasteImage = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = () => {
            const full = reader.result as string;
            setRefImageBase64(full.split(",")[1]);
            setRefImageMime(imageType);
            setRefImagePreview(full);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      alert("Nenhuma imagem na área de transferência.");
    } catch {
      alert("Não foi possível acessar a área de transferência.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const full = reader.result as string;
      setRefImageBase64(full.split(",")[1]);
      setRefImageMime(file.type);
      setRefImagePreview(full);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    try {
      localStorage.setItem("xpz_handle", handle);
      localStorage.setItem("xpz_brand", brandName);
      localStorage.setItem("xpz_carousel_title", carouselTitle);
    } catch {}
    onConfirm({
      topic, inputMode, customPrompt, slideCount, writingStyle,
      imageStyle: isTwitterMode ? "foto_real" : imageStyle,
      imageLayout: isTwitterMode ? "top" : imageLayout,
      refImageBase64, refImageMime, refImagePreview, handle, brandName, carouselTitle,
    });
    onClose();
  };

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full sm:max-w-md bg-[#111] sm:border border-t border-[#222] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: "95vh" }}>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X size={16} />
        </button>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-1 shrink-0">
          {(isTwitterMode ? [0] : [0, 1]).map((i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 28 : 10,
                background: i <= step ? "#a855f7" : "rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ── Step 0: Conteúdo ── */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h2 className="text-xl font-bold">{isTwitterMode ? "Post X / Twitter" : "Configurar IA"}</h2>
                <p className="text-sm text-gray-500 mt-1">{isTwitterMode ? "Sobre o que será o post? A IA cria o conteúdo no estilo X." : "Diga sobre o que é o conteúdo e como quer o carrossel"}</p>
              </div>

              {/* Input mode toggle */}
              <div className="flex rounded-xl border border-[#222] overflow-hidden">
                <button
                  onClick={() => setInputMode("topic")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${inputMode === "topic" ? "bg-brand-600 text-white" : "bg-[#0a0a0a] text-gray-500 hover:text-gray-300"}`}
                >
                  <Search size={12} /> Por Tópico
                </button>
                <button
                  onClick={() => setInputMode("prompt")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${inputMode === "prompt" ? "bg-brand-600 text-white" : "bg-[#0a0a0a] text-gray-500 hover:text-gray-300"}`}
                >
                  <Terminal size={12} /> Prompt Livre
                </button>
              </div>

              {/* Content input */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">
                  Sobre o que é o conteúdo?
                </p>
                {inputMode === "topic" ? (
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ex: 5 prompts ultra realistas para foto de perfil com IA..."
                    rows={4}
                    autoFocus
                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600 resize-none"
                  />
                ) : (
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={`Descreva cada slide:\n\nSlide 1: Título impactante\nSlide 2: Problema principal\nSlide 3: Solução...`}
                    rows={5}
                    autoFocus
                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600 resize-none font-mono text-xs leading-relaxed"
                  />
                )}
              </div>

              {/* Reference images — Pro only */}
              {isPro && inputMode === "topic" && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
                    Imagens de Referência
                    <span className="text-[9px] text-gray-600">(opcional)</span>
                    <span className="text-[9px] text-yellow-400 flex items-center gap-0.5 ml-auto"><Crown size={9} /> Pro</span>
                  </p>
                  <p className="text-[11px] text-gray-600 mb-2">Anexe capturas de carrosséis — a IA analisa e cria conteúdo inspirado.</p>

                  {refImagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-[#222]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={refImagePreview} alt="Referência" className="w-full h-28 object-cover" />
                      <button
                        onClick={() => { setRefImageBase64(null); setRefImagePreview(null); }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handlePasteImage}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[#222] bg-[#0a0a0a] hover:border-brand-500/40 hover:bg-brand-500/5 text-sm text-gray-400 hover:text-gray-200 transition-all"
                      >
                        <Clipboard size={13} /> Colar Imagem
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[#222] bg-[#0a0a0a] hover:border-brand-500/40 hover:bg-brand-500/5 text-sm text-gray-400 hover:text-gray-200 transition-all"
                      >
                        <Upload size={13} /> Upload
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </div>
                  )}
                </div>
              )}

              {/* Branding */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Sua Marca <span className="normal-case text-gray-600">(opcional)</span></p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-gray-600">@handle</label>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.replace(/^@+/, ""))}
                      placeholder="seuperfil"
                      className="bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-700 text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-gray-600">Nome da marca</label>
                    <input
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="MyBrand"
                      className="bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-700 text-white"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-gray-600">Título do carrossel (aparece no topo direito)</label>
                  <input
                    value={carouselTitle}
                    onChange={(e) => setCarouselTitle(e.target.value)}
                    placeholder="Ex: Carrosséis com IA"
                    className="bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-700 text-white"
                  />
                </div>
              </div>

              {/* Slide count */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Número de Slides</p>
                <div className="grid grid-cols-5 gap-2">
                  {SLIDE_COUNTS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setSlideCount(n)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                        slideCount === n
                          ? "bg-white text-black font-bold"
                          : "bg-[#0a0a0a] border border-[#222] text-gray-400 hover:border-brand-500/40 hover:text-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tom de escrita — exibido no step 0 apenas em modo Twitter */}
              {isTwitterMode && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Tom da escrita</p>
                  <div className="flex flex-wrap gap-2">
                    {WRITING_STYLES.map((ws) => (
                      <button
                        key={ws.value}
                        onClick={() => setWritingStyle(ws.value)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                          writingStyle === ws.value
                            ? "border-sky-500 bg-sky-500/10 text-white"
                            : "border-[#222] bg-[#0a0a0a] text-gray-400 hover:border-sky-500/30 hover:text-white"
                        }`}
                      >
                        <span>{ws.emoji}</span> {ws.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 1: Estilo ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h2 className="text-xl font-bold">Estilo do Post</h2>
                <p className="text-sm text-gray-500 mt-1">Como quer que a IA escreva e ilustre o carrossel?</p>
              </div>

              {/* Writing style */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Tom da escrita</p>
                <div className="flex flex-col gap-2">
                  {WRITING_STYLES.map((ws) => (
                    <button
                      key={ws.value}
                      onClick={() => setWritingStyle(ws.value)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                        writingStyle === ws.value
                          ? "border-brand-500 bg-brand-500/10"
                          : "border-[#222] bg-[#0a0a0a] hover:border-brand-500/30 hover:bg-white/[0.02]"
                      }`}
                    >
                      <span className="text-lg">{ws.emoji}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${writingStyle === ws.value ? "text-white" : "text-gray-300"}`}>{ws.label}</p>
                        <p className="text-[11px] text-gray-500">{ws.desc}</p>
                      </div>
                      {writingStyle === ws.value && (
                        <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image style */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Estilo visual das imagens</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "foto_real" as ImageStyle, label: "Foto Real",  desc: "Ultra-realista · Gemini",  badge: "FREE", badgeColor: "text-green-400 bg-green-500/10" },
                    { value: "gemini"    as ImageStyle, label: "Gemini IA",  desc: "Cinemático · Imagen Pro",  badge: "PRO",  badgeColor: "text-yellow-400 bg-yellow-500/10" },
                  ].map((is) => (
                    <button
                      key={is.value}
                      onClick={() => setImageStyle(is.value)}
                      className={`relative flex flex-col items-start gap-1.5 px-4 py-4 rounded-xl border transition-all ${
                        imageStyle === is.value
                          ? "border-brand-500 bg-brand-500/10"
                          : "border-[#222] bg-[#0a0a0a] hover:border-brand-500/30"
                      }`}
                    >
                      <span className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${is.badgeColor}`}>
                        {is.badge}
                      </span>
                      <p className={`text-sm font-semibold ${imageStyle === is.value ? "text-white" : "text-gray-300"}`}>{is.label}</p>
                      <p className="text-[11px] text-gray-500 leading-snug">{is.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image layout */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
                  <LayoutTemplate size={11} /> Layout da imagem
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    { value: "mixed",  label: "Auto",         preview: "mixed"  },
                    { value: "full",   label: "Fundo total",  preview: "full"   },
                    { value: "square", label: "Quadrado",     preview: "square" },
                    { value: "top",    label: "Img. topo",    preview: "top"    },
                    { value: "base",   label: "Img. base",    preview: "base"   },
                  ] as { value: ImageLayout; label: string; preview: string }[]).map((lyt) => (
                    <button
                      key={lyt.value}
                      onClick={() => setImageLayout(lyt.value)}
                      className={`flex flex-col items-center gap-1.5 px-1 py-2 rounded-xl border transition-all ${
                        imageLayout === lyt.value
                          ? "border-brand-500 bg-brand-500/10"
                          : "border-[#222] bg-[#0a0a0a] hover:border-brand-500/30"
                      }`}
                    >
                      {/* Mini preview */}
                      <div className="w-8 h-10 rounded-md overflow-hidden bg-[#111] border border-[#2a2a2a] relative flex flex-col">
                        {lyt.preview === "full"   && <div className="absolute inset-0 bg-purple-500/30 rounded-md" />}
                        {lyt.preview === "mixed"  && (<><div className="absolute inset-0 bg-purple-500/20 rounded-md" /><div className="absolute bottom-0 inset-x-0 h-1/3 bg-[#111]" /></>)}
                        {lyt.preview === "square" && (<><div className="absolute inset-x-1 top-1 bottom-3 bg-purple-500/30 rounded-sm" /><div className="absolute bottom-0 inset-x-0 h-2 bg-[#111]" /></>)}
                        {lyt.preview === "top"    && (<><div className="absolute top-0 inset-x-0 h-1/2 bg-purple-500/30" /><div className="absolute bottom-0 inset-x-0 h-1/2 bg-[#111]" /></>)}
                        {lyt.preview === "base"   && (<><div className="absolute top-0 inset-x-0 h-2/5 bg-[#111]" /><div className="absolute bottom-0 inset-x-0 h-3/5 bg-purple-500/30" /></>)}
                      </div>
                      <span className={`text-[9px] font-medium leading-tight text-center ${imageLayout === lyt.value ? "text-white" : "text-gray-500"}`}>
                        {lyt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4 border-t border-[#1a1a1a] flex items-center gap-3 shrink-0">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#222] text-gray-400 hover:text-white hover:border-[#333] text-sm transition-colors"
            >
              <ChevronLeft size={14} /> Voltar
            </button>
          ) : (
            <div />
          )}

          {step === 0 && !isTwitterMode ? (
            <button
              onClick={() => setStep(1)}
              disabled={!canContinue}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] hover:border-brand-500/40 text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Continuar <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={!canContinue}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors shadow-lg disabled:opacity-30 disabled:cursor-not-allowed ${
                isTwitterMode
                  ? "bg-sky-600 hover:bg-sky-700 shadow-sky-500/20"
                  : "bg-brand-600 hover:bg-brand-700 shadow-brand-500/20"
              }`}
            >
              <Sparkles size={14} /> {isTwitterMode ? "Gerar Post X / Twitter" : "Gerar Carrossel"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
}
