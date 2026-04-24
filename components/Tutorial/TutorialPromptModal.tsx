"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Sparkles } from "lucide-react";

const NEVER_KEY = "xpz_tutorial_never";
const SESSION_KEY = "xpz_tutorial_prompt_shown";

interface Props {
  open: boolean;
  onStart: () => void;
  onClose: () => void;
}

export default function TutorialPromptModal({ open, onStart, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !open) return null;

  const handleStart = () => {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    onStart();
  };

  const handleSkip = () => {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    onClose();
  };

  const handleNever = () => {
    try {
      localStorage.setItem(NEVER_KEY, "1");
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}
    onClose();
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div className="w-full sm:max-w-sm bg-[#0f0f0f] border-t sm:border border-[#1e1e1e] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 pt-8 pb-2 flex flex-col items-center text-center gap-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20">
            <BookOpen size={28} className="text-brand-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Quer um tour rápido?</h2>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              Vamos te mostrar as principais funções do editor em menos de 2 minutos.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-6 pb-8 pt-6">
          <button
            onClick={handleStart}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98]"
          >
            <Sparkles size={15} /> Ver tutorial
          </button>
          <button
            onClick={handleSkip}
            className="text-[12px] text-gray-600 hover:text-gray-400 py-2 transition-colors"
          >
            Pular por agora
          </button>
          <button
            onClick={handleNever}
            className="text-[11px] text-gray-700 hover:text-gray-500 pb-1 transition-colors"
          >
            Não mostrar mais
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export { NEVER_KEY, SESSION_KEY };
