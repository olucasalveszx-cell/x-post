"use client";

import { useState } from "react";
import { Sparkles, Languages, ShoppingBag, CalendarClock, X, RefreshCw } from "lucide-react";
import { Slide } from "@/types";
import GeneratorPanel from "./GeneratorPanel";
import TranslatePanel from "./TranslatePanel";
import PromoPanel from "./PromoPanel";
import PostsPanel from "@/components/Calendar/PostsPanel";

interface Props {
  onGenerate: (slides: Slide[]) => void;
  currentSlides?: Slide[];
  onClose?: () => void;
}

type Tab = "generate" | "promo" | "posts" | "translate";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "generate",  label: "Gerar",      icon: <Sparkles size={12} /> },
  { id: "promo",     label: "Produto",    icon: <ShoppingBag size={12} /> },
  { id: "posts",     label: "Posts",      icon: <CalendarClock size={12} /> },
  { id: "translate", label: "Traduzir",   icon: <Languages size={12} /> },
];

export default function SidePanel({ onGenerate, currentSlides = [], onClose }: Props) {
  const [tab, setTab] = useState<Tab>("generate");

  return (
    <div className="w-80 bg-[var(--bg-2)] border-r border-[var(--border)] flex flex-col overflow-hidden">
      {/* Abas */}
      <div className="flex border-b border-[var(--border)] shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? "text-[var(--text)] border-b-2 border-brand-500"
                : "text-[var(--text-3)] hover:text-[var(--text-2)]"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "generate"  && <GeneratorPanel onGenerate={onGenerate} />}
        {tab === "promo"     && <PromoPanel onGenerate={onGenerate} />}
        {tab === "posts"     && <PostsPanel currentSlides={currentSlides} onLoad={onGenerate} />}
        {tab === "translate" && <TranslatePanel onGenerate={onGenerate} />}
      </div>

      {/* Botão Fechar */}
      <div className="shrink-0 border-t border-[var(--border)] p-3 flex gap-2">
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--bg-3)] transition-colors"
          >
            <X size={14} /> Fechar
          </button>
        )}
        <button
          onClick={() => window.location.reload()}
          title="Recarregar app"
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--bg-3)] transition-colors"
        >
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Recarregar</span>
        </button>
      </div>
    </div>
  );
}
