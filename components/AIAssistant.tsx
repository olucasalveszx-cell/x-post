"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mic, MicOff, Send, Volume2, VolumeX,
  Loader2, MessageSquare, PhoneOff, Trash2, Wand2,
} from "lucide-react";

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

interface Message { role: "user" | "assistant"; content: string; }
interface Props { open: boolean; onClose: () => void; onUseInGenerator?: () => void; }

const STORAGE_KEY = "nexa-chat-history";

const SUGGESTIONS = [
  "Cria um hook que pare o scroll",
  "Estrutura de carrossel viral",
  "Como escrever um CTA que converte",
  "Ideias de pauta para essa semana",
];

function detectCarouselPrompt(text: string): string | null {
  const hasSlidePattern = /slide\s*\d+\s*[:—\-]/i.test(text);
  const hasMultipleSlides = (text.match(/slide\s*\d+/gi) ?? []).length >= 3;
  if (hasSlidePattern && hasMultipleSlides) {
    const lines = text.split("\n");
    const out: string[] = [];
    let capturing = false;
    for (const line of lines) {
      if (/slide\s*\d+\s*[:—\-]/i.test(line)) capturing = true;
      if (capturing && line.trim()) out.push(line.trim());
    }
    return out.length >= 3 ? out.join("\n") : null;
  }
  return null;
}

const WELCOME: Message = {
  role: "assistant",
  content: "Olá. Sou a Nexa.\nMe diz o que você quer criar — faço isso funcionar.",
};

// ── Waveform ────────────────────────────────────────────────────
const WAVE_LEVELS = [2, 4, 6, 4, 7, 3, 5];
function Waveform({ active, color }: { active: boolean; color: string }) {
  return (
    <>
      <style>{`
        @keyframes nxBeat1{0%,100%{height:3px}50%{height:14px}}
        @keyframes nxBeat2{0%,100%{height:3px}50%{height:22px}}
        @keyframes nxBeat3{0%,100%{height:5px}50%{height:30px}}
        @keyframes nxBeat4{0%,100%{height:3px}50%{height:18px}}
        @keyframes nxBeat5{0%,100%{height:6px}50%{height:26px}}
        @keyframes nxBeat6{0%,100%{height:3px}50%{height:12px}}
        @keyframes nxBeat7{0%,100%{height:4px}50%{height:20px}}
      `}</style>
      <div className="flex items-center gap-[3px]" style={{ height: 34 }}>
        {WAVE_LEVELS.map((lvl, i) => (
          <div key={i} style={{
            width: 3, borderRadius: 3, background: color,
            height: active ? undefined : 3,
            animation: active ? `nxBeat${lvl} ${0.55 + i * 0.07}s ease-in-out ${i * 0.06}s infinite` : "none",
            transition: "background 0.3s",
          }} />
        ))}
      </div>
    </>
  );
}

// ── Orb animado ─────────────────────────────────────────────────
type OrbState = "idle" | "listening" | "speaking" | "thinking";

