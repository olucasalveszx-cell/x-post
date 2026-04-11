"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Mic, MicOff, Send, Sparkles, Volume2, VolumeX, Loader2 } from "lucide-react";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  "Como criar um hook irresistível?",
  "Estrutura ideal de carrossel viral",
  "Dicas de CTA que convertem",
  "Cores e fontes para carrosséis",
];

export default function AIAssistant({ open, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { setMounted(true); }, []);

  // Mensagem inicial ao abrir
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Olá! Sou a Zora, sua especialista em carrosséis virais para Instagram. Pode falar ou digitar sua dúvida — vou te ajudar a criar conteúdo que engaja de verdade!",
      }]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Para TTS ao fechar
  useEffect(() => {
    if (!open) {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop();
      setListening(false);
      setSpeaking(false);
    }
  }, [open]);

  const speak = useCallback((text: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/\*\*/g, "").replace(/\n/g, " ");
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = "pt-BR";
    utt.rate = 1.05;
    utt.pitch = 1.1;

    // Preferir voz pt-BR se disponível
    const voices = window.speechSynthesis.getVoices();
    const ptBr = voices.find((v) => v.lang === "pt-BR") || voices.find((v) => v.lang.startsWith("pt"));
    if (ptBr) utt.voice = ptBr;

    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, [ttsEnabled]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading) return;
    const userMsg: Message = { role: "user", content: content.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setTranscript("");
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
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      speak(reply);
    } catch {
      const err = "Erro de conexão. Tente novamente.";
      setMessages((prev) => [...prev, { role: "assistant", content: err }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, speak]);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Reconhecimento de voz não suportado neste browser. Use Chrome.");
      return;
    }
    window.speechSynthesis?.cancel();

    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => { setListening(true); setTranscript(""); };
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        interim += e.results[i][0].transcript;
      }
      setTranscript(interim);
    };
    rec.onend = () => {
      setListening(false);
      const final = transcript || rec._lastTranscript || "";
      if (final.trim()) sendMessage(final);
    };
    rec.onerror = () => setListening(false);

    // Guardar último transcript antes de onend
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        interim += e.results[i][0].transcript;
      }
      setTranscript(interim);
      rec._lastTranscript = interim;
    };

    recognitionRef.current = rec;
    rec.start();
  }, [transcript, sendMessage]);

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

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ height: 580, background: "#0d0d0d", border: "1px solid #1e1e1e" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #1a0533 0%, #0d0d1f 100%)", borderBottom: "1px solid #1e1e1e" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}
            >
              <Sparkles size={17} color="white" />
            </div>
            <div>
              <p className="font-semibold text-white">Zora IA</p>
              <p className="text-xs text-purple-400">Especialista em carrosséis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTtsEnabled((v) => !v); window.speechSynthesis?.cancel(); }}
              className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
              title={ttsEnabled ? "Desativar voz" : "Ativar voz"}
            >
              {ttsEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ scrollbarWidth: "none" }}>
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="text-sm leading-relaxed max-w-[85%] px-3.5 py-2.5 rounded-2xl"
                style={{
                  background: m.role === "user" ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "#1c1c1c",
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

          {/* Sugestões */}
          {messages.length === 1 && !loading && (
            <div className="flex flex-wrap gap-2 mt-1">
              {SUGGESTIONS.map((s) => (
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

        {/* Voz — transcript ao ouvir */}
        {(listening || transcript) && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl text-sm text-gray-300 flex items-center gap-2"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
            <span className="truncate">{transcript || "Ouvindo..."}</span>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 pb-4 flex-shrink-0 space-y-2">
          {/* Input texto */}
          <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-xl px-3 py-2.5 border border-[#2a2a2a] focus-within:border-purple-600 transition-colors">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendMessage(input); }}
              placeholder="Digite sua pergunta..."
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all flex-shrink-0"
              style={{ background: input.trim() && !loading ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "#2a2a2a" }}
            >
              <Send size={13} color="white" />
            </button>
          </div>

          {/* Botão de voz */}
          <button
            onClick={listening ? stopListening : startListening}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-40"
            style={{
              background: listening
                ? "linear-gradient(135deg, #dc2626, #ef4444)"
                : "linear-gradient(135deg, #7c3aed, #a855f7)",
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
    </div>,
    document.body
  );
}
