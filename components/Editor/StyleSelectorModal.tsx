"use client";

import { X, Sparkles, Twitter } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (style: "layouts" | "twitter") => void;
}

export default function StyleSelectorModal({ open, onClose, onSelect }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0d0d0d] border border-[#222] rounded-2xl p-6 w-full max-w-[520px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Como quer criar?</h2>
            <p className="text-xs text-gray-500 mt-0.5">Escolha o estilo do carrossel</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">

          {/* ── Gerar Layouts ── */}
          <button
            onClick={() => onSelect("layouts")}
            className="flex flex-col gap-3 p-4 rounded-xl border border-[#2a2a2a] hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left group"
          >
            <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: "4/5" }}>
              {/* Slide stack */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(145deg,#1a0533,#2d0a5c,#4a1090)" }} />
              {/* Gradiente overlay */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0.3) 60%,transparent 100%)" }} />
              {/* Sparkles decorativos */}
              <div className="absolute top-[12%] right-[12%] w-2 h-2 rounded-full bg-purple-300/60" />
              <div className="absolute top-[22%] left-[18%] w-1.5 h-1.5 rounded-full bg-pink-300/50" />
              <div className="absolute top-[35%] right-[25%] w-1 h-1 rounded-full bg-white/40" />
              {/* Conteúdo do slide */}
              <div className="absolute bottom-[28%] left-[8%] right-[8%] space-y-1.5">
                <div className="h-[10%] rounded-md bg-white/90" style={{ height: 9 }} />
                <div className="h-[7%] rounded-md bg-white/60" style={{ height: 6, width: "75%" }} />
              </div>
              <div className="absolute bottom-[10%] left-[8%] right-[8%] h-[12%] rounded-lg border border-purple-400/30 bg-purple-500/20 flex items-center gap-1.5 px-2">
                <Sparkles size={10} className="text-purple-300 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <div className="h-1.5 w-12 bg-purple-300/70 rounded" />
                  <div className="h-1 w-8 bg-purple-400/40 rounded" />
                </div>
              </div>
              {/* Badge IA */}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-purple-200 bg-purple-500/30 border border-purple-400/20">
                <Sparkles size={7} /> IA
              </div>
            </div>
            <div>
              <p className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">Gerar Layouts</p>
              <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                Imagens por IA em cada slide com gradientes
              </p>
            </div>
          </button>

          {/* ── Estilo Twitter / X ── */}
          <button
            onClick={() => onSelect("twitter")}
            className="flex flex-col gap-3 p-4 rounded-xl border border-[#2a2a2a] hover:border-sky-500/50 hover:bg-sky-500/5 transition-all text-left group"
          >
            <div className="relative w-full rounded-lg overflow-hidden bg-[#f4f4f4]" style={{ aspectRatio: "4/5" }}>

              {/* Wave grid SVG — igual ao gerado no canvas */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f7f7f7" />
                {/* Linhas horizontais onduladas */}
                {[0,1,2,3,4,5,6,7,8].map((i) => {
                  const y = (i / 8) * 100;
                  const wave = Math.sin(i * 0.8) * 3;
                  const wave2 = Math.sin(i * 0.4 + 1) * 2;
                  return (
                    <path
                      key={`h${i}`}
                      d={`M0,${y + wave}% Q25%,${y + wave2}% 50%,${y - wave}% T100%,${y + wave * 0.5}%`}
                      stroke="rgba(0,0,0,0.07)" strokeWidth="0.8" fill="none"
                    />
                  );
                })}
                {/* Linhas verticais onduladas */}
                {[0,1,2,3,4,5,6,7,8,9].map((i) => {
                  const x = (i / 9) * 100;
                  const wave = Math.sin(i * 0.7) * 2.5;
                  return (
                    <path
                      key={`v${i}`}
                      d={`M${x + wave}%,0 Q${x - wave}%,50% ${x + wave * 0.5}%,100%`}
                      stroke="rgba(0,0,0,0.07)" strokeWidth="0.8" fill="none"
                    />
                  );
                })}
              </svg>

              {/* Slide de capa — topo */}
              <div
                className="absolute top-[3%] left-[8%] right-[8%] rounded-lg overflow-hidden shadow-sm"
                style={{ height: "28%", background: "linear-gradient(135deg,#1d9bf0,#0a5fa3)" }}
              >
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.6),transparent)" }} />
                <div className="absolute bottom-[15%] left-[8%] right-[30%] h-2 rounded bg-white/80" />
                <div className="absolute bottom-[6%] left-[8%] right-[45%] h-1.5 rounded bg-white/50" />
                <div className="absolute top-2 right-2 text-[7px] font-black text-white/70 bg-black/20 px-1 py-0.5 rounded">1</div>
              </div>

              {/* Slides internos — conteúdo tipo post */}
              <div className="absolute left-[8%] right-[8%] space-y-1.5" style={{ top: "35%" }}>
                {/* Linha título */}
                <div className="h-2 rounded bg-[#111]/75 w-[85%]" />
                <div className="h-2 rounded bg-[#111]/75 w-[70%]" />
                {/* Corpo */}
                <div className="h-1.5 rounded bg-[#444]/45 w-[90%] mt-1" />
                <div className="h-1.5 rounded bg-[#444]/45 w-[75%]" />
                <div className="h-1.5 rounded bg-[#444]/45 w-[60%]" />
              </div>

              {/* Perfil fixo — rodapé */}
              <div
                className="absolute bottom-[5%] left-[8%] right-[8%] rounded-lg bg-white shadow-sm flex items-center gap-2 px-2.5"
                style={{ height: "14%" }}
              >
                <div className="w-6 h-6 rounded-full bg-[#1d9bf0] shrink-0 flex items-center justify-center">
                  <Twitter size={10} color="white" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="h-1.5 w-14 bg-[#111] rounded" />
                  <div className="h-1 w-10 bg-[#999] rounded" />
                </div>
                <div className="ml-auto">
                  <div className="w-3 h-3 rounded-full bg-[#1d9bf0]/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1d9bf0]" />
                  </div>
                </div>
              </div>

              {/* Badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-sky-600 bg-sky-100 border border-sky-200">
                <Twitter size={7} /> X
              </div>
            </div>
            <div>
              <p className="font-bold text-white text-sm group-hover:text-sky-300 transition-colors">Estilo Twitter / X</p>
              <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                Capa com foto + slides brancos com grid + perfil fixo
              </p>
            </div>
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-700 mt-4">
          Você pode mudar o estilo a qualquer momento após gerar
        </p>
      </div>
    </div>
  );
}