function NexaOrb({ state, size = 56 }: { state: OrbState; size?: number }) {
  const isListening = state === "listening";
  const isSpeaking  = state === "speaking";
  const isThinking  = state === "thinking";
  const isActive    = isListening || isSpeaking || isThinking;
  const showRing    = size >= 34;
  const showAura    = size >= 38;

  const gradBg = isListening
    ? "linear-gradient(145deg,#ef4444 0%,#dc2626 45%,#b91c1c 100%)"
    : "linear-gradient(145deg,rgba(99,102,241,0.95) 0%,rgba(139,92,246,0.9) 35%,rgba(168,85,247,0.85) 60%,rgba(236,72,153,0.65) 100%)";

  const gc1 = isListening ? "rgba(239,68,68,0.5)"  : "rgba(99,102,241,0.5)";
  const gc2 = isListening ? "rgba(239,68,68,0.25)" : "rgba(168,85,247,0.25)";

  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>

      {showAura && (
        <motion.div style={{
          position: "absolute", inset: -size * 0.35, borderRadius: "50%", pointerEvents: "none",
          background: `radial-gradient(ellipse, ${gc1} 0%, ${gc2} 40%, transparent 70%)`,
          filter: `blur(${size * 0.18}px)`,
        }}
          animate={{ opacity: isActive ? [0.55, 1, 0.55] : [0.25, 0.5, 0.25], scale: isActive ? [1, 1.4, 1] : [1, 1.2, 1] }}
          transition={{ duration: isActive ? 1 : 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {showRing && (
        <motion.div style={{
          position: "absolute", width: size * 1.22, height: size * 1.22, borderRadius: "50%",
          border: `1px solid ${isListening ? "rgba(239,68,68,0.35)" : "rgba(99,102,241,0.3)"}`,
          pointerEvents: "none", rotateX: 70, transition: "border-color 0.5s",
        }}
          initial={{ rotateX: 70, rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: isActive ? 2.5 : 7, repeat: Infinity, ease: "linear" }}
        />
      )}

      <motion.div style={{ position: "relative", width: size, height: size, borderRadius: "50%", overflow: "hidden" }}
        animate={{ scale: isActive ? [1, 1.07, 0.96, 1.07, 1] : [1, 1.025, 1] }}
        transition={{ duration: isActive ? 1 : 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: gradBg, transition: "background 0.5s" }} />
        <motion.div style={{
          position: "absolute", inset: -size * 0.2,
          background: isListening
            ? "conic-gradient(from 0deg,transparent,rgba(252,165,165,0.55),transparent,rgba(239,68,68,0.7),transparent)"
            : "conic-gradient(from 0deg,transparent,rgba(167,139,250,0.55),transparent,rgba(99,102,241,0.7),transparent)",
        }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: isActive ? 2.5 : 5.5, repeat: Infinity, ease: "linear" }}
        />
        <motion.div style={{
          position: "absolute", width: "65%", height: "65%", borderRadius: "50%",
          background: isListening
            ? "radial-gradient(circle,rgba(252,165,165,0.65) 0%,transparent 70%)"
            : "radial-gradient(circle,rgba(196,181,253,0.65) 0%,transparent 70%)",
          filter: `blur(${size * 0.08}px)`,
        }}
          animate={{ x: [-size*.1, size*.1, -size*.05, -size*.1], y: [-size*.08, -size*.14, size*.1, -size*.08] }}
          transition={{ duration: isActive ? 2 : 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div style={{
          position: "absolute", top: size * .09, left: "18%", width: "64%", height: "34%",
          borderRadius: "50%",
          background: "linear-gradient(180deg,rgba(255,255,255,0.26) 0%,rgba(255,255,255,0.04) 100%)",
          filter: "blur(1px)",
        }} />
        <AnimatePresence>
          {isThinking && (
            <motion.div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: size * .07 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i} style={{ width: size * .1, height: size * .1, borderRadius: "50%", background: "rgba(255,255,255,0.9)" }}
                  animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.2 }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div style={{
        position: "absolute", inset: -2, borderRadius: "50%", pointerEvents: "none",
        border: `1.5px solid ${isListening ? "rgba(239,68,68,0.7)" : "rgba(99,102,241,0.6)"}`,
        boxShadow: isListening
          ? `0 0 ${size*.22}px rgba(239,68,68,0.5),0 0 ${size*.5}px rgba(239,68,68,0.2)`
          : `0 0 ${size*.22}px rgba(99,102,241,0.5),0 0 ${size*.5}px rgba(99,102,241,0.2)`,
        transition: "border-color 0.5s,box-shadow 0.5s",
      }}
        animate={{ opacity: isActive ? [0.55, 1, 0.55] : [0.35, 0.65, 0.35] }}
        transition={{ duration: isActive ? 0.85 : 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────
export default function AIAssistant({ open, onClose, onUseInGenerator }: Props) {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [listening, setListening]     = useState(false);
  const [transcript, setTranscript]   = useState("");
  const [speaking, setSpeaking]       = useState(false);
  const [ttsEnabled, setTtsEnabled]   = useState(true);
  const [mounted, setMounted]         = useState(false);
  const [voiceMode, setVoiceMode]     = useState(false);
  const [autoListen, setAutoListen]   = useState(false);
  const [micError, setMicError]       = useState<string | null>(null);
  const [micStarting, setMicStarting] = useState(false);
  const [isOpera, setIsOpera]         = useState(false);
  const [nexaStatus, setNexaStatus]   = useState("");

  const bottomRef      = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef  = useRef("");
  const messagesRef    = useRef<Message[]>([]);
  const autoListenRef  = useRef(false);
  const startListenRef = useRef<() => void>(() => {});
  const isOperaRef     = useRef(false);
  const audioUnlockedRef = useRef(false);
  const loadingRef     = useRef(false);
  const audioRef       = useRef<HTMLAudioElement | null>(null);

  const orbState: OrbState = listening ? "listening" : speaking ? "speaking" : loading ? "thinking" : "idle";

  // ── Setup ──────────────────────────────────────────────────────
  useEffect(() => {
    const ua = navigator.userAgent;
    const opera = ua.includes("OPR/") || ua.includes("Opera");
    isOperaRef.current = opera;
    setIsOpera(opera);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (messages.length > 0) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {} }
  }, [messages]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { autoListenRef.current = autoListen; }, [autoListen]);
  useEffect(() => { if (open && messages.length === 0) setMessages([WELCOME]); }, [open]); // eslint-disable-line
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);


  const cancelSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    if (!open) {
      cancelSpeech();
      recognitionRef.current?.abort();
      setListening(false); setMicStarting(false); setAutoListen(false); setNexaStatus("");
    }
  }, [open, cancelSpeech]);

  const clearHistory = useCallback(() => {
    cancelSpeech();
    recognitionRef.current?.abort();
    setListening(false); setSpeaking(false); setNexaStatus("");
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setMessages([WELCOME]);
    setInput(""); setTranscript("");
  }, [cancelSpeech]);

  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    try {
      // Destravar Web Speech API
      if (window.speechSynthesis) {
        const silent = new SpeechSynthesisUtterance(" ");
        silent.volume = 0; silent.rate = 10;
        window.speechSynthesis.speak(silent);
        setTimeout(() => window.speechSynthesis.cancel(), 50);
      }
      // Destravar HTML Audio API (necessário para ElevenLabs após async fetch)
      const silentAudio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
      silentAudio.volume = 0;
      silentAudio.play().catch(() => {});
      audioUnlockedRef.current = true;
    } catch {}
  }, []);

  // ── Voz: selecionar melhor voz disponível ──────────────────────
  const getBestVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    const MALE = ["daniel","ricardo","reed","male","masculino","jorge","carlos","fred"];
    const isMale = (v: SpeechSynthesisVoice) => MALE.some(n => v.name.toLowerCase().includes(n));
    const PRIORITY = ["luciana","joana","fernanda","samantha","google português do brasil"];
    const ptBR = voices.filter(v => v.lang === "pt-BR" || v.lang === "pt-br");
    return (
      ptBR.find(v => PRIORITY.some(p => v.name.toLowerCase().includes(p)) && !isMale(v)) ||
      ptBR.find(v => !isMale(v) && v.localService) ||
      ptBR.find(v => !isMale(v)) ||
      ptBR[0] ||
      voices.find(v => v.lang.startsWith("pt") && !isMale(v)) ||
      null
    );
  }, []);

  // ── Web Speech fallback ────────────────────────────────────────
  const falarWebSpeech = useCallback((text: string, onDone?: () => void) => {
    if (!window.speechSynthesis) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voice = getBestVoice();
    if (voice) utt.voice = voice;
    utt.lang = "pt-BR"; utt.rate = 0.9; utt.pitch = 1.0; utt.volume = 1;
    utt.onstart = () => setSpeaking(true);
    utt.onend   = () => { setSpeaking(false); onDone?.(); };
    utt.onerror = () => { setSpeaking(false); onDone?.(); };
    setTimeout(() => {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      window.speechSynthesis.speak(utt);
    }, 80);
  }, [getBestVoice]);

  // ── falarTexto — OpenAI TTS com fallback Web Speech ───────────
  // onDone é chamado APÓS o áudio terminar (usado para iniciar escuta depois)
  const falarTexto = useCallback(async (text: string, onDone?: () => void) => {
    if (!ttsEnabled) { onDone?.(); return; }

    const limpo = text
      // Remove emojis (todas as faixas Unicode de pictogramas)
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
      .replace(/[\u{2600}-\u{27BF}]/gu, "")
      .replace(/[︀-️]/g, "")
      .replace(/‍/g, "")
      // Remove markdown
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Bullet points e listas viram pausa natural
      .replace(/^[\-\*•]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      // Slide X: → pausa
      .replace(/Slide \d+:\s*/gi, "")
      // Em dash para vírgula
      .replace(/—/g, ", ")
      // Limpa espaços extras
      .replace(/[ \t]{2,}/g, " ")
      .trim();
    if (!limpo) { onDone?.(); return; }

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: limpo }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onplay  = () => setSpeaking(true);
        audio.onended = () => {
          setSpeaking(false); audioRef.current = null;
          URL.revokeObjectURL(url); onDone?.();
        };
        audio.onerror = () => {
          setSpeaking(false); audioRef.current = null;
          URL.revokeObjectURL(url); falarWebSpeech(limpo, onDone);
        };
        audio.play().catch(() => {
          URL.revokeObjectURL(url); audioRef.current = null;
          falarWebSpeech(limpo, onDone);
        });
      } else {
        falarWebSpeech(limpo, onDone);
      }
    } catch {
      falarWebSpeech(limpo, onDone);
    }
  }, [ttsEnabled, falarWebSpeech]);

  // ── Enviar mensagem ────────────────────────────────────────────
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading) return;
    unlockAudio();

    const userMsg: Message = { role: "user", content: content.trim() };
    const next = [...messagesRef.current, userMsg];
    setMessages(next);
    setInput(""); setTranscript(""); transcriptRef.current = "";
    setLoading(true);
    loadingRef.current = true;

    setNexaStatus("Processando...");

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      const reply = data.text || "Não consegui processar. Tenta de novo.";

      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setNexaStatus("");
      void falarTexto(reply, () => {
        if (autoListenRef.current) startListenRef.current();
      });
    } catch {
      setNexaStatus("");
      setMessages(prev => [...prev, { role: "assistant", content: "Erro de conexão." }]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [loading, falarTexto, unlockAudio]);

  // ── Reconhecimento de voz ──────────────────────────────────────
  const startListening = useCallback(() => {
    unlockAudio();
    setMicError(null); setMicStarting(true);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMicStarting(false); setMicError("Reconhecimento de voz não suportado. Use o Chrome."); return; }
    cancelSpeech();
    if (recognitionRef.current) {
      const old = recognitionRef.current;
      old.onend = null;
      try { old.abort(); } catch {}
      recognitionRef.current = null;
    }
    setTranscript(""); transcriptRef.current = "";
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart  = () => { setMicStarting(false); setListening(true); setMicError(null); };
    rec.onresult = (e: any) => {
      let interim = "", final = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      const combined = (final || interim).trim();
      if (combined) { setTranscript(combined); transcriptRef.current = combined; }
    };
    rec.onend = () => {
      setMicStarting(false); setListening(false);
      const captured = transcriptRef.current.trim();
      if (captured) sendMessage(captured);
      else setMicError("Nenhuma fala capturada. Fale mais perto do microfone.");
    };
    rec.onerror = (e: any) => {
      setMicStarting(false); setListening(false);
      const code: string = e?.error ?? "";
      const opera = isOperaRef.current;
      const MSGS: Record<string, string> = {
        "not-allowed": opera ? "Microfone bloqueado no Opera. Use Chrome/Edge." : "Microfone bloqueado. Permita nas configurações.",
        "no-speech": "Nenhuma fala detectada.",
        "audio-capture": "Microfone não encontrado.",
        "network": opera ? "Opera bloqueou o serviço de voz. Use Chrome/Edge." : "Erro de rede.",
        "aborted": "",
      };
      const msg = MSGS[code] ?? (code ? `Erro (${code}).` : "");
      if (msg) setMicError(msg);
    };
    recognitionRef.current = rec;
    try { rec.start(); } catch { setMicStarting(false); setMicError("Não foi possível iniciar o microfone."); }
  }, [sendMessage, cancelSpeech, unlockAudio]);

  useEffect(() => { startListenRef.current = startListening; }, [startListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    setListening(false); setMicStarting(false);
  }, []);

  const sendPromptToGenerator = (prompt: string) => {
    // sessionStorage garante entrega mesmo no mobile (GeneratorPanel ainda não montado)
    sessionStorage.setItem("nexa-pending-prompt", prompt);
    // evento para desktop (GeneratorPanel já montado e escutando)
    window.dispatchEvent(new CustomEvent("nexa-prompt", { detail: { prompt } }));
    onClose();
    onUseInGenerator?.();
  };

  const renderText = (text: string) =>
    text.split(/(\*\*[^*]+\*\*)|\n/g).map((p, i) => {
      if (!p) return <br key={i} />;
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
      return <span key={i}>{p}</span>;
    });

  if (!mounted || !open) return null;

  const waveColor  = listening ? "#f87171" : "#818cf8";
  const isWaveActive = listening || speaking;

  /* ═══════════════════════════════════════════
     MODO VOZ
  ═══════════════════════════════════════════ */
  const voiceContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-end justify-center sm:items-center p-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="relative flex flex-col items-center w-full max-w-xs rounded-3xl overflow-hidden pb-8"
        style={{
          background: "linear-gradient(160deg,#080012 0%,#050008 100%)",
          border: "1px solid rgba(99,102,241,0.18)",
          boxShadow: "0 0 80px rgba(99,102,241,0.12),0 40px 80px rgba(0,0,0,0.8)",
        }}
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 16 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
      >
        {/* Ambient glow */}
        <motion.div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: listening
            ? "radial-gradient(ellipse at center,rgba(239,68,68,0.12) 0%,transparent 65%)"
            : speaking
            ? "radial-gradient(ellipse at center,rgba(99,102,241,0.14) 0%,transparent 65%)"
            : "radial-gradient(ellipse at center,rgba(79,70,229,0.06) 0%,transparent 65%)",
        }}
          animate={{ opacity: isWaveActive ? [0.7, 1, 0.7] : [0.5, 0.8, 0.5] }}
          transition={{ duration: isWaveActive ? 1.2 : 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Header */}
        <div className="w-full flex items-center justify-between px-5 pt-5 pb-3 relative z-10">
          <button onClick={() => setVoiceMode(false)} style={{ color: "rgba(255,255,255,0.35)" }} className="p-2 rounded-xl transition-colors" title="Modo chat">
            <MessageSquare size={18} />
          </button>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.8)" }}>NEXA</span>
            <motion.div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }}
              animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }} />
          </div>
          <button onClick={() => { setTtsEnabled(v => !v); window.speechSynthesis?.cancel(); }}
            style={{ color: "rgba(255,255,255,0.35)" }} className="p-2 rounded-xl transition-colors">
            {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        {/* Orb grande */}
        <div className="relative flex items-center justify-center z-10 mt-6 mb-2">
          <AnimatePresence>
            {isWaveActive && (
              <>
                {[0, 1].map(i => (
                  <motion.div key={i} style={{
                    position: "absolute", width: 200, height: 200, borderRadius: "50%",
                    border: `1px solid ${listening ? "rgba(239,68,68,0.15)" : "rgba(99,102,241,0.15)"}`,
                  }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 0.5, 0], scale: [0.8, 1.3 + i * 0.15, 1.5 + i * 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: i * 0.5 }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
          <NexaOrb state={orbState} size={140} />
        </div>

        {/* Waveform */}
        <div className="flex justify-center mt-2 mb-1 h-9 items-center z-10">
          <Waveform active={isWaveActive} color={waveColor} />
        </div>

        {/* Status — frases da Nexa */}
        <AnimatePresence mode="wait">
          <motion.p key={nexaStatus || orbState}
            className="text-sm font-semibold mb-3 z-10 tracking-wide"
            style={{ color: listening ? "#f87171" : speaking ? "#a78bfa" : loading ? "#818cf8" : "rgba(255,255,255,0.3)", letterSpacing: "0.04em" }}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {nexaStatus || (listening ? "Ouvindo..." : micStarting ? "Aguarde..." : speaking ? "Falando..." : loading ? "Processando..." : "Toque para falar")}
          </motion.p>
        </AnimatePresence>

        {isOpera && !micError && (
          <div className="mx-6 mb-2 px-3 py-2 rounded-xl text-[11px] text-amber-300 text-center z-10"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            Opera pode bloquear o microfone — use Chrome/Edge
          </div>
        )}

        {/* Transcript / última msg */}
        <div className="px-6 mb-5 min-h-[36px] flex items-center justify-center z-10 w-full">
          {micError
            ? <p className="text-xs text-red-400 text-center leading-relaxed">{micError}</p>
            : <p className="text-xs text-center leading-relaxed line-clamp-2" style={{ color: "rgba(255,255,255,0.28)" }}>
                {transcript
                  ? `"${transcript}"`
                  : messages.length > 0
                  ? messages[messages.length - 1].content.slice(0, 80) + (messages[messages.length - 1].content.length > 80 ? "…" : "")
                  : ""}
              </p>}
        </div>

        {/* Botão mic */}
        <motion.button
          onClick={listening ? stopListening : startListening}
          disabled={loading || micStarting}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl disabled:opacity-40 mb-5 z-10"
          style={{
            background: listening ? "linear-gradient(135deg,#dc2626,#ef4444)" : micStarting ? "linear-gradient(135deg,#1e1b4b,#2e2aad)" : "linear-gradient(135deg,#4338ca,#6d28d9)",
            boxShadow: listening ? "0 0 32px rgba(239,68,68,0.5)" : "0 0 32px rgba(109,40,217,0.5)",
            transition: "background 0.3s,box-shadow 0.3s",
          }}
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
        >
          {loading || micStarting ? <Loader2 size={26} color="white" className="animate-spin" />
            : listening ? <MicOff size={26} color="white" />
            : <Mic size={26} color="white" />}
        </motion.button>

        {/* Controles */}
        <div className="flex items-center gap-3 z-10">
          <motion.button onClick={() => setAutoListen(v => !v)}
            className="flex items-center gap-1.5 text-[12px] px-4 py-2 rounded-full font-semibold"
            style={{
              background: autoListen ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
              border: `1.5px solid ${autoListen ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`,
              color: autoListen ? "#a78bfa" : "rgba(255,255,255,0.3)",
            }}
            whileHover={{ scale: 1.04 }}
          >
            <motion.span className={`w-2 h-2 rounded-full ${autoListen ? "bg-purple-400" : "bg-gray-600"}`}
              animate={autoListen ? { opacity: [0.6, 1, 0.6] } : {}}
              transition={{ duration: 1, repeat: Infinity }} />
            {autoListen ? "Conversa ativa" : "Automático"}
          </motion.button>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full">
            <PhoneOff size={11} /> Encerrar
          </button>
        </div>
      </motion.div>
    </div>
  );

  /* ═══════════════════════════════════════════
     MODO CHAT
  ═══════════════════════════════════════════ */
  const chatContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="relative flex flex-col w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{
          height: 580,
          background: "linear-gradient(160deg,#09060f 0%,#07050d 100%)",
          border: "1px solid rgba(99,102,241,0.18)",
          boxShadow: "0 0 60px rgba(99,102,241,0.1),0 30px 60px rgba(0,0,0,0.8)",
        }}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(99,102,241,0.12)", background: "rgba(99,102,241,0.04)" }}>
          <div className="flex items-center gap-3">
            <NexaOrb state={orbState} size={42} />
            <div>
              <div className="flex items-center gap-2">
                <p style={{ fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.9)" }}>Nexa</p>
                <motion.div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px #22c55e" }}
                  animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.5, repeat: Infinity }} />
              </div>
              <AnimatePresence mode="wait">
                <motion.p key={nexaStatus || orbState}
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}
                  initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {nexaStatus || (orbState === "thinking" ? "Processando..." : orbState === "speaking" ? "Falando..." : orbState === "listening" ? "Ouvindo..." : "Especialista em conteúdo")}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setVoiceMode(true)} style={{ color: "rgba(255,255,255,0.35)" }} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Modo de voz"><Mic size={16} /></button>
            <button onClick={() => { setTtsEnabled(v => !v); window.speechSynthesis?.cancel(); }}
              style={{ color: ttsEnabled ? "#22c55e" : "rgba(255,255,255,0.35)" }} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button onClick={clearHistory} style={{ color: "rgba(255,255,255,0.35)" }} className="p-2 rounded-lg hover:bg-white/5 transition-colors"><Trash2 size={16} /></button>
            <button onClick={onClose} style={{ color: "rgba(255,255,255,0.35)" }} className="p-2 rounded-lg hover:bg-white/5 transition-colors"><X size={16} /></button>
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ scrollbarWidth: "none" }}>
          <AnimatePresence initial={false}>
            {messages.map((m, i) => {
              const detected = m.role === "assistant" ? detectCarouselPrompt(m.content) : null;
              return (
                <motion.div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  {m.role === "assistant" && <div className="mb-1"><NexaOrb state="idle" size={22} /></div>}
                  <div className="text-sm leading-relaxed max-w-[85%] px-3.5 py-2.5 rounded-2xl"
                    style={{
                      background: m.role === "user" ? "linear-gradient(135deg,rgba(67,56,202,0.9),rgba(109,40,217,0.85))" : "rgba(255,255,255,0.05)",
                      color: m.role === "user" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.78)",
                      border: m.role === "assistant" ? "1px solid rgba(99,102,241,0.14)" : "none",
                      borderBottomRightRadius: m.role === "user" ? 4 : undefined,
                      borderBottomLeftRadius: m.role === "assistant" ? 4 : undefined,
                    }}>
                    {renderText(m.content)}
                  </div>
                  {detected && (
                    <motion.button onClick={() => sendPromptToGenerator(detected)}
                      className="mt-1.5 flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-semibold"
                      style={{ background: "linear-gradient(135deg,#4338ca,#6d28d9)", color: "white", boxShadow: "0 0 12px rgba(109,40,217,0.4)" }}
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                      <Wand2 size={11} /> Usar no Gerador
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {loading && (
            <motion.div className="flex items-end gap-2"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <NexaOrb state="thinking" size={22} />
              <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-[4px] flex items-center gap-2.5"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,102,241,0.14)" }}>
                {[0, 1, 2].map(i => (
                  <motion.div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8" }}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18 }} />
                ))}
                {nexaStatus && (
                  <AnimatePresence mode="wait">
                    <motion.span key={nexaStatus} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontStyle: "italic" }}
                      initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}>
                      {nexaStatus}
                    </motion.span>
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          )}

          {messages.length === 1 && !loading && (
            <motion.div className="flex flex-wrap gap-2 mt-1"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              {SUGGESTIONS.map((s, i) => (
                <motion.button key={s} onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)", color: "rgba(255,255,255,0.45)" }}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.07 }}
                  whileHover={{ background: "rgba(99,102,241,0.14)", color: "rgba(255,255,255,0.85)", borderColor: "rgba(99,102,241,0.35)" }}>
                  {s}
                </motion.button>
              ))}
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Avisos */}
        {isOpera && (
          <div className="mx-4 mt-2 mb-1 px-3 py-2 rounded-xl text-xs text-amber-300 flex items-start gap-2"
            style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <span className="shrink-0">⚠️</span>
            <span>Opera bloqueia reconhecimento de voz. Use <strong>Chrome</strong> ou <strong>Edge</strong>.</span>
          </div>
        )}
        {micError && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl text-xs text-red-300 flex items-start gap-2"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <span className="shrink-0">🎤</span><span>{micError}</span>
          </div>
        )}
        {(listening || transcript) && (
          <motion.div className="mx-4 mb-2 px-3 py-2 rounded-xl text-sm flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)" }}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <motion.span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"
              animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity }} />
            <span className="truncate text-xs">{transcript || "Ouvindo..."}</span>
          </motion.div>
        )}

        {/* Footer */}
        <div className="px-4 pb-4 flex-shrink-0 space-y-2 pt-2">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(99,102,241,0.18)" }}>
            <input ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendMessage(input); }}
              placeholder="Me diz o que você quer criar..."
              className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none" />
            <motion.button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-25 flex-shrink-0"
              style={{ background: input.trim() && !loading ? "linear-gradient(135deg,#4338ca,#6d28d9)" : "rgba(255,255,255,0.06)" }}
              whileHover={input.trim() && !loading ? { scale: 1.1 } : {}} whileTap={{ scale: 0.92 }}>
              <Send size={13} color="white" />
            </motion.button>
          </div>

          <div className="flex gap-2">
            <motion.button onClick={listening ? stopListening : startListening}
              disabled={loading || micStarting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40"
              style={{
                background: listening ? "linear-gradient(135deg,#dc2626,#ef4444)" : "linear-gradient(135deg,#4338ca,#6d28d9)",
                color: "white",
                boxShadow: listening ? "0 0 20px rgba(239,68,68,0.35)" : "0 0 20px rgba(109,40,217,0.35)",
                transition: "background 0.3s,box-shadow 0.3s",
              }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {micStarting ? <><Loader2 size={15} className="animate-spin" /> Aguarde</>
                : listening ? <><MicOff size={15} /> Parar</>
                : <><Mic size={15} /> {speaking ? "Interromper" : "Falar"}</>}
            </motion.button>
            <motion.button onClick={() => setAutoListen(v => !v)}
              className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              style={{
                background: autoListen ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${autoListen ? "rgba(99,102,241,0.45)" : "rgba(255,255,255,0.08)"}`,
                color: autoListen ? "#a78bfa" : "rgba(255,255,255,0.3)",
                transition: "all 0.25s",
              }}
              whileHover={{ scale: 1.04 }}>
              <motion.span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${autoListen ? "bg-purple-400" : "bg-gray-600"}`}
                animate={autoListen ? { opacity: [0.5, 1, 0.5] } : {}} transition={{ duration: 1, repeat: Infinity }} />
              Auto
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(voiceMode ? voiceContent : chatContent, document.body);
}
