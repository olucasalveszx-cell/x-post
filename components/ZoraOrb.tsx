"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Volume2, VolumeX, ArrowRight } from "lucide-react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────
type OrbState = "idle" | "hover" | "active";

interface Suggestion {
  id: number;
  icon: string;
  title: string;
  desc: string;
}

// ── Static data (no Math.random in JSX → no hydration mismatch) ──
const BG_PARTICLES = [
  { w: 2, left: 8,  top: 12, ci: 0, dur: 4.2, delay: 0,   dy: 18 },
  { w: 3, left: 22, top: 67, ci: 1, dur: 3.8, delay: 1.1, dy: 22 },
  { w: 2, left: 38, top: 28, ci: 0, dur: 5.1, delay: 0.4, dy: 15 },
  { w: 3, left: 55, top: 82, ci: 1, dur: 4.6, delay: 2.0, dy: 20 },
  { w: 2, left: 70, top: 18, ci: 0, dur: 3.5, delay: 0.8, dy: 25 },
  { w: 3, left: 82, top: 55, ci: 1, dur: 4.9, delay: 1.5, dy: 18 },
  { w: 2, left: 92, top: 35, ci: 0, dur: 4.3, delay: 2.3, dy: 16 },
  { w: 2, left: 15, top: 90, ci: 1, dur: 5.8, delay: 0.2, dy: 20 },
  { w: 3, left: 47, top: 48, ci: 0, dur: 3.9, delay: 1.8, dy: 22 },
  { w: 2, left: 63, top: 75, ci: 1, dur: 4.5, delay: 0.6, dy: 19 },
  { w: 3, left: 78, top: 8,  ci: 0, dur: 6.2, delay: 1.3, dy: 24 },
  { w: 2, left: 32, top: 52, ci: 1, dur: 4.1, delay: 2.8, dy: 17 },
];
const BG_COLORS = ["rgba(99,102,241,0.7)", "rgba(168,85,247,0.6)"];

const ORBIT_PARTICLES = [
  { start: 0,   r: 108, speed: 4.5, size: 5 },
  { start: 72,  r: 115, speed: 5.8, size: 4 },
  { start: 144, r: 105, speed: 3.9, size: 6 },
  { start: 216, r: 112, speed: 6.2, size: 4 },
  { start: 288, r: 108, speed: 5.1, size: 5 },
];

// Pre-compute orbit keyframes (12 steps = smooth + performant)
function buildOrbitKFs(startDeg: number, radius: number, steps = 12) {
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const rad = ((startDeg + (360 * i) / steps) * Math.PI) / 180;
    xs.push(Math.cos(rad) * radius);
    ys.push(Math.sin(rad) * radius);
  }
  return { xs, ys };
}
const ORBIT_KFS = ORBIT_PARTICLES.map(p => buildOrbitKFs(p.start, p.r));

// ── Content ────────────────────────────────────────────────────
const PLACEHOLDERS = [
  "Ideias de post para Instagram...",
  "Como vender mais no Direct...",
  "Carrossel sobre marketing digital...",
  "Estratégia de conteúdo para meu nicho...",
  "Como crescer meu perfil rapidamente...",
];

