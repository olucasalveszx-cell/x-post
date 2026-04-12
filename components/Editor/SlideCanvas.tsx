"use client";

import { useRef, useState, useCallback } from "react";
import { Slide, SlideElement } from "@/types";
import { Trash2, Layers, ArrowUp, ArrowDown, Image as ImageIcon, Scissors, Blend, Maximize2, X, RefreshCw, Wand2 } from "lucide-react";

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
  const [generatingBg, setGeneratingBg] = useState(false);
  const dragRef = useRef<DragState>(null);
  const resizeRef = useRef<ResizeState>(null);
  const cropRef = useRef<CropState>(null);
  const menuDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
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

  // ── Touch: arrastar + pinch-to-zoom ───────────────────────
  const handleTouchStart = (e: React.TouchEvent, el: SlideElement) => {
    if (cropId === el.id) return;
    e.stopPropagation();

    setSelectedId(el.id);
    onSelectElement?.(el);

    // Dois dedos → escalar (pinch-to-zoom)
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const startDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const origW = el.width;
      const origH = el.height;

      const onMove = (te: TouchEvent) => {
        if (te.touches.length < 2) return;
        te.preventDefault();
        const a = te.touches[0];
        const b = te.touches[1];
        const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
        const ratio = dist / startDist;
        updateElement(el.id, {
          width: Math.max(60, origW * ratio),
          height: Math.max(40, origH * ratio),
        });
      };
      const onEnd = () => {
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
      return;
    }

    // Um dedo → arrastar
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    let dragging = false;

    const onMove = (te: TouchEvent) => {
      if (te.touches.length >= 2) return; // ignorar se virou pinch
      const t = te.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (!dragging && Math.sqrt(dx * dx + dy * dy) > 6) {
        dragging = true;
        dragRef.current = { elementId: el.id, startX, startY, origX: el.x, origY: el.y };
      }
      if (dragging && dragRef.current) {
        te.preventDefault();
        updateElement(dragRef.current.elementId, {
          x: dragRef.current.origX + dx / scale,
          y: dragRef.current.origY + dy / scale,
        });
      }
    };
    const onEnd = () => {
      if (!dragging && el.type === "text") setEditingId(el.id);
      dragging = false;
      dragRef.current = null;
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  };

  // ── Touch: resize ──────────────────────────────────────────
  const handleResizeTouchStart = (e: React.TouchEvent, el: SlideElement) => {
    e.stopPropagation();
    const touch = e.touches[0];
    resizeRef.current = { elementId: el.id, startX: touch.clientX, startY: touch.clientY, origW: el.width, origH: el.height };
    const onMove = (te: TouchEvent) => {
      if (!resizeRef.current) return;
      te.preventDefault();
      const t = te.touches[0];
      updateElement(resizeRef.current.elementId, {
        width: Math.max(60, resizeRef.current.origW + (t.clientX - resizeRef.current.startX) / scale),
        height: Math.max(40, resizeRef.current.origH + (t.clientY - resizeRef.current.startY) / scale),
      });
    };
    const onEnd = () => {
      resizeRef.current = null;
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  };

  // ── Touch: crop handles ────────────────────────────────────
  const handleCropTouchStart = (e: React.TouchEvent, el: SlideElement, handle: string) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const clip = el.clipInset ?? { top: 0, right: 0, bottom: 0, left: 0 };
    cropRef.current = { elementId: el.id, startX: touch.clientX, startY: touch.clientY, handle, origClip: { ...clip } };
    const onMove = (te: TouchEvent) => {
      if (!cropRef.current) return;
      te.preventDefault();
      const t = te.touches[0];
      const dx = (t.clientX - cropRef.current.startX) / scale;
      const dy = (t.clientY - cropRef.current.startY) / scale;
      const c = { ...cropRef.current.origClip };
      const pxToPercW = (px: number) => (px / el.width) * 100;
      const pxToPercH = (px: number) => (px / el.height) * 100;
      if (handle === "top")    c.top    = Math.max(0, Math.min(80, c.top + pxToPercH(dy)));
      if (handle === "bottom") c.bottom = Math.max(0, Math.min(80, c.bottom - pxToPercH(dy)));
      if (handle === "left")   c.left   = Math.max(0, Math.min(80, c.left + pxToPercW(dx)));
      if (handle === "right")  c.right  = Math.max(0, Math.min(80, c.right - pxToPercW(dx)));
      updateElement(cropRef.current.elementId, { clipInset: c });
    };
    const onEnd = () => {
      cropRef.current = null;
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
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

  // ── Arrastar menus de contexto ─────────────────────────────
  const startMenuDrag = (
    e: React.MouseEvent | React.TouchEvent,
    getPos: () => { x: number; y: number },
    setPos: (x: number, y: number) => void,
  ) => {
    e.stopPropagation();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = getPos();
    menuDragRef.current = { startX: clientX, startY: clientY, origX: x, origY: y };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!menuDragRef.current) return;
      const cx = "touches" in ev ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX;
      const cy = "touches" in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
      setPos(
        menuDragRef.current.origX + (cx - menuDragRef.current.startX) / scale,
        menuDragRef.current.origY + (cy - menuDragRef.current.startY) / scale,
      );
    };
    const onUp = () => {
      menuDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  };

  const handleBgContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    setBgCtxMenu({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
  };

  const removeBg = () => {
    onUpdate({ ...slide, backgroundImageUrl: undefined, backgroundGradient: undefined });
    closeBgCtx();
  };

  const generateBg = async () => {
    closeBgCtx();
    const texts = slide.elements
      .filter((e) => e.type === "text")
      .map((e) => (e.content ?? "").replace(/<[^>]+>/g, "").trim())
      .filter(Boolean)
      .join(". ");
    const prompt = texts || "modern dark cinematic professional background";
    setGeneratingBg(true);
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
    finally { setGeneratingBg(false); }
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
      onContextMenu={handleBgContextMenu}
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
        const isSelected = selectedId === el.id;

        // Tamanhos escalonados: N px na tela independente do zoom do canvas
        const S = 1 / scale;
        const hW = Math.round(70 * S);   // largura do handle de crop (70px na tela)
        const hT = Math.round(22 * S);   // espessura do handle de crop (22px na tela)
        const rS = Math.round(22 * S);   // tamanho do handle de resize (22px na tela)
        const oW = Math.round(2.5 * S);  // espessura da borda de seleção (2.5px na tela)

        return (
          <div
            key={el.id}
            className="slide-element"
            style={{
              left: el.x, top: el.y, width: el.width, height: el.height,
              opacity: el.opacity ?? 1, zIndex: el.zIndex, touchAction: "none",
              ...(isSelected ? { outline: `${oW}px solid #a855f7`, outlineOffset: `${Math.round(2 * S)}px` } : {}),
            }}
            onMouseDown={(e) => handleMouseDown(e, el)}
            onTouchStart={(e) => handleTouchStart(e, el)}
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

                {/* Handles de corte — tamanho escalonado para mobile */}
                {isCropping && (
                  <>
                    <div className="absolute inset-0 pointer-events-none" style={{ border: `${Math.round(2 * S)}px dashed #facc15` }} />
                    {/* Topo */}
                    <div style={{ position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center", top: `${clip?.top ?? 0}%`, transform: "translateY(-50%)", zIndex: 10 }}>
                      <div style={{ width: hW, height: hT, background: "#facc15", borderRadius: 9999, cursor: "ns-resize" }}
                        onMouseDown={(e) => { e.stopPropagation(); handleCropDown(e, el, "top"); }}
                        onTouchStart={(e) => { e.stopPropagation(); handleCropTouchStart(e, el, "top"); }} />
                    </div>
                    {/* Baixo */}
                    <div style={{ position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center", bottom: `${clip?.bottom ?? 0}%`, transform: "translateY(50%)", zIndex: 10 }}>
                      <div style={{ width: hW, height: hT, background: "#facc15", borderRadius: 9999, cursor: "ns-resize" }}
                        onMouseDown={(e) => { e.stopPropagation(); handleCropDown(e, el, "bottom"); }}
                        onTouchStart={(e) => { e.stopPropagation(); handleCropTouchStart(e, el, "bottom"); }} />
                    </div>
                    {/* Esquerda */}
                    <div style={{ position: "absolute", top: 0, bottom: 0, display: "flex", alignItems: "center", left: `${clip?.left ?? 0}%`, transform: "translateX(-50%)", zIndex: 10 }}>
                      <div style={{ width: hT, height: hW, background: "#facc15", borderRadius: 9999, cursor: "ew-resize" }}
                        onMouseDown={(e) => { e.stopPropagation(); handleCropDown(e, el, "left"); }}
                        onTouchStart={(e) => { e.stopPropagation(); handleCropTouchStart(e, el, "left"); }} />
                    </div>
                    {/* Direita */}
                    <div style={{ position: "absolute", top: 0, bottom: 0, display: "flex", alignItems: "center", right: `${clip?.right ?? 0}%`, transform: "translateX(50%)", zIndex: 10 }}>
                      <div style={{ width: hT, height: hW, background: "#facc15", borderRadius: 9999, cursor: "ew-resize" }}
                        onMouseDown={(e) => { e.stopPropagation(); handleCropDown(e, el, "right"); }}
                        onTouchStart={(e) => { e.stopPropagation(); handleCropTouchStart(e, el, "right"); }} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Forma */}
            {el.type === "shape" && (
              <div className="w-full h-full" style={{ backgroundColor: (el.style as any)?.fill ?? "#a855f7", borderRadius: (el.style as any)?.borderRadius ?? 0, border: `${(el.style as any)?.strokeWidth ?? 0}px solid ${(el.style as any)?.stroke ?? "transparent"}` }} />
            )}

            {/* Perfil */}
            {el.type === "profile" && (
              <div className="w-full h-full flex items-center" style={{ gap: el.height * 0.18 }}>
                {/* Avatar circular */}
                <div style={{ width: el.height * 0.72, height: el.height * 0.72, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: `${el.height * 0.025}px solid rgba(255,255,255,0.25)`, background: "#333" }}>
                  {el.src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={el.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
                  )}
                </div>
                {/* Textos */}
                <div style={{ display: "flex", flexDirection: "column", gap: el.height * 0.05 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: el.height * 0.1 }}>
                    <span style={{ fontSize: el.height * 0.28, fontWeight: 700, color: "#fff", lineHeight: 1, whiteSpace: "nowrap" }}>
                      {el.profileName || "Seu nome"}
                    </span>
                    {el.profileVerified && (
                      <svg width={el.height * 0.26} height={el.height * 0.26} viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="12" fill="#1d9bf0" />
                        <path d="M6 12l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: el.height * 0.22, color: "rgba(255,255,255,0.55)", lineHeight: 1, whiteSpace: "nowrap" }}>
                    @{el.profileHandle || "seuhandle"}
                  </span>
                </div>
              </div>
            )}

            {/* Handle resize — escalonado para mobile */}
            {isSelected && !isCropping && (
              <div
                style={{ position: "absolute", width: rS, height: rS, background: "#a855f7", border: `${Math.max(1, Math.round(1.5 * S))}px solid white`, borderRadius: "50%", cursor: "se-resize", bottom: -Math.round(rS / 2), right: -Math.round(rS / 2), zIndex: 10, touchAction: "none" }}
                onMouseDown={(e) => { e.stopPropagation(); handleResizeDown(e, el); }}
                onTouchStart={(e) => { e.stopPropagation(); handleResizeTouchStart(e, el); }}
              />
            )}
          </div>
        );
      })}

      {/* Context menu — scale invertido para aparecer no tamanho real na tela */}
      {ctxMenu && (
        <div
          className="absolute z-[100] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl py-1.5 min-w-[260px]"
          style={{
            left: Math.min(ctxMenu.x, slide.width - 290 / scale),
            top: Math.min(ctxMenu.y, slide.height - 430 / scale),
            transform: `scale(${1 / scale})`,
            transformOrigin: "top left",
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Header — arrastar menu */}
          <div className="px-4 py-2.5 border-b border-[#2a2a2a] flex items-center gap-2 cursor-move select-none"
            onMouseDown={(e) => startMenuDrag(e, () => ({ x: ctxMenu!.x, y: ctxMenu!.y }), (x, y) => setCtxMenu(m => m ? { ...m, x, y } : null))}
            onTouchStart={(e) => startMenuDrag(e, () => ({ x: ctxMenu!.x, y: ctxMenu!.y }), (x, y) => setCtxMenu(m => m ? { ...m, x, y } : null))}>
            <ImageIcon size={15} className="text-brand-400" />
            <span className="text-sm font-semibold text-gray-300">Editar imagem</span>
          </div>

          {/* Transparência */}
          <div className="px-4 py-2.5 border-b border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-gray-400 flex items-center gap-1.5"><Blend size={14} /> Transparência</span>
              <span className="text-sm text-white font-medium">{Math.round((1 - (ctxMenu.el.opacity ?? 1)) * 100)}%</span>
            </div>
            <input type="range" min={0} max={100} value={Math.round((1 - (ctxMenu.el.opacity ?? 1)) * 100)}
              onChange={(e) => { updateElement(ctxMenu.el.id, { opacity: 1 - Number(e.target.value) / 100 }); setCtxMenu({ ...ctxMenu, el: { ...ctxMenu.el, opacity: 1 - Number(e.target.value) / 100 } }); }}
              className="w-full accent-brand-500" />
          </div>

          {/* Degradê */}
          <div className="px-4 py-2.5 border-b border-[#2a2a2a]">
            <p className="text-sm text-gray-400 mb-2 flex items-center gap-1.5"><Layers size={14} /> Degradê</p>
            <div className="grid grid-cols-3 gap-1.5">
              {GRADIENTS.map((g) => (
                <button key={g.label}
                  onClick={() => { updateElement(ctxMenu.el.id, { gradient: g.value || null }); setCtxMenu({ ...ctxMenu, el: { ...ctxMenu.el, gradient: g.value || null } }); }}
                  className={`text-xs py-1.5 px-2 rounded border transition-colors ${ctxMenu.el.gradient === (g.value || null) ? "border-brand-500 bg-brand-500/20 text-white" : "border-[#333] text-gray-400 hover:border-[#555]"}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cortar */}
          <button onClick={() => enterCrop(ctxMenu.el)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a]">
            <Scissors size={15} className="text-yellow-400" /> Cortar imagem
          </button>

          {/* Camadas */}
          <div className="border-b border-[#2a2a2a]">
            <button onClick={() => bringForward(ctxMenu.el)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a2a2a] transition-colors">
              <ArrowUp size={15} className="text-blue-400" /> Trazer à frente
            </button>
            <button onClick={() => sendBackward(ctxMenu.el)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a2a2a] transition-colors">
              <ArrowDown size={15} className="text-blue-400" /> Enviar para trás
            </button>
          </div>

          {/* Definir como fundo */}
          <button onClick={() => setAsBackground(ctxMenu.el)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a]">
            <Maximize2 size={15} className="text-green-400" /> Definir como fundo do slide
          </button>

          {/* Fechar */}
          <button onClick={closeCtx} className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-400 transition-colors">
            Fechar
          </button>
        </div>
      )}

      {/* Background context menu — scale invertido */}
      {bgCtxMenu && (
        <div
          className="absolute z-[100] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl py-1.5 min-w-[260px]"
          style={{
            left: Math.min(bgCtxMenu.x, slide.width - 290 / scale),
            top: Math.min(bgCtxMenu.y, slide.height - 370 / scale),
            transform: `scale(${1 / scale})`,
            transformOrigin: "top left",
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Header — arrastar menu */}
          <div className="px-4 py-2.5 border-b border-[#2a2a2a] flex items-center gap-2 cursor-move select-none"
            onMouseDown={(e) => startMenuDrag(e, () => ({ x: bgCtxMenu!.x, y: bgCtxMenu!.y }), (x, y) => setBgCtxMenu(m => m ? { ...m, x, y } : null))}
            onTouchStart={(e) => startMenuDrag(e, () => ({ x: bgCtxMenu!.x, y: bgCtxMenu!.y }), (x, y) => setBgCtxMenu(m => m ? { ...m, x, y } : null))}>
            <ImageIcon size={15} className="text-brand-400" />
            <span className="text-sm font-semibold text-gray-300">Imagem de fundo</span>
          </div>

          {/* Degradê — só quando tem imagem */}
          {slide.backgroundImageUrl && (
            <div className="px-4 py-2.5 border-b border-[#2a2a2a]">
              <p className="text-sm text-gray-400 mb-2 flex items-center gap-1.5"><Layers size={14} /> Degradê</p>
              <div className="grid grid-cols-3 gap-1.5">
                {GRADIENTS.map((g) => (
                  <button key={g.label}
                    onClick={() => setBgGradient(g.value)}
                    className={`text-xs py-1.5 px-2 rounded border transition-colors ${
                      (slide.backgroundGradient ?? "") === g.value
                        ? "border-brand-500 bg-brand-500/20 text-white"
                        : "border-[#333] text-gray-400 hover:border-[#555]"
                    }`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Gerar imagem IA */}
          <button onClick={generateBg}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-400 hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a]">
            <Wand2 size={15} /> {slide.backgroundImageUrl ? "Gerar nova imagem IA" : "Gerar imagem de fundo com IA"}
          </button>

          {/* Adicionar / Trocar imagem */}
          <button onClick={() => bgFileInputRef.current?.click()}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a]">
            <RefreshCw size={15} className="text-blue-400" /> {slide.backgroundImageUrl ? "Trocar imagem" : "Adicionar imagem de fundo"}
          </button>

          {/* Remover fundo — só quando tem imagem */}
          {slide.backgroundImageUrl && (
            <button onClick={removeBg}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a]">
              <X size={15} /> Remover fundo
            </button>
          )}

          {/* Fechar */}
          <button onClick={closeBgCtx} className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-400 transition-colors">
            Fechar
          </button>
        </div>
      )}

      {/* Loading overlay ao gerar fundo */}
      {generatingBg && (
        <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-sm text-gray-300 font-medium">Gerando imagem...</span>
        </div>
      )}
    </div>
  );
}
