"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Trash2, Upload, Loader2, ImageIcon, Globe, User, Plus, AlertCircle } from "lucide-react";

interface LibraryImage {
  id: string;
  public_url: string;
  prompt?: string;
  title?: string;
  filename?: string;
  tags?: string[];
  created_at: string;
}

type Tab = "ai" | "global" | "personal";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the chosen image URL — caller decides what to do with it */
  onSelect: (url: string) => void;
  /** If set, tab is locked to this value */
  defaultTab?: Tab;
}

export default function ImageLibraryModal({ open, onClose, onSelect, defaultTab }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab ?? "ai");
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const endpoint: Record<Tab, string> = {
    ai:       "/api/library/ai",
    global:   "/api/library/global",
    personal: "/api/library/personal",
  };

  const fetchImages = useCallback(async (t: Tab) => {
    setLoading(true);
    setError("");
    setImages([]);
    try {
      const res = await fetch(endpoint[t]);
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao carregar");
      setImages(await res.json());
    } catch (e: any) {
      setError(e.message ?? "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) fetchImages(tab);
  }, [open, tab, fetchImages]);

  useEffect(() => {
    if (defaultTab) setTab(defaultTab);
  }, [defaultTab]);

  const deleteImage = async (img: LibraryImage) => {
    setDeletingId(img.id);
    try {
      await fetch(`${endpoint[tab]}/${img.id}`, { method: "DELETE" });
      setImages((prev) => prev.filter((i) => i.id !== img.id));
    } catch {
      alert("Erro ao excluir imagem");
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/library/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, filename: file.name }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao fazer upload");
      const saved: LibraryImage = await res.json();
      setImages((prev) => [saved, ...prev]);
    } catch (e: any) {
      setError(e.message ?? "Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFileUpload(file);
  };

  if (!open) return null;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "ai",       label: "Minhas IA",  icon: <ImageIcon size={13} /> },
    { id: "global",   label: "Biblioteca", icon: <Globe size={13} /> },
    { id: "personal", label: "Pessoais",   icon: <User size={13} /> },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="relative w-full max-w-3xl rounded-2xl border border-[#2a2a2a] bg-[#0d0d0d] flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e] shrink-0">
          <span className="text-sm font-semibold text-white">Biblioteca de Imagens</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1a1a1a] shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-brand-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}

          {tab === "personal" && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 disabled:opacity-40 transition-colors"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? "Enviando..." : "Upload"}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={tab === "personal" ? handleDrop : undefined}
        >
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
              <Loader2 size={24} className="animate-spin text-brand-500" />
              <span className="text-sm">Carregando...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-xl p-3 mb-4">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {!loading && images.length === 0 && !error && (
            tab === "personal" ? (
              <div
                className="flex flex-col items-center justify-center py-16 gap-4 text-gray-600 border-2 border-dashed border-gray-800 rounded-2xl cursor-pointer hover:border-brand-500/40 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <div className="p-4 rounded-full bg-white/3">
                  <Plus size={24} />
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">Arraste fotos aqui ou clique para fazer upload</p>
                  <p className="text-xs mt-1">JPG, PNG, WEBP — máx 10 MB</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-600 text-sm">
                {tab === "ai" ? "Nenhuma imagem gerada ainda. Gere um carrossel e as imagens serão salvas automaticamente." : "Biblioteca vazia."}
              </div>
            )
          )}

          {!loading && images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative group aspect-square">
                  <button
                    onClick={() => { onSelect(img.public_url); onClose(); }}
                    className="w-full h-full rounded-xl overflow-hidden border-2 border-transparent hover:border-brand-500 transition-all block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.public_url}
                      alt={img.prompt ?? img.title ?? img.filename ?? ""}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>

                  {/* Delete button — shown on hover for owned images */}
                  {tab !== "global" && (
                    <button
                      onClick={() => deleteImage(img)}
                      disabled={deletingId === img.id}
                      className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all disabled:opacity-40"
                    >
                      {deletingId === img.id
                        ? <Loader2 size={11} className="animate-spin" />
                        : <Trash2 size={11} />
                      }
                    </button>
                  )}

                  {/* Tooltip */}
                  {(img.prompt || img.title || img.filename) && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <p className="text-[10px] text-white/80 truncate">
                        {img.prompt ?? img.title ?? img.filename}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
