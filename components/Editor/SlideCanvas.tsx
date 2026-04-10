"use client";

import { useRef, useState, useCallback } from "react";
import { Slide, SlideElement } from "@/types";
import { Trash2, Layers, ArrowUp, ArrowDown, Image as ImageIcon, Scissors, Blend, Maximize2, X, RefreshCw } from "lucide-react";

interface Props {
  slide: Slide;
  onUpdate: (slide: Slide) => void;
  scale?: number;
  onSelectElement?: (el: SlideElement | null) => void;
}

type DragState = { elementId: string; startX: number; startY: number; origX: number; origY: number } | null;
type ResizeState = { elementId: string; startX: number; startY: number; origW: number; origH: number } | null;
type CropState = { elementId: string; startX: number; startY: number; handle: string; origClip: { top: number; right: number; bottom: number; left: number } } | null;

type CtxMenu = { x: number; y: number; el: SlideElement } | null;
type BgCtxMenu = { x: number; y: number } | null;

const GRADIENTS = [
  { label: "Escuro baixo",  value: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 60%)" },
  { label: "Escuro cima",   value: "linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, transparent 60%)" },
  { label: "Escuro total",  value: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.85) 100%)" },
  { label: "Roxo",          value: "linear-gradient(135deg, rgba(124,58,237,0.8) 0%, transparent 70%)" },
  { label: "Rosa",          value: "linear-gradient(135deg, rgba(236,72,153,0.8) 0%, transparent 70%)" },
  { label: "Sem degradê",   value: "" },
];

