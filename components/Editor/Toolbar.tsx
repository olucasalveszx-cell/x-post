"use client";

import { Type, Image as ImageIcon, Plus, Trash2, ChevronLeft, ChevronRight, Bold, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Wand2, UserCircle, X, BadgeCheck, Sparkles, Loader2, LayoutTemplate, FrameIcon } from "lucide-react";
import { Slide, SlideElement } from "@/types";
import { v4 as uuid } from "uuid";
import { useRef, useState, useEffect } from "react";

const FONTS = [
  { label: "Sans-serif", value: "sans-serif" },
  { label: "Inter",       value: "'Inter', sans-serif" },
  { label: "Montserrat",  value: "'Montserrat', sans-serif" },
  { label: "Oswald",      value: "'Oswald', sans-serif" },
  { label: "Poppins",     value: "'Poppins', sans-serif" },
  { label: "Playfair",    value: "'Playfair Display', serif" },
  { label: "Bebas Neue",  value: "'Bebas Neue', sans-serif" },
  { label: "Roboto",      value: "'Roboto', sans-serif" },
  { label: "Lato",        value: "'Lato', sans-serif" },
  { label: "Serif",       value: "serif" },
  { label: "Monospace",   value: "monospace" },
];

const FORMATS = ["1:1", "4:5", "9:16", "16:9"] as const;
type FormatLabel = typeof FORMATS[number];

interface Props {
  slide: Slide;
  onUpdate: (slide: Slide) => void;
  onAddSlide: () => void;
  onDeleteSlide: () => void;
  slideIndex: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  selectedElement?: SlideElement | null;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  format?: FormatLabel;
  onFormatChange?: (f: FormatLabel) => void;
}

