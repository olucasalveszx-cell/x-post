"use client";

import { useState } from "react";
import { X, MessageSquare, Lightbulb, Send, CheckCircle2, ChevronLeft, Star } from "lucide-react";

type FeedbackType = "feedback" | "update_idea";
type Step = "choose" | "write" | "done";

interface Props {
  open: boolean;
  onClose: () => void;
}

const OPTIONS: { type: FeedbackType; icon: React.ReactNode; title: string; desc: string; color: string; bg: string; border: string }[] = [
  {
    type: "feedback",
    icon: <MessageSquare size={22} />,
    title: "Dar um Feedback",
    desc: "Conte o que achou, o que melhorou ou o que incomoda.",
    color: "#4c6ef5",
    bg: "rgba(76,110,245,0.08)",
    border: "rgba(76,110,245,0.25)",
  },
  {
    type: "update_idea",
    icon: <Lightbulb size={22} />,
    title: "Dica de Atualização",
    desc: "Sugira uma funcionalidade nova ou melhoria para o app.",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
  },
];

const STAR_LABELS = ["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"];

export default function FeedbackModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>("choose");
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const option = OPTIONS.find((o) => o.type === selectedType);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep("choose"); setSelectedType(null); setText("");
      setRating(0); setHoverRating(0); setError("");
    }, 300);
  };

  const handleSelect = (type: FeedbackType) => {
    setSelectedType(type);
    setStep("write");
  };

  const handleSend = async () => {
    if (!text.trim() || !selectedType) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, text, rating: rating || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erro ao enviar");
      }
      setStep("done");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={handleClose}
    >
      <div
        className="w-full sm:max-w-md bg-[var(--bg-2)] border-t sm:border border-[var(--border-2)] rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
          {step === "write" && (
            <button onClick={() => setStep("choose")} className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors shrink-0 p-1 -ml-1">
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="flex-1">
            <p className="font-bold text-sm text-[var(--text)]">
              {step === "choose" ? "Enviar mensagem" : step === "write" ? option?.title : "Enviado!"}
            </p>
            <p className="text-[10px] text-[var(--text-3)] mt-0.5">
              {step === "choose" ? "O que você gostaria de nos dizer?" : step === "write" ? option?.desc : "Obrigado pelo seu contato."}
            </p>
          </div>
          <button onClick={handleClose} className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Escolha do tipo */}
          {step === "choose" && (
            <div className="flex flex-col gap-3">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => handleSelect(opt.type)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl border text-left transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{ background: opt.bg, borderColor: opt.border }}
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${opt.color}20`, color: opt.color }}>
                    {opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--text)]">{opt.title}</p>
                    <p className="text-[11px] mt-0.5 text-[var(--text-2)] leading-relaxed">{opt.desc}</p>
                  </div>
                  <span className="text-[var(--text-3)] text-lg shrink-0">›</span>
                </button>
              ))}
            </div>
          )}

          {/* Escrever */}
          {step === "write" && option && (
            <div className="flex flex-col gap-4">
              {/* Avaliação com estrelas (apenas para feedback) */}
              {selectedType === "feedback" && (
                <div className="flex flex-col items-center gap-2 py-2">
                  <p className="text-[11px] text-[var(--text-3)]">Avalie sua experiência (opcional)</p>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star === rating ? 0 : star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          size={28}
                          style={{
                            fill: star <= activeRating ? "#f59e0b" : "transparent",
                            color: star <= activeRating ? "#f59e0b" : "#374151",
                            transition: "all 0.15s",
                          }}
                        />
                      </button>
                    ))}
                  </div>
                  {activeRating > 0 && (
                    <p className="text-[11px] font-semibold" style={{ color: "#f59e0b" }}>
                      {STAR_LABELS[activeRating]}
                    </p>
                  )}
                </div>
              )}

              <textarea
                autoFocus={selectedType !== "feedback"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={selectedType === "feedback" ? "Escreva seu feedback aqui..." : "Descreva sua ideia de atualização..."}
                rows={5}
                className="w-full resize-none rounded-xl border border-[var(--border-2)] bg-[var(--bg-3)] text-sm text-[var(--text)] placeholder-[var(--text-3)] px-4 py-3 focus:outline-none focus:border-brand-500/50 transition-colors leading-relaxed"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: option.color, color: "#fff" }}
              >
                {sending ? "Enviando..." : <><Send size={15} /> Enviar</>}
              </button>
            </div>
          )}

          {/* Sucesso */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}>
                <CheckCircle2 size={30} className="text-green-400" />
              </div>
              {rating > 0 && selectedType === "feedback" && (
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={18} style={{ fill: s <= rating ? "#f59e0b" : "transparent", color: s <= rating ? "#f59e0b" : "#374151" }} />
                  ))}
                </div>
              )}
              <div>
                <p className="font-bold text-[var(--text)] text-base">
                  {selectedType === "feedback" ? "Feedback recebido!" : "Ideia enviada!"}
                </p>
                <p className="text-[12px] text-[var(--text-3)] mt-1.5 leading-relaxed max-w-xs">
                  {selectedType === "feedback"
                    ? "Obrigado! Seu feedback é muito valioso para nós."
                    : "Recebemos sua ideia. O admin vai analisar e pode responder em breve."}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl bg-[var(--bg-3)] border border-[var(--border-2)] text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
