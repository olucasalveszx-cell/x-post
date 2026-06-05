"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Search, X, Loader2, RefreshCw, Check, ZoomIn } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface ImageResult {
  url: string;
  thumb: string;
  width: number;
  height: number;
  title: string;
  source: string;
}

function QualityBadge({ w }: { w: number }) {
  if (w >= 1920) return <span className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow">HD</span>;
  if (w >= 1000) return <span className="absolute top-2 right-2 bg-sky-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow">HQ</span>;
  return null;
}

function ImageSearchPopup() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImageResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialQuery) doSearch(initialQuery, 1);
  }, []); // eslint-disable-line

  const doSearch = async (q: string, p: number) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    if (p === 1) setImages([]);
    try {
      const res = await fetch("/api/image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q.trim(), page: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!data.images?.length) throw new Error("Nenhuma imagem encontrada. Tente outro termo.");
      setImages(prev => p === 1 ? data.images : [...prev, ...data.images]);
    } catch (e: any) {
      setError(e.message ?? "Erro ao buscar imagens");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => { setPage(1); doSearch(query, 1); };
  const loadMore = () => { const next = page + 1; setPage(next); doSearch(query, next); };

  const selectImage = (img: ImageResult) => {
    setSelectedUrl(img.url);
    if (window.opener) {
      window.opener.postMessage(
        { type: "web_image_selected", url: img.url, thumb: img.thumb },
        window.location.origin
      );
    }
    setTimeout(() => window.close(), 250);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col select-none" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#080808]/95 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-[13px] shrink-0 select-none">
            <Search size={15} />
            Buscar na Web
          </div>
          <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-sky-500/50 rounded-xl px-3 py-2 transition-colors">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Ex: Trump 2025, Neymar Copa, iPhone 16..."
              className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/25 outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-white/25 hover:text-white/60 transition-colors">
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={!query.trim() || loading}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-40 text-[13px] font-semibold transition-colors shrink-0 flex items-center gap-2"
          >
            {loading && images.length === 0 ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Buscar
          </button>
          <button
            onClick={() => window.close()}
            className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors shrink-0"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-6xl mx-auto">

          {loading && images.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-white/30">
              <Loader2 size={32} className="animate-spin text-sky-400" />
              <span className="text-sm">Buscando imagens em alta qualidade...</span>
            </div>
          )}

          {error && !loading && images.length === 0 && (
            <div className="text-center py-24 text-sm text-red-400/80">{error}</div>
          )}

          {!loading && images.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-32 gap-3 text-white/20">
              <Search size={36} />
              <span className="text-sm">Digite um termo e pressione Enter</span>
            </div>
          )}

          {images.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <div key={`${img.url}-${idx}`} className="relative group">
                    <button
                      onClick={() => selectImage(img)}
                      className={`w-full aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all duration-150 block ${
                        selectedUrl === img.url
                          ? "border-sky-400 scale-[0.97]"
                          : "border-white/0 hover:border-sky-400/50 hover:scale-[1.02]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/image-proxy?url=${encodeURIComponent(img.url)}`}
                        alt={img.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={e => {
                          (e.target as HTMLImageElement).src = `/api/image-proxy?url=${encodeURIComponent(img.thumb)}`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="absolute bottom-0 left-0 right-0 p-2.5">
                          <p className="text-[11px] text-white font-medium truncate leading-tight">{img.title}</p>
                          <p className="text-[10px] text-sky-300/70 truncate mt-0.5">{img.source}</p>
                          {img.width > 0 && (
                            <p className="text-[10px] text-white/35 mt-0.5">{img.width} × {img.height}</p>
                          )}
                        </div>
                      </div>
                      {selectedUrl === img.url && (
                        <div className="absolute inset-0 bg-sky-500/15 flex items-center justify-center">
                          <div className="bg-sky-500 rounded-full p-1.5 shadow-lg">
                            <Check size={14} className="text-white" />
                          </div>
                        </div>
                      )}
                      <QualityBadge w={img.width} />
                    </button>

                    {/* Preview button */}
                    <button
                      onClick={e => { e.stopPropagation(); setPreview(img); }}
                      className="absolute top-2 left-2 p-1 rounded-md bg-black/60 text-white/60 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-all"
                      title="Pré-visualizar"
                    >
                      <ZoomIn size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/10 hover:border-sky-500/40 text-sm text-white/40 hover:text-sky-400 transition-all disabled:opacity-40"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Carregar mais
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full preview overlay */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/image-proxy?url=${encodeURIComponent(preview.url)}`}
              alt={preview.title}
              className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl px-4 py-3">
              <p className="text-sm text-white font-medium truncate">{preview.title}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-sky-300/70">{preview.source}</p>
                {preview.width > 0 && (
                  <p className="text-xs text-white/40">{preview.width} × {preview.height}px</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setPreview(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white/60 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            <button
              onClick={() => { selectImage(preview); setPreview(null); }}
              className="absolute bottom-14 right-4 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-sm font-semibold text-white transition-colors shadow-lg"
            >
              Usar esta imagem
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImageSearchPage() {
  return (
    <Suspense>
      <ImageSearchPopup />
    </Suspense>
  );
}
