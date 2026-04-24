"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";

const SESSION_KEY = "xpz_session_welcomed";

const SUGGESTIONS = [
  "Marketing digital para pequenas empresas",
  "Dicas de produtividade no trabalho",
  "Como investir do zero",
  "Receitas saudáveis rápidas",
  "Motivação para empreendedores",
];

interface Props {
  onConfirm: (topic: string) => void;
  onDone?: () => void;
}

export default function OnboardingModal({ onConfirm, onDone }: Props) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Mostra sempre que uma nova sessão de login é detectada
  useEffect(() => {
    if (status !== "authenticated") return;
    const userKey = `${SESSION_KEY}_${session?.user?.email ?? "guest"}`;
    const seen = sessionStorage.getItem(userKey);
    if (!seen) setOpen(true);
  }, [status, session?.user?.email]);

  const markSeen = () => {
    const userKey = `${SESSION_KEY}_${session?.user?.email ?? "guest"}`;
    sessionStorage.setItem(userKey, "1");
  };

  const handleConfirm = () => {
    if (!topic.trim()) return;
    markSeen();
    setOpen(false);
    onConfirm(topic.trim());
    onDone?.();
  };

  const handleSkip = () => {
    markSeen();
    setOpen(false);
    onDone?.();
  };

  if (!mounted || !open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center sm:p-6"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)" }}
    >
      <div className="w-full sm:max-w-md bg-[#0f0f0f] border-t sm:border border-[#1e1e1e] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 mb-4">
            <Sparkles size={26} className="text-brand-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Bem-vindo! 👋</h2>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Qual será o trabalho de hoje?<br />
            <span className="text-gray-600">Diga o tema e a IA cria os slides pra você.</span>
          </p>
        </div>

        {/* Input */}
        <div className="px-6 pb-4 flex flex-col gap-3">
          <input
            autoFocus
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            placeholder="Ex: marketing para dentistas..."
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600 transition-colors"
          />

          {/* Sugestões */}
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setTopic(s)}
                className="text-[11px] px-3 py-1.5 rounded-full border border-[#222] bg-[#111] text-gray-500 hover:border-brand-500/40 hover:text-brand-400 hover:bg-brand-500/5 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-8 flex flex-col gap-2">
          <button
            onClick={handleConfirm}
            disabled={!topic.trim()}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98]"
          >
            <Sparkles size={15} /> Criar slides agora <ArrowRight size={15} />
          </button>
          <button
            onClick={handleSkip}
            className="text-[12px] text-gray-600 hover:text-gray-400 py-2 transition-colors"
          >
            Entrar direto no editor
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
