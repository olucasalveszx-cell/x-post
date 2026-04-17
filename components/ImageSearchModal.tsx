"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, X, Loader2, Check } from "lucide-react";

interface ImageResult {
  url: string;
  thumb: string;
  width: number;
  height: number;
  title: string;
  source: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (imageBase64: string, mimeType: string, previewUrl: string) => void;
  defaultQuery?: string;
}

export default function ImageSearchModal({ open, onClose, onSelect, defaultQuery = "" }: Props) {
  const [query, setQuery] = useState(defaultQuery);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery(defaultQuery);
      setImages([]);
      setError("");
      setSelectedUrl(null);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, defaultQuery]);

  const search = async (q = query) => {
    if (!q.trim()) return;
    setSearching(true);
    setError("");
    setImages([]);
    try {
      const res = await fetch("/api/image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImages(data.images ?? []);
      if (!data.images?.length) setError("Nenhuma imagem encontrada. Tente outro termo.");
    } catch (e: any) {
      setError(e.message ?? "Erro ao buscar imagens");
    } finally {
      setSearching(false);
    }
  };

  const selectImage = async (img: ImageResult, idx: number) => {
    setLoadingIdx(idx);
    setError("");
    try {
      const res = await fetch("/api/image-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: img.url }),
      });
      const data = await res.json();
      if (!res.ok || !data.base64) throw new Error(data.error ?? "Falha ao carregar imagem");
      setSelectedUrl(img.url);
      onSelect(data.base64, data.mimeType, img.url);
      setTimeout(onClose, 300);
    } catch {
      setError("Falha ao carregar imagem. Tente outra.");
    } finally {
      setLoadingIdx(null);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#2a2a2a] bg-[#0d0d0d] flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <span className="text-sm font-semibold text-white">Buscar imagem de referência</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#1a1a1a]">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2">
              <Search size={14} className="text-gray-500 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Ex: Trump 2025, Neymar Copa, iPhone 16..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 outline-none"
              />
            </div>
            <button
              onClick={() => search()}
              disabled={!query.trim() || searching}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
            >
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Buscar
            </button>
          </div>
          <p className="text-[11px] text-gray-600 mt-2">
            A IA vai usar a imagem selecionada como base visual para criar a arte dos slides.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {searching && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
              <Loader2 size={24} className="animate-spin text-brand-500" />
              <span className="text-sm">Buscando imagens...</span>
            </div>
          )}

          {error && !searching && (
            <div className="text-center py-10 text-sm text-red-400">{error}</div>
          )}

          {!searching && images.length === 0 && !error && (
            <div className="text-center py-16 text-gray-600 text-sm">
              Digite um termo e clique em Buscar para ver imagens
            </div>
          )}

          {!searching && images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => selectImage(img, idx)}
                  disabled={loadingIdx !== null}
                  title={img.title}
                  className={`relative group aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedUrl === img.url ? "border-brand-500" : "border-transparent hover:border-white/30"
                  } disabled:opacity-60`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.thumb}
                    alt={img.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    {loadingIdx === idx ? (
                      <Loader2 size={20} className="text-white animate-spin" />
                    ) : selectedUrl === img.url ? (
                      <Check size={20} className="text-brand-400" />
                    ) : null}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white/80 truncate">{img.source}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
