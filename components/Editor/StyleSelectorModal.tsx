"use client";

import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (style: "layouts" | "twitter") => void;
}

export default function StyleSelectorModal({ open, onClose, onSelect }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl p-6 w-full max-w-[480px] shadow-2xl">
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
          {/* Gerar Layouts */}
          <button
            onClick={() => onSelect("layouts")}
            className="flex flex-col gap-3 p-4 rounded-xl border border-[#2a2a2a] hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left group"
          >
            {/* Preview */}
            <div
              className="relative w-full rounded-lg overflow-hidden"
              style={{ aspectRatio: "4/5", background: "linear-gradient(160deg,#4f46e5,#7c3aed,#db2777)" }}
            >
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.5) 50%,rgba(0,0,0,0.1) 100%)" }}
              />
              <div className="absolute bottom-[22%] left-[8%] right-[8%] h-[14%] rounded bg-white/90" />
              <div className="absolute bottom-[13%] left-[8%] right-[30%] h-[5%] rounded bg-white/50" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Gerar Layouts</p>
              <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                Imagens por IA em cada slide com gradientes
              </p>
            </div>
          </button>

          {/* Estilo Twitter */}
          <button
            onClick={() => onSelect("twitter")}
            className="flex flex-col gap-3 p-4 rounded-xl border border-[#2a2a2a] hover:border-sky-500/50 hover:bg-sky-500/5 transition-all text-left group"
          >
            {/* Preview */}
            <div
              className="relative w-full rounded-lg overflow-hidden bg-white"
              style={{ aspectRatio: "4/5" }}
            >
              {/* Grid lines simulados */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                {[0,1,2,3,4,5,6].map((i) => (
                  <line
                    key={`h${i}`}
                    x1="0" y1={`${(i / 6) * 100}%`}
                    x2="100%" y2={`${(i / 6) * 100 + (Math.sin(i * 0.8) * 5)}%`}
                    stroke="#ccc" strokeWidth="0.6"
                  />
                ))}
                {[0,1,2,3,4,5,6,7].map((i) => (
                  <line
                    key={`v${i}`}
                    x1={`${(i / 7) * 100}%`} y1="0"
                    x2={`${(i / 7) * 100 + (Math.sin(i * 0.6) * 4)}%`} y2="100%"
                    stroke="#ccc" strokeWidth="0.6"
                  />
                ))}
              </svg>
              {/* Texto escuro */}
              <div className="absolute top-[15%] left-[8%] right-[8%] h-[13%] rounded bg-[#111]/80" />
              <div className="absolute top-[32%] left-[8%] right-[20%] h-[5%] rounded bg-[#333]/60" />
              <div className="absolute top-[40%] left-[8%] right-[25%] h-[5%] rounded bg-[#333]/60" />
              {/* Profile card */}
              <div className="absolute bottom-[8%] left-[8%] right-[8%] h-[12%] rounded bg-[#eee] flex items-center gap-1 px-2">
                <div className="w-5 h-5 rounded-full bg-[#bbb] shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <div className="h-1.5 w-10 bg-[#999] rounded" />
                  <div className="h-1 w-7 bg-[#bbb] rounded" />
                </div>
              </div>
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Estilo Twitter</p>
              <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                1º slide com foto + grid branco + perfil fixo
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
