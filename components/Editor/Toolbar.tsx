"use client";

import { Type, Image as ImageIcon, Plus, Trash2, ChevronLeft, ChevronRight, Bold, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Wand2, UserCircle, X, BadgeCheck, Sparkles, Loader2, LayoutTemplate, FrameIcon, Palette } from "lucide-react";
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

const SLIDE_THEMES = [
  {
    id: "dark",
    label: "Preto",
    bg: "#0a0a0a",
    textColor: "#ffffff",
    preview: { bg: "#0a0a0a", line: "#ffffff" },
  },
  {
    id: "light",
    label: "Branco",
    bg: "#ffffff",
    textColor: "#111111",
    preview: { bg: "#ffffff", line: "#111111" },
  },
  {
    id: "navy",
    label: "Azul",
    bg: "#0f172a",
    textColor: "#e2e8f0",
    preview: { bg: "#0f172a", line: "#818cf8" },
  },
  {
    id: "cream",
    label: "Creme",
    bg: "#faf7f2",
    textColor: "#1c1917",
    preview: { bg: "#faf7f2", line: "#78716c" },
  },
] as const;

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
  onApplyThemeToAll?: (bg: string, textColor: string) => void;
}

export default function Toolbar({
  slide, onUpdate, onAddSlide, onDeleteSlide,
  slideIndex, totalSlides, onPrev, onNext,
  selectedElement, onUndo, onRedo, canUndo, canRedo,
  format = "4:5", onFormatChange, onApplyThemeToAll,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [generating, setGenerating] = useState(false);
  const [showEditAI, setShowEditAI] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [imgElPrompt, setImgElPrompt] = useState("");
  const [imgElGenerating, setImgElGenerating] = useState(false);
  const [showLayouts, setShowLayouts] = useState(false);
  const [showMolds, setShowMolds] = useState(false);
  const [showTheme, setShowTheme] = useState(false);

  const closeAll = () => { setShowLayouts(false); setShowProfile(false); setShowEditAI(false); setShowMolds(false); setShowTheme(false); };

  const MOLD_SHAPES = [
    { id: "circle",   label: "Círculo",  path: <circle cx="24" cy="24" r="22" /> },
    { id: "rounded",  label: "Arredon.", path: <rect x="4" y="4" width="40" height="40" rx="10" ry="10" /> },
    { id: "rect",     label: "Retang.",  path: <rect x="4" y="8" width="40" height="32" /> },
    { id: "squircle", label: "Suave",    path: <rect x="4" y="4" width="40" height="40" rx="18" ry="18" /> },
    { id: "arch",     label: "Arco",     path: <path d="M4 48 Q4 4 24 4 Q44 4 44 48 Z" /> },
    { id: "diamond",  label: "Losango",  path: <polygon points="24,2 46,24 24,46 2,24" /> },
    { id: "hexagon",  label: "Hexágono", path: <polygon points="24,2 44,13 44,35 24,46 4,35 4,13" /> },
    { id: "triangle", label: "Triâng.",  path: <polygon points="24,2 46,46 2,46" /> },
    { id: "star",     label: "Estrela",  path: <polygon points="24,2 29,18 46,18 33,28 38,44 24,34 10,44 15,28 2,18 19,18" /> },
  ] as const;

  const addFrame = (shape: string) => {
    const W = slide.width;
    const H = slide.height;
    const size = Math.round(Math.min(W, H) * 0.42);
    const newEl = {
      id: require("uuid").v4(),
      type: "frame" as const,
      frameShape: shape,
      x: Math.round((W - size) / 2),
      y: Math.round((H - size) / 2),
      width: size,
      height: size,
      zIndex: 20,
      opacity: 1,
    };
    onUpdate({ ...slide, elements: [...slide.elements, newEl] });
    setShowMolds(false);
  };

  const LAYOUTS: {
    id: string; label: string; desc: string; gradient: string;
    bgPosition: { x: number; y: number }; bgZoom: number;
    textBlocks: { top: string; left: string; w: string; h: string; bold?: boolean }[];
    photoCover: string;
  }[] = [
    {
      id: "impacto", label: "Impacto", desc: "Foto cheia, texto marcante embaixo",
      gradient: "linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.88) 40%, rgba(0,0,0,0.30) 68%, rgba(0,0,0,0.04) 100%)",
      bgPosition: { x: 50, y: 38 }, bgZoom: 112,
      textBlocks: [{ top: "57%", left: "5%", w: "90%", h: "24%", bold: true }, { top: "84%", left: "5%", w: "62%", h: "7%" }],
      photoCover: "linear-gradient(160deg, #1e3a8a 0%, #3b5bdb 45%, #2563eb 100%)",
    },
    {
      id: "capa", label: "Capa", desc: "Foto no topo, base sólida escura",
      gradient: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 34%, rgba(0,0,0,0.55) 46%, rgba(0,0,0,0.0) 62%, rgba(0,0,0,0.0) 100%)",
      bgPosition: { x: 50, y: 28 }, bgZoom: 112,
      textBlocks: [{ top: "66%", left: "5%", w: "90%", h: "20%", bold: true }, { top: "89%", left: "5%", w: "58%", h: "5%" }],
      photoCover: "linear-gradient(200deg, #0c4a6e 0%, #1e3a8a 40%, #312e81 100%)",
    },
    {
      id: "topo", label: "Topo", desc: "Título no alto, foto domina a base",
      gradient: "linear-gradient(to bottom, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.72) 34%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0.0) 100%)",
      bgPosition: { x: 50, y: 65 }, bgZoom: 110,
      textBlocks: [{ top: "5%", left: "5%", w: "90%", h: "24%", bold: true }, { top: "32%", left: "5%", w: "64%", h: "7%" }],
      photoCover: "linear-gradient(160deg, #064e3b 0%, #065f46 45%, #047857 100%)",
    },
    {
      id: "poster", label: "Poster", desc: "Título gigante, visual dramático",
      gradient: "linear-gradient(to top, rgba(0,0,0,0.99) 0%, rgba(0,0,0,0.93) 55%, rgba(0,0,0,0.75) 100%)",
      bgPosition: { x: 50, y: 35 }, bgZoom: 122,
      textBlocks: [{ top: "20%", left: "3%", w: "94%", h: "48%", bold: true }, { top: "73%", left: "3%", w: "58%", h: "6%" }],
      photoCover: "linear-gradient(160deg, #7f1d1d 0%, #991b1b 45%, #b91c1c 100%)",
    },
    {
      id: "elegante", label: "Elegante", desc: "Texto centralizado, clean",
      gradient: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.90) 38%, rgba(0,0,0,0.90) 62%, rgba(0,0,0,0.72) 100%)",
      bgPosition: { x: 50, y: 50 }, bgZoom: 105,
      textBlocks: [{ top: "32%", left: "8%", w: "84%", h: "22%", bold: true }, { top: "58%", left: "12%", w: "76%", h: "7%" }],
      photoCover: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
    },
    {
      id: "editorial", label: "Editorial", desc: "Metade foto, metade escuro",
      gradient: "linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.94) 46%, rgba(0,0,0,0.52) 58%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.0) 100%)",
      bgPosition: { x: 50, y: 22 }, bgZoom: 108,
      textBlocks: [{ top: "53%", left: "5%", w: "90%", h: "22%", bold: true }, { top: "79%", left: "5%", w: "68%", h: "7%" }],
      photoCover: "linear-gradient(160deg, #78350f 0%, #92400e 45%, #b45309 100%)",
    },
  ];

  const applyLayout = (layoutId: string) => {
    const W = slide.width;
    const H = slide.height;
    const layout = LAYOUTS.find(l => l.id === layoutId);
    if (!layout) return;

    const contentEls = slide.elements.filter(e =>
      e.type === "text" && e.y >= H * 0.12 && e.y <= H * 0.82
    );
    const [titleEl, bodyEl] = contentEls;

    let newElements = [...slide.elements];

    const positions: Record<string, { ty: number; th: number; by: number; bh: number; fs: number; bfs: number; ba: "left" | "center" }> = {
      impacto:   { ty: Math.round(H*0.57), th: Math.round(H*0.24), by: Math.round(H*0.84), bh: Math.round(H*0.07), fs: Math.round(H*0.046), bfs: Math.round(H*0.020), ba: "left" },
      capa:      { ty: Math.round(H*0.66), th: Math.round(H*0.20), by: Math.round(H*0.89), bh: Math.round(H*0.05), fs: Math.round(H*0.042), bfs: Math.round(H*0.018), ba: "left" },
      topo:      { ty: Math.round(H*0.05), th: Math.round(H*0.24), by: Math.round(H*0.32), bh: Math.round(H*0.07), fs: Math.round(H*0.038), bfs: Math.round(H*0.020), ba: "left" },
      poster:    { ty: Math.round(H*0.20), th: Math.round(H*0.48), by: Math.round(H*0.73), bh: Math.round(H*0.06), fs: Math.round(H*0.058), bfs: Math.round(H*0.020), ba: "left" },
      elegante:  { ty: Math.round(H*0.32), th: Math.round(H*0.22), by: Math.round(H*0.58), bh: Math.round(H*0.07), fs: Math.round(H*0.038), bfs: Math.round(H*0.020), ba: "center" },
      editorial: { ty: Math.round(H*0.53), th: Math.round(H*0.22), by: Math.round(H*0.79), bh: Math.round(H*0.07), fs: Math.round(H*0.042), bfs: Math.round(H*0.020), ba: "left" },
    };

    const p = positions[layoutId];
    if (!p) return;

    if (titleEl) {
      newElements = newElements.map(e => e.id === titleEl.id ? {
        ...e, x: 64, y: p.ty, width: W - 128, height: p.th,
        style: { ...(e.style as any), fontSize: p.fs, textAlign: p.ba },
      } : e);
    }
    if (bodyEl) {
      newElements = newElements.map(e => e.id === bodyEl.id ? {
        ...e, x: 64, y: p.by, width: W - 128, height: p.bh,
        style: { ...(e.style as any), fontSize: p.bfs, textAlign: p.ba },
      } : e);
    }

    onUpdate({
      ...slide,
      elements: newElements,
      backgroundGradient: layout.gradient,
      backgroundPosition: layout.bgPosition,
      backgroundZoom: layout.bgZoom,
    });
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
        const bytes = new Uint8Array(buf);
        imageBase64 = btoa(bytes.reduce((s, b) => s + String.fromCharCode(b), ""));
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
  const isProfile = selectedElement?.type === "profile";
  const isImage = selectedElement?.type === "image";
  const isFrame = selectedElement?.type === "frame";

  const generateImageForElement = async () => {
    if (!selectedElement || (!isImage && !isFrame)) return;
    const prompt = imgElPrompt.trim() || slide.elements.filter(e => e.type === "text").map(e => (e.content ?? "").replace(/<[^>]+>/g, "").trim()).filter(Boolean).join(". ") || "cinematic photo";
    setImgElGenerating(true);
    try {
      const customerId = localStorage.getItem("xpz_customer_id") ?? undefined;
      const activationToken = localStorage.getItem("xpz_activation_token") ?? undefined;
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, imageStyle: "gemini", customerId, activationToken }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        if (isFrame) patchSelected({ frameImageUrl: data.imageUrl });
        else patchSelected({ src: data.imageUrl });
      }
    } catch {}
    finally { setImgElGenerating(false); }
  };

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

  const panelBase = "absolute top-full left-0 z-50 mt-1 ml-2 bg-[var(--bg-2)] border border-[var(--border-2)] rounded-xl shadow-2xl p-4";
  const btnBase  = "flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--bg-3)] hover:bg-[var(--bg-4)] text-[var(--text-2)] hover:text-[var(--text)] text-sm shrink-0 transition-colors";
  const divider  = "w-px h-6 bg-[var(--border-2)]";

  return (
    <div className="flex flex-col bg-[var(--bg-2)] border-b border-[var(--border)] relative">
      {/* Linha principal */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto whitespace-nowrap scrollbar-none">

        {/* Navegação */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onPrev} disabled={slideIndex === 0} className={`p-1.5 rounded hover:bg-[var(--bg-3)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-2)]`}><ChevronLeft size={16} /></button>
          <span className="text-sm text-[var(--text-2)] w-16 text-center">{slideIndex + 1} / {totalSlides}</span>
          <button onClick={onNext} disabled={slideIndex === totalSlides - 1} className={`p-1.5 rounded hover:bg-[var(--bg-3)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-2)]`}><ChevronRight size={16} /></button>
        </div>

        <div className={divider} />

        <button onClick={onUndo} disabled={!canUndo} title="Desfazer (Ctrl+Z)" className={`p-1.5 rounded hover:bg-[var(--bg-3)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-2)] hover:text-[var(--text)]`}><Undo2 size={16} /></button>
        <button onClick={onRedo} disabled={!canRedo} title="Refazer (Ctrl+Y)" className={`p-1.5 rounded hover:bg-[var(--bg-3)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-2)] hover:text-[var(--text)]`}><Redo2 size={16} /></button>

        <div className={divider} />

        {/* Formato */}
        <div className="flex items-center gap-1 bg-[var(--bg-3)] border border-[var(--border-2)] rounded-lg p-0.5 shrink-0">
          {FORMATS.map((f) => (
            <button key={f} onClick={() => onFormatChange?.(f)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${format === f ? "bg-brand-600 text-white" : "text-[var(--text-2)] hover:text-[var(--text)]"}`}>{f}</button>
          ))}
        </div>

        <div className={divider} />

        <button onClick={addText} className={btnBase}><Type size={14} /> Texto</button>
        <button onClick={() => fileInputRef.current?.click()} className={btnBase}><ImageIcon size={14} /> Imagem</button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />

        {/* Perfil */}
        <button onClick={() => { closeAll(); setShowProfile((v) => !v); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm shrink-0 transition-colors ${showProfile ? "bg-brand-600 text-white" : btnBase}`}>
          <UserCircle size={14} /> Perfil
        </button>

        {/* Layout */}
        <button onClick={() => { closeAll(); setShowLayouts(v => !v); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm shrink-0 transition-colors ${showLayouts ? "bg-brand-600 text-white" : btnBase}`}>
          <LayoutTemplate size={14} /> Layout
        </button>

        {/* Molduras */}
        <button onClick={() => { closeAll(); setShowMolds(v => !v); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm shrink-0 transition-colors ${showMolds ? "bg-brand-600 text-white" : btnBase}`}>
          <FrameIcon size={14} /> Molduras
        </button>

        {/* Tema dos slides */}
        <button onClick={() => { closeAll(); setShowTheme(v => !v); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm shrink-0 transition-colors ${showTheme ? "bg-brand-600 text-white" : btnBase}`}>
          <Palette size={14} /> Tema
        </button>

        {/* Gerar fundo IA */}
        <button onClick={generateBackground} disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-600/15 hover:bg-brand-600/30 border border-brand-600/25 text-brand-500 text-sm shrink-0 disabled:opacity-40 transition-colors">
          <Wand2 size={14} className={generating ? "animate-spin" : ""} />
          {generating ? "Gerando..." : "Fundo IA"}
        </button>

        {/* Editar imagem com IA */}
        {slide.backgroundImageUrl && (
          <button
            onClick={() => { closeAll(); setShowEditAI((v) => !v); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm shrink-0 transition-colors ${showEditAI ? "bg-pink-600/30 border-pink-500/50 text-pink-300" : "bg-pink-600/10 hover:bg-pink-600/20 border-pink-600/25 text-pink-400"}`}>
            <Sparkles size={14} />
            Editar com IA
          </button>
        )}

        <div className={divider} />

        <label className="flex items-center gap-1.5 text-sm text-[var(--text-2)] cursor-pointer shrink-0">
          Fundo:
          <input type="color" value={slide.backgroundColor} onChange={(e) => onUpdate({ ...slide, backgroundColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
        </label>

        <div className="flex gap-2 shrink-0 ml-3">
          <button onClick={onAddSlide} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shrink-0"><Plus size={14} /> Slide</button>
          <button onClick={onDeleteSlide} disabled={totalSlides <= 1} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-900/40 hover:bg-red-900/60 text-red-300 text-sm disabled:opacity-30 disabled:cursor-not-allowed shrink-0"><Trash2 size={14} /></button>
        </div>
      </div>

      {/* ── Painel de tema dos slides ── */}
      {showTheme && (
        <div className={`${panelBase} w-72`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
              <Palette size={14} className="text-brand-500" /> Tema dos Slides
            </span>
            <button onClick={() => setShowTheme(false)} className="text-[var(--text-3)] hover:text-[var(--text)]"><X size={16} /></button>
          </div>
          <p className="text-[11px] text-[var(--text-3)] mb-3">Aplica fundo e cor do texto em todos os slides.</p>
          <div className="grid grid-cols-2 gap-2">
            {SLIDE_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => { onApplyThemeToAll?.(t.bg, t.textColor); setShowTheme(false); }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--border-2)] hover:border-brand-500/60 hover:bg-brand-500/5 transition-all"
              >
                <div className="w-full h-10 rounded-lg border border-[var(--border-2)] relative overflow-hidden" style={{ background: t.preview.bg }}>
                  <div className="absolute left-2 top-2 right-2 h-1.5 rounded" style={{ background: t.preview.line, opacity: 0.9 }} />
                  <div className="absolute left-2 top-5 w-3/5 h-1 rounded" style={{ background: t.preview.line, opacity: 0.5 }} />
                </div>
                <span className="text-xs font-medium text-[var(--text-2)]">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Painel de perfil ── */}
      {showProfile && (
        <div className={`${panelBase} w-80`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--text)]">Configurar perfil</span>
            <button onClick={() => setShowProfile(false)} className="text-[var(--text-3)] hover:text-[var(--text)]"><X size={16} /></button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => avatarInputRef.current?.click()} className="relative group shrink-0">
              {profileAvatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileAvatarSrc} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-brand-500" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[var(--bg-3)] flex items-center justify-center border-2 border-dashed border-[var(--border-2)]">
                  <UserCircle size={28} className="text-[var(--text-3)]" />
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-[10px] font-medium">Trocar</span>
              </div>
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ""; }} />
            <div className="flex-1">
              <p className="text-xs text-[var(--text-2)] mb-1">Foto de perfil</p>
              <p className="text-[11px] text-[var(--text-3)]">Clique para fazer upload</p>
            </div>
          </div>

          <div className="mb-2">
            <label className="text-xs text-[var(--text-2)] block mb-1">Nome</label>
            <input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Seu nome"
              className="w-full bg-[var(--bg-3)] border border-[var(--border-2)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-brand-500 placeholder:text-[var(--text-3)]" />
          </div>

          <div className="mb-3">
            <label className="text-xs text-[var(--text-2)] block mb-1">@ (sem o @)</label>
            <div className="flex items-center bg-[var(--bg-3)] border border-[var(--border-2)] rounded-lg overflow-hidden focus-within:border-brand-500">
              <span className="px-3 text-[var(--text-3)] text-sm select-none">@</span>
              <input value={profileHandle} onChange={(e) => setProfileHandle(e.target.value.replace("@", ""))} placeholder="seuhandle"
                className="flex-1 bg-transparent py-2 pr-3 text-sm text-[var(--text)] focus:outline-none" />
            </div>
          </div>

          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
            <div onClick={() => setProfileVerified((v) => !v)}
              className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${profileVerified ? "bg-blue-500" : "bg-[var(--bg-4)]"}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${profileVerified ? "translate-x-5" : "translate-x-0"}`} />
            </div>
            <span className="text-sm text-[var(--text-2)] flex items-center gap-1.5">
              <BadgeCheck size={14} className="text-blue-400" /> Selo verificado
            </span>
          </label>

          {(profileName || profileHandle) && (
            <div className="flex items-center gap-2.5 bg-[var(--bg-3)] rounded-lg px-3 py-2.5 mb-3">
              {profileAvatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileAvatarSrc} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[var(--bg-4)] shrink-0" />
              )}
              <div>
                <div className="flex items-center gap-1 text-sm font-semibold text-[var(--text)]">
                  {profileName || "Seu nome"}
                  {profileVerified && <BadgeCheck size={13} className="text-blue-400" />}
                </div>
                <div className="text-xs text-[var(--text-2)]">@{profileHandle || "seuhandle"}</div>
              </div>
            </div>
          )}

          <button onClick={insertProfile}
            className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-sm font-medium text-white transition-colors">
            Inserir no slide
          </button>
        </div>
      )}

      {/* ── Painel de layouts ── */}
      {showLayouts && (
        <div className={`${panelBase} w-[420px]`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
              <LayoutTemplate size={14} className="text-brand-500" /> Templates de Layout
            </span>
            <button onClick={() => setShowLayouts(false)} className="text-[var(--text-3)] hover:text-[var(--text)]"><X size={16} /></button>
          </div>
          <p className="text-[11px] text-[var(--text-3)] mb-3">Reposiciona o texto e ajusta o gradiente. O conteúdo é preservado.</p>
          <div className="grid grid-cols-3 gap-2">
            {LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                onClick={() => applyLayout(layout.id)}
                className="flex flex-col gap-2 p-2 rounded-xl border border-[var(--border-2)] hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-left"
              >
                <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: "4/5" }}>
                  <div className="absolute inset-0" style={{ background: layout.photoCover }} />
                  <div className="absolute inset-0" style={{ background: layout.gradient }} />
                  {layout.textBlocks.map((block, i) => (
                    <div key={i} className="absolute rounded-sm"
                      style={{ top: block.top, left: block.left, width: block.w, height: block.h,
                        background: block.bold ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.50)" }} />
                  ))}
                  <div className="absolute bottom-1 right-1 bg-black/50 rounded px-1 py-0.5 text-[7px] text-gray-400 font-mono">
                    {layout.bgPosition.x}% {layout.bgPosition.y}%
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text)]">{layout.label}</p>
                  <p className="text-[10px] text-[var(--text-3)]">{layout.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Painel de Molduras ── */}
      {showMolds && (
        <div className={`${panelBase} w-[360px]`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
              <FrameIcon size={14} className="text-brand-500" /> Molduras
            </span>
            <button onClick={() => setShowMolds(false)} className="text-[var(--text-3)] hover:text-[var(--text)]"><X size={16} /></button>
          </div>
          <p className="text-xs text-[var(--text-3)] mb-3">Clique em uma forma para adicionar ao slide.</p>
          <div className="grid grid-cols-3 gap-2">
            {MOLD_SHAPES.map((s) => (
              <button
                key={s.id}
                onClick={() => addFrame(s.id)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--border-2)] bg-[var(--bg-3)] hover:border-brand-500/50 hover:bg-brand-500/8 transition-all group"
              >
                <svg viewBox="0 0 48 48" width={52} height={52} fill="rgba(76,110,245,0.20)" stroke="rgba(76,110,245,0.75)" strokeWidth={2} className="group-hover:fill-brand-500/35 transition-all">
                  {s.path}
                </svg>
                <span className="text-[11px] text-[var(--text-3)] group-hover:text-brand-500 transition-colors">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Painel Editar com IA ── */}
      {showEditAI && slide.backgroundImageUrl && (
        <div className={`${panelBase} w-96`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
              <Sparkles size={14} className="text-pink-400" /> Editar imagem com IA
            </span>
            <button onClick={() => setShowEditAI(false)} className="text-[var(--text-3)] hover:text-[var(--text)]"><X size={16} /></button>
          </div>

          <div className="rounded-lg overflow-hidden mb-3 border border-[var(--border-2)]" style={{ height: 120 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.backgroundImageUrl} alt="Imagem atual" className="w-full h-full object-cover" />
          </div>

          <p className="text-[11px] text-[var(--text-3)] mb-2">
            Descreva o que quer alterar. O rosto e demais elementos são preservados ao máximo pelo Gemini.
          </p>

          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="ex: ele segurando a taça da copa do mundo"
            rows={3}
            className="w-full bg-[var(--bg-3)] border border-[var(--border-2)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-pink-500 resize-none placeholder:text-[var(--text-3)]"
          />

          {editError && <p className="text-xs text-red-400 mt-1">{editError}</p>}

          <button
            onClick={editBackgroundWithAI}
            disabled={editLoading || !editPrompt.trim()}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-pink-600 hover:bg-pink-700 disabled:opacity-40 text-sm font-medium text-white transition-colors"
          >
            {editLoading ? <><Loader2 size={14} className="animate-spin" /> Editando...</> : <><Sparkles size={14} /> Aplicar edição</>}
          </button>
        </div>
      )}

      {/* ── Painel de imagem de fundo ── */}
      {slide.backgroundImageUrl && !isText && (
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border)] overflow-x-auto whitespace-nowrap scrollbar-none">
          <span className="text-xs text-[var(--text-3)] shrink-0">Imagem:</span>

          <label className="flex items-center gap-2 text-xs text-[var(--text-2)] shrink-0">
            X
            <input type="range" min={0} max={100} step={1}
              value={slide.backgroundPosition?.x ?? 50}
              onChange={(e) => onUpdate({ ...slide, backgroundPosition: { x: Number(e.target.value), y: slide.backgroundPosition?.y ?? 50 } })}
              className="w-24 accent-brand-500" />
            <span className="text-[var(--text-3)] w-6">{slide.backgroundPosition?.x ?? 50}</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-[var(--text-2)] shrink-0">
            Y
            <input type="range" min={0} max={100} step={1}
              value={slide.backgroundPosition?.y ?? 50}
              onChange={(e) => onUpdate({ ...slide, backgroundPosition: { x: slide.backgroundPosition?.x ?? 50, y: Number(e.target.value) } })}
              className="w-24 accent-brand-500" />
            <span className="text-[var(--text-3)] w-6">{slide.backgroundPosition?.y ?? 50}</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-[var(--text-2)] shrink-0">
            Zoom
            <input type="range" min={100} max={200} step={5}
              value={slide.backgroundZoom ?? 100}
              onChange={(e) => onUpdate({ ...slide, backgroundZoom: Number(e.target.value) })}
              className="w-24 accent-brand-500" />
            <span className="text-[var(--text-3)] w-8">{slide.backgroundZoom ?? 100}%</span>
          </label>

          <button
            onClick={() => onUpdate({ ...slide, backgroundPosition: { x: 50, y: 50 }, backgroundZoom: 100 })}
            className="text-xs text-[var(--text-3)] hover:text-[var(--text-2)] shrink-0 underline"
          >
            Reset
          </button>
        </div>
      )}

      {/* ── Painel de imagem IA (imagem ou moldura) ── */}
      {(isImage || isFrame) && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-[var(--border)] overflow-x-auto whitespace-nowrap scrollbar-none">
          <Wand2 size={14} className="text-brand-500 shrink-0" />
          <input
            type="text"
            value={imgElPrompt}
            onChange={(e) => setImgElPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateImageForElement()}
            placeholder="Descreva a imagem (ou deixe vazio para usar o texto do slide)..."
            className="bg-[var(--bg-3)] border border-[var(--border-2)] rounded px-2 py-1 text-xs text-[var(--text)] focus:outline-none focus:border-brand-500 w-72 placeholder:text-[var(--text-3)]"
          />
          <button
            onClick={generateImageForElement}
            disabled={imgElGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-xs font-medium shrink-0 transition-colors"
          >
            {imgElGenerating ? <><Loader2 size={12} className="animate-spin" /> Gerando...</> : <><Sparkles size={12} /> Gerar imagem com IA</>}
          </button>
        </div>
      )}

      {/* ── Painel de tipografia ── */}
      {isProfile && (
        <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--border)] overflow-x-auto whitespace-nowrap scrollbar-none">
          <span className="text-xs text-[var(--text-3)] shrink-0">Perfil</span>
          <div className="w-px h-4 bg-[var(--border-2)]" />
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer shrink-0">
            Nome:
            <input type="color"
              value={(selectedElement as any).profileNameColor ?? "#ffffff"}
              onChange={(e) => patchSelected({ profileNameColor: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer shrink-0">
            @handle:
            <input type="color"
              value={(selectedElement as any).profileHandleColor ?? "#888888"}
              onChange={(e) => patchSelected({ profileHandleColor: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
          </label>
        </div>
      )}

      {isText && s && (
        <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--border)] overflow-x-auto whitespace-nowrap scrollbar-none">
          <select value={s.fontFamily ?? "sans-serif"} onChange={(e) => { loadFont(e.target.value); patchStyle({ fontFamily: e.target.value }); }}
            className="bg-[var(--bg-3)] border border-[var(--border-2)] rounded px-2 py-1 text-xs text-[var(--text)] focus:outline-none focus:border-brand-500 max-w-[130px]" style={{ fontFamily: s.fontFamily }}>
            {FONTS.map((f) => (<option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>))}
          </select>
          <div className="flex items-center gap-1">
            <button onClick={() => patchStyle({ fontSize: Math.max(8, (s.fontSize ?? 20) - 2) })} className="w-6 h-6 flex items-center justify-center rounded bg-[var(--bg-3)] hover:bg-[var(--bg-4)] text-[var(--text)] text-sm font-bold">−</button>
            <input type="number" min={8} max={300} value={s.fontSize ?? 20} onChange={(e) => patchStyle({ fontSize: Number(e.target.value) })} className="w-14 bg-[var(--bg-3)] border border-[var(--border-2)] rounded px-1 py-1 text-xs text-center text-[var(--text)] focus:outline-none focus:border-brand-500" />
            <button onClick={() => patchStyle({ fontSize: (s.fontSize ?? 20) + 2 })} className="w-6 h-6 flex items-center justify-center rounded bg-[var(--bg-3)] hover:bg-[var(--bg-4)] text-[var(--text)] text-sm font-bold">+</button>
          </div>
          <div className="w-px h-5 bg-[var(--border-2)]" />
          <button onClick={() => patchStyle({ fontWeight: s.fontWeight === "bold" ? "normal" : "bold" })} className={`p-1.5 rounded text-sm ${s.fontWeight === "bold" ? "bg-brand-500/20 text-brand-500" : "bg-[var(--bg-3)] hover:bg-[var(--bg-4)] text-[var(--text-2)]"}`}><Bold size={14} /></button>
          {(["left", "center", "right"] as const).map((align) => {
            const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
            return (<button key={align} onClick={() => patchStyle({ textAlign: align })} className={`p-1.5 rounded ${s.textAlign === align ? "bg-brand-500/20 text-brand-500" : "bg-[var(--bg-3)] hover:bg-[var(--bg-4)] text-[var(--text-2)]"}`}><Icon size={14} /></button>);
          })}
          <div className="w-px h-5 bg-[var(--border-2)]" />
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer">Cor:<input type="color" value={s.color ?? "#ffffff"} onChange={(e) => patchStyle({ color: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" /></label>
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)]">Espaç:<input type="number" min={0.8} max={3} step={0.1} value={s.lineHeight ?? 1.4} onChange={(e) => patchStyle({ lineHeight: Number(e.target.value) })} className="w-12 bg-[var(--bg-3)] border border-[var(--border-2)] rounded px-1 py-1 text-xs text-center text-[var(--text)] focus:outline-none focus:border-brand-500" /></label>
          <div className="w-px h-5 bg-[var(--border-2)]" />
          <input type="text" value={selectedElement?.content ?? ""} onChange={(e) => patchSelected({ content: e.target.value })} placeholder="Editar texto..." className="bg-[var(--bg-3)] border border-[var(--border-2)] rounded px-2 py-1 text-xs text-[var(--text)] focus:outline-none focus:border-brand-500 w-48 placeholder:text-[var(--text-3)]" />
        </div>
      )}
    </div>
  );
}
