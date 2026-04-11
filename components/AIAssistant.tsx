"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Mic, MicOff, Send, Sparkles, Volume2, VolumeX,
  Loader2, MessageSquare, PhoneOff, Trash2,
} from "lucide-react";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message { role: "user" | "assistant"; content: string; }
interface Props { open: boolean; onClose: () => void; }

const STORAGE_KEY = "zora-chat-history";

const SUGGESTIONS = [
  "Como criar um hook irresistível?",
  "Estrutura ideal de carrossel viral",
  "Dicas de CTA que convertem",
  "Cores e fontes para carrosséis",
];

const WELCOME: Message = {
  role: "assistant",
  content: "Olá! Sou a Zora, sua especialista em carrosséis virais para Instagram. Pode falar ou digitar — estou aqui pra te ajudar!",
};

/* ── Waveform animado ── */
const WAVE_LEVELS = [2, 4, 6, 4, 7, 3, 5];

function Waveform({ active, color }: { active: boolean; color: string }) {
  return (
    <>
      <style>{`
        @keyframes zoraBeat1{0%,100%{height:3px}50%{height:14px}}
        @keyframes zoraBeat2{0%,100%{height:3px}50%{height:22px}}
        @keyframes zoraBeat3{0%,100%{height:5px}50%{height:30px}}
        @keyframes zoraBeat4{0%,100%{height:3px}50%{height:18px}}
        @keyframes zoraBeat5{0%,100%{height:6px}50%{height:26px}}
        @keyframes zoraBeat6{0%,100%{height:3px}50%{height:12px}}
        @keyframes zoraBeat7{0%,100%{height:4px}50%{height:20px}}
      `}</style>
      <div className="flex items-center gap-[3px]" style={{ height: 34 }}>
        {WAVE_LEVELS.map((lvl, i) => (
          <div
            key={i}
            style={{
              width: 3,
              borderRadius: 3,
              background: color,
              height: active ? undefined : 3,
              animation: active
                ? `zoraBeat${lvl} ${0.55 + i * 0.07}s ease-in-out ${i * 0.06}s infinite`
                : "none",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>
    </>
  );
}

export default function AIAssistant({ open, onClose }: Props) {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [listening, setListening]   = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speaking, setSpeaking]     = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [mounted, setMounted]       = useState(false);
  const [voiceMode, setVoiceMode]   = useState(false);
  const [autoListen, setAutoListen] = useState(false);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef  = useRef("");
  const messagesRef    = useRef<Message[]>([]);
  const autoListenRef  = useRef(false);
  const startListenRef = useRef<() => void>(() => {});

  /* ── Carregar histórico do localStorage ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {}
    setMounted(true);
  }, []);

  /* ── Salvar histórico no localStorage ── */
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
    }
  }, [messages]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { autoListenRef.current = autoListen; }, [autoListen]);

  /* ── Welcome (só se não há histórico) ── */
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([WELCOME]);
    }
  }, [open]); // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ── Limpar ao fechar ── */
  useEffect(() => {
    if (!open) {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort();
      setListening(false); setSpeaking(false); setAutoListen(false);
    }
  }, [open]);

  /* ── Nova conversa ── */
  const clearHistory = useCallback(() => {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.abort();
    setListening(false); setSpeaking(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setMessages([WELCOME]);
    setInput(""); setTranscript("");
  }, []);

  /* ── TTS ── */
  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!ttsEnabled || !window.speechSynthesis) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const clean = text.replace(/\*\*/g, "").replace(/\n/g, " ").slice(0, 600);
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = "pt-BR"; utt.rate = 1.05; utt.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const ptBr = voices.find(v => v.lang === "pt-BR") || voices.find(v => v.lang.startsWith("pt"));
    if (ptBr) utt.voice = ptBr;
    utt.onstart = () => setSpeaking(true);
    utt.onend   = () => { setSpeaking(false); onDone?.(); };
    utt.onerror = () => { setSpeaking(false); onDone?.(); };
    window.speechSynthesis.speak(utt);
  }, [ttsEnabled]);

  /* ── Enviar mensagem ── */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading) return;
    const userMsg: Message = { role: "user", content: content.trim() };
    const next = [...messagesRef.current, userMsg];
    setMessages(next);
    setInput(""); setTranscript(""); transcriptRef.current = "";
    setLoading(true);
    window.speechSynthesis?.cancel();

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      const reply = data.text || "Erro ao processar. Tente novamente.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      speak(reply, () => {
        if (autoListenRef.current) setTimeout(() => startListenRef.current(), 600);
      });
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Erro de conexão." }]);
    } finally {
      setLoading(false);
    }
  }, [loading, speak]);

  /* ── Reconhecimento de voz ── */
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Reconhecimento de voz não suportado. Use Chrome."); return; }
    window.speechSynthesis?.cancel();

    const rec = new SR();
    rec.lang = "pt-BR"; rec.continuous = false; rec.interimResults = true;

    rec.onstart  = () => { setListening(true); setTranscript(""); transcriptRef.current = ""; };
    rec.onresult = (e: any) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      setTranscript(t); transcriptRef.current = t;
    };
    rec.onend    = () => {
      setListening(false);
      const final = transcriptRef.current;
      if (final.trim()) sendMessage(final);
    };
    rec.onerror  = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
  }, [sendMessage]);

  useEffect(() => { startListenRef.current = startListening; }, [startListening]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const renderText = (text: string) =>
    text.split(/(\*\*[^*]+\*\*)|\n/g).map((p, i) => {
      if (!p) return <br key={i} />;
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
      return <span key={i}>{p}</span>;
    });

  if (!mounted || !open) return null;

  const waveColor = listening ? "#f87171" : "#a855f7";
  const isActive  = listening || speaking;

  /* ════════════════════════════════════════
     MODO VOZ
  ════════════════════════════════════════ */
  const voiceContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-end justify-center sm:items-center p-4"
      style={{ background: "rgba(0,0,0,0.90)", backdropFilter: "blur(20px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Gradiente de fundo animado */}
      <style>{`
        @keyframes bgPulse {
          0%,100% { opacity: 0.06; transform: scale(1); }
          50%      { opacity: 0.14; transform: scale(1.12); }
        }
        @keyframes orbitSpin {
          from { transform: rotate(0deg) translateX(56px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(56px) rotate(-360deg); }
        }
        @keyframes orbitSpinRev {
          from { transform: rotate(0deg) translateX(68px) rotate(0deg); }
          to   { transform: rotate(-360deg) translateX(68px) rotate(360deg); }
        }
      `}</style>

      <div
        className="relative flex flex-col items-center w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl pb-8"
        style={{ background: "linear-gradient(160deg,#0e0015 0%,#070010 100%)", border: "1px solid #1f0040" }}
      >
        {/* Blob de fundo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: listening
              ? "radial-gradient(ellipse at center, rgba(239,68,68,0.15) 0%, transparent 70%)"
              : speaking
              ? "radial-gradient(ellipse at center, rgba(168,85,247,0.18) 0%, transparent 70%)"
              : "radial-gradient(ellipse at center, rgba(124,58,237,0.08) 0%, transparent 70%)",
            transition: "background 0.6s ease",
            animation: isActive ? "bgPulse 2s ease-in-out infinite" : "none",
          }}
        />

        {/* Topo */}
        <div className="w-full flex items-center justify-between px-5 pt-5 pb-3 relative z-10">
          <button
            onClick={() => setVoiceMode(false)}
            className="p-2 rounded-xl text-gray-500 hover:text-white transition-colors"
            title="Modo chat"
          >
            <MessageSquare size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
            >
              <Sparkles size={14} color="white" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">Zora IA</span>
          </div>
          <button
            onClick={() => { setTtsEnabled(v => !v); window.speechSynthesis?.cancel(); }}
            className="p-2 rounded-xl text-gray-500 hover:text-white transition-colors"
          >
            {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        {/* Avatar com animação */}
        <div className="relative flex items-center justify-center mt-6 mb-1 z-10">
          {/* Ripples externos */}
          {isActive && (
            <>
              <div
                className="absolute w-44 h-44 rounded-full animate-ping"
                style={{ background: listening ? "rgba(239,68,68,0.06)" : "rgba(168,85,247,0.06)" }}
              />
              <div
                className="absolute w-36 h-36 rounded-full animate-pulse"
                style={{ background: listening ? "rgba(239,68,68,0.1)" : "rgba(168,85,247,0.12)" }}
              />
            </>
          )}

          {/* Pontos em órbita (só quando ativo) */}
          {isActive && (
            <>
              <div
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: waveColor,
                  animation: "orbitSpin 3s linear infinite",
                  boxShadow: `0 0 6px ${waveColor}`,
                }}
              />
              <div
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: waveColor,
                  opacity: 0.7,
                  animation: "orbitSpinRev 4.5s linear infinite",
                  boxShadow: `0 0 4px ${waveColor}`,
                }}
              />
            </>
          )}

          {/* Avatar */}
          <div
            className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl"
            style={{
              background: "linear-gradient(135deg,#a855f7,#ec4899)",
              boxShadow: listening
                ? "0 0 60px rgba(239,68,68,0.55), 0 0 120px rgba(239,68,68,0.2)"
                : speaking
                ? "0 0 60px rgba(168,85,247,0.65), 0 0 120px rgba(168,85,247,0.25)"
                : "0 0 40px rgba(168,85,247,0.25)",
              transition: "box-shadow 0.5s ease",
            }}
          >
            <Sparkles size={36} color="white" />
          </div>
        </div>

        {/* Waveform */}
        <div className="flex justify-center mt-3 mb-1 h-9 items-center z-10">
          <Waveform active={isActive} color={waveColor} />
        </div>

        {/* Status */}
        <p
          className="text-sm font-medium mb-1 transition-colors z-10"
          style={{
            color: listening ? "#f87171" : speaking ? "#d8b4fe" : loading ? "#a855f7" : "#6b7280",
          }}
        >
          {listening ? "Ouvindo..." : speaking ? "Falando..." : loading ? "Pensando..." : "Toque para falar"}
        </p>

        {/* Transcript / última fala */}
        <div className="px-6 mb-5 min-h-[36px] flex items-center justify-center z-10">
          <p className="text-xs text-gray-500 text-center leading-relaxed line-clamp-2">
            {transcript
              ? transcript
              : messages.length > 0
              ? messages[messages.length - 1].content.slice(0, 80) + (messages[messages.length - 1].content.length > 80 ? "…" : "")
              : ""}
          </p>
        </div>

        {/* Botão mic grande */}
        <button
          onClick={listening ? stopListening : startListening}
          disabled={loading || speaking}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90 disabled:opacity-40 mb-5 z-10"
          style={{
            background: listening
              ? "linear-gradient(135deg,#dc2626,#ef4444)"
              : "linear-gradient(135deg,#7c3aed,#a855f7)",
            boxShadow: listening
              ? "0 0 32px rgba(239,68,68,0.55)"
              : "0 0 32px rgba(168,85,247,0.45)",
            transition: "background 0.3s ease, box-shadow 0.3s ease",
          }}
        >
          {loading
            ? <Loader2 size={26} color="white" className="animate-spin" />
            : listening
            ? <MicOff size={26} color="white" />
            : <Mic size={26} color="white" />}
        </button>

        {/* Conversa contínua + encerrar */}
        <div className="flex items-center gap-3 z-10">
          <button
            onClick={() => setAutoListen(v => !v)}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full transition-all"
            style={{
              background: autoListen ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${autoListen ? "#7c3aed" : "#1f1f1f"}`,
              color: autoListen ? "#a855f7" : "#4b5563",
            }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoListen ? "bg-purple-500 animate-pulse" : "bg-gray-600"}`} />
            Modo conversa
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1f1f1f", color: "#6b7280" }}
          >
            <PhoneOff size={11} /> Encerrar
          </button>
        </div>
      </div>
    </div>
  );

  /* ════════════════════════════════════════
     MODO CHAT
  ════════════════════════════════════════ */
  const chatContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ height: 580, background: "#0d0d0d", border: "1px solid #1e1e1e" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#1a0533 0%,#0d0d1f 100%)", borderBottom: "1px solid #1e1e1e" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
            >
              <Sparkles size={17} color="white" />
            </div>
            <div>
              <p className="font-semibold text-white">Zora IA</p>
              <p className="text-xs text-purple-400">Especialista em carrosséis</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setVoiceMode(true)}
              className="p-2 rounded-lg text-gray-400 hover:text-purple-400 transition-colors"
              title="Modo de voz"
            >
              <Mic size={17} />
            </button>
            <button
              onClick={() => { setTtsEnabled(v => !v); window.speechSynthesis?.cancel(); }}
              className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
              title={ttsEnabled ? "Desativar voz" : "Ativar voz"}
            >
              {ttsEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button
              onClick={clearHistory}
              className="p-2 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
              title="Nova conversa"
            >
              <Trash2 size={17} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ scrollbarWidth: "none" }}>
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="text-sm leading-relaxed max-w-[85%] px-3.5 py-2.5 rounded-2xl"
                style={{
                  background: m.role === "user" ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "#1c1c1c",
                  color: "#e5e7eb",
                  borderBottomRightRadius: m.role === "user" ? 4 : undefined,
                  borderBottomLeftRadius: m.role === "assistant" ? 4 : undefined,
                }}
              >
                {renderText(m.content)}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-[4px] bg-[#1c1c1c] flex items-center gap-2">
                <Loader2 size={14} className="text-purple-400 animate-spin" />
                <span className="text-xs text-gray-500">Zora está pensando...</span>
              </div>
            </div>
          )}

          {messages.length === 1 && !loading && (
            <div className="flex flex-wrap gap-2 mt-1">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#2a2a2a] text-gray-400 hover:border-purple-500 hover:text-purple-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Transcript ao vivo */}
        {(listening || transcript) && (
          <div
            className="mx-4 mb-2 px-3 py-2 rounded-xl text-sm text-gray-300 flex items-center gap-2"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
            <span className="truncate">{transcript || "Ouvindo..."}</span>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 pb-4 flex-shrink-0 space-y-2">
          <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-xl px-3 py-2.5 border border-[#2a2a2a] focus-within:border-purple-600 transition-colors">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendMessage(input); }}
              placeholder="Digite sua pergunta..."
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all flex-shrink-0"
              style={{ background: input.trim() && !loading ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "#2a2a2a" }}
            >
              <Send size={13} color="white" />
            </button>
          </div>

          <button
            onClick={listening ? stopListening : startListening}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-40"
            style={{
              background: listening
                ? "linear-gradient(135deg,#dc2626,#ef4444)"
                : "linear-gradient(135deg,#7c3aed,#a855f7)",
              color: "white",
              boxShadow: listening ? "0 0 20px rgba(239,68,68,0.4)" : "0 0 20px rgba(168,85,247,0.3)",
            }}
          >
            {listening ? (
              <><MicOff size={18} /> Parar de ouvir</>
            ) : (
              <><Mic size={18} /> {speaking ? "Reproduzindo resposta..." : "Falar com a Zora"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(voiceMode ? voiceContent : chatContent, document.body);
}
