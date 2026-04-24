"use client";

import { useState } from "react";
import { BookOpen, Sparkles, Loader2, Copy, Check, ChevronDown, ChevronUp, Play } from "lucide-react";
import { Slide } from "@/types";
import { v4 as uuid } from "uuid";

interface StoryScript {
  hook: string;
  scenes: { text: string; tip: string }[];
  cta: string;
}

interface Props {
  onGenerate?: (slides: Slide[]) => void;
}

const TONES = ["Inspirador", "Educativo", "Divertido", "Emocional", "Urgente"];
const FORMATS = ["Tutorial passo a passo", "Antes & depois", "Revelação/twist", "Pergunta + resposta", "Bastidores"];

const W = 1080, H = 1920;

function buildStorySlide(text: string, sub: string, accent: string, bg: string): Slide {
  return {
    id: uuid(),
    backgroundColor: bg,
    elements: [
      {
        id: uuid(), type: "shape" as const,
        x: W / 2 - 50, y: 555, width: 100, height: 8,
        style: { fill: accent, stroke: "transparent", strokeWidth: 0, borderRadius: 4 } as any,
      },
      {
        id: uuid(), type: "text" as const,
        x: 80, y: 600, width: W - 160, height: 460,
        content: text,
        style: { fontSize: 86, fontWeight: "bold" as const, fontFamily: "sans-serif", color: "#ffffff", textAlign: "center" as const, lineHeight: 1.12 },
      },
      {
        id: uuid(), type: "text" as const,
        x: 80, y: 1130, width: W - 160, height: 120,
        content: sub,
        style: { fontSize: 34, fontWeight: "normal" as const, fontFamily: "sans-serif", color: accent + "cc", textAlign: "center" as const, lineHeight: 1.3 },
      },
    ],
    width: W,
    height: H,
  };
}

export default function StorytellingAssistant({ onGenerate }: Props) {
  const [topic, setTopic]       = useState("");
  const [tone, setTone]         = useState("Inspirador");
  const [format, setFormat]     = useState("Tutorial passo a passo");
  const [slides, setSlides]     = useState("5");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<StoryScript | null>(null);
  const [error, setError]       = useState("");
  const [copied, setCopied]     = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [building, setBuilding] = useState(false);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/storytelling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone, format, slides: parseInt(slides) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar");
      setResult(data.script);
    } catch (e: any) {
      setError(e.message ?? "Erro desconhecido");
    }
    setLoading(false);
  };

  const generateProject = () => {
    if (!result || !onGenerate) return;
    setBuilding(true);

    const items = [
      { text: result.hook, sub: "Hook — Abertura", accent: "#fbbf24", bg: "#0a0800" },
      ...result.scenes.map((s) => ({ text: s.text, sub: s.tip || "", accent: "#a855f7", bg: "#06000f" })),
      { text: result.cta, sub: "Chamada para ação", accent: "#10b981", bg: "#00080a" },
    ];

    const storySlides = items.map(item => buildStorySlide(item.text, item.sub, item.accent, item.bg));
    onGenerate(storySlides);
    setBuilding(false);
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <BookOpen size={13} className="text-purple-400" />
          </div>
          <span className="text-xs font-semibold text-[var(--text)]">Assistente de Storytelling</span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 pl-1">
          {/* Tema */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Tema / Produto</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generate()}
              placeholder="ex: Lançamento do meu curso de fotografia"
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Tom */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Tom</label>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map(t => (
                <button key={t} onClick={() => setTone(t)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
                    tone === t ? "bg-purple-600 border-purple-500 text-white" : "border-[#2a2a2a] text-gray-500 hover:text-gray-300 hover:border-[#3a3a3a]"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Formato */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Formato</label>
            <div className="flex flex-wrap gap-1.5">
              {FORMATS.map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
                    format === f ? "bg-purple-600 border-purple-500 text-white" : "border-[#2a2a2a] text-gray-500 hover:text-gray-300 hover:border-[#3a3a3a]"
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Nº de slides */}
          <div className="flex items-center gap-3">
            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide whitespace-nowrap">Nº de Stories</label>
            <input type="range" min="3" max="10" value={slides} onChange={e => setSlides(e.target.value)}
              className="flex-1 accent-purple-500" />
            <span className="text-xs text-[var(--text-2)] w-4 text-right">{slides}</span>
          </div>

          {/* Erro */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-[10px] text-red-400">
              {error}
            </div>
          )}

          {/* Botão */}
          <button onClick={generate} disabled={loading || !topic.trim()}
            className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}>
            {loading ? <><Loader2 size={13} className="animate-spin" /> Gerando roteiro...</> : <><Sparkles size={13} /> Gerar roteiro de Stories</>}
          </button>

          {/* Resultado */}
          {result && (
            <div className="flex flex-col gap-2.5 pt-1">
              {/* Hook */}
              <ScriptBlock label="Hook (abertura)" text={result.hook} onCopy={() => copyText(result.hook, "hook")} copied={copied === "hook"} accent="yellow" />

              {/* Cenas */}
              {result.scenes.map((scene, i) => (
                <ScriptBlock
                  key={i}
                  label={`Story ${i + 1}`}
                  text={scene.text}
                  tip={scene.tip}
                  onCopy={() => copyText(scene.text, `scene-${i}`)}
                  copied={copied === `scene-${i}`}
                  accent="purple"
                />
              ))}

              {/* CTA */}
              <ScriptBlock label="CTA (encerramento)" text={result.cta} onCopy={() => copyText(result.cta, "cta")} copied={copied === "cta"} accent="green" />

              {/* Copy all */}
              <button
                onClick={() => {
                  const all = [
                    `🎬 HOOK:\n${result.hook}`,
                    ...result.scenes.map((s, i) => `📱 Story ${i + 1}:\n${s.text}\n💡 ${s.tip}`),
                    `🔥 CTA:\n${result.cta}`,
                  ].join("\n\n---\n\n");
                  copyText(all, "all");
                }}
                className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-gray-500 hover:text-[var(--text)] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg transition-colors"
              >
                {copied === "all" ? <><Check size={11} className="text-green-400" /> Copiado!</> : <><Copy size={11} /> Copiar roteiro completo</>}
              </button>

              {/* Gerar Projeto 9:16 */}
              {onGenerate && (
                <button
                  onClick={generateProject}
                  disabled={building}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-all disabled:opacity-40"
                >
                  {building ? <><Loader2 size={13} className="animate-spin" /> Criando projeto...</> : <><Play size={13} /> Gerar Projeto 9:16 no Editor</>}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScriptBlock({ label, text, tip, onCopy, copied, accent }: {
  label: string; text: string; tip?: string;
  onCopy: () => void; copied: boolean;
  accent: "yellow" | "purple" | "green";
}) {
  const colors = {
    yellow: "text-yellow-400 border-yellow-500/20 bg-yellow-500/5",
    purple: "text-purple-400 border-purple-500/20 bg-purple-500/5",
    green:  "text-green-400 border-green-500/20 bg-green-500/5",
  };
  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-1.5 ${colors[accent]}`}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</span>
        <button onClick={onCopy} className="p-1 rounded hover:bg-white/10 transition-colors">
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </div>
      <p className="text-[11px] text-[var(--text)] leading-relaxed">{text}</p>
      {tip && <p className="text-[9px] opacity-60 italic">{tip}</p>}
    </div>
  );
}
