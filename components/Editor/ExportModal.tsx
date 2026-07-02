"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download, CheckSquare, Square, Loader2, Check, ImageDown } from "lucide-react";
import type { Slide } from "@/types";
import { renderSlide } from "@/lib/render-slide";

interface Props {
  slides: Slide[];
  onClose: () => void;
  onSave?: (canvases: HTMLCanvasElement[]) => void;
}

interface SlideThumb {
  index: number;
  dataUrl: string | null;
  loading: boolean;
}

export default function ExportModal({ slides, onClose, onSave }: Props) {
  const [thumbs, setThumbs]           = useState<SlideThumb[]>(() =>
    slides.map((_, i) => ({ index: i, dataUrl: null, loading: true }))
  );
  const [selected, setSelected]       = useState<Set<number>>(new Set(slides.map((_, i) => i)));
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress]       = useState<{ done: number; total: number } | null>(null);
  const [quality, setQuality]         = useState<"high" | "medium">("high");

  // Gera thumbnails em paralelo ao abrir
  useEffect(() => {
    let cancelled = false;
    slides.forEach((slide, i) => {
      renderSlide(slide).then((canvas) => {
        if (cancelled) return;
        // Escala para thumbnail (18% do tamanho original)
        const scale = 0.18;
        const thumb = document.createElement("canvas");
        thumb.width  = Math.round(canvas.width  * scale);
        thumb.height = Math.round(canvas.height * scale);
        const ctx = thumb.getContext("2d");
        if (ctx) ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
        setThumbs((prev) =>
          prev.map((t) => t.index === i ? { ...t, dataUrl: thumb.toDataURL("image/jpeg", 0.7), loading: false } : t)
        );
      }).catch(() => {
        if (cancelled) return;
        setThumbs((prev) => prev.map((t) => t.index === i ? { ...t, loading: false } : t));
      });
    });
    return () => { cancelled = true; };
  }, [slides]);

  const toggleOne = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === slides.length ? new Set() : new Set(slides.map((_, i) => i))
    );
  };

  const doDownload = useCallback(async (indices: number[]) => {
    if (!indices.length) return;
    setDownloading(true);
    setProgress({ done: 0, total: indices.length });
    const q = quality === "high" ? 0.97 : 0.80;
    const rendered: HTMLCanvasElement[] = [];
    try {
      for (let n = 0; n < indices.length; n++) {
        const i      = indices[n];
        const canvas = await renderSlide(slides[i]);
        rendered.push(canvas);
        const a      = document.createElement("a");
        a.href       = canvas.toDataURL("image/jpeg", q);
        a.download   = `slide-${String(i + 1).padStart(2, "0")}.jpg`;
        a.click();
        setProgress({ done: n + 1, total: indices.length });
        await new Promise((r) => setTimeout(r, 180));
      }
      if (rendered.length) onSave?.(rendered);
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  }, [slides, quality]);

  const handleDownloadSelected = () => doDownload([...selected].sort((a, b) => a - b));
  const handleDownloadAll      = () => doDownload(slides.map((_, i) => i));

  const allSelected  = selected.size === slides.length;
  const noneSelected = selected.size === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2">
            <ImageDown size={16} className="text-indigo-400" />
            <span className="text-sm font-bold text-white">Exportar slides</span>
            <span className="text-xs text-white/35 ml-1">{slides.length} slide{slides.length !== 1 ? "s" : ""}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Controles */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/6 shrink-0 gap-3 flex-wrap">
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            {allSelected
              ? <CheckSquare size={14} className="text-indigo-400" />
              : <Square size={14} />}
            {allSelected ? "Desmarcar todos" : "Selecionar todos"}
          </button>

          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
            {(["high", "medium"] as const).map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${
                  quality === q ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"
                }`}
              >
                {q === "high" ? "Alta qualidade" : "Média qualidade"}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de slides */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {thumbs.map((t) => {
              const isSelected = selected.has(t.index);
              return (
                <button
                  key={t.index}
                  onClick={() => toggleOne(t.index)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-[4/5] ${
                    isSelected
                      ? "border-indigo-500 ring-2 ring-indigo-500/30"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  {/* Thumbnail */}
                  {t.loading ? (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <Loader2 size={14} className="text-white/30 animate-spin" />
                    </div>
                  ) : t.dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.dataUrl} alt={`Slide ${t.index + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <span className="text-white/20 text-xs">?</span>
                    </div>
                  )}

                  {/* Overlay selecionado */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg">
                      <Check size={11} className="text-white" />
                    </div>
                  )}

                  {/* Número */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pt-4 pb-1 px-1.5">
                    <span className="text-[10px] text-white/70 font-medium">{t.index + 1}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/8 shrink-0 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-white/35">
            {selected.size} de {slides.length} selecionado{selected.size !== 1 ? "s" : ""}
          </span>

          <div className="flex items-center gap-2">
            {/* Progresso */}
            {progress && (
              <span className="text-xs text-white/40">
                {progress.done}/{progress.total}
              </span>
            )}

            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/8 hover:bg-white/14 text-white/70 hover:text-white border border-white/10 transition-all disabled:opacity-40"
            >
              {downloading && !progress ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Baixar todos
            </button>

            <button
              onClick={handleDownloadSelected}
              disabled={downloading || noneSelected}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40"
            >
              {downloading && progress ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              {downloading && progress
                ? `Baixando ${progress.done}/${progress.total}...`
                : `Baixar${selected.size > 0 && !allSelected ? ` (${selected.size})` : " selecionados"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
