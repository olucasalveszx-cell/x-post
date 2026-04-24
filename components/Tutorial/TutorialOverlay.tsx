"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Sparkles, PenLine, LayoutTemplate, Grid3X3, Download, MessageCircle } from "lucide-react";

interface Step {
  icon: React.ReactNode;
  color: string;
  bg: string;
  title: string;
  desc: string;
  tip?: string;
}

const STEPS: Step[] = [
  {
    icon: <Sparkles size={30} />,
    color: "#4c6ef5",
    bg: "rgba(76,110,245,0.12)",
    title: "Gerar com IA",
    desc: "Clique em \"Gerar Carrossel\", escreva o tema do seu post e a IA pesquisa na web e cria todo o conteúdo dos slides automaticamente.",
    tip: "Dica: coloque palavras entre [colchetes] para destacá-las na cor do tema.",
  },
  {
    icon: <PenLine size={30} />,
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    title: "Editar qualquer elemento",
    desc: "Clique em qualquer texto ou imagem no canvas para selecionar. Arraste para mover, use as alças para redimensionar e dê duplo clique para editar o texto.",
    tip: "Dica: use Ctrl+Z para desfazer e Ctrl+Y para refazer qualquer ação.",
  },
  {
    icon: <LayoutTemplate size={30} />,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    title: "5 layouts disponíveis",
    desc: "Após gerar um carrossel, troque o layout instantaneamente — Fundo completo, Quadrado, Imagem no topo, na base ou Automático — sem precisar gerar novamente.",
    tip: "Dica: o layout \"Automático\" varia entre os slides para deixar o carrossel mais dinâmico.",
  },
  {
    icon: <Grid3X3 size={30} />,
    color: "#ec4899",
    bg: "rgba(236,72,153,0.12)",
    title: "Mais formas de criar",
    desc: "Além de gerar por tema, você tem 3 abas extras: \"Produto\" para flyers promocionais, \"Traduzir\" para adaptar conteúdo em outro idioma e \"Posts\" para seus rascunhos agendados.",
  },
  {
    icon: <Download size={30} />,
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.12)",
    title: "Exportar e publicar",
    desc: "Clique em \"Exportar\" na barra superior para baixar todos os slides em alta resolução (JPG). Conecte sua conta do Instagram e publique o carrossel direto pelo app.",
    tip: "Dica: o botão de Login Instagram fica no canto superior direito da tela.",
  },
  {
    icon: <MessageCircle size={30} />,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    title: "Nexa — sua assistente IA",
    desc: "O botão roxo com o orbe pulsante abre a Nexa. Peça ideias de conteúdo, solicite reescrita de textos, gere prompts personalizados e muito mais.",
    tip: "Dica: você também pode pedir à Nexa para gerar um carrossel completo descrevendo o que quer.",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function TutorialOverlay({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) setStep(0); }, [open]);

  if (!mounted || !open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)" }}
    >
      <div className="w-full sm:max-w-sm bg-[#0f0f0f] border-t sm:border border-[#1e1e1e] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <span className="text-[11px] font-medium text-gray-600">
            {step + 1} de {STEPS.length}
          </span>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-400 transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mx-5 h-0.5 rounded-full bg-[#1a1a1a] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: current.color }}
          />
        </div>

        {/* Content */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-5">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl"
            style={{ background: current.bg, border: `1px solid ${current.color}30`, color: current.color }}
          >
            {current.icon}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-white">{current.title}</h2>
            <p className="text-gray-500 text-sm leading-relaxed">{current.desc}</p>
          </div>

          {current.tip && (
            <div
              className="w-full px-3 py-2.5 rounded-xl text-left text-[12px] leading-relaxed"
              style={{ background: `${current.color}0d`, border: `1px solid ${current.color}22`, color: current.color }}
            >
              {current.tip}
            </div>
          )}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i === step ? current.color : "#222",
              }}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-2 px-6 pb-8">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center justify-center gap-1 px-4 py-3 rounded-2xl border border-[#222] text-gray-400 hover:text-white text-sm transition-colors shrink-0"
            >
              <ChevronLeft size={15} />
              Anterior
            </button>
          )}
          <button
            onClick={isLast ? onClose : () => setStep(step + 1)}
            className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl font-semibold text-sm transition-all text-white active:scale-[0.98]"
            style={{ background: current.color }}
          >
            {isLast ? (
              "Pronto! Vamos criar 🚀"
            ) : (
              <>Próximo <ChevronRight size={15} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