const SUGGESTIONS: Record<string, Suggestion[]> = {
  default: [
    { id: 1, icon: "💡", title: "5 erros que travam seu crescimento", desc: "Carrossel de 7 slides com linguagem direta e CTA forte no final" },
    { id: 2, icon: "🔥", title: "Como criar conteúdo todo dia sem burnout", desc: "Estratégia de batching + planejamento semanal que funciona" },
    { id: 3, icon: "📈", title: "Algoritmo do Instagram em 2025", desc: "O que funciona agora e como adaptar sua estratégia hoje" },
  ],
  instagram: [
    { id: 1, icon: "🎯", title: "Aumente seu alcance orgânico agora", desc: "7 técnicas de SEO para Instagram que poucos conhecem" },
    { id: 2, icon: "💬", title: "Posts que geram comentários reais", desc: "Fórmulas de engajamento testadas por criadores top BR" },
    { id: 3, icon: "📱", title: "Stories para converter seguidores em clientes", desc: "Sequência de 5 stories com CTA progressivo que converte" },
  ],
  vender: [
    { id: 1, icon: "💰", title: "Como vender no Direct em 3 passos", desc: "Abordagem consultiva sem parecer vendedor chato" },
    { id: 2, icon: "🛍️", title: "Carrossel de oferta que converte", desc: "Estrutura: dor → solução → prova → CTA irresistível" },
    { id: 3, icon: "🤝", title: "Construir confiança antes de vender", desc: "4 tipos de conteúdo que preparam o terreno para vendas" },
  ],
  marketing: [
    { id: 1, icon: "🧠", title: "Psicologia do consumo nas redes", desc: "Gatilhos mentais que aumentam conversão orgânica" },
    { id: 2, icon: "📊", title: "Métricas que realmente importam", desc: "Pare de olhar para curtidas e foque no que gera receita" },
    { id: 3, icon: "🎨", title: "Identidade visual sem designer", desc: "Paleta + tipografia + layout em 20 minutos com IA" },
  ],
};

const RESPONSES: Record<string, string> = {
  default:   "Olá! Preparei 3 ideias de conteúdo estratégico pra você. Cada uma foi pensada para gerar engajamento real e crescimento orgânico. Escolha a que mais combina com seu momento:",
  instagram: "Perfeito! Aqui estão as melhores estratégias de alcance orgânico para o Instagram em 2025. Escolha a que faz mais sentido para o seu perfil agora:",
  vender:    "Ótima intenção! Vender pelo Instagram fica muito mais fácil com a estrutura certa. Veja as opções que preparei pra você:",
  marketing: "Marketing digital é meu forte! Aqui estão conteúdos que vão posicionar você como referência no seu nicho:",
};

function getKey(q: string): string {
  const l = q.toLowerCase();
  if (l.includes("instagram") || l.includes("feed") || l.includes("alcance") || l.includes("story")) return "instagram";
  if (l.includes("vend") || l.includes("direct") || l.includes("client") || l.includes("comprar")) return "vender";
  if (l.includes("marketing") || l.includes("estratégia") || l.includes("métrica") || l.includes("marca")) return "marketing";
  return "default";
}

// ── Web Speech hook ────────────────────────────────────────────
function useSpeech() {
  const [muted, setMuted] = useState(true);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const synth = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    synth.current = window.speechSynthesis;
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    window.speechSynthesis.addEventListener("voiceschanged", load);
    load();
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const falar = useCallback((texto: string) => {
    if (muted || !synth.current) return;
    synth.current.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    const voices = voicesRef.current;
    u.voice =
      voices.find(v => v.lang.startsWith("pt") && v.localService) ||
      voices.find(v => v.lang.startsWith("pt")) ||
      voices.find(v => v.localService) ||
      voices[0] ||
      null;
    u.rate = 0.9;
    u.pitch = 1.0;
    u.volume = 1;
    synth.current.speak(u);
  }, [muted]);

  const parar = useCallback(() => synth.current?.cancel(), []);

  return { falar, parar, muted, setMuted };
}

