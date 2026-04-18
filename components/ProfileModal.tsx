"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Download, Trash2, Loader2, ImageIcon, Layers, RefreshCw } from "lucide-react";

interface HistoryEntry {
  id: string;
  title: string;
  coverUrl: string;
  slideCount: number;
  createdAt: string;
}

interface ImageEntry {
  id: string;
  url: string;
  savedAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ProfileModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<"history" | "images">("history");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [images,  setImages]  = useState<ImageEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.history ?? []);
      setImages(data.images ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl bg-[#0e0e0e] border-t sm:border border-[#222] rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e] shrink-0">
          <p className="font-bold text-sm text-white">Meu Perfil</p>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1e1e1e] shrink-0">
          {(["history", "images"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                tab === t ? "text-white border-b-2 border-purple-500" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "history" ? <><Layers size={13} /> Histórico</> : <><ImageIcon size={13} /> Biblioteca</>}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="text-purple-400 animate-spin" />
            </div>
          )}

          {!loading && tab === "history" && (
            <>
              {history.length === 0 ? (
                <div className="text-center py-16 text-gray-600 text-sm">
                  <Layers size={32} className="mx-auto mb-3 opacity-30" />
                  Nenhum carrossel salvo ainda.<br />
                  <span className="text-xs">Exporte um carrossel para salvar no histórico.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl overflow-hidden border border-[#1e1e1e] bg-[#141414] flex flex-col"
                    >
                      {/* Cover */}
                      <div className="relative aspect-[4/5] bg-[#111]">
                        {item.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Layers size={24} className="text-gray-700" />
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 px-2 py-1 text-[10px] text-gray-400"
                          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
                          {item.slideCount} slide{item.slideCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                      {/* Info */}
                      <div className="px-2.5 py-2 flex flex-col gap-1">
                        <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                        <p className="text-[10px] text-gray-600">{fmt(item.createdAt)}</p>
                        <a
                          href={item.coverUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 transition-colors"
                        >
                          <Download size={11} /> Baixar capa
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!loading && tab === "images" && (
            <>
              {images.length === 0 ? (
                <div className="text-center py-16 text-gray-600 text-sm">
                  <ImageIcon size={32} className="mx-auto mb-3 opacity-30" />
                  Nenhuma imagem salva ainda.<br />
                  <span className="text-xs">As imagens exportadas aparecem aqui.</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {images.map((img) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-[3/4] bg-[#111]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a
                          href={img.url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                          <Download size={14} className="text-white" />
                        </a>
                      </div>
                      <div className="absolute bottom-1 left-1 right-1 text-[9px] text-gray-400 truncate">
                        {fmt(img.savedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1e1e1e] shrink-0 flex justify-between items-center">
          <p className="text-[10px] text-gray-600">
            {tab === "history" ? `${history.length}/30 carrosséis` : `${images.length}/100 imagens`}
          </p>
          <button onClick={load} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}
