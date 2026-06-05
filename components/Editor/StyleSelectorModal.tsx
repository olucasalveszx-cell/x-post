"use client";

import { X, Sparkles, Twitter, UserRound, Images, Newspaper } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (style: "layouts" | "twitter" | "comrosto" | "biblioteca" | "choquei") => void;
}

const STYLES = [
  {
    id: "layouts" as const,
    label: "Gerar Layouts",
    desc: "Imagens por IA em cada slide com gradientes",
    accent: "hover:border-brand-500/50 hover:bg-brand-500/5",
    labelColor: "group-hover:text-brand-400",
    tag: { color: "text-blue-200 bg-brand-500/25 border-brand-400/20", icon: <Sparkles size={7} />, text: "IA" },
    preview: (
      <div className="absolute inset-0" style={{ background: "linear-gradient(145deg,#0f172a,#1e2fa0,#3b5bdb)" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0.3) 60%,transparent 100%)" }} />
        <div className="absolute top-[12%] right-[12%] w-2 h-2 rounded-full bg-purple-300/60" />
        <div className="absolute top-[22%] left-[18%] w-1.5 h-1.5 rounded-full bg-pink-300/50" />
        <div className="absolute bottom-[28%] left-[8%] right-[8%] space-y-1.5">
          <div className="h-[10%] rounded-md bg-white/90" style={{ height: 9 }} />
          <div className="rounded-md bg-white/60" style={{ height: 6, width: "75%" }} />
        </div>
        <div className="absolute bottom-[10%] left-[8%] right-[8%] rounded-lg border border-purple-400/30 bg-purple-500/20 flex items-center gap-1.5 px-2 py-1">
          <Sparkles size={10} className="text-brand-400 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <div className="h-1.5 w-10 bg-purple-300/70 rounded" />
            <div className="h-1 w-7 bg-purple-400/40 rounded" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "twitter" as const,
    label: "Estilo Twitter / X",
    desc: "Capa com foto + slides brancos com grid + perfil fixo",
    accent: "hover:border-sky-500/50 hover:bg-sky-500/5",
    labelColor: "group-hover:text-sky-300",
    tag: { color: "text-sky-600 bg-sky-100 border-sky-200", icon: <Twitter size={7} />, text: "X" },
    preview: (
      <div className="absolute inset-0 bg-[#f7f7f7]">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          {[0,1,2,3,4,5,6].map((i) => {
            const y = (i / 6) * 100;
            return <path key={`h${i}`} d={`M0,${y} L100,${y}`} stroke="rgba(0,0,0,0.06)" strokeWidth="0.8" fill="none" />;
          })}
          {[0,1,2,3,4,5,6,7].map((i) => {
            const x = (i / 7) * 100;
            return <path key={`v${i}`} d={`M${x},0 L${x},100`} stroke="rgba(0,0,0,0.06)" strokeWidth="0.8" fill="none" />;
          })}
        </svg>
        <div className="absolute top-[3%] left-[8%] right-[8%] rounded-lg overflow-hidden shadow-sm" style={{ height: "30%", background: "linear-gradient(135deg,#1d9bf0,#0a5fa3)" }}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.6),transparent)" }} />
          <div className="absolute bottom-[15%] left-[8%] right-[30%] h-2 rounded bg-white/80" />
          <div className="absolute bottom-[6%] left-[8%] right-[45%] h-1.5 rounded bg-white/50" />
        </div>
        <div className="absolute left-[8%] right-[8%] space-y-1.5" style={{ top: "38%" }}>
          <div className="h-2 rounded bg-[#111]/75 w-[85%]" />
          <div className="h-2 rounded bg-[#111]/75 w-[70%]" />
          <div className="h-1.5 rounded bg-[#444]/45 w-[90%] mt-1" />
        </div>
        <div className="absolute bottom-[5%] left-[8%] right-[8%] rounded-lg bg-white shadow-sm flex items-center gap-2 px-2" style={{ height: "14%" }}>
          <div className="w-5 h-5 rounded-full bg-[#1d9bf0] shrink-0 flex items-center justify-center"><Twitter size={9} color="white" /></div>
          <div className="flex flex-col gap-0.5">
            <div className="h-1.5 w-12 bg-[#111] rounded" />
            <div className="h-1 w-8 bg-[#999] rounded" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "comrosto" as const,
    label: "Com Rosto",
    desc: "Seu rosto preservado em cada imagem",
    accent: "hover:border-purple-500/50 hover:bg-purple-500/5",
    labelColor: "group-hover:text-purple-400",
    tag: { color: "text-purple-200 bg-purple-500/25 border-purple-400/20", icon: <UserRound size={7} />, text: "Rosto" },
    preview: (
      <div className="absolute inset-0" style={{ background: "linear-gradient(145deg,#1a0030,#3b0068,#6d28d9)" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.2) 55%,transparent 100%)" }} />
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
          <div className="w-8 h-8 rounded-full bg-purple-300/40 border border-purple-400/40" />
          <div className="w-12 h-4 rounded-full bg-purple-300/20 border border-purple-400/20" />
        </div>
        <div className="absolute bottom-[28%] left-[8%] right-[8%] space-y-1.5">
          <div className="rounded-md bg-white/85" style={{ height: 9 }} />
          <div className="rounded-md bg-white/50" style={{ height: 6, width: "70%" }} />
        </div>
      </div>
    ),
  },
  {
    id: "choquei" as const,
    label: "📰 Estilo Choquei",
    desc: "Perfil + título + imagem e vídeo lado a lado",
    accent: "hover:border-white/30 hover:bg-white/5",
    labelColor: "group-hover:text-white",
    tag: { color: "text-gray-300 bg-white/10 border-white/15", icon: <Newspaper size={7} />, text: "News" },
    preview: (
      <div className="absolute inset-0 bg-[#111]">
        <div className="absolute top-[4%] left-[6%] right-[6%] flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-white/20 shrink-0" />
          <div className="flex flex-col gap-0.5 flex-1">
            <div className="h-1.5 w-10 bg-white/70 rounded" />
            <div className="h-1 w-7 bg-white/30 rounded" />
          </div>
          <div className="text-[7px] font-black text-white/40">𝕏</div>
        </div>
        <div className="absolute bg-white/10" style={{ top: "20%", left: 0, right: 0, height: 1 }} />
        <div className="absolute left-[6%] right-[6%] space-y-1" style={{ top: "24%" }}>
          <div className="h-2 rounded bg-white/80 w-full" />
          <div className="h-2 rounded bg-white/60 w-[80%]" />
        </div>
        <div className="absolute bg-white/10" style={{ top: "42%", left: 0, right: 0, height: 1 }} />
        <div className="absolute left-[2%] right-[2%] flex gap-[2%]" style={{ top: "44%", bottom: "4%" }}>
          <div className="flex-1 rounded-sm bg-white/20" />
          <div className="flex-1 rounded-sm bg-white/10" />
        </div>
      </div>
    ),
  },
  {
    id: "biblioteca" as const,
    label: "Da Biblioteca",
    desc: "Reutiliza imagens salvas — sem custo de geração",
    accent: "hover:border-blue-500/50 hover:bg-blue-500/5",
    labelColor: "group-hover:text-blue-400",
    tag: { color: "text-blue-200 bg-blue-500/25 border-blue-400/20", icon: <Images size={7} />, text: "Biblioteca" },
    preview: (
      <div className="absolute inset-0" style={{ background: "linear-gradient(145deg,#070d1a,#0f2044,#1a3a6e)" }}>
        <div className="absolute inset-[8%] grid grid-cols-3 gap-1">
          {[
            "linear-gradient(135deg,#1e3a5f,#2d6a9f)",
            "linear-gradient(135deg,#3b1f5e,#7c3aed)",
            "linear-gradient(135deg,#1f3b2d,#2d9a5f)",
            "linear-gradient(135deg,#5e2020,#c0392b)",
            "linear-gradient(135deg,#3d3520,#b8960c)",
            "linear-gradient(135deg,#1a2a4a,#2980b9)",
          ].map((grad, i) => (
            <div key={i} className="rounded-sm aspect-square" style={{ background: grad, opacity: 0.85 }} />
          ))}
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 60%)" }} />
        <div className="absolute bottom-[10%] left-[8%] right-[8%] space-y-1">
          <div className="rounded bg-white/80" style={{ height: 8 }} />
          <div className="rounded bg-white/50" style={{ height: 5, width: "65%" }} />
        </div>
      </div>
    ),
  },
];

