"use client";

import { useState } from "react";
import { Sparkles, Languages } from "lucide-react";
import { Slide } from "@/types";
import GeneratorPanel from "./GeneratorPanel";
import TranslatePanel from "./TranslatePanel";

interface Props {
  onGenerate: (slides: Slide[]) => void;
}

type Tab = "generate" | "translate";

export default function SidePanel({ onGenerate }: Props) {
  const [tab, setTab] = useState<Tab>("generate");

  return (
    <div className="w-80 bg-[#080808] border-r border-[#161616] flex flex-col overflow-hidden">
      {/* Abas */}
      <div className="flex border-b border-[#161616] shrink-0">
        <button
          onClick={() => setTab("generate")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
            tab === "generate"
              ? "text-white border-b-2 border-brand-500"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Sparkles size={14} />
          Gerar
        </button>
        <button
          onClick={() => setTab("translate")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
            tab === "translate"
              ? "text-white border-b-2 border-brand-500"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Languages size={14} />
          Traduzir
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "generate" ? (
          <GeneratorPanel onGenerate={onGenerate} />
        ) : (
          <TranslatePanel onGenerate={onGenerate} />
        )}
      </div>
    </div>
  );
}
