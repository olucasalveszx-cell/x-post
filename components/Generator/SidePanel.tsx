"use client";

import { useState } from "react";
import { Sparkles, Languages, ShoppingBag, Calendar, FileText } from "lucide-react";
import { Slide } from "@/types";
import GeneratorPanel from "./GeneratorPanel";
import TranslatePanel from "./TranslatePanel";
import PromoPanel from "./PromoPanel";
import CalendarPanel from "@/components/Calendar/CalendarPanel";
import DraftsPanel from "@/components/Calendar/DraftsPanel";

interface Props {
  onGenerate: (slides: Slide[]) => void;
  currentSlides?: Slide[];
}

type Tab = "generate" | "promo" | "drafts" | "calendar" | "translate";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "generate",  label: "Gerar",      icon: <Sparkles size={12} /> },
  { id: "promo",     label: "Produto",    icon: <ShoppingBag size={12} /> },
  { id: "drafts",    label: "Salvos",     icon: <FileText size={12} /> },
  { id: "calendar",  label: "Agenda",     icon: <Calendar size={12} /> },
  { id: "translate", label: "Traduzir",   icon: <Languages size={12} /> },
];

export default function SidePanel({ onGenerate, currentSlides = [] }: Props) {
  const [tab, setTab] = useState<Tab>("generate");

  return (
    <div className="w-80 bg-[#080808] border-r border-[#161616] flex flex-col overflow-hidden">
      {/* Abas */}
      <div className="flex border-b border-[#161616] shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? "text-white border-b-2 border-brand-500"
                : "text-gray-500 hover:text-gray-300"
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
        {tab === "drafts"    && <DraftsPanel currentSlides={currentSlides} onLoad={onGenerate} />}
        {tab === "calendar"  && <CalendarPanel />}
        {tab === "translate" && <TranslatePanel onGenerate={onGenerate} />}
      </div>
    </div>
  );
}