export default function StyleSelectorModal({ open, onClose, onSelect }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-2)] border border-[var(--border-2)] rounded-2xl p-5 w-full max-w-[92vw] md:max-w-[900px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-[var(--text)]">Como quer criar?</h2>
            <p className="text-xs text-[var(--text-3)] mt-0.5">Escolha o estilo do carrossel</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-3)] text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cards — linha horizontal com scroll no mobile */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`flex flex-col gap-2.5 p-3 rounded-xl border border-[var(--border-2)] ${s.accent} transition-all text-left group shrink-0 w-[140px] md:w-[160px] flex-1 min-w-[130px] max-w-[180px]`}
            >
              {/* Preview */}
              <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: "4/5" }}>
                {s.preview}
                {/* Tag */}
                <div className={`absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-bold border ${s.tag.color}`}>
                  {s.tag.icon} {s.tag.text}
                </div>
              </div>
              {/* Label */}
              <div>
                <p className={`font-bold text-[var(--text)] text-xs ${s.labelColor} transition-colors leading-tight`}>{s.label}</p>
                <p className="text-[10px] text-[var(--text-3)] leading-snug mt-0.5">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-[10px] text-[var(--text-3)] mt-3">
          Você pode mudar o estilo a qualquer momento após gerar
        </p>
      </div>
    </div>
  );
}