export default function Toolbar({
  slide, onUpdate, onAddSlide, onDeleteSlide,
  slideIndex, totalSlides, onPrev, onNext,
  selectedElement, onUndo, onRedo, canUndo, canRedo,
  format = "4:5", onFormatChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [generating, setGenerating] = useState(false);
  const [showEditAI, setShowEditAI] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [showLayouts, setShowLayouts] = useState(false);
  const [showFrame, setShowFrame] = useState(false);

  const FRAME_PRESETS: {
    id: string; label: string; desc: string;
    crop: { top: number; right: number; bottom: number; left: number };
    gradient: string;
    imgArea: { top: string; height: string }; // para mini-preview
  }[] = [
    {
      id: "full",
      label: "Full",
      desc: "Imagem de fundo total",
      crop: { top: 0, right: 0, bottom: 0, left: 0 },
      gradient: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.80) 40%, rgba(0,0,0,0.20) 70%, rgba(0,0,0,0.05) 100%)",
      imgArea: { top: "0%", height: "100%" },
    },
    {
      id: "top55",
      label: "Topo 55%",
      desc: "Imagem no topo, texto embaixo",
      crop: { top: 0, right: 0, bottom: 45, left: 0 },
      gradient: "linear-gradient(to top, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.0) 45%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.15) 100%)",
      imgArea: { top: "0%", height: "55%" },
    },
    {
      id: "top40",
      label: "Topo 40%",
      desc: "Quadro compacto no topo",
      crop: { top: 0, right: 0, bottom: 60, left: 0 },
      gradient: "linear-gradient(to top, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.40) 55%, rgba(0,0,0,0.10) 100%)",
      imgArea: { top: "0%", height: "40%" },
    },
    {
      id: "bottom55",
      label: "Inferior 55%",
      desc: "Texto em cima, imagem embaixo",
      crop: { top: 45, right: 0, bottom: 0, left: 0 },
      gradient: "linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.0) 45%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.15) 100%)",
      imgArea: { top: "45%", height: "55%" },
    },
    {
      id: "bottom40",
      label: "Inferior 40%",
      desc: "Quadro compacto embaixo",
      crop: { top: 60, right: 0, bottom: 0, left: 0 },
      gradient: "linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.40) 75%, rgba(0,0,0,0.10) 100%)",
      imgArea: { top: "60%", height: "40%" },
    },
    {
      id: "center",
      label: "Centro",
      desc: "Quadro centralizado com margens",
      crop: { top: 18, right: 4, bottom: 18, left: 4 },
      gradient: "linear-gradient(to top, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.0) 100%)",
      imgArea: { top: "18%", height: "64%" },
    },
  ];

  const applyFrame = (presetId: string) => {
    const preset = FRAME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const W = slide.width;
    const H = slide.height;
    const textEls = slide.elements.filter((e) => e.type === "text");
    const [titleEl, bodyEl] = textEls;
    let newElements = [...slide.elements];

    if (presetId === "top55" || presetId === "top40") {
      const imgBottom = presetId === "top55" ? 0.55 : 0.40;
      if (titleEl) {
        newElements = newElements.map((e) => e.id === titleEl.id ? {
          ...e, x: 64, y: Math.round(H * (imgBottom + 0.04)), width: W - 128, height: Math.round(H * 0.22),
          style: { ...(e.style as any), fontSize: Math.round(H * 0.062), textAlign: "left" },
        } : e);
      }
      if (bodyEl) {
        newElements = newElements.map((e) => e.id === bodyEl.id ? {
          ...e, x: 64, y: Math.round(H * (imgBottom + 0.28)), width: W - 128, height: Math.round(H * 0.10),
          style: { ...(e.style as any), fontSize: Math.round(H * 0.020), textAlign: "left" },
        } : e);
      }
    } else if (presetId === "bottom55" || presetId === "bottom40") {
      const imgTop = presetId === "bottom55" ? 0.45 : 0.60;
      if (titleEl) {
        newElements = newElements.map((e) => e.id === titleEl.id ? {
          ...e, x: 64, y: Math.round(H * 0.06), width: W - 128, height: Math.round(H * 0.26),
          style: { ...(e.style as any), fontSize: Math.round(H * 0.068), textAlign: "center" },
        } : e);
      }
      if (bodyEl) {
        newElements = newElements.map((e) => e.id === bodyEl.id ? {
          ...e, x: 64, y: Math.round(H * 0.34), width: W - 128, height: Math.round(H * 0.09),
          style: { ...(e.style as any), fontSize: Math.round(H * 0.020), textAlign: "center" },
        } : e);
      }
    }

    onUpdate({
      ...slide,
      elements: newElements,
      backgroundCrop: preset.crop,
      backgroundGradient: preset.gradient,
    });
    setShowFrame(false);
  };

  const LAYOUTS = [
    { id: "classic",    label: "Clássico",    desc: "Texto embaixo",    gradient: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.80) 40%, rgba(0,0,0,0.30) 70%, rgba(0,0,0,0.10) 100%)", preview: [{ top: "62%", left: "6%", w: "88%", h: "20%", size: "lg" }, { top: "86%", left: "6%", w: "70%", h: "8%", size: "sm" }] },
    { id: "top",        label: "Topo",        desc: "Texto no topo",    gradient: "linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.70) 40%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.05) 100%)", preview: [{ top: "8%", left: "6%", w: "88%", h: "20%", size: "lg" }, { top: "32%", left: "6%", w: "70%", h: "8%", size: "sm" }] },
    { id: "center",     label: "Centralizado",desc: "Texto no centro",  gradient: "linear-gradient(to bottom, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.88) 40%, rgba(0,0,0,0.88) 60%, rgba(0,0,0,0.70) 100%)", preview: [{ top: "35%", left: "10%", w: "80%", h: "18%", size: "lg" }, { top: "57%", left: "15%", w: "70%", h: "7%", size: "sm" }] },
    { id: "bold",       label: "Bold",        desc: "Título gigante",   gradient: "linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.90) 50%, rgba(0,0,0,0.70) 100%)", preview: [{ top: "28%", left: "4%", w: "92%", h: "42%", size: "xl" }, { top: "74%", left: "4%", w: "65%", h: "7%", size: "sm" }] },
    { id: "cinematic",  label: "Cinemático",  desc: "Estilo filme",     gradient: "linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.40) 70%, rgba(0,0,0,0.10) 100%)", preview: [{ top: "60%", left: "4%", w: "92%", h: "22%", size: "lg" }, { top: "86%", left: "4%", w: "60%", h: "7%", size: "sm" }] },
    { id: "minimal",    label: "Minimalista", desc: "Clean e direto",   gradient: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.15) 100%)", preview: [{ top: "55%", left: "6%", w: "88%", h: "17%", size: "lg" }, { top: "76%", left: "6%", w: "65%", h: "7%", size: "sm" }] },
  ];

  const applyLayout = (layoutId: string) => {
    const W = slide.width;
    const H = slide.height;
    const layout = LAYOUTS.find(l => l.id === layoutId);
    if (!layout) return;

    const textEls = slide.elements.filter(e => e.type === "text");
    const [titleEl, bodyEl] = textEls;

    let newElements = [...slide.elements];

    const positions: Record<string, { ty: number; by: number; fs: number; ba: "left" | "center" }> = {
      classic:   { ty: H - 520, by: H - 172, fs: Math.round(H * 0.068), ba: "left" },
      top:       { ty: 80,      by: 390,     fs: Math.round(H * 0.058), ba: "left" },
      center:    { ty: Math.round(H * 0.30), by: Math.round(H * 0.58), fs: Math.round(H * 0.060), ba: "center" },
      bold:      { ty: Math.round(H * 0.25), by: Math.round(H * 0.74), fs: Math.round(H * 0.085), ba: "left" },
      cinematic: { ty: Math.round(H * 0.60), by: Math.round(H * 0.88), fs: Math.round(H * 0.072), ba: "left" },
      minimal:   { ty: Math.round(H * 0.55), by: Math.round(H * 0.80), fs: Math.round(H * 0.052), ba: "left" },
    };

    const p = positions[layoutId];
    if (!p) return;

    if (titleEl) {
      newElements = newElements.map(e => e.id === titleEl.id ? {
        ...e, x: 64, y: p.ty, width: W - 128, height: Math.round(H * 0.26),
        style: { ...(e.style as any), fontSize: p.fs, textAlign: p.ba },
      } : e);
    }
    if (bodyEl) {
      newElements = newElements.map(e => e.id === bodyEl.id ? {
        ...e, x: 64, y: p.by, width: W - 128, height: Math.round(H * 0.09),
        style: { ...(e.style as any), fontSize: Math.round(H * 0.019), textAlign: p.ba },
      } : e);
    }

    onUpdate({ ...slide, elements: newElements, backgroundGradient: layout.gradient });
    setShowLayouts(false);
  };

  // ── Perfil ────────────────────────────────────────────────
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileHandle, setProfileHandle] = useState("");
  const [profileAvatarSrc, setProfileAvatarSrc] = useState("");
  const [profileVerified, setProfileVerified] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("xpz_profile");
      if (saved) {
        const p = JSON.parse(saved);
        setProfileName(p.name ?? "");
        setProfileHandle(p.handle ?? "");
        setProfileAvatarSrc(p.avatarSrc ?? "");
        setProfileVerified(p.verified ?? false);
      }
    } catch {}
  }, []);

  const handleAvatarUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setProfileAvatarSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const insertProfile = () => {
    const profile = { name: profileName, handle: profileHandle, avatarSrc: profileAvatarSrc, verified: profileVerified };
    localStorage.setItem("xpz_profile", JSON.stringify(profile));

    const avatarSize = 130;
    const cardH = 160;
    const cardW = Math.min(700, slide.width - 80);
    const el: SlideElement = {
      id: uuid(),
      type: "profile",
      x: 40,
      y: slide.height - cardH - 60,
      width: cardW,
      height: cardH,
      src: profileAvatarSrc || undefined,
      profileName,
      profileHandle,
      profileVerified,
      zIndex: 10,
    };
    onUpdate({ ...slide, elements: [...slide.elements, el] });
    setShowProfile(false);
  };

  // ── Gerar fundo ────────────────────────────────────────────
  const generateBackground = async () => {
    const texts = slide.elements
      .filter((el) => el.type === "text")
      .map((el) => (el.content ?? "").replace(/<[^>]+>/g, "").trim())
      .filter(Boolean)
      .join(". ");
    const prompt = texts || "modern dark cinematic professional background";
    setGenerating(true);
    try {
      const customerId = localStorage.getItem("xpz_customer_id") ?? undefined;
      const activationToken = localStorage.getItem("xpz_activation_token") ?? undefined;
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, imageStyle: "cinematico", customerId, activationToken }),
      });
      const data = await res.json();
      if (data.imageUrl) onUpdate({ ...slide, backgroundImageUrl: data.imageUrl });
    } catch {}
    finally { setGenerating(false); }
  };

  const addText = () => {
    const el: SlideElement = {
      id: uuid(), type: "text",
      x: 60, y: 200, width: 500, height: 80,
      content: "Seu texto aqui",
      style: { fontSize: 40, fontWeight: "bold", fontFamily: "sans-serif", color: "#ffffff", textAlign: "left", lineHeight: 1.3 },
    };
    onUpdate({ ...slide, elements: [...slide.elements, el] });
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const el: SlideElement = { id: uuid(), type: "image", x: 80, y: 80, width: 400, height: 300, src };
      onUpdate({ ...slide, elements: [...slide.elements, el] });
    };
    reader.readAsDataURL(file);
  };

  const patchSelected = (patch: Partial<SlideElement>) => {
    if (!selectedElement) return;
    onUpdate({ ...slide, elements: slide.elements.map((el) => el.id === selectedElement.id ? { ...el, ...patch } : el) });
  };

  const patchStyle = (stylePatch: Record<string, any>) => {
    if (!selectedElement) return;
    onUpdate({ ...slide, elements: slide.elements.map((el) => el.id === selectedElement.id ? { ...el, style: { ...(el.style as any), ...stylePatch } } : el) });
  };

  // ── Editar fundo com IA ────────────────────────────────────
  const editBackgroundWithAI = async () => {
    if (!editPrompt.trim() || !slide.backgroundImageUrl) return;
    setEditLoading(true);
    setEditError("");
    try {
      // Converte URL em base64 (pode já ser data URL ou URL externa)
      let imageBase64 = "";
      let imageMime = "image/jpeg";

      if (slide.backgroundImageUrl.startsWith("data:")) {
        const [header, b64] = slide.backgroundImageUrl.split(",");
        imageBase64 = b64;
        imageMime = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
      } else {
        const imgRes = await fetch(slide.backgroundImageUrl);
        const buf = await imgRes.arrayBuffer();
        imageMime = imgRes.headers.get("content-type") ?? "image/jpeg";
        imageBase64 = Buffer.from(buf).toString("base64");
      }

      const res = await fetch("/api/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, imageMime, prompt: editPrompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.imageUrl) throw new Error(data.error ?? "Erro ao editar");
      onUpdate({ ...slide, backgroundImageUrl: data.imageUrl });
      setShowEditAI(false);
      setEditPrompt("");
    } catch (e: any) {
      setEditError(e.message ?? "Erro desconhecido");
    } finally {
      setEditLoading(false);
    }
  };

  const s = selectedElement?.type === "text" ? (selectedElement.style as any) : null;
  const isText = selectedElement?.type === "text";

  const loadFont = (fontValue: string) => {
    const name = fontValue.match(/'([^']+)'/)?.[1];
    if (!name) return;
    const id = `gfont-${name.replace(/\s/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id; link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  };

  return (
    <div className="flex flex-col bg-[#080808] border-b border-[#161616] relative">
      {/* Linha principal */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        {/* Navegação */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onPrev} disabled={slideIndex === 0} className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
          <span className="text-sm text-gray-400 w-16 text-center">{slideIndex + 1} / {totalSlides}</span>
          <button onClick={onNext} disabled={slideIndex === totalSlides - 1} className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
        </div>

        <div className="w-px h-6 bg-[#2a2a2a]" />

        <button onClick={onUndo} disabled={!canUndo} title="Desfazer (Ctrl+Z)" className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white"><Undo2 size={16} /></button>
        <button onClick={onRedo} disabled={!canRedo} title="Refazer (Ctrl+Y)" className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white"><Redo2 size={16} /></button>

        <div className="w-px h-6 bg-[#2a2a2a]" />

        <button onClick={addText} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2a2a2a] hover:bg-[#333] text-sm shrink-0"><Type size={14} /> Texto</button>

        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2a2a2a] hover:bg-[#333] text-sm shrink-0"><ImageIcon size={14} /> Imagem</button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />

        {/* Perfil */}
        <button onClick={() => setShowProfile((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm shrink-0 transition-colors ${showProfile ? "bg-brand-600 text-white" : "bg-[#2a2a2a] hover:bg-[#333] text-gray-300"}`}>
          <UserCircle size={14} /> Perfil
        </button>

        {/* Layout */}
        <button onClick={() => { setShowLayouts(v => !v); setShowProfile(false); setShowEditAI(false); setShowFrame(false); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm shrink-0 transition-colors ${showLayouts ? "bg-brand-600 text-white" : "bg-[#2a2a2a] hover:bg-[#333] text-gray-300"}`}>
          <LayoutTemplate size={14} /> Layout
        </button>

        {/* Frame da imagem */}
        {slide.backgroundImageUrl && (
          <button onClick={() => { setShowFrame(v => !v); setShowLayouts(false); setShowProfile(false); setShowEditAI(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm shrink-0 transition-colors ${showFrame ? "bg-indigo-600 text-white" : "bg-[#2a2a2a] hover:bg-[#333] text-gray-300"}`}>
            <FrameIcon size={14} /> Frame
          </button>
        )}

        {/* Gerar fundo IA */}
        <button onClick={generateBackground} disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-600/20 hover:bg-brand-600/40 border border-brand-600/30 text-brand-400 text-sm shrink-0 disabled:opacity-40 transition-colors">
          <Wand2 size={14} className={generating ? "animate-spin" : ""} />
          {generating ? "Gerando..." : "Fundo IA"}
        </button>

        {/* Editar imagem com IA (só aparece quando há imagem de fundo) */}
        {slide.backgroundImageUrl && (
          <button
            onClick={() => { setShowEditAI((v) => !v); setEditError(""); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm shrink-0 transition-colors ${showEditAI ? "bg-pink-600/30 border-pink-500/50 text-pink-300" : "bg-pink-600/10 hover:bg-pink-600/20 border-pink-600/30 text-pink-400"}`}>
            <Sparkles size={14} />
            Editar com IA
          </button>
        )}

        <div className="w-px h-6 bg-[#2a2a2a]" />

        {/* Formato */}
        <div className="flex items-center gap-1 bg-[#111] border border-[#222] rounded-lg p-0.5 shrink-0">
          {FORMATS.map((f) => (
            <button key={f} onClick={() => onFormatChange?.(f)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${format === f ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>{f}</button>
          ))}
        </div>

        <div className="w-px h-6 bg-[#2a2a2a]" />

        <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer shrink-0">
          Fundo:
          <input type="color" value={slide.backgroundColor} onChange={(e) => onUpdate({ ...slide, backgroundColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
        </label>

        <div className="flex gap-2 shrink-0 ml-3">
          <button onClick={onAddSlide} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-600 hover:bg-brand-700 text-sm font-medium shrink-0"><Plus size={14} /> Slide</button>
          <button onClick={onDeleteSlide} disabled={totalSlides <= 1} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-900/40 hover:bg-red-900/60 text-sm disabled:opacity-30 disabled:cursor-not-allowed shrink-0"><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Painel de perfil */}
      {showProfile && (
        <div className="absolute top-full left-0 z-50 mt-1 ml-2 bg-[#111] border border-[#2a2a2a] rounded-xl shadow-2xl p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-200">Configurar perfil</span>
            <button onClick={() => setShowProfile(false)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => avatarInputRef.current?.click()} className="relative group shrink-0">
              {profileAvatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileAvatarSrc} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-brand-500" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#2a2a2a] flex items-center justify-center border-2 border-dashed border-[#444]">
                  <UserCircle size={28} className="text-gray-500" />
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-[10px] font-medium">Trocar</span>
              </div>
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ""; }} />
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">Foto de perfil</p>
              <p className="text-[11px] text-gray-600">Clique para fazer upload</p>
            </div>
          </div>

          {/* Nome */}
          <div className="mb-2">
            <label className="text-xs text-gray-400 block mb-1">Nome</label>
            <input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Seu nome"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500" />
          </div>

          {/* Handle */}
          <div className="mb-3">
            <label className="text-xs text-gray-400 block mb-1">@ (sem o @)</label>
            <div className="flex items-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden focus-within:border-brand-500">
              <span className="px-3 text-gray-500 text-sm select-none">@</span>
              <input value={profileHandle} onChange={(e) => setProfileHandle(e.target.value.replace("@", ""))} placeholder="seuhandle"
                className="flex-1 bg-transparent py-2 pr-3 text-sm text-white focus:outline-none" />
            </div>
          </div>

          {/* Verificado */}
          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
            <div onClick={() => setProfileVerified((v) => !v)}
              className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${profileVerified ? "bg-blue-500" : "bg-[#333]"}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${profileVerified ? "translate-x-5" : "translate-x-0"}`} />
            </div>
            <span className="text-sm text-gray-300 flex items-center gap-1.5">
              <BadgeCheck size={14} className="text-blue-400" /> Selo verificado
            </span>
          </label>

          {/* Preview */}
          {(profileName || profileHandle) && (
            <div className="flex items-center gap-2.5 bg-[#1a1a1a] rounded-lg px-3 py-2.5 mb-3">
              {profileAvatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileAvatarSrc} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#333] shrink-0" />
              )}
              <div>
                <div className="flex items-center gap-1 text-sm font-semibold text-white">
                  {profileName || "Seu nome"}
                  {profileVerified && <BadgeCheck size={13} className="text-blue-400" />}
                </div>
                <div className="text-xs text-gray-400">@{profileHandle || "seuhandle"}</div>
              </div>
            </div>
          )}

          <button onClick={insertProfile}
            className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-sm font-medium text-white transition-colors">
            Inserir no slide
          </button>
        </div>
      )}

      {/* Painel de layouts */}
      {showLayouts && (
        <div className="absolute top-full left-0 z-50 mt-1 ml-2 bg-[#111] border border-[#2a2a2a] rounded-xl shadow-2xl p-4 w-[420px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
              <LayoutTemplate size={14} className="text-brand-400" /> Templates de Layout
            </span>
            <button onClick={() => setShowLayouts(false)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
          </div>
          <p className="text-[11px] text-gray-600 mb-3">Reposiciona o texto e ajusta o gradiente. O conteúdo é preservado.</p>
          <div className="grid grid-cols-3 gap-2">
            {LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                onClick={() => applyLayout(layout.id)}
                className="flex flex-col gap-2 p-2 rounded-xl border border-[#2a2a2a] hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-left"
              >
                {/* Mini preview */}
                <div className="relative w-full rounded-lg overflow-hidden bg-[#1a1a1a]" style={{ aspectRatio: "4/5" }}>
                  <div className="absolute inset-0" style={{ background: layout.gradient }} />
                  {layout.preview.map((block, i) => (
                    <div
                      key={i}
                      className="absolute rounded"
                      style={{
                        top: block.top, left: block.left, width: block.w, height: block.h,
                        background: "rgba(255,255,255,0.85)",
                        opacity: block.size === "sm" ? 0.5 : 0.9,
                      }}
                    />
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{layout.label}</p>
                  <p className="text-[10px] text-gray-500">{layout.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Painel de Frame da imagem */}
      {showFrame && slide.backgroundImageUrl && (
        <div className="absolute top-full left-0 z-50 mt-1 ml-2 bg-[#111] border border-[#2a2a2a] rounded-xl shadow-2xl p-4 w-[400px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
              <FrameIcon size={14} className="text-indigo-400" /> Quadro da Imagem
            </span>
            <button onClick={() => setShowFrame(false)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
          </div>
          <p className="text-[11px] text-gray-600 mb-3">Escolha onde a imagem aparece no slide. O texto é reposicionado automaticamente.</p>
          <div className="grid grid-cols-3 gap-2">
            {FRAME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyFrame(preset.id)}
                className="flex flex-col gap-2 p-2 rounded-xl border border-[#2a2a2a] hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left"
              >
                {/* Mini preview do frame */}
                <div className="relative w-full rounded-lg overflow-hidden bg-[#0a0a0a] border border-[#2a2a2a]" style={{ aspectRatio: "4/5" }}>
                  {/* Área da imagem */}
                  <div
                    className="absolute left-[4%] right-[4%] rounded-sm"
                    style={{
                      top: preset.imgArea.top,
                      height: preset.imgArea.height,
                      background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)",
                      opacity: 0.85,
                    }}
                  />
                  {/* Linhas de texto simuladas */}
                  {(preset.id === "bottom55" || preset.id === "bottom40") ? (
                    <>
                      <div className="absolute left-[8%] right-[8%] rounded" style={{ top: "8%", height: "10%", background: "rgba(255,255,255,0.8)" }} />
                      <div className="absolute left-[10%] right-[20%] rounded" style={{ top: "21%", height: "5%", background: "rgba(255,255,255,0.4)" }} />
                    </>
                  ) : preset.id !== "full" ? (
                    <>
                      <div className="absolute left-[8%] right-[8%] rounded" style={{ bottom: "18%", height: "10%", background: "rgba(255,255,255,0.8)" }} />
                      <div className="absolute left-[10%] right-[20%] rounded" style={{ bottom: "10%", height: "5%", background: "rgba(255,255,255,0.4)" }} />
                    </>
                  ) : (
                    <>
                      <div className="absolute left-[8%] right-[8%] rounded" style={{ bottom: "14%", height: "10%", background: "rgba(255,255,255,0.8)" }} />
                      <div className="absolute left-[10%] right-[20%] rounded" style={{ bottom: "8%", height: "5%", background: "rgba(255,255,255,0.4)" }} />
                    </>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{preset.label}</p>
                  <p className="text-[10px] text-gray-500 leading-tight">{preset.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Painel Editar com IA */}
      {showEditAI && slide.backgroundImageUrl && (
        <div className="absolute top-full left-0 z-50 mt-1 ml-2 bg-[#111] border border-[#2a2a2a] rounded-xl shadow-2xl p-4 w-96">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
              <Sparkles size={14} className="text-pink-400" /> Editar imagem com IA
            </span>
            <button onClick={() => setShowEditAI(false)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
          </div>

          {/* Preview da imagem atual */}
          <div className="rounded-lg overflow-hidden mb-3 border border-[#2a2a2a]" style={{ height: 120 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.backgroundImageUrl} alt="Imagem atual" className="w-full h-full object-cover" />
          </div>

          <p className="text-[11px] text-gray-500 mb-2">
            Descreva o que quer alterar. O rosto e demais elementos são preservados ao máximo pelo Gemini.
          </p>

          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="ex: ele segurando a taça da copa do mundo"
            rows={3}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 resize-none placeholder:text-gray-600"
          />

          {editError && (
            <p className="text-xs text-red-400 mt-1">{editError}</p>
          )}

          <button
            onClick={editBackgroundWithAI}
            disabled={editLoading || !editPrompt.trim()}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-pink-600 hover:bg-pink-700 disabled:opacity-40 text-sm font-medium text-white transition-colors"
          >
            {editLoading ? <><Loader2 size={14} className="animate-spin" /> Editando...</> : <><Sparkles size={14} /> Aplicar edição</>}
          </button>
        </div>
      )}

      {/* Painel de imagem de fundo */}
      {slide.backgroundImageUrl && !isText && (
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[#161616] overflow-x-auto whitespace-nowrap scrollbar-none">
          <span className="text-xs text-gray-500 shrink-0">Imagem:</span>

          <label className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
            X
            <input
              type="range" min={0} max={100} step={1}
              value={slide.backgroundPosition?.x ?? 50}
              onChange={(e) => onUpdate({ ...slide, backgroundPosition: { x: Number(e.target.value), y: slide.backgroundPosition?.y ?? 50 } })}
              className="w-24 accent-brand-500"
            />
            <span className="text-gray-600 w-6">{slide.backgroundPosition?.x ?? 50}</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
            Y
            <input
              type="range" min={0} max={100} step={1}
              value={slide.backgroundPosition?.y ?? 50}
              onChange={(e) => onUpdate({ ...slide, backgroundPosition: { x: slide.backgroundPosition?.x ?? 50, y: Number(e.target.value) } })}
              className="w-24 accent-brand-500"
            />
            <span className="text-gray-600 w-6">{slide.backgroundPosition?.y ?? 50}</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
            Zoom
            <input
              type="range" min={100} max={200} step={5}
              value={slide.backgroundZoom ?? 100}
              onChange={(e) => onUpdate({ ...slide, backgroundZoom: Number(e.target.value) })}
              className="w-24 accent-brand-500"
            />
            <span className="text-gray-600 w-8">{slide.backgroundZoom ?? 100}%</span>
          </label>

          <button
            onClick={() => onUpdate({ ...slide, backgroundPosition: { x: 50, y: 50 }, backgroundZoom: 100 })}
            className="text-xs text-gray-600 hover:text-gray-400 shrink-0 underline"
          >
            Reset
          </button>
        </div>
      )}

      {/* Painel de tipografia */}
      {isText && s && (
        <div className="flex items-center gap-3 px-4 py-2 border-t border-[#161616] overflow-x-auto whitespace-nowrap scrollbar-none">
          <select value={s.fontFamily ?? "sans-serif"} onChange={(e) => { loadFont(e.target.value); patchStyle({ fontFamily: e.target.value }); }}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-500 max-w-[130px]" style={{ fontFamily: s.fontFamily }}>
            {FONTS.map((f) => (<option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>))}
          </select>
          <div className="flex items-center gap-1">
            <button onClick={() => patchStyle({ fontSize: Math.max(8, (s.fontSize ?? 20) - 2) })} className="w-6 h-6 flex items-center justify-center rounded bg-[#1a1a1a] hover:bg-[#2a2a2a] text-sm font-bold">−</button>
            <input type="number" min={8} max={300} value={s.fontSize ?? 20} onChange={(e) => patchStyle({ fontSize: Number(e.target.value) })} className="w-14 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1 py-1 text-xs text-center text-white focus:outline-none focus:border-brand-500" />
            <button onClick={() => patchStyle({ fontSize: (s.fontSize ?? 20) + 2 })} className="w-6 h-6 flex items-center justify-center rounded bg-[#1a1a1a] hover:bg-[#2a2a2a] text-sm font-bold">+</button>
          </div>
          <div className="w-px h-5 bg-[#2a2a2a]" />
          <button onClick={() => patchStyle({ fontWeight: s.fontWeight === "bold" ? "normal" : "bold" })} className={`p-1.5 rounded text-sm ${s.fontWeight === "bold" ? "bg-brand-500/20 text-brand-400" : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-400"}`}><Bold size={14} /></button>
          {(["left", "center", "right"] as const).map((align) => {
            const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
            return (<button key={align} onClick={() => patchStyle({ textAlign: align })} className={`p-1.5 rounded ${s.textAlign === align ? "bg-brand-500/20 text-brand-400" : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-400"}`}><Icon size={14} /></button>);
          })}
          <div className="w-px h-5 bg-[#2a2a2a]" />
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">Cor:<input type="color" value={s.color ?? "#ffffff"} onChange={(e) => patchStyle({ color: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" /></label>
          <label className="flex items-center gap-1.5 text-xs text-gray-400">Espaç:<input type="number" min={0.8} max={3} step={0.1} value={s.lineHeight ?? 1.4} onChange={(e) => patchStyle({ lineHeight: Number(e.target.value) })} className="w-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1 py-1 text-xs text-center text-white focus:outline-none focus:border-brand-500" /></label>
          <div className="w-px h-5 bg-[#2a2a2a]" />
          <input type="text" value={selectedElement?.content ?? ""} onChange={(e) => patchSelected({ content: e.target.value })} placeholder="Editar texto..." className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-500 w-48" />
        </div>
      )}
    </div>
  );
}
