"use client";

import { Type, Image as ImageIcon, Plus, Trash2, ChevronLeft, ChevronRight, Bold, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2 } from "lucide-react";
import { Slide, SlideElement } from "@/types";
import { v4 as uuid } from "uuid";
import { useRef } from "react";

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
}

export default function Toolbar({
  slide, onUpdate, onAddSlide, onDeleteSlide,
  slideIndex, totalSlides, onPrev, onNext,
  selectedElement, onUndo, onRedo, canUndo, canRedo,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const el: SlideElement = {
        id: uuid(), type: "image",
        x: 80, y: 80, width: 400, height: 300,
        src,
      };
      onUpdate({ ...slide, elements: [...slide.elements, el] });
    };
    reader.readAsDataURL(file);
  };

  const patchSelected = (patch: Partial<SlideElement>) => {
    if (!selectedElement) return;
    onUpdate({
      ...slide,
      elements: slide.elements.map((el) =>
        el.id === selectedElement.id ? { ...el, ...patch } : el
      ),
    });
  };

  const patchStyle = (stylePatch: Record<string, any>) => {
    if (!selectedElement) return;
    onUpdate({
      ...slide,
      elements: slide.elements.map((el) =>
        el.id === selectedElement.id
          ? { ...el, style: { ...(el.style as any), ...stylePatch } }
          : el
      ),
    });
  };

  const s = selectedElement?.type === "text" ? (selectedElement.style as any) : null;
  const isText = selectedElement?.type === "text";

  // Carrega Google Fonts dinamicamente
  const loadFont = (fontValue: string) => {
    const name = fontValue.match(/'([^']+)'/)?.[1];
    if (!name) return;
    const id = `gfont-${name.replace(/\s/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  };

  return (
    <div className="flex flex-col bg-[#080808] border-b border-[#161616]">
      {/* Linha principal */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        {/* Navegação */}
        <div className="flex items-center gap-1">
          <button onClick={onPrev} disabled={slideIndex === 0}
            className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-400 w-16 text-center">{slideIndex + 1} / {totalSlides}</span>
          <button onClick={onNext} disabled={slideIndex === totalSlides - 1}
            className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="w-px h-6 bg-[#2a2a2a]" />

        {/* Undo / Redo */}
        <button onClick={onUndo} disabled={!canUndo} title="Desfazer (Ctrl+Z)"
          className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white">
          <Undo2 size={16} />
        </button>
        <button onClick={onRedo} disabled={!canRedo} title="Refazer (Ctrl+Y)"
          className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white">
          <Redo2 size={16} />
        </button>

        <div className="w-px h-6 bg-[#2a2a2a]" />

        {/* Adicionar texto */}
        <button onClick={addText}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2a2a2a] hover:bg-[#333] text-sm">
          <Type size={14} /> Texto
        </button>

        {/* Upload de imagem */}
        <button onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2a2a2a] hover:bg-[#333] text-sm">
          <ImageIcon size={14} /> Imagem
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />

        <div className="w-px h-6 bg-[#2a2a2a]" />

        {/* Cor de fundo */}
        <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer">
          Fundo:
          <input type="color" value={slide.backgroundColor}
            onChange={(e) => onUpdate({ ...slide, backgroundColor: e.target.value })}
            className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
        </label>

        <div className="ml-auto flex gap-2">
          <button onClick={onAddSlide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-600 hover:bg-brand-700 text-sm font-medium">
            <Plus size={14} /> Slide
          </button>
          <button onClick={onDeleteSlide} disabled={totalSlides <= 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-900/40 hover:bg-red-900/60 text-sm disabled:opacity-30 disabled:cursor-not-allowed">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Painel de tipografia — aparece ao selecionar texto */}
      {isText && s && (
        <div className="flex items-center gap-3 px-4 py-2 border-t border-[#161616] flex-wrap">

          {/* Fonte */}
          <select
            value={s.fontFamily ?? "sans-serif"}
            onChange={(e) => { loadFont(e.target.value); patchStyle({ fontFamily: e.target.value }); }}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-500 max-w-[130px]"
            style={{ fontFamily: s.fontFamily }}
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
            ))}
          </select>

          {/* Tamanho */}
          <div className="flex items-center gap-1">
            <button onClick={() => patchStyle({ fontSize: Math.max(8, (s.fontSize ?? 20) - 2) })}
              className="w-6 h-6 flex items-center justify-center rounded bg-[#1a1a1a] hover:bg-[#2a2a2a] text-sm font-bold">−</button>
            <input
              type="number" min={8} max={300}
              value={s.fontSize ?? 20}
              onChange={(e) => patchStyle({ fontSize: Number(e.target.value) })}
              className="w-14 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1 py-1 text-xs text-center text-white focus:outline-none focus:border-brand-500"
            />
            <button onClick={() => patchStyle({ fontSize: (s.fontSize ?? 20) + 2 })}
              className="w-6 h-6 flex items-center justify-center rounded bg-[#1a1a1a] hover:bg-[#2a2a2a] text-sm font-bold">+</button>
          </div>

          <div className="w-px h-5 bg-[#2a2a2a]" />

          {/* Bold */}
          <button
            onClick={() => patchStyle({ fontWeight: s.fontWeight === "bold" ? "normal" : "bold" })}
            className={`p-1.5 rounded text-sm ${s.fontWeight === "bold" ? "bg-brand-500/20 text-brand-400" : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-400"}`}>
            <Bold size={14} />
          </button>

          {/* Alinhamento */}
          {(["left", "center", "right"] as const).map((align) => {
            const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
            return (
              <button key={align}
                onClick={() => patchStyle({ textAlign: align })}
                className={`p-1.5 rounded ${s.textAlign === align ? "bg-brand-500/20 text-brand-400" : "bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-400"}`}>
                <Icon size={14} />
              </button>
            );
          })}

          <div className="w-px h-5 bg-[#2a2a2a]" />

          {/* Cor do texto */}
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            Cor:
            <input type="color" value={s.color ?? "#ffffff"}
              onChange={(e) => patchStyle({ color: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
          </label>

          {/* Line height */}
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            Espaç:
            <input type="number" min={0.8} max={3} step={0.1}
              value={s.lineHeight ?? 1.4}
              onChange={(e) => patchStyle({ lineHeight: Number(e.target.value) })}
              className="w-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1 py-1 text-xs text-center text-white focus:outline-none focus:border-brand-500"
            />
          </label>

          {/* Editar conteúdo */}
          <div className="w-px h-5 bg-[#2a2a2a]" />
          <input
            type="text"
            value={selectedElement?.content ?? ""}
            onChange={(e) => patchSelected({ content: e.target.value })}
            placeholder="Editar texto..."
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-500 w-48"
          />
        </div>
      )}
    </div>
  );
}