export default function SlideCanvas({ slide, onUpdate, scale = 1, onSelectElement }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu>(null);
  const [bgCtxMenu, setBgCtxMenu] = useState<BgCtxMenu>(null);
  const [cropId, setCropId] = useState<string | null>(null);
  const dragRef = useRef<DragState>(null);
  const resizeRef = useRef<ResizeState>(null);
  const cropRef = useRef<CropState>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const updateElement = useCallback((id: string, patch: Partial<SlideElement>) => {
    onUpdate({ ...slide, elements: slide.elements.map((el) => el.id === id ? { ...el, ...patch } : el) });
  }, [slide, onUpdate]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    onUpdate({ ...slide, elements: slide.elements.filter((el) => el.id !== selectedId) });
    setSelectedId(null);
    onSelectElement?.(null);
  }, [selectedId, slide, onUpdate, onSelectElement]);

  // ── Arrastar ───────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent, el: SlideElement) => {
    if (cropId === el.id) return; // em modo crop não move
    e.stopPropagation();
    setSelectedId(el.id);
    onSelectElement?.(el);

    let dragging = false;
    const holdTimer = setTimeout(() => {
      dragging = true;
      dragRef.current = { elementId: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
    }, 180);

    const onMove = (me: MouseEvent) => {
      if (!dragging || !dragRef.current) return;
      updateElement(dragRef.current.elementId, {
        x: dragRef.current.origX + (me.clientX - dragRef.current.startX) / scale,
        y: dragRef.current.origY + (me.clientY - dragRef.current.startY) / scale,
      });
    };
    const onUp = () => {
      clearTimeout(holdTimer);
      if (!dragging && el.type === "text") setEditingId(el.id);
      dragging = false;
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Resize ─────────────────────────────────────────────────
  const handleResizeDown = (e: React.MouseEvent, el: SlideElement) => {
    e.stopPropagation();
    resizeRef.current = { elementId: el.id, startX: e.clientX, startY: e.clientY, origW: el.width, origH: el.height };
    const onMove = (me: MouseEvent) => {
      if (!resizeRef.current) return;
      updateElement(resizeRef.current.elementId, {
        width: Math.max(60, resizeRef.current.origW + (me.clientX - resizeRef.current.startX) / scale),
        height: Math.max(40, resizeRef.current.origH + (me.clientY - resizeRef.current.startY) / scale),
      });
    };
    const onUp = () => { resizeRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Crop handles ───────────────────────────────────────────
  const handleCropDown = (e: React.MouseEvent, el: SlideElement, handle: string) => {
    e.stopPropagation();
    const clip = el.clipInset ?? { top: 0, right: 0, bottom: 0, left: 0 };
    cropRef.current = { elementId: el.id, startX: e.clientX, startY: e.clientY, handle, origClip: { ...clip } };
    const onMove = (me: MouseEvent) => {
      if (!cropRef.current) return;
      const dx = (me.clientX - cropRef.current.startX) / scale;
      const dy = (me.clientY - cropRef.current.startY) / scale;
      const c = { ...cropRef.current.origClip };
      const pxToPercW = (px: number) => (px / el.width) * 100;
      const pxToPercH = (px: number) => (px / el.height) * 100;
      if (handle === "top")    c.top    = Math.max(0, Math.min(80, c.top + pxToPercH(dy)));
      if (handle === "bottom") c.bottom = Math.max(0, Math.min(80, c.bottom - pxToPercH(dy)));
      if (handle === "left")   c.left   = Math.max(0, Math.min(80, c.left + pxToPercW(dx)));
      if (handle === "right")  c.right  = Math.max(0, Math.min(80, c.right - pxToPercW(dx)));
      updateElement(cropRef.current.elementId, { clipInset: c });
    };
    const onUp = () => { cropRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Context menu ───────────────────────────────────────────
  const handleContextMenu = (e: React.MouseEvent, el: SlideElement) => {
    if (el.type !== "image") return;
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    setCtxMenu({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale, el });
    setSelectedId(el.id);
  };

  const closeCtx = () => setCtxMenu(null);
  const closeBgCtx = () => setBgCtxMenu(null);

  const handleBgContextMenu = (e: React.MouseEvent) => {
    if (!slide.backgroundImageUrl) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    setBgCtxMenu({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
  };

  const removeBg = () => {
    onUpdate({ ...slide, backgroundImageUrl: undefined, backgroundGradient: undefined });
    closeBgCtx();
  };

  const setBgGradient = (gradient: string) => {
    onUpdate({ ...slide, backgroundGradient: gradient || undefined });
    setBgCtxMenu((prev) => prev); // keep menu open to allow multiple picks
  };

  const handleBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onUpdate({ ...slide, backgroundImageUrl: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    closeBgCtx();
  };

  // Ações do context menu
  const setAsBackground = (el: SlideElement) => {
    onUpdate({ ...slide, backgroundImageUrl: el.src, elements: slide.elements.filter((e) => e.id !== el.id) });
    setSelectedId(null);
    closeCtx();
  };

  const bringForward = (el: SlideElement) => {
    const idx = slide.elements.findIndex((e) => e.id === el.id);
    if (idx >= slide.elements.length - 1) { closeCtx(); return; }
    const els = [...slide.elements];
    [els[idx], els[idx + 1]] = [els[idx + 1], els[idx]];
    onUpdate({ ...slide, elements: els });
    closeCtx();
  };

  const sendBackward = (el: SlideElement) => {
    const idx = slide.elements.findIndex((e) => e.id === el.id);
    if (idx <= 0) { closeCtx(); return; }
    const els = [...slide.elements];
    [els[idx], els[idx - 1]] = [els[idx - 1], els[idx]];
    onUpdate({ ...slide, elements: els });
    closeCtx();
  };

  const enterCrop = (el: SlideElement) => {
    setCropId(el.id);
    if (!el.clipInset) updateElement(el.id, { clipInset: { top: 0, right: 0, bottom: 0, left: 0 } });
    closeCtx();
  };

  const resetCrop = (el: SlideElement) => {
    updateElement(el.id, { clipInset: { top: 0, right: 0, bottom: 0, left: 0 } });
    setCropId(null);
    closeCtx();
  };

  // ── Helpers ────────────────────────────────────────────────
  const stripHtml = (html: string) => html.replace(/<span[^>]*>(.*?)<\/span>/gi, "$1").replace(/<[^>]+>/g, "");

  const textStyle = (el: SlideElement) => {
    const s = el.style as any;
    return { fontSize: s?.fontSize ?? 20, fontWeight: s?.fontWeight ?? "normal", fontFamily: s?.fontFamily ?? "sans-serif", color: s?.color ?? "#ffffff", textAlign: (s?.textAlign ?? "left") as "left" | "center" | "right", lineHeight: s?.lineHeight ?? 1.4 };
  };

  const handleCanvasClick = () => {
    if (ctxMenu) { closeCtx(); return; }
    if (bgCtxMenu) { closeBgCtx(); return; }
    setSelectedId(null);
    setEditingId(null);
    setCropId(null);
    onSelectElement?.(null);
  };

  return (
    <div
      ref={containerRef}
      className="slide-canvas"
      style={{ width: slide.width, height: slide.height, backgroundColor: slide.backgroundColor, transform: `scale(${scale})`, transformOrigin: "top left" }}
      onClick={handleCanvasClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Fundo gerado por IA */}
      {slide.backgroundImageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.backgroundImageUrl} alt=""
            className="absolute inset-0 w-full h-full object-cover cursor-context-menu"
            style={{ objectPosition: "center top" }}
            draggable={false}
            onContextMenu={handleBgContextMenu}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: slide.backgroundGradient ?? "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.15) 100%)" }}
          />
        </>
      )}
      {/* Hidden file input for bg image replacement */}
      <input ref={bgFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgFileChange} />

      {/* Botão deletar */}
      {selectedId && !ctxMenu && (
        <div className="absolute top-3 right-3 z-50 flex gap-2">
          {cropId === selectedId && (
            <button onClick={() => { const el = slide.elements.find(e => e.id === cropId); if (el) resetCrop(el); }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium">
              Aplicar corte
            </button>
          )}
          <button onClick={deleteSelected} className="bg-red-600 hover:bg-red-700 text-white rounded-lg p-2.5" title="Deletar">
            <Trash2 size={20} />
          </button>
        </div>
      )}

      {/* Elementos */}
      {slide.elements.map((el) => {
        const clip = el.clipInset;
        const clipPath = clip ? `inset(${clip.top}% ${clip.right}% ${clip.bottom}% ${clip.left}%)` : undefined;
        const isCropping = cropId === el.id;

        return (
          <div
            key={el.id}
            className={`slide-element ${selectedId === el.id ? "selected" : ""}`}
            style={{ left: el.x, top: el.y, width: el.width, height: el.height, opacity: el.opacity ?? 1, zIndex: el.zIndex }}
            onMouseDown={(e) => handleMouseDown(e, el)}
            onContextMenu={(e) => handleContextMenu(e, el)}
          >
            {/* Texto */}
            {el.type === "text" && (
              <>
                {editingId === el.id ? (
                  <textarea autoFocus className="w-full h-full bg-transparent resize-none outline-none" style={{ ...textStyle(el), padding: 4 }}
                    value={stripHtml(el.content ?? "")} onChange={(e) => updateElement(el.id, { content: e.target.value })}
                    onBlur={() => setEditingId(null)} onClick={(e) => e.stopPropagation()} />
                ) : (
                  <div className="w-full h-full overflow-hidden" style={{ ...textStyle(el), padding: 4, whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: el.content ?? "" }} />
                )}
              </>
            )}

            {/* Imagem */}
            {el.type === "image" && el.src && (
              <div className="w-full h-full relative overflow-hidden" style={{ clipPath }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={el.src} alt="" className="w-full h-full object-cover" draggable={false} />
                {/* Degradê sobre a imagem */}
                {el.gradient && <div className="absolute inset-0 pointer-events-none" style={{ background: el.gradient }} />}

                {/* Handles de corte */}
                {isCropping && (
                  <>
                    {/* Bordas de corte visual */}
                    <div className="absolute inset-0 border-2 border-dashed border-yellow-400 pointer-events-none" />
                    {/* Handle topo */}
                    <div className="absolute left-0 right-0 flex justify-center" style={{ top: `${clip?.top ?? 0}%` }}>
                      <div className="w-12 h-3 bg-yellow-400 rounded-full cursor-ns-resize" onMouseDown={(e) => { e.stopPropagation(); handleCropDown(e, el, "top"); }} />
                    </div>
                    {/* Handle baixo */}
                    <div className="absolute left-0 right-0 flex justify-center" style={{ bottom: `${clip?.bottom ?? 0}%` }}>
                      <div className="w-12 h-3 bg-yellow-400 rounded-full cursor-ns-resize" onMouseDown={(e) => { e.stopPropagation(); handleCropDown(e, el, "bottom"); }} />
                    </div>
                    {/* Handle esquerda */}
                    <div className="absolute top-0 bottom-0 flex items-center" style={{ left: `${clip?.left ?? 0}%` }}>
                      <div className="w-3 h-12 bg-yellow-400 rounded-full cursor-ew-resize" onMouseDown={(e) => { e.stopPropagation(); handleCropDown(e, el, "left"); }} />
                    </div>
                    {/* Handle direita */}
                    <div className="absolute top-0 bottom-0 flex items-center" style={{ right: `${clip?.right ?? 0}%` }}>
                      <div className="w-3 h-12 bg-yellow-400 rounded-full cursor-ew-resize" onMouseDown={(e) => { e.stopPropagation(); handleCropDown(e, el, "right"); }} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Forma */}
            {el.type === "shape" && (
              <div className="w-full h-full" style={{ backgroundColor: (el.style as any)?.fill ?? "#a855f7", borderRadius: (el.style as any)?.borderRadius ?? 0, border: `${(el.style as any)?.strokeWidth ?? 0}px solid ${(el.style as any)?.stroke ?? "transparent"}` }} />
            )}

            {/* Handle resize */}
            {selectedId === el.id && !isCropping && (
              <div className="resize-handle" onMouseDown={(e) => { e.stopPropagation(); handleResizeDown(e, el); }} />
            )}
          </div>
        );
      })}

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="absolute z-[100] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl py-1 min-w-[200px]"
          style={{ left: Math.min(ctxMenu.x, slide.width - 220), top: Math.min(ctxMenu.y, slide.height - 320) }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#2a2a2a] flex items-center gap-2">
            <ImageIcon size={13} className="text-brand-400" />
            <span className="text-xs font-semibold text-gray-300">Editar imagem</span>
          </div>

          {/* Transparência */}
          <div className="px-3 py-2 border-b border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400 flex items-center gap-1"><Blend size={12} /> Transparência</span>
              <span className="text-xs text-white">{Math.round((1 - (ctxMenu.el.opacity ?? 1)) * 100)}%</span>
            </div>
            <input type="range" min={0} max={100} value={Math.round((1 - (ctxMenu.el.opacity ?? 1)) * 100)}
              onChange={(e) => { updateElement(ctxMenu.el.id, { opacity: 1 - Number(e.target.value) / 100 }); setCtxMenu({ ...ctxMenu, el: { ...ctxMenu.el, opacity: 1 - Number(e.target.value) / 100 } }); }}
              className="w-full accent-brand-500" />
          </div>

          {/* Degradê */}
          <div className="px-3 py-2 border-b border-[#2a2a2a]">
            <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1"><Layers size={12} /> Degradê</p>
            <div className="grid grid-cols-3 gap-1">
              {GRADIENTS.map((g) => (
                <button key={g.label}
                  onClick={() => { updateElement(ctxMenu.el.id, { gradient: g.value || null }); setCtxMenu({ ...ctxMenu, el: { ...ctxMenu.el, gradient: g.value || null } }); }}
                  className={`text-[10px] py-1 px-1.5 rounded border transition-colors ${ctxMenu.el.gradient === (g.value || null) ? "border-brand-500 bg-brand-500/20 text-white" : "border-[#333] text-gray-400 hover:border-[#555]"}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cortar */}
          <button onClick={() => enterCrop(ctxMenu.el)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a]">
            <Scissors size={13} className="text-yellow-400" /> Cortar imagem
          </button>

          {/* Camadas */}
          <div className="border-b border-[#2a2a2a]">
            <button onClick={() => bringForward(ctxMenu.el)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#2a2a2a] transition-colors">
              <ArrowUp size={13} className="text-blue-400" /> Trazer à frente
            </button>
            <button onClick={() => sendBackward(ctxMenu.el)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#2a2a2a] transition-colors">
              <ArrowDown size={13} className="text-blue-400" /> Enviar para trás
            </button>
          </div>

          {/* Definir como fundo */}
          <button onClick={() => setAsBackground(ctxMenu.el)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a]">
            <Maximize2 size={13} className="text-green-400" /> Definir como fundo do slide
          </button>

          {/* Fechar */}
          <button onClick={closeCtx} className="w-full px-3 py-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Fechar
          </button>
        </div>
      )}

      {/* Background context menu */}
      {bgCtxMenu && (
        <div
          className="absolute z-[100] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl py-1 min-w-[210px]"
          style={{ left: Math.min(bgCtxMenu.x, slide.width - 230), top: Math.min(bgCtxMenu.y, slide.height - 340) }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#2a2a2a] flex items-center gap-2">
            <ImageIcon size={13} className="text-brand-400" />
            <span className="text-xs font-semibold text-gray-300">Imagem de fundo</span>
          </div>

          {/* Degradê */}
          <div className="px-3 py-2 border-b border-[#2a2a2a]">
            <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1"><Layers size={12} /> Degradê</p>
            <div className="grid grid-cols-3 gap-1">
              {GRADIENTS.map((g) => (
                <button key={g.label}
                  onClick={() => setBgGradient(g.value)}
                  className={`text-[10px] py-1 px-1.5 rounded border transition-colors ${
                    (slide.backgroundGradient ?? "") === g.value
                      ? "border-brand-500 bg-brand-500/20 text-white"
                      : "border-[#333] text-gray-400 hover:border-[#555]"
                  }`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trocar imagem */}
          <button onClick={() => bgFileInputRef.current?.click()}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a]">
            <RefreshCw size={13} className="text-blue-400" /> Trocar imagem
          </button>

          {/* Remover fundo */}
          <button onClick={removeBg}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a]">
            <X size={13} /> Remover fundo
          </button>

          {/* Fechar */}
          <button onClick={closeBgCtx} className="w-full px-3 py-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
