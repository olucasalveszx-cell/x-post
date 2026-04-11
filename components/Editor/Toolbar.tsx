"use client";

import { Type, Image as ImageIcon, Plus, Trash2, ChevronLeft, ChevronRight, Bold, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Wand2, UserCircle, X, BadgeCheck } from "lucide-react";
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

        {/* Gerar fundo IA */}
        <button onClick={generateBackground} disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-600/20 hover:bg-brand-600/40 border border-brand-600/30 text-brand-400 text-sm shrink-0 disabled:opacity-40 transition-colors">
          <Wand2 size={14} className={generating ? "animate-spin" : ""} />
          {generating ? "Gerando..." : "Fundo IA"}
        </button>

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
