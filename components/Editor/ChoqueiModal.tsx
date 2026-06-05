"use client";

import { useState, useEffect, useRef } from "react";
import { X, Newspaper } from "lucide-react";
import { Slide, SlideElement } from "@/types";
import { v4 as uuid } from "uuid";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (slides: Slide[]) => void;
}

function buildChoqueiSlide(title: string, igAccount: any): Slide {
  const W = 1080, H = 1350;
  const name    = igAccount?.username ?? "Meu Perfil";
  const handle  = igAccount?.username ?? "meuperfil";
  const picture = igAccount?.picture  ?? "";

  const elements: SlideElement[] = [
    {
      id: uuid(), type: "profile",
      x: 28, y: 22, width: 640, height: 90,
      profileName: name, profileHandle: handle,
      profileVerified: true,
      profileNameColor: "#ffffff",
      profileHandleColor: "rgba(255,255,255,0.55)",
      zIndex: 10,
      ...(picture ? { src: picture } : {}),
    },
    {
      id: uuid(), type: "text",
      x: W - 120, y: 28, width: 92, height: 80,
      content: "𝕏",
      style: { fontSize: 52, fontWeight: "bold", fontFamily: "sans-serif", color: "#ffffff", textAlign: "center", lineHeight: 1 },
      zIndex: 10,
    },
    {
      id: uuid(), type: "shape",
      x: 0, y: 122, width: W, height: 2,
      style: { fill: "rgba(255,255,255,0.12)", stroke: "none", strokeWidth: 0, borderRadius: 0 },
      zIndex: 5,
    },
    {
      id: uuid(), type: "text",
      x: 28, y: 138, width: W - 56, height: 220,
      content: title || "📰 NOTÍCIAS: Escreva o [título] aqui",
      style: { fontSize: 38, fontWeight: "bold", fontFamily: "sans-serif", color: "#ffffff", textAlign: "left", lineHeight: 1.35 },
      zIndex: 10,
    },
    {
      id: uuid(), type: "shape",
      x: 0, y: 370, width: W, height: 2,
      style: { fill: "rgba(255,255,255,0.12)", stroke: "none", strokeWidth: 0, borderRadius: 0 },
      zIndex: 5,
    },
    {
      id: uuid(), type: "frame",
      x: 2, y: 374, width: 534, height: 970,
      frameShape: "rect", frameMediaType: "image",
      zIndex: 8,
    },
    {
      id: uuid(), type: "shape",
      x: 538, y: 374, width: 4, height: 970,
      style: { fill: "rgba(0,0,0,1)", stroke: "none", strokeWidth: 0, borderRadius: 0 },
      zIndex: 9,
    },
    {
      id: uuid(), type: "frame",
      x: 544, y: 374, width: 534, height: 970,
      frameShape: "rect", frameMediaType: "video",
      zIndex: 8,
    },
  ];

  return { id: uuid(), backgroundColor: "#111111", elements, width: W, height: H };
}

export default function ChoqueiModal({ open, onClose, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  if (!open) return null;

  const igAccount = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("ig_account") ?? "null")
    : null;

  const handleCreate = () => {
    const slide = buildChoqueiSlide(title.trim(), igAccount);
    onCreate([slide]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-2)] border border-[var(--border-2)] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Newspaper size={18} className="text-gray-400" />
            <h2 className="text-base font-bold text-[var(--text)]">Estilo Choquei</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-3)] text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Perfil preview */}
        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-[var(--bg-3)] border border-[var(--border)]">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-4)] overflow-hidden shrink-0 flex items-center justify-center">
            {igAccount?.picture
              ? <img src={igAccount.picture} alt="" className="w-full h-full object-cover" />
              : <span className="text-lg text-[var(--text-3)]">👤</span>
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">{igAccount?.username ?? "Meu Perfil"} ✓</p>
            <p className="text-xs text-[var(--text-3)]">@{igAccount?.username ?? "meuperfil"}</p>
          </div>
          <div className="ml-auto text-lg font-black text-[var(--text-3)]">𝕏</div>
        </div>

        {/* Input título */}
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">
            📰 Título da notícia
          </label>
          <textarea
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleCreate(); }}
            placeholder="Ex: Neymar já está em solo americano para a Copa do Mundo."
            rows={3}
            className="w-full bg-[var(--bg)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-white/30 resize-none leading-relaxed"
          />
          <p className="text-[10px] text-[var(--text-3)]">Ctrl+Enter para criar · Você vai adicionar imagem e vídeo no editor</p>
        </div>

        {/* Botões */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[var(--border-2)] text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 py-2.5 rounded-xl bg-[#111] border border-white/20 hover:border-white/40 text-white text-sm font-semibold transition-all"
          >
            Criar slide
          </button>
        </div>
      </div>
    </div>
  );
}