// ── Animated placeholder ───────────────────────────────────────
function AnimatedPlaceholder() {
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setShow(false);
      setTimeout(() => { setIdx(i => (i + 1) % PLACEHOLDERS.length); setShow(true); }, 350);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.span
          key={idx}
          className="pointer-events-none select-none"
          style={{ color: "rgba(255,255,255,0.22)", fontSize: 14 }}
          initial={{ opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -7 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {PLACEHOLDERS[idx]}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

// ── Typing effect ──────────────────────────────────────────────
function TypingText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setShown(""); setDone(false);
    let i = 0;
    const id = setInterval(() => {
      if (i < text.length) { setShown(text.slice(0, ++i)); }
      else { setDone(true); clearInterval(id); onDone?.(); }
    }, 20);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <span>
      {shown}
      {!done && (
        <motion.span
          className="inline-block w-[2px] ml-[2px] bg-indigo-400"
          style={{ height: "1em", verticalAlign: "middle" }}
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </span>
  );
}

// ── Orbital particle ───────────────────────────────────────────
function OrbParticle({ kf, speed, size, active }: {
  kf: { xs: number[]; ys: number[] };
  speed: number; size: number; active: boolean;
}) {
  return (
    <motion.div
      style={{
        position: "absolute",
        left: "50%", top: "50%",
        marginLeft: -size / 2, marginTop: -size / 2,
        width: size, height: size,
        borderRadius: "50%",
        background: "radial-gradient(circle, #c4b5fd 0%, #818cf8 55%, transparent 100%)",
        boxShadow: `0 0 ${size * 2}px ${size}px rgba(167,139,250,0.7)`,
        pointerEvents: "none",
      }}
      animate={{
        x: kf.xs, y: kf.ys,
        opacity: active ? [0.7, 1, 0.7] : [0.25, 0.5, 0.25],
        scale:   active ? [1.0, 1.5, 1.0] : [0.7, 1.0, 0.7],
      }}
      transition={{
        x: { duration: active ? speed * 0.55 : speed, repeat: Infinity, ease: "linear" },
        y: { duration: active ? speed * 0.55 : speed, repeat: Infinity, ease: "linear" },
        opacity: { duration: active ? speed * 0.55 : speed, repeat: Infinity, ease: "linear" },
        scale:   { duration: active ? 0.8 : 2, repeat: Infinity, ease: "easeInOut" },
      }}
    />
  );
}

// ── The Orb ────────────────────────────────────────────────────
function OrbSphere({ state, onClick }: { state: OrbState; onClick: () => void }) {
  const active = state === "active";
  const hovered = state === "hover";

  return (
    <div
      style={{ position: "relative", width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {/* Ambient glow aura */}
      <motion.div
        style={{
          position: "absolute", inset: -30, borderRadius: "50%", pointerEvents: "none",
          background: "radial-gradient(ellipse, rgba(99,102,241,0.45) 0%, rgba(168,85,247,0.2) 45%, transparent 70%)",
          filter: "blur(22px)",
        }}
        animate={{
          opacity: active ? [0.65, 1, 0.65] : hovered ? [0.75, 0.85, 0.75] : [0.35, 0.6, 0.35],
          scale:   active ? [1.05, 1.35, 1.05] : hovered ? [1.15, 1.22, 1.15] : [1.0, 1.18, 1.0],
        }}
        transition={{ duration: active ? 1.1 : hovered ? 1.5 : 3.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orbital ring 1 — tilted horizontal */}
      <motion.div
        style={{
          position: "absolute", width: 196, height: 196, borderRadius: "50%",
          border: "1px solid rgba(99,102,241,0.35)",
          boxShadow: "0 0 14px rgba(99,102,241,0.15)",
          pointerEvents: "none",
          rotateX: 72,
        }}
        initial={{ rotateX: 72, rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: active ? 3.5 : 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Orbital ring 2 — tilted vertical */}
      <motion.div
        style={{
          position: "absolute", width: 206, height: 206, borderRadius: "50%",
          border: "1px solid rgba(168,85,247,0.25)",
          pointerEvents: "none",
          rotateY: 72,
        }}
        initial={{ rotateY: 72, rotate: 0 }}
        animate={{ rotate: -360 }}
        transition={{ duration: active ? 4.5 : 11, repeat: Infinity, ease: "linear" }}
      />

      {/* Orbital ring 3 — diagonal, only when active */}
      <AnimatePresence>
        {active && (
          <motion.div
            style={{
              position: "absolute", width: 186, height: 186, borderRadius: "50%",
              border: "1.5px solid rgba(236,72,153,0.4)",
              boxShadow: "0 0 18px rgba(236,72,153,0.2)",
              pointerEvents: "none",
              rotateX: 45, rotateY: 30,
            }}
            initial={{ opacity: 0, scale: 0.8, rotateX: 45, rotateY: 30, rotate: 0 }}
            animate={{ opacity: 1, scale: 1, rotate: 360 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ rotate: { duration: 2.8, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.4 }, scale: { duration: 0.4 } }}
          />
        )}
      </AnimatePresence>

      {/* Orbital particles */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {ORBIT_PARTICLES.map((p, i) => (
          <OrbParticle key={i} kf={ORBIT_KFS[i]} speed={p.speed} size={p.size} active={active} />
        ))}
      </div>

      {/* Main sphere button */}
      <motion.button
        onClick={onClick}
        style={{
          position: "relative",
          width: 160, height: 160,
          borderRadius: "50%",
          border: "none",
          padding: 0,
          cursor: "pointer",
          outline: "none",
        }}
        animate={{
          scale: active ? [1, 1.05, 0.97, 1.05, 1] : [1, 1.025, 1],
        }}
        transition={{
          scale: { duration: active ? 1.1 : 4, repeat: Infinity, ease: "easeInOut" },
        }}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.93 }}
      >
        {/* Sphere body */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden",
          background: "linear-gradient(145deg, rgba(99,102,241,0.95) 0%, rgba(139,92,246,0.9) 30%, rgba(168,85,247,0.85) 60%, rgba(236,72,153,0.65) 100%)",
        }}>
          {/* Fluid rotation layer */}
          <motion.div
            style={{
              position: "absolute", inset: -24,
              background: "conic-gradient(from 0deg, transparent 0%, rgba(167,139,250,0.55) 25%, transparent 50%, rgba(99,102,241,0.7) 75%, transparent 100%)",
            }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: active ? 3 : 6, repeat: Infinity, ease: "linear" }}
          />

          {/* Floating blob 1 */}
          <motion.div
            style={{
              position: "absolute", width: "65%", height: "65%", borderRadius: "50%",
              background: "radial-gradient(circle, rgba(196,181,253,0.65) 0%, transparent 70%)",
              filter: "blur(10px)",
            }}
            animate={{ x: [-12, 14, -6, -12], y: [-10, -18, 14, -10], scale: [1, 1.18, 0.88, 1] }}
            transition={{ duration: active ? 2.2 : 4.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Floating blob 2 — pink */}
          <motion.div
            style={{
              position: "absolute", width: "50%", height: "50%", borderRadius: "50%",
              background: "radial-gradient(circle, rgba(244,114,182,0.45) 0%, transparent 70%)",
              filter: "blur(8px)",
              right: 0, bottom: 0,
            }}
            animate={{ x: [8, -10, 12, 8], y: [10, 6, -12, 10] }}
            transition={{ duration: active ? 2.8 : 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          />

          {/* Glass highlight — top */}
          <div style={{
            position: "absolute", top: 14, left: "18%", width: "64%", height: "34%",
            borderRadius: "50%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 100%)",
            filter: "blur(2px)",
          }} />

          {/* Glass specular — tiny top-left */}
          <div style={{
            position: "absolute", top: 22, left: "28%", width: "22%", height: "14%",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
            filter: "blur(1px)",
          }} />

          {/* Glass shadow — bottom */}
          <div style={{
            position: "absolute", bottom: 14, left: "28%", width: "44%", height: "22%",
            borderRadius: "50%",
            background: "rgba(0,0,0,0.28)",
            filter: "blur(5px)",
          }} />
        </div>

        {/* Outer glow ring — always visible, pulses with state */}
        <motion.div
          style={{
            position: "absolute", inset: -3, borderRadius: "50%",
            border: "1.5px solid rgba(99,102,241,0.6)",
            boxShadow: "0 0 30px rgba(99,102,241,0.5), 0 0 60px rgba(99,102,241,0.25), inset 0 0 24px rgba(99,102,241,0.15)",
            pointerEvents: "none",
          }}
          animate={{ opacity: active ? [0.7, 1, 0.7] : hovered ? 0.9 : [0.45, 0.75, 0.45] }}
          transition={{ duration: active ? 0.9 : 2.8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Active energy burst ring */}
        <AnimatePresence>
          {active && (
            <motion.div
              style={{
                position: "absolute", inset: -8, borderRadius: "50%",
                border: "2px solid rgba(196,181,253,0.7)",
                boxShadow: "0 0 24px rgba(196,181,253,0.5), inset 0 0 16px rgba(167,139,250,0.2)",
                pointerEvents: "none",
              }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.06, 1] }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.75, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </AnimatePresence>
      </motion.button>

      {/* Status label */}
      <motion.div
        style={{ position: "absolute", bottom: -18, display: "flex", alignItems: "center", gap: 6 }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em" }}>
          NEXA · {active ? "GERANDO..." : "ONLINE"}
        </span>
      </motion.div>
    </div>
  );
}

// ── Suggestion card ────────────────────────────────────────────
function SuggestionCard({ s, index }: { s: Suggestion; index: number }) {
  return (
    <motion.div
      className="group w-full text-left flex items-start gap-3 p-4 rounded-2xl cursor-pointer"
      style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.14)" }}
      initial={{ opacity: 0, x: -14, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{
        backgroundColor: "rgba(99,102,241,0.13)",
        borderColor: "rgba(99,102,241,0.35)",
        x: 5,
        transition: { duration: 0.18 },
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { window.location.href = "/editor"; }}
    >
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, fontWeight: 700, color: "#f0f0f0", lineHeight: 1.35 }}>{s.title}</p>
        <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", marginTop: 3, lineHeight: 1.5 }}>{s.desc}</p>
      </div>
      <ArrowRight
        size={13}
        style={{ color: "#818cf8", marginTop: 4, flexShrink: 0, opacity: 0, transition: "opacity 0.15s" }}
        className="group-hover:opacity-100"
      />
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function NexaOrb() {
  const [orbState, setOrbState]   = useState<OrbState>("idle");
  const [input, setInput]         = useState("");
  const [phase, setPhase]         = useState<"idle" | "loading" | "done">("idle");
  const [response, setResponse]   = useState("");
  const [suggestions, setSuggs]   = useState<Suggestion[]>([]);
  const [typed, setTyped]         = useState(false);
  const { falar, parar, muted, setMuted } = useSpeech();
  const inputRef                  = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (q?: string) => {
    const query = (q ?? input).trim();
    if (!query || phase !== "idle") return;
    setPhase("loading");
    setOrbState("active");
    setResponse(""); setSuggs([]); setTyped(false);

    await new Promise(r => setTimeout(r, 1800));

    const key  = getKey(query);
    const resp = RESPONSES[key];
    setPhase("done");
    setResponse(resp);
    falar(resp);
  }, [input, phase, falar]);

  const handleTypingDone = useCallback(() => {
    setTyped(true);
    setSuggs(SUGGESTIONS[getKey(input)] ?? SUGGESTIONS.default);
  }, [input]);

  const handleReset = () => {
    parar();
    setPhase("idle"); setOrbState("idle");
    setInput(""); setResponse(""); setSuggs([]); setTyped(false);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  return (
    <section className="relative px-5 py-20 overflow-hidden">
      {/* Background ambient gradient */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(79,70,229,0.07) 0%, transparent 70%)",
      }} />

      {/* Floating ambient particles */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {BG_PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              width: p.w, height: p.w,
              borderRadius: "50%",
              background: BG_COLORS[p.ci],
              left: `${p.left}%`, top: `${p.top}%`,
            }}
            animate={{ y: [-p.dy / 2, p.dy / 2, -p.dy / 2], opacity: [0.15, 0.7, 0.15] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      <div className="relative max-w-2xl mx-auto flex flex-col items-center gap-10">

        {/* Section header */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(99,102,241,0.65)", marginBottom: 10, textTransform: "uppercase" }}>
            Sua assistente de IA
          </p>
          <h2 className="text-3xl md:text-4xl font-black leading-tight">
            Conheça a{" "}
            <span style={{
              background: "linear-gradient(135deg, #818cf8 0%, #a78bfa 40%, #f472b6 100%)",
              WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Nexa
            </span>
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.38)", marginTop: 8 }}>
            Estratégias de conteúdo personalizadas em segundos
          </p>
        </motion.div>

        {/* Orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.65 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          onHoverStart={() => { if (phase === "idle") setOrbState("hover"); }}
          onHoverEnd={() => { if (phase === "idle") setOrbState("idle"); }}
          style={{ marginBottom: 8 }}
        >
          <OrbSphere state={orbState} onClick={() => { if (phase === "idle") inputRef.current?.focus(); }} />
        </motion.div>

        {/* Interaction area */}
        <motion.div
          className="w-full flex flex-col gap-3"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          {/* Input */}
          <AnimatePresence>
            {phase === "idle" && (
              <motion.div
                key="input"
                className="relative flex items-center gap-3 rounded-2xl p-1"
                style={{
                  paddingLeft: 18,
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid rgba(99,102,241,0.22)",
                  backdropFilter: "blur(12px)",
                }}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
              >
                <Sparkles size={14} style={{ color: "#818cf8", flexShrink: 0 }} />
                <div className="flex-1 relative" style={{ height: 46, display: "flex", alignItems: "center" }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    className="absolute inset-0 bg-transparent text-white outline-none w-full"
                    style={{ fontSize: 14, caretColor: "#818cf8", border: "none" }}
                    aria-label="Pergunta para Nexa"
                  />
                  {!input && (
                    <div className="absolute inset-0 flex items-center pointer-events-none">
                      <AnimatedPlaceholder />
                    </div>
                  )}
                </div>
                <motion.button
                  onClick={() => handleSubmit()}
                  className="flex items-center gap-2 font-bold text-white rounded-xl flex-shrink-0"
                  style={{ fontSize: 13, padding: "10px 18px", background: "linear-gradient(135deg,#4338ca,#6d28d9)", boxShadow: "0 4px 18px rgba(67,56,202,0.45)" }}
                  whileHover={{ scale: 1.04, boxShadow: "0 6px 24px rgba(67,56,202,0.65)" }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Sparkles size={13} /> Gerar
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading */}
          <AnimatePresence>
            {phase === "loading" && (
              <motion.div
                key="loading"
                className="flex items-center gap-3 rounded-2xl"
                style={{ padding: "14px 18px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      style={{ width: 7, height: 7, borderRadius: "50%", background: "#818cf8" }}
                      animate={{ scale: [1, 1.45, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.18 }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                  Nexa está pensando...
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Response */}
          <AnimatePresence>
            {phase === "done" && (
              <motion.div
                key="response"
                className="flex flex-col gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* Response bubble */}
                <motion.div
                  className="flex gap-3 items-start"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg,#4338ca,#6d28d9,#9333ea)",
                    boxShadow: "0 0 16px rgba(109,40,217,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Sparkles size={13} color="white" />
                  </div>
                  <div style={{
                    flex: 1, padding: "12px 16px", borderRadius: "18px 18px 18px 6px",
                    background: "rgba(99,102,241,0.09)", border: "1px solid rgba(99,102,241,0.2)",
                    fontSize: 13.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.65,
                  }}>
                    <TypingText text={response} onDone={handleTypingDone} />
                  </div>
                </motion.div>

                {/* Suggestion cards */}
                <AnimatePresence>
                  {typed && suggestions.length > 0 && (
                    <motion.div
                      key="cards"
                      className="flex flex-col gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {suggestions.map((s, i) => (
                        <SuggestionCard key={s.id} s={s} index={i} />
                      ))}

                      <motion.div
                        className="flex items-center justify-between mt-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.45 }}
                      >
                        <button
                          onClick={handleReset}
                          style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 5 }}
                          className="hover:text-gray-400 transition-colors"
                        >
                          ← Fazer outra pergunta
                        </button>
                        <Link
                          href="/editor"
                          className="flex items-center gap-1.5 font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                          style={{ fontSize: 12 }}
                        >
                          Abrir editor <ArrowRight size={11} />
                        </Link>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Voice & plan badge */}
          <div className="flex items-center justify-between mt-1">
            <button
              onClick={() => setMuted(m => !m)}
              className="flex items-center gap-1.5 transition-colors hover:text-gray-300"
              style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}
              title={muted ? "Ativar voz da Nexa" : "Desativar voz da Nexa"}
            >
              {muted
                ? <VolumeX size={12} />
                : <Volume2 size={12} style={{ color: "#22c55e" }} />}
              {muted ? "Voz desativada" : "Voz ativada"}
            </button>
            <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}>
              Disponível nos planos Pro & Business
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
