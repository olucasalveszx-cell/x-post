"use client";

import { useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Slide, SlideElement } from "@/types";
import { Trash2, Layers, ArrowUp, ArrowDown, Image as ImageIcon, Scissors, Blend, Maximize2, X, RefreshCw, Wand2, Square, MoreVertical, LayoutTemplate, Video as VideoIcon, Upload } from "lucide-react";
import { v4 as uuid } from "uuid";

interface Props {
  slide: Slide;
  onUpdate: (slide: Slide) => void;
  scale?: number;
  onSelectElement?: (el: SlideElement | null) => void;
  isActive?: boolean;
}

type DragState = { elementId: string; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number } | null;
type ResizeState = { elementId: string; startX: number; startY: number; origW: number; origH: number } | null;
type CropState = { elementId: string; startX: number; startY: number; handle: string; origClip: { top: number; right: number; bottom: number; left: number } } | null;

type CtxMenu = { x: number; y: number; el: SlideElement } | null;
type BgCtxMenu = { x: number; y: number; mobile?: boolean } | null;
type FrameCtxMenu = { x: number; y: number; el: SlideElement; mobile?: boolean } | null;

const FRAME_CLIP: Record<string, { clip?: string; radius?: string }> = {
  circle:   { radius: "50%" },
  rounded:  { radius: "14%" },
  rect:     {},
  squircle: { radius: "28%" },
  arch:     { radius: "50% 50% 0 0 / 60% 60% 0 0" },
  diamond:  { clip: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" },
  hexagon:  { clip: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" },
  triangle: { clip: "polygon(50% 0%, 0% 100%, 100% 100%)" },
  star:     { clip: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" },
};

const GRADIENTS = [
  { label: "Escuro baixo",  value: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 60%)" },
  { label: "Escuro cima",   value: "linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, transparent 60%)" },
  { label: "Escuro total",  value: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.85) 100%)" },
  { label: "Roxo",          value: "linear-gradient(135deg, rgba(59,91,219,0.8) 0%, transparent 70%)" },
  { label: "Rosa",          value: "linear-gradient(135deg, rgba(236,72,153,0.8) 0%, transparent 70%)" },
  { label: "Sem degradê",   value: "" },
];

export default function SlideCanvas({ slide, onUpdate, scale = 1, onSelectElement, isActive = false }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu>(null);
  const [bgCtxMenu, setBgCtxMenu] = useState<BgCtxMenu>(null);
  const [cropId, setCropId] = useState<string | null>(null);
  const [isCroppingBg, setIsCroppingBg] = useState(false);
  const [generatingBg, setGeneratingBg] = useState(false);
  const [showThemeInput, setShowThemeInput] = useState(false);
  const [themeValue, setThemeValue] = useState("");
  const [frameCtxMenu, setFrameCtxMenu] = useState<FrameCtxMenu>(null);
  const [loadingFrames, setLoadingFrames] = useState<Set<string>>(new Set());
  const [framePendingId, setFramePendingId] = useState<string | null>(null);
  const [framePanId, setFramePanId] = useState<string | null>(null);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const dragRef = useRef<DragState>(null);
  const framePanRef = useRef<{ elementId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<ResizeState>(null);
  const cropRef = useRef<CropState>(null);
  const bgCropRef = useRef<{ startX: number; startY: number; handle: string; origClip: { top: number; right: number; bottom: number; left: number } } | null>(null);
  const menuDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const frameFileInputRef = useRef<HTMLInputElement>(null);

  const applyLayout = useCallback((variant: 0 | 1 | 2 | 3 | 4 | 5) => {
    const W = slide.width, H = slide.height;
    const texts = slide.elements
      .filter((e) => e.type === "text")
      .sort((a, b) => ((b.style as any)?.fontSize ?? 0) - ((a.style as any)?.fontSize ?? 0));
    const titleEl  = texts[0];
    const bodyEl   = texts[1];
    const auxTexts = texts.slice(2); // swipe indicators, footnotes, etc.
    const titleText = titleEl?.content ?? "";
    const bodyText  = bodyEl?.content  ?? "";
    const titleStyle = titleEl?.style ?? { fontSize: 80, fontWeight: "bold", fontFamily: "sans-serif", color: "#ffffff", textAlign: "center", lineHeight: 1.05 };
    const bodyStyle  = bodyEl?.style  ?? { fontSize: 28, fontWeight: "normal", fontFamily: "sans-serif", color: "rgba(255,255,255,0.72)", textAlign: "center", lineHeight: 1.45 };
    const imgEl  = slide.elements.find((e) => e.type === "image");
    const imgUrl = slide.backgroundImageUrl || (imgEl as any)?.src || null;

    const useBg  = variant <= 1;
    const elements: any[] = [];

    let gradient = "";
    let titleY: number, titleH = 280, bodyY: number, bodyH = 110;
    let tAlign: "left" | "center" | "right" = "center";
    let bAlign: "left" | "center" | "right" = "center";
    let elImgId: string | undefined;

    if (variant === 0) {
      gradient = "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.97) 28%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.1) 72%, rgba(0,0,0,0) 100%)";
      titleY = H - 510; bodyY = H - 192;
    } else if (variant === 1) {
      gradient = "linear-gradient(180deg, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.14) 30%, rgba(0,0,0,0.14) 55%, rgba(0,0,0,0.93) 100%)";
      titleY = Math.round(H * 0.28); titleH = 300; tAlign = "left";
      bodyY = Math.min(titleY + 310, H - 210);
      elements.push({ id: uuid(), type: "shape" as const, x: 60, y: titleY - 28, width: 56, height: 6, content: "",
        style: { fill: "#4c6ef5", stroke: "transparent", strokeWidth: 0, borderRadius: 3 } });
    } else if (variant === 2) {
      elImgId = uuid();
      titleY = 110; tAlign = "left"; titleH = 230; bodyY = 360; bodyH = 130; bAlign = "left";
      elements.push({ id: elImgId, type: "image" as const, x: 60, y: 510, width: W - 120, height: 660, src: imgUrl ?? undefined, imageObjectPositionY: 25 });
    } else if (variant === 3) {
      elImgId = uuid();
      titleY = 110; tAlign = "left"; titleH = 210; bodyY = 340; bodyH = 110; bAlign = "left";
      elements.push({ id: elImgId, type: "image" as const, x: 60, y: 470, width: W - 120, height: 700, src: imgUrl ?? undefined, imageObjectPositionY: 25 });
    } else if (variant === 4) {
      elImgId = uuid();
      const sqSize = Math.round(W * 0.72); const sqX = Math.round((W - sqSize) / 2); const sqY = Math.round(H * 0.3);
      titleY = 90; titleH = 200; bodyY = sqY + sqSize + 40; bodyH = 130;
      elements.push({ id: elImgId, type: "image" as const, x: sqX, y: sqY, width: sqSize, height: sqSize, src: imgUrl ?? undefined, imageObjectPositionY: 50 });
    } else {
      elImgId = uuid();
      const imgH = Math.round(H * 0.5);
      titleY = imgH + 60; tAlign = "left"; titleH = 220; bodyY = titleY + 230; bodyH = 120; bAlign = "left";
      elements.push({ id: elImgId, type: "image" as const, x: 0, y: 0, width: W, height: imgH, src: imgUrl ?? undefined, imageObjectPositionY: 40 });
    }

    elements.push({ id: uuid(), type: "text" as const, x: 60, y: titleY, width: W - 120, height: titleH,
      content: titleText, style: { ...(titleStyle as any), textAlign: tAlign } });
    if (bodyText) {
      elements.push({ id: uuid(), type: "text" as const, x: 60, y: bodyY, width: W - 120, height: bodyH,
        content: bodyText, style: { ...(bodyStyle as any), textAlign: bAlign } });
    }

    // Preserva textos auxiliares (ex: "arrasta →", "salva ❤️") na posição original
    elements.push(...auxTexts);

    onUpdate({
      ...slide,
      backgroundImageUrl: useBg ? (imgUrl ?? undefined) : undefined,
      backgroundGradient: useBg && gradient ? gradient : undefined,
      elements,
    });
    setShowLayoutPicker(false);
    closeBgCtx();
  }, [slide, onUpdate]);

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
    if (cropId === el.id) return;
    e.stopPropagation();

    const wasSelected = selectedId === el.id;
    setSelectedId(el.id);
    onSelectElement?.(el);

    // Primeiro clique apenas seleciona; só arrasta se já estava selecionado
    if (!wasSelected) return;

    let dragging = false;
    const holdTimer = setTimeout(() => {
      dragging = true;
      dragRef.current = { elementId: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, origW: el.width, origH: el.height };
    }, 150);

    const onMove = (me: MouseEvent) => {
      if (!dragging || !dragRef.current) return;
      const d = dragRef.current;
      updateElement(d.elementId, {
        x: Math.max(0, Math.min(slide.width  - d.origW, d.origX + (me.clientX - d.startX) / scale)),
        y: Math.max(0, Math.min(slide.height - d.origH, d.origY + (me.clientY - d.startY) / scale)),
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
    const origFontSize = el.type === "text" ? ((el.style as any)?.fontSize ?? 0) : 0;
    resizeRef.current = { elementId: el.id, startX: e.clientX, startY: e.clientY, origW: el.width, origH: el.height };
    const onMove = (me: MouseEvent) => {
      if (!resizeRef.current) return;
      const newW = Math.max(60, resizeRef.current.origW + (me.clientX - resizeRef.current.startX) / scale);
      const newH = Math.max(40, resizeRef.current.origH + (me.clientY - resizeRef.current.startY) / scale);
      const patch: Partial<SlideElement> = { width: newW, height: newH };
      if (origFontSize > 0) {
        const ratio = Math.sqrt(newW * newH) / Math.sqrt(resizeRef.current.origW * resizeRef.current.origH);
        patch.style = { ...(el.style as any), fontSize: Math.max(8, Math.round(origFontSize * ratio)) };
      }
      updateElement(resizeRef.current.elementId, patch);
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

    const wasSelected = selectedId === el.id;
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
      const origFontSize = el.type === "text" ? ((el.style as any)?.fontSize ?? 0) : 0;

      const onMove = (te: TouchEvent) => {
        if (te.touches.length < 2) return;
        te.preventDefault();
        const a = te.touches[0];
        const b = te.touches[1];
        const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
        const ratio = dist / startDist;
        const patch: Partial<SlideElement> = {
          width: Math.max(60, origW * ratio),
          height: Math.max(40, origH * ratio),
        };
        if (origFontSize > 0) {
          patch.style = { ...(el.style as any), fontSize: Math.max(8, Math.round(origFontSize * ratio)) };
        }
        updateElement(el.id, patch);
      };
      const onEnd = () => {
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
      return;
    }

    // Um dedo → arrastar (só se já estava selecionado)
    if (!wasSelected) return;

    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    let dragging = false;

    const onMove = (te: TouchEvent) => {
      if (te.touches.length >= 2) return;
      const t = te.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (!dragging && Math.sqrt(dx * dx + dy * dy) > 12) {
        dragging = true;
        dragRef.current = { elementId: el.id, startX, startY, origX: el.x, origY: el.y, origW: el.width, origH: el.height };
      }
      if (dragging && dragRef.current) {
        te.preventDefault();
        const d = dragRef.current;
        updateElement(d.elementId, {
          x: Math.max(0, Math.min(slide.width  - d.origW, d.origX + dx / scale)),
          y: Math.max(0, Math.min(slide.height - d.origH, d.origY + dy / scale)),
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
    const origFontSize = el.type === "text" ? ((el.style as any)?.fontSize ?? 0) : 0;
    resizeRef.current = { elementId: el.id, startX: touch.clientX, startY: touch.clientY, origW: el.width, origH: el.height };
    const onMove = (te: TouchEvent) => {
      if (!resizeRef.current) return;
      te.preventDefault();
      const t = te.touches[0];
      const newW = Math.max(60, resizeRef.current.origW + (t.clientX - resizeRef.current.startX) / scale);
      const newH = Math.max(40, resizeRef.current.origH + (t.clientY - resizeRef.current.startY) / scale);
      const patch: Partial<SlideElement> = { width: newW, height: newH };
      if (origFontSize > 0) {
        const ratio = Math.sqrt(newW * newH) / Math.sqrt(resizeRef.current.origW * resizeRef.current.origH);
        patch.style = { ...(el.style as any), fontSize: Math.max(8, Math.round(origFontSize * ratio)) };
      }
      updateElement(resizeRef.current.elementId, patch);
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
    dragScale = scale,
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
        menuDragRef.current.origX + (cx - menuDragRef.current.startX) / dragScale,
        menuDragRef.current.origY + (cy - menuDragRef.current.startY) / dragScale,
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
    setBgCtxMenu({ x: e.clientX, y: e.clientY });
  };

  const removeBg = () => {
    onUpdate({ ...slide, backgroundImageUrl: undefined, backgroundGradient: undefined, backgroundCrop: undefined });
    closeBgCtx();
  };

  const enterBgCrop = () => {
    closeBgCtx();
    if (!slide.backgroundCrop) {
      onUpdate({ ...slide, backgroundCrop: { top: 0, right: 0, bottom: 0, left: 0 } });
    }
    setIsCroppingBg(true);
  };

  const resetBgCrop = () => {
    onUpdate({ ...slide, backgroundCrop: { top: 0, right: 0, bottom: 0, left: 0 } });
  };

  const applyBgCrop = () => {
    setIsCroppingBg(false);
  };

  // ── Mouse: bg crop handles ─────────────────────────────────
  const handleBgCropDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    const clip = slide.backgroundCrop ?? { top: 0, right: 0, bottom: 0, left: 0 };
    bgCropRef.current = { startX: e.clientX, startY: e.clientY, handle, origClip: { ...clip } };
    const onMove = (me: MouseEvent) => {
      if (!bgCropRef.current) return;
      const dx = (me.clientX - bgCropRef.current.startX) / scale;
      const dy = (me.clientY - bgCropRef.current.startY) / scale;
      const c = { ...bgCropRef.current.origClip };
      const pxW = (px: number) => Math.max(0, Math.min(80, (px / slide.width)  * 100));
      const pxH = (px: number) => Math.max(0, Math.min(80, (px / slide.height) * 100));
      if (handle === "top")    c.top    = pxH(c.top    * slide.height / 100 + dy);
      if (handle === "bottom") c.bottom = pxH(c.bottom * slide.height / 100 - dy);
      if (handle === "left")   c.left   = pxW(c.left   * slide.width  / 100 + dx);
      if (handle === "right")  c.right  = pxW(c.right  * slide.width  / 100 - dx);
      onUpdate({ ...slide, backgroundCrop: c });
    };
    const onUp = () => { bgCropRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Touch: bg crop handles ─────────────────────────────────
  const handleBgCropTouchStart = (e: React.TouchEvent, handle: string) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const clip = slide.backgroundCrop ?? { top: 0, right: 0, bottom: 0, left: 0 };
    bgCropRef.current = { startX: touch.clientX, startY: touch.clientY, handle, origClip: { ...clip } };
    const onMove = (te: TouchEvent) => {
      if (!bgCropRef.current) return;
      te.preventDefault();
      const t = te.touches[0];
      const dx = (t.clientX - bgCropRef.current.startX) / scale;
      const dy = (t.clientY - bgCropRef.current.startY) / scale;
      const c = { ...bgCropRef.current.origClip };
      const pxW = (px: number) => Math.max(0, Math.min(80, (px / slide.width)  * 100));
      const pxH = (px: number) => Math.max(0, Math.min(80, (px / slide.height) * 100));
      if (handle === "top")    c.top    = pxH(c.top    * slide.height / 100 + dy);
      if (handle === "bottom") c.bottom = pxH(c.bottom * slide.height / 100 - dy);
      if (handle === "left")   c.left   = pxW(c.left   * slide.width  / 100 + dx);
      if (handle === "right")  c.right  = pxW(c.right  * slide.width  / 100 - dx);
      onUpdate({ ...slide, backgroundCrop: c });
    };
    const onUp = () => { bgCropRef.current = null; window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onUp); };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  };

  const slideTexts = slide.elements
    .filter((e) => e.type === "text")
    .map((e) => (e.content ?? "").replace(/<[^>]+>/g, "").trim())
    .filter(Boolean)
    .join(". ");

  const runGenerateBg = async (prompt: string) => {
    setGeneratingBg(true);
    setShowThemeInput(false);
    try {
      const customerId = localStorage.getItem("xpz_customer_id") ?? undefined;
      const activationToken = localStorage.getItem("xpz_activation_token") ?? undefined;
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, imageStyle: "gemini", customerId, activationToken }),
      });
      const data = await res.json();
      console.log("[generateBg] fonte:", data.source, "| plano:", data.plan, "| erro:", data.error);
      if (data.imageUrl) onUpdate({ ...slide, backgroundImageUrl: data.imageUrl });
      else if (data.error) console.error("[generateBg] falhou:", data.error);
    } catch (err) { console.error("[generateBg] exception:", err); }
    finally { setGeneratingBg(false); }
  };

  const generateBg = () => {
    closeBgCtx();
    setThemeValue(slideTexts.slice(0, 120));
    setShowThemeInput(true);
  };

  const setBgGradient = (gradient: string) => {
    onUpdate({ ...slide, backgroundGradient: gradient || undefined });
    setBgCtxMenu((prev) => prev); // keep menu open to allow multiple picks
  };

  const generateFrameImage = async (frameEl: SlideElement) => {
    setFrameCtxMenu(null);
    const prompt = slideTexts || "professional lifestyle photography, vibrant colors, high quality";
    setLoadingFrames((s) => new Set(s).add(frameEl.id));
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, imageStyle: "gemini" }),
      });
      const data = await res.json();
      if (data.imageUrl) updateElement(frameEl.id, { frameImageUrl: data.imageUrl });
    } catch {}
    finally { setLoadingFrames((s) => { const n = new Set(s); n.delete(frameEl.id); return n; }); }
  };

  const handleFrameFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !framePendingId) return;
    const isVideo = file.type.startsWith("video/");
    const reader = new FileReader();
    reader.onload = (ev) => updateElement(framePendingId, {
      frameImageUrl: ev.target?.result as string,
      frameMediaType: isVideo ? "video" : "image",
    });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleFrameContextMenu = (e: React.MouseEvent, el: SlideElement) => {
    e.preventDefault();
    e.stopPropagation();
    closeCtx();
    closeBgCtx();
    setFrameCtxMenu({ x: e.clientX, y: e.clientY, el, mobile: false });
  };

  const closeFrameCtx = () => setFrameCtxMenu(null);

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
    if (frameCtxMenu) { closeFrameCtx(); return; }
    if (framePanId) { setFramePanId(null); return; }
    if (isCroppingBg) return; // não deseleciona enquanto está cortando o fundo
    setSelectedId(null);
    setEditingId(null);
    setCropId(null);
    onSelectElement?.(null);
  };

  return (
    <>
    <div
      ref={containerRef}
      className="slide-canvas"
      style={{
        width: slide.width,
        height: slide.height,
        backgroundColor: slide.backgroundColor,
        backgroundImage: slide.backgroundPattern
          ? "linear-gradient(rgba(128,128,128,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.2) 1px, transparent 1px)"
          : undefined,
        backgroundSize: slide.backgroundPattern ? "32px 32px" : undefined,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
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
            style={{
              objectPosition: `${slide.backgroundPosition?.x ?? 50}% ${slide.backgroundPosition?.y ?? 50}%`,
              transform: slide.backgroundZoom && slide.backgroundZoom !== 100 ? `scale(${slide.backgroundZoom / 100})` : undefined,
              transformOrigin: `${slide.backgroundPosition?.x ?? 50}% ${slide.backgroundPosition?.y ?? 50}%`,
              opacity: slide.backgroundOpacity ?? 1,
              clipPath: slide.backgroundCrop
                ? `inset(${slide.backgroundCrop.top}% ${slide.backgroundCrop.right}% ${slide.backgroundCrop.bottom}% ${slide.backgroundCrop.left}%)`
                : undefined,
            }}
            draggable={false}
            onContextMenu={handleBgContextMenu}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: slide.backgroundGradient ?? "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.15) 100%)" }}
          />

          {/* ── Handles de crop do fundo ── */}
          {isCroppingBg && (() => {
            const S = 1 / scale;
            const hW = Math.round(70 * S);
            const hT = Math.round(22 * S);
            const clip = slide.backgroundCrop ?? { top: 0, right: 0, bottom: 0, left: 0 };
            return (
              <div className="absolute inset-0" style={{ zIndex: 5 }}>
                {/* Borda tracejada */}
                <div className="absolute inset-0 pointer-events-none" style={{ border: `${Math.round(2 * S)}px dashed #facc15` }} />
                {/* Topo */}
                <div style={{ position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center", top: `${clip.top}%`, transform: "translateY(-50%)", zIndex: 10 }}>
                  <div style={{ width: hW, height: hT, background: "#facc15", borderRadius: 9999, cursor: "ns-resize" }}
                    onMouseDown={(e) => handleBgCropDown(e, "top")}
                    onTouchStart={(e) => handleBgCropTouchStart(e, "top")} />
                </div>
                {/* Baixo */}
                <div style={{ position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center", bottom: `${clip.bottom}%`, transform: "translateY(50%)", zIndex: 10 }}>
                  <div style={{ width: hW, height: hT, background: "#facc15", borderRadius: 9999, cursor: "ns-resize" }}
                    onMouseDown={(e) => handleBgCropDown(e, "bottom")}
                    onTouchStart={(e) => handleBgCropTouchStart(e, "bottom")} />
                </div>
                {/* Esquerda */}
                <div style={{ position: "absolute", top: 0, bottom: 0, display: "flex", alignItems: "center", left: `${clip.left}%`, transform: "translateX(-50%)", zIndex: 10 }}>
                  <div style={{ width: hT, height: hW, background: "#facc15", borderRadius: 9999, cursor: "ew-resize" }}
                    onMouseDown={(e) => handleBgCropDown(e, "left")}
                    onTouchStart={(e) => handleBgCropTouchStart(e, "left")} />
                </div>
                {/* Direita */}
                <div style={{ position: "absolute", top: 0, bottom: 0, display: "flex", alignItems: "center", right: `${clip.right}%`, transform: "translateX(50%)", zIndex: 10 }}>
                  <div style={{ width: hT, height: hW, background: "#facc15", borderRadius: 9999, cursor: "ew-resize" }}
                    onMouseDown={(e) => handleBgCropDown(e, "right")}
                    onTouchStart={(e) => handleBgCropTouchStart(e, "right")} />
                </div>
              </div>
            );
          })()}
        </>
      )}
      {/* Hidden file input for bg image replacement */}
      <input ref={bgFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgFileChange} />
      {/* Hidden file input para foto/vídeo de moldura */}
      <input ref={frameFileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFrameFileChange} />

      {/* Botões de crop do fundo */}
      {isCroppingBg && !bgCtxMenu && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex gap-2">
          <button onClick={resetBgCrop}
            className="bg-[#222] hover:bg-[#333] text-gray-300 rounded-lg px-3 py-2 text-sm font-medium border border-[#444]">
            Resetar
          </button>
          <button onClick={applyBgCrop}
            className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg px-3 py-2 text-sm font-semibold">
            Aplicar corte
          </button>
        </div>
      )}

      {/* Botão deletar elemento */}
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
        const rS = Math.round(30 * S);   // tamanho do handle de resize (30px na tela)
        const oW = Math.round(2.5 * S);  // espessura da borda de seleção (2.5px na tela)

        // Frame (moldura): renderização própria sem o container padrão
        if (el.type === "frame") {
          const shapeStyle = FRAME_CLIP[el.frameShape ?? "circle"] ?? {};
          const isLoading = loadingFrames.has(el.id);
          const isPanning = framePanId === el.id;
          const imgOffsetX = el.frameImageOffset?.x ?? 50;
          const imgOffsetY = el.frameImageOffset?.y ?? 50;
          const imgZoom = el.frameImageZoom ?? 100;
          const innerStyle: React.CSSProperties = {
            width: "100%", height: "100%", overflow: "hidden", position: "relative",
            ...(shapeStyle.clip ? { clipPath: shapeStyle.clip } : {}),
            ...(shapeStyle.radius ? { borderRadius: shapeStyle.radius } : {}),
            cursor: isPanning ? "grab" : undefined,
          };

          const startFramePan = (clientX: number, clientY: number) => {
            const origX = el.frameImageOffset?.x ?? 50;
            const origY = el.frameImageOffset?.y ?? 50;
            framePanRef.current = { elementId: el.id, startX: clientX, startY: clientY, origX, origY };
            const onMove = (ev: MouseEvent | TouchEvent) => {
              if (!framePanRef.current) return;
              const cx = "touches" in ev ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX;
              const cy = "touches" in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
              const dx = (cx - framePanRef.current.startX) / scale;
              const dy = (cy - framePanRef.current.startY) / scale;
              // A sensibilidade do pan depende do zoom: mais zoom = movimento mais fino
              const zoomFactor = (el.frameImageZoom ?? 100) / 100;
              const newX = Math.max(0, Math.min(100, framePanRef.current.origX - (dx / el.width) * 100 / zoomFactor));
              const newY = Math.max(0, Math.min(100, framePanRef.current.origY - (dy / el.height) * 100 / zoomFactor));
              updateElement(framePanRef.current.elementId, { frameImageOffset: { x: newX, y: newY } });
            };
            const onUp = () => {
              framePanRef.current = null;
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

          return (
            <div
              key={el.id}
              className="slide-element"
              style={{
                left: el.x, top: el.y, width: el.width, height: el.height,
                opacity: el.opacity ?? 1, zIndex: el.zIndex ?? 20, touchAction: "none",
                ...(isSelected ? { outline: `${oW}px solid #4c6ef5`, outlineOffset: `${Math.round(2 * S)}px` } : {}),
              }}
              onMouseDown={(e) => {
                if (isPanning && el.frameImageUrl) {
                  e.stopPropagation();
                  startFramePan(e.clientX, e.clientY);
                } else {
                  handleMouseDown(e, el);
                }
              }}
              onTouchStart={(e) => {
                if (isPanning && el.frameImageUrl) {
                  e.stopPropagation();
                  // Dois dedos em pan mode = pinch para zoom
                  if (e.touches.length === 2) {
                    e.preventDefault();
                    const t1 = e.touches[0]; const t2 = e.touches[1];
                    const startDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                    const origZoom = el.frameImageZoom ?? 100;
                    const onMove = (te: TouchEvent) => {
                      if (te.touches.length < 2) return;
                      te.preventDefault();
                      const a = te.touches[0]; const b = te.touches[1];
                      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
                      updateElement(el.id, { frameImageZoom: Math.max(100, Math.min(400, Math.round(origZoom * (dist / startDist)))) });
                    };
                    const onEnd = () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); };
                    window.addEventListener("touchmove", onMove, { passive: false });
                    window.addEventListener("touchend", onEnd);
                  } else {
                    startFramePan(e.touches[0].clientX, e.touches[0].clientY);
                  }
                } else {
                  handleTouchStart(e, el);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => { if (el.frameImageUrl && el.frameMediaType !== "video") { e.stopPropagation(); setFramePanId(el.id); } }}
              onContextMenu={(e) => handleFrameContextMenu(e, el)}
            >
              <div style={innerStyle}>
                {isLoading ? (
                  <div style={{ width: "100%", height: "100%", background: "rgba(76,110,245,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: Math.round(el.width * 0.18), height: Math.round(el.width * 0.18), border: `${Math.round(el.width * 0.025)}px solid #4c6ef5`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  </div>
                ) : el.frameImageUrl && el.frameMediaType === "video" ? (
                  <video
                    src={el.frameImageUrl}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    autoPlay muted loop playsInline
                  />
                ) : el.frameImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={el.frameImageUrl} alt=""
                    style={{
                      width: "100%", height: "100%",
                      objectFit: "cover",
                      objectPosition: `${imgOffsetX}% ${imgOffsetY}%`,
                      transform: imgZoom !== 100 ? `scale(${imgZoom / 100})` : undefined,
                      transformOrigin: `${imgOffsetX}% ${imgOffsetY}%`,
                      display: "block",
                      cursor: isPanning ? "grabbing" : undefined,
                    }}
                    draggable={false}
                  />
                ) : (
                  <div
                    style={{ width: "100%", height: "100%", background: "rgba(255,255,255,0.06)", border: `${Math.round(2 * S)}px dashed rgba(76,110,245,0.5)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: Math.round(el.height * 0.05), color: "rgba(76,110,245,0.7)", cursor: "pointer", boxSizing: "border-box" }}
                    onClick={(e) => { e.stopPropagation(); if (isSelected) { setFramePendingId(el.id); frameFileInputRef.current?.click(); } else { setSelectedId(el.id); onSelectElement?.(el); } }}
                  >
                    <div style={{ display: "flex", gap: Math.round(el.width * 0.06), alignItems: "center" }}>
                      <ImageIcon style={{ width: Math.round(el.width * 0.18), height: Math.round(el.width * 0.18) }} />
                      <VideoIcon style={{ width: Math.round(el.width * 0.18), height: Math.round(el.width * 0.18) }} />
                    </div>
                    <span style={{ fontSize: Math.round(el.width * 0.07), fontFamily: "sans-serif", fontWeight: 600, textAlign: "center", padding: "0 8%" }}>Foto ou vídeo</span>
                  </div>
                )}
              </div>

              {/* Botão "Ajustar foto" */}
              {isSelected && !isLoading && el.frameImageUrl && el.frameMediaType !== "video" && !isPanning && (
                <div style={{ position: "absolute", top: -Math.round(36 * S), left: 0, display: "flex", gap: Math.round(4 * S), zIndex: 15 }}
                  onClick={(e) => e.stopPropagation()}>
                  <button
                    style={{ background: "#4c6ef5", border: "none", borderRadius: Math.round(8 * S), padding: `${Math.round(4 * S)}px ${Math.round(10 * S)}px`, color: "#fff", fontSize: Math.round(11 * S), fontFamily: "sans-serif", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); setFramePanId(el.id); }}
                  >
                    ✥ Ajustar foto
                  </button>
                </div>
              )}

              {/* Toolbar modo pan: label + zoom slider + concluir */}
              {isPanning && el.frameImageUrl && el.frameMediaType !== "video" && (
                <div
                  style={{ position: "absolute", top: -Math.round(52 * S), left: 0, right: 0, display: "flex", flexDirection: "column", gap: Math.round(3 * S), zIndex: 15 }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Linha topo: label + concluir */}
                  <div style={{ display: "flex", alignItems: "center", gap: Math.round(4 * S) }}>
                    <div style={{ background: "rgba(0,0,0,0.8)", borderRadius: Math.round(8 * S), padding: `${Math.round(3 * S)}px ${Math.round(8 * S)}px`, color: "#4c6ef5", fontSize: Math.round(10 * S), fontFamily: "sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}>
                      ↕↔ Arraste · Zoom:
                    </div>
                    {/* Slider de zoom */}
                    <input
                      type="range" min={100} max={400} step={5}
                      value={imgZoom}
                      style={{ flex: 1, accentColor: "#4c6ef5", cursor: "pointer", height: Math.round(4 * S) }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) => updateElement(el.id, { frameImageZoom: Number(e.target.value) })}
                    />
                    <div style={{ background: "rgba(0,0,0,0.7)", borderRadius: Math.round(6 * S), padding: `${Math.round(2 * S)}px ${Math.round(6 * S)}px`, color: "#d8b4fe", fontSize: Math.round(10 * S), fontFamily: "monospace", whiteSpace: "nowrap" }}>
                      {imgZoom}%
                    </div>
                    <button
                      style={{ background: "#1a1a1a", border: "1px solid #444", borderRadius: Math.round(8 * S), padding: `${Math.round(3 * S)}px ${Math.round(8 * S)}px`, color: "#fff", fontSize: Math.round(10 * S), fontFamily: "sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setFramePanId(null); }}
                    >
                      Concluir
                    </button>
                    <button
                      style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: Math.round(8 * S), padding: `${Math.round(3 * S)}px ${Math.round(8 * S)}px`, color: "#888", fontSize: Math.round(10 * S), fontFamily: "sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); updateElement(el.id, { frameImageOffset: { x: 50, y: 50 }, frameImageZoom: 100 }); }}
                    >
                      Resetar
                    </button>
                  </div>
                </div>
              )}

              {isSelected && !isLoading && !isPanning && (
                <div
                  style={{ position: "absolute", width: rS, height: rS, background: "#4c6ef5", border: `${Math.max(1, Math.round(2 * S))}px solid white`, borderRadius: "50%", cursor: "se-resize", bottom: -Math.round(rS / 2), right: -Math.round(rS / 2), zIndex: 10, touchAction: "none" }}
                  onMouseDown={(e) => { e.stopPropagation(); handleResizeDown(e, el); }}
                  onTouchStart={(e) => { e.stopPropagation(); handleResizeTouchStart(e, el); }}
                />
              )}
            </div>
          );
        }

        return (
          <div
            key={el.id}
            className="slide-element"
            style={{
              left: el.x, top: el.y, width: el.width,
              height: el.type === "text" ? "auto" : el.height,
              minHeight: el.type === "text" ? undefined : undefined,
              opacity: el.opacity ?? 1, zIndex: el.zIndex, touchAction: "none",
              ...(isSelected ? { outline: `${oW}px solid #4c6ef5`, outlineOffset: `${Math.round(2 * S)}px` } : {}),
            }}
            onMouseDown={(e) => handleMouseDown(e, el)}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => handleTouchStart(e, el)}
            onContextMenu={(e) => handleContextMenu(e, el)}
          >
            {/* Texto */}
            {el.type === "text" && (
              <>
                {editingId === el.id ? (
                  <textarea autoFocus className="w-full bg-transparent resize-none outline-none block"
                    style={{ ...textStyle(el), padding: 4, minHeight: el.height, height: "auto", overflow: "hidden" }}
                    value={stripHtml(el.content ?? "")} onChange={(e) => {
                      updateElement(el.id, { content: e.target.value });
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    onBlur={(e) => {
                      updateElement(el.id, { height: Math.max(e.target.scrollHeight, 20) });
                      setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()} />
                ) : (
                  <div className="w-full" style={{ ...textStyle(el), padding: 4, whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: el.content ?? "" }} />
                )}
              </>
            )}

            {/* Imagem */}
            {el.type === "image" && el.src && (
              <div className="w-full h-full relative overflow-hidden" style={{ clipPath }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={el.src} alt="" className="w-full h-full object-cover" style={{ objectPosition: `50% ${el.imageObjectPositionY ?? 50}%` }} draggable={false} />
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
              <div className="w-full h-full" style={{ backgroundColor: (el.style as any)?.fill ?? "#4c6ef5", borderRadius: (el.style as any)?.borderRadius ?? 0, border: `${(el.style as any)?.strokeWidth ?? 0}px solid ${(el.style as any)?.stroke ?? "transparent"}` }} />
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
                    <span style={{ fontSize: el.height * 0.28, fontWeight: 700, color: el.profileNameColor ?? "#fff", lineHeight: 1, whiteSpace: "nowrap" }}>
                      {el.profileName || "Seu nome"}
                    </span>
                    {el.profileVerified && (
                      <svg width={el.height * 0.26} height={el.height * 0.26} viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="12" fill="#1d9bf0" />
                        <path d="M6 12l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: el.height * 0.22, color: el.profileHandleColor ?? "rgba(255,255,255,0.55)", lineHeight: 1, whiteSpace: "nowrap" }}>
                    @{el.profileHandle || "seuhandle"}
                  </span>
                </div>
              </div>
            )}

            {/* Handle resize — escalonado, maior e com label para texto */}
            {isSelected && !isCropping && (
              <>
                {el.type === "text" && (
                  <div style={{ position: "absolute", bottom: -Math.round(rS / 2) - Math.round(20 * S), right: 0, display: "flex", alignItems: "center", gap: Math.round(4 * S), zIndex: 11, pointerEvents: "none" }}>
                    <span style={{ fontSize: Math.round(11 * S), color: "rgba(76,110,245,0.9)", background: "rgba(0,0,0,0.6)", borderRadius: Math.round(4 * S), padding: `${Math.round(2 * S)}px ${Math.round(6 * S)}px`, whiteSpace: "nowrap", fontFamily: "sans-serif" }}>
                      ↕↔ tamanho
                    </span>
                  </div>
                )}
                <div
                  style={{ position: "absolute", width: rS, height: rS, background: el.type === "text" ? "#3b5bdb" : "#4c6ef5", border: `${Math.max(1, Math.round(2 * S))}px solid white`, borderRadius: "50%", cursor: "se-resize", bottom: -Math.round(rS / 2), right: -Math.round(rS / 2), zIndex: 10, touchAction: "none", boxShadow: el.type === "text" ? `0 0 ${Math.round(8 * S)}px rgba(59,91,219,0.8)` : "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseDown={(e) => { e.stopPropagation(); handleResizeDown(e, el); }}
                  onTouchStart={(e) => { e.stopPropagation(); handleResizeTouchStart(e, el); }}
                >
                  <svg width={Math.round(12 * S)} height={Math.round(12 * S)} viewBox="0 0 12 12" fill="white" style={{ pointerEvents: "none" }}>
                    <path d="M1 11L11 1M6 11h5V6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
              </>
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
            <span className="text-sm font-semibold text-gray-300 flex-1">Editar imagem</span>
            <button onClick={(e) => { e.stopPropagation(); closeCtx(); }} className="ml-auto text-gray-500 hover:text-gray-200 transition-colors p-0.5"><X size={15} /></button>
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

      {/* frameCtxMenu movido para portal abaixo */}


      {/* Botão "Gerar imagem com I.A" quando não há fundo */}
      {!slide.backgroundImageUrl && !generatingBg && !selectedId && !showThemeInput && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none" style={{ zIndex: 10, paddingBottom: slide.height * 0.06 }}>
          <button
            className="pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold transition-all active:scale-95"
            style={{ fontSize: slide.width * 0.022, background: "rgba(76,110,245,0.55)", border: "1.5px solid rgba(76,110,245,0.85)", backdropFilter: "blur(8px)", boxShadow: "0 0 32px rgba(76,110,245,0.5)" }}
            onClick={(e) => { e.stopPropagation(); generateBg(); }}
          >
            <Wand2 style={{ width: slide.width * 0.025, height: slide.width * 0.025 }} />
            Fundo I.A
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

    {/* Background context menu — portal fixed, fora do canvas (sem clipping) */}
    {bgCtxMenu && typeof window !== "undefined" && createPortal(
      <>
        <div className="fixed inset-0 z-[9990]" onClick={closeBgCtx} />
        <div
          className="fixed z-[9991] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl py-1 overflow-y-auto"
          style={bgCtxMenu.mobile
            ? { bottom: 76, left: "50%", transform: "translateX(-50%)", maxHeight: "75vh", width: "min(300px, 92vw)" }
            : {
                left: Math.min(bgCtxMenu.x, window.innerWidth - 270),
                top: Math.max(8, Math.min(bgCtxMenu.y, window.innerHeight - 60)),
                maxHeight: "80vh",
                minWidth: 240,
              }
          }
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Header */}
          {!bgCtxMenu.mobile && (
            <div className="px-4 py-2.5 border-b border-[#2a2a2a] flex items-center gap-2 cursor-move select-none"
              onMouseDown={(e) => startMenuDrag(e, () => ({ x: bgCtxMenu!.x, y: bgCtxMenu!.y }), (x, y) => setBgCtxMenu(m => m ? { ...m, x, y } : null), 1)}
              onTouchStart={(e) => startMenuDrag(e, () => ({ x: bgCtxMenu!.x, y: bgCtxMenu!.y }), (x, y) => setBgCtxMenu(m => m ? { ...m, x, y } : null), 1)}>
              <ImageIcon size={15} className="text-brand-400" />
              <span className="text-sm font-semibold text-gray-300 flex-1">Imagem de fundo</span>
              <button onClick={(e) => { e.stopPropagation(); closeBgCtx(); }} className="ml-auto text-gray-500 hover:text-gray-200 transition-colors p-0.5"><X size={15} /></button>
            </div>
          )}
          {bgCtxMenu.mobile && (
            <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
              <ImageIcon size={15} className="text-brand-400" />
              <span className="text-sm font-semibold text-gray-300 flex-1">Opções do slide</span>
              <button onClick={(e) => { e.stopPropagation(); closeBgCtx(); }} className="text-gray-500 hover:text-gray-200 p-0.5"><X size={15} /></button>
            </div>
          )}

          {/* Transparência */}
          {slide.backgroundImageUrl && (
            <div className="px-4 py-2.5 border-b border-[#2a2a2a]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-400 flex items-center gap-1.5"><Blend size={14} /> Transparência</span>
                <span className="text-sm text-white font-medium">{Math.round((1 - (slide.backgroundOpacity ?? 1)) * 100)}%</span>
              </div>
              <input type="range" min={0} max={100} value={Math.round((1 - (slide.backgroundOpacity ?? 1)) * 100)}
                onChange={(e) => onUpdate({ ...slide, backgroundOpacity: 1 - Number(e.target.value) / 100 })}
                className="w-full accent-brand-500" />
            </div>
          )}

          {/* Degradê */}
          {slide.backgroundImageUrl && (
            <div className="px-4 py-2.5 border-b border-[#2a2a2a]">
              <p className="text-sm text-gray-400 mb-2 flex items-center gap-1.5"><Layers size={14} /> Degradê</p>
              <div className="grid grid-cols-3 gap-1.5">
                {GRADIENTS.map((g) => (
                  <button key={g.label} onClick={() => setBgGradient(g.value)}
                    className={`text-xs py-1.5 px-2 rounded border transition-colors ${(slide.backgroundGradient ?? "") === g.value ? "border-brand-500 bg-brand-500/20 text-white" : "border-[#333] text-gray-400 hover:border-[#555]"}`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Posição e zoom */}
          {slide.backgroundImageUrl && (
            <div className="px-4 py-3 border-b border-[#2a2a2a] space-y-2.5">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Posição & Zoom</p>
              <label className="flex items-center gap-2 text-xs text-gray-400"><span className="w-3">X</span>
                <input type="range" min={0} max={100} step={1} value={slide.backgroundPosition?.x ?? 50}
                  onChange={(e) => onUpdate({ ...slide, backgroundPosition: { x: Number(e.target.value), y: slide.backgroundPosition?.y ?? 50 } })} className="flex-1 accent-brand-500" />
                <span className="text-gray-600 w-6 text-right">{slide.backgroundPosition?.x ?? 50}</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-400"><span className="w-3">Y</span>
                <input type="range" min={0} max={100} step={1} value={slide.backgroundPosition?.y ?? 50}
                  onChange={(e) => onUpdate({ ...slide, backgroundPosition: { x: slide.backgroundPosition?.x ?? 50, y: Number(e.target.value) } })} className="flex-1 accent-brand-500" />
                <span className="text-gray-600 w-6 text-right">{slide.backgroundPosition?.y ?? 50}</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-400"><span className="w-3">🔍</span>
                <input type="range" min={80} max={250} step={5} value={slide.backgroundZoom ?? 100}
                  onChange={(e) => onUpdate({ ...slide, backgroundZoom: Number(e.target.value) })} className="flex-1 accent-brand-500" />
                <span className="text-gray-600 w-8 text-right">{slide.backgroundZoom ?? 100}%</span>
              </label>
              <button onClick={() => onUpdate({ ...slide, backgroundPosition: { x: 50, y: 50 }, backgroundZoom: 100 })}
                className="text-[11px] text-gray-600 hover:text-gray-400 underline">Resetar posição</button>
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

          {/* Cortar fundo */}
          {slide.backgroundImageUrl && (
            <button onClick={enterBgCrop}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-yellow-400 hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a]">
              <Scissors size={15} /> Cortar imagem de fundo
            </button>
          )}

          {/* Remover fundo */}
          {slide.backgroundImageUrl && (
            <button onClick={removeBg}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a]">
              <X size={15} /> Remover fundo
            </button>
          )}

          {/* Grade claro/escuro */}
          {(slide.backgroundPattern === "grid-light" || slide.backgroundPattern === "grid-dark") && (
            <div className="px-4 py-2.5 border-b border-[#2a2a2a]">
              <p className="text-xs text-gray-500 mb-2">Grade de fundo</p>
              <div className="flex gap-2">
                <button onClick={() => onUpdate({ ...slide, backgroundColor: "#ffffff", backgroundPattern: "grid-light" as const })}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors border ${slide.backgroundPattern === "grid-light" ? "border-brand-500 bg-brand-500/20 text-white" : "border-[#333] text-gray-400 hover:border-[#555]"}`}>
                  ☀ Branco
                </button>
                <button onClick={() => onUpdate({ ...slide, backgroundColor: "#0a0a0a", backgroundPattern: "grid-dark" as const })}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors border ${slide.backgroundPattern === "grid-dark" ? "border-brand-500 bg-brand-500/20 text-white" : "border-[#333] text-gray-400 hover:border-[#555]"}`}>
                  ☾ Preto
                </button>
              </div>
            </div>
          )}

          {/* Modificar Layout */}
          <button onClick={() => { setShowLayoutPicker(true); closeBgCtx(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-500 hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a]">
            <LayoutTemplate size={15} /> Modificar layout
          </button>

          {/* Fechar */}
          <button onClick={closeBgCtx} className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-400 transition-colors">
            Fechar
          </button>
        </div>
      </>,
      document.body
    )}

    {/* Botão 3 pontos (mobile) — fora do canvas para não atrapalhar edição */}
    {isActive && typeof window !== "undefined" && createPortal(
      <button
        className="fixed z-[200] flex items-center justify-center rounded-xl transition-all active:scale-90 md:hidden"
        style={{
          bottom: 92,
          right: 16,
          width: 44,
          height: 44,
          background: "rgba(0,0,0,0.70)",
          border: "1px solid rgba(255,255,255,0.20)",
          color: "rgba(255,255,255,0.90)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => {
          e.stopPropagation();
          closeCtx(); closeBgCtx(); closeFrameCtx();
          if (selectedId) {
            const el = slide.elements.find((el) => el.id === selectedId);
            if (el?.type === "image") { setCtxMenu({ x: 20, y: 70, el }); return; }
            if (el?.type === "frame") { setFrameCtxMenu({ x: 0, y: 0, el, mobile: true }); return; }
          }
          setBgCtxMenu({ x: 0, y: 0, mobile: true });
        }}
      >
        <MoreVertical size={18} />
      </button>,
      document.body
    )}

    {/* Context menu de moldura — portal fixed, sem clipping do canvas */}
    {frameCtxMenu && typeof window !== "undefined" && createPortal(
      <>
        <div className="fixed inset-0 z-[9990]" onClick={closeFrameCtx} />
        <div
          className="fixed z-[9991] bg-[#1a1a1a] border border-[#2a2a2a] shadow-2xl overflow-y-auto"
          style={frameCtxMenu.mobile
            ? { bottom: 0, left: 0, right: 0, maxHeight: "72vh", borderRadius: "18px 18px 0 0", paddingBottom: "env(safe-area-inset-bottom, 8px)" }
            : { left: Math.min(frameCtxMenu.x, window.innerWidth - 260), top: Math.max(8, Math.min(frameCtxMenu.y, window.innerHeight - 380)), maxHeight: "80vh", minWidth: 240, borderRadius: 12 }
          }
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Handle bar no mobile */}
          {frameCtxMenu.mobile && (
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-white/20" />
            </div>
          )}
          <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
            <Square size={14} className="text-indigo-400" />
            <span className="text-sm font-semibold text-white flex-1">Moldura</span>
            <button onClick={(e) => { e.stopPropagation(); closeFrameCtx(); }} className="text-gray-500 hover:text-gray-200 transition-colors p-1"><X size={14} /></button>
          </div>

          <button onClick={() => generateFrameImage(frameCtxMenu.el)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-indigo-400 hover:bg-white/5 transition-colors border-b border-[#2a2a2a]">
            <Wand2 size={15} /> Gerar foto com I.A
          </button>

          <button onClick={() => { setFramePendingId(frameCtxMenu.el.id); frameFileInputRef.current?.click(); closeFrameCtx(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors border-b border-[#2a2a2a]">
            <Upload size={15} className="text-blue-400" /> Fazer upload foto/vídeo
          </button>

          {slide.backgroundImageUrl && (
            <button onClick={() => { updateElement(frameCtxMenu.el.id, { frameImageUrl: slide.backgroundImageUrl, frameImageOffset: { x: 50, y: 50 }, frameImageZoom: 100 }); closeFrameCtx(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-green-400 hover:bg-white/5 transition-colors border-b border-[#2a2a2a]">
              <ImageIcon size={15} /> Usar imagem de fundo
            </button>
          )}

          {frameCtxMenu.el.frameImageUrl && (
            <button onClick={() => { updateElement(frameCtxMenu.el.id, { frameImageUrl: undefined, frameMediaType: undefined }); closeFrameCtx(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors border-b border-[#2a2a2a]">
              <X size={15} /> {frameCtxMenu.el.frameMediaType === "video" ? "Remover vídeo" : "Remover foto"}
            </button>
          )}

          <button onClick={() => { bringForward(frameCtxMenu.el); closeFrameCtx(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors border-b border-[#2a2a2a]">
            <ArrowUp size={15} className="text-blue-400" /> Trazer à frente
          </button>
          <button onClick={() => { sendBackward(frameCtxMenu.el); closeFrameCtx(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors border-b border-[#2a2a2a]">
            <ArrowDown size={15} className="text-blue-400" /> Enviar para trás
          </button>

          <button onClick={closeFrameCtx} className="w-full px-4 py-3 text-sm text-gray-500 hover:text-gray-300 transition-colors">
            Fechar
          </button>
        </div>
      </>,
      document.body
    )}

    {/* Layout picker portal */}
    {showLayoutPicker && typeof window !== "undefined" && createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
        onClick={() => setShowLayoutPicker(false)}
      >
        <div
          className="w-full sm:max-w-sm bg-[#111] border-t sm:border border-[#222] rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <LayoutTemplate size={18} className="text-brand-500" />
            <span className="text-base font-bold text-white">Escolher layout</span>
            <button onClick={() => setShowLayoutPicker(false)} className="ml-auto text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
          </div>
          <p className="text-xs text-gray-500 -mt-2">O texto e imagem existentes serão redistribuídos no novo layout.</p>

          <div className="grid grid-cols-3 gap-3">
            {([
              { v: 0, label: "Clássico",    desc: "Texto na base, fundo total" },
              { v: 1, label: "Cinemático",  desc: "Texto topo esq, fundo total" },
              { v: 2, label: "Conteúdo",    desc: "Título topo, imagem base" },
              { v: 3, label: "Misto",       desc: "Título grande, img grande" },
              { v: 4, label: "Quadrado",    desc: "Img quadrada centralizada" },
              { v: 5, label: "Topo",        desc: "Img topo, texto abaixo" },
            ] as { v: 0|1|2|3|4|5; label: string; desc: string }[]).map(({ v, label, desc }) => (
              <button
                key={v}
                onClick={() => applyLayout(v)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[#222] bg-[#0a0a0a] hover:border-brand-500/50 hover:bg-brand-600/5 transition-all group"
              >
                {/* Mini visual preview */}
                <div className="w-12 h-16 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] relative overflow-hidden">
                  {v === 0 && (<><div className="absolute inset-0 bg-brand-500/15" /><div className="absolute bottom-0 inset-x-0 h-2/5 bg-black/60" /><div className="absolute bottom-2 inset-x-1.5 h-2 bg-white/40 rounded-sm" /><div className="absolute bottom-5 inset-x-1.5 h-1 bg-white/20 rounded-sm" /></>)}
                  {v === 1 && (<><div className="absolute inset-0 bg-brand-500/15" /><div className="absolute top-0 inset-x-0 h-2/5 bg-black/50" /><div className="absolute top-3 left-1.5 w-1 h-3 bg-purple-400/60 rounded-sm" /><div className="absolute top-3 left-3.5 right-1.5 h-2 bg-white/40 rounded-sm" /></>)}
                  {v === 2 && (<><div className="absolute top-0 inset-x-0 h-2/5 bg-[#222]" /><div className="absolute top-2 inset-x-1.5 h-2 bg-white/40 rounded-sm" /><div className="absolute top-5 inset-x-1.5 h-1 bg-white/20 rounded-sm" /><div className="absolute bottom-0 inset-x-0 h-3/5 bg-brand-600/25 rounded-b-lg" /></>)}
                  {v === 3 && (<><div className="absolute top-0 inset-x-0 h-1/3 bg-[#222]" /><div className="absolute top-2 inset-x-1.5 h-2.5 bg-white/40 rounded-sm" /><div className="absolute bottom-0 inset-x-0 h-2/3 bg-brand-600/25 rounded-b-lg" /></>)}
                  {v === 4 && (<><div className="absolute top-0 inset-x-0 h-1/5 bg-[#222]" /><div className="absolute top-5 inset-x-2 bottom-5 bg-brand-500/25 rounded-md" /><div className="absolute bottom-1.5 inset-x-1.5 h-1 bg-white/20 rounded-sm" /></>)}
                  {v === 5 && (<><div className="absolute top-0 inset-x-0 h-1/2 bg-brand-500/25" /><div className="absolute bottom-0 inset-x-0 h-1/2 bg-[#222]" /><div className="absolute bottom-4 inset-x-1.5 h-2 bg-white/40 rounded-sm" /><div className="absolute bottom-1.5 inset-x-1.5 h-1 bg-white/20 rounded-sm" /></>)}
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-200 group-hover:text-white transition-colors">{label}</p>
                  <p className="text-[9px] text-gray-600 leading-tight mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          <button onClick={() => setShowLayoutPicker(false)} className="w-full py-2.5 rounded-xl border border-[#222] text-sm text-gray-500 hover:text-gray-300 transition-colors">
            Cancelar
          </button>
        </div>
      </div>,
      document.body
    )}

    {/* theme input portal — fora do canvas para evitar stacking context do transform:scale */}
    {showThemeInput && !generatingBg && typeof window !== "undefined" && createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
        onClick={() => setShowThemeInput(false)}
      >
        <div
          className="w-full sm:max-w-sm bg-[#111] border-t sm:border border-[#222] rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <Wand2 size={20} className="text-brand-400" />
            <span className="text-base font-bold text-white">Qual tema pretende usar?</span>
          </div>
          <input
            autoFocus
            value={themeValue}
            onChange={(e) => setThemeValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && themeValue.trim()) runGenerateBg(themeValue.trim());
              if (e.key === "Escape") setShowThemeInput(false);
            }}
            placeholder="Ex: tecnologia, saúde, negócios..."
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowThemeInput(false)}
              className="flex-1 py-2.5 rounded-xl bg-[#222] border border-[#333] text-gray-500 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={() => themeValue.trim() && runGenerateBg(themeValue.trim())}
              disabled={!themeValue.trim()}
              className="flex-[2] py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-30 text-white text-sm font-semibold"
            >
              Gerar imagem
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
