"use client";

import { useState } from "react";
import { X, Instagram, Loader2, CheckCircle, AlertCircle, LogIn, User, ExternalLink, Upload, Pencil, LayoutGrid, BookImage, Calendar, Clock, Music, ChevronRight, ChevronLeft } from "lucide-react";
import { renderSlide } from "@/lib/render-slide";

interface IGAccount {
  token: string;
  accountId: string;
  username: string;
}

interface Props {
  slides: any[];
  account: IGAccount | null;
  onClose: () => void;
  onLoginClick: () => void;
}

type Step = "caption" | "mode" | "publish";
type PublishMode = "api" | "manual";
type PostType = "carousel" | "stories";

const STEPS: { key: Step; label: string }[] = [
  { key: "caption", label: "Legenda" },
  { key: "mode",    label: "Modo" },
  { key: "publish", label: "Publicar" },
];

const nextStep: Record<Step, Step | null> = { caption: "mode", mode: "publish", publish: null };
const prevStep: Record<Step, Step | null> = { caption: null, mode: "caption", publish: "mode" };

export default function PublishModal({ slides, account, onClose, onLoginClick }: Props) {
  const [step, setStep] = useState<Step>("caption");
  const [caption, setCaption] = useState("");
  const [publishMode, setPublishMode] = useState<PublishMode>("api");
  const [postType, setPostType] = useState<PostType>("carousel");
  const [status, setStatus] = useState<"idle" | "exporting" | "uploading" | "publishing" | "scheduling" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [permalink, setPermalink] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [showMusicConfirm, setShowMusicConfirm] = useState(false);

  const isLoading = ["exporting", "uploading", "publishing", "scheduling"].includes(status);
  const statusLabel: Record<string, string> = {
    exporting: "Exportando slides...",
    uploading: "Enviando para o servidor...",
    publishing: "Publicando no Instagram...",
    scheduling: "Agendando post...",
  };

  const exportSlides = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < slides.length; i++) {
      setProgress(Math.round((i / slides.length) * 40));
      const canvas = await renderSlide(slides[i]);
      urls.push(canvas.toDataURL("image/jpeg", 0.92));
    }
    return urls;
  };

  const uploadImages = async (dataUrls: string[]): Promise<string[]> => {
    const publicUrls: string[] = [];
    for (let i = 0; i < dataUrls.length; i++) {
      setProgress(40 + Math.round((i / dataUrls.length) * 40));
      const base64 = dataUrls[i].split(",")[1];
      const res = await fetch("/api/instagram/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType: "image/jpeg" }),
      });
      const data = await res.json();
      if (!data.url) throw new Error("Falha ao hospedar imagem " + (i + 1));
      publicUrls.push(data.url);
    }
    return publicUrls;
  };

  const uploadToBlob = async (dataUrls: string[]): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < dataUrls.length; i++) {
      setProgress(40 + Math.round((i / dataUrls.length) * 40));
      const base64 = dataUrls[i].split(",")[1];
      const res = await fetch("/api/blob-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg", filename: `carousel-${Date.now()}-${i}.jpg` }),
      });
      const data = await res.json();
      if (!data.url) throw new Error("Falha ao hospedar imagem " + (i + 1));
      urls.push(data.url);
    }
    return urls;
  };

  const handlePublishApi = async () => {
    if (!account) return;
    setStatus("exporting"); setMessage(""); setProgress(0);
    try {
      const dataUrls = await exportSlides();
      if (dataUrls.length < 2) throw new Error("O carrossel precisa ter pelo menos 2 slides");
      setStatus("uploading");
      const publicUrls = await uploadImages(dataUrls);
      setProgress(80);
      setStatus("publishing");
      const res = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls: publicUrls, caption, igToken: account.token, igAccountId: account.accountId, postType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProgress(100); setStatus("success"); setMessage(data.message);
      setPermalink(data.permalink ?? "");
    } catch (err: any) {
      setStatus("error"); setMessage(err.message ?? "Erro ao publicar");
    }
  };

  const handlePublishManual = async () => {
    setStatus("exporting"); setMessage(""); setProgress(0);
    try {
      const dataUrls = await exportSlides();
      setProgress(80);
      const files: File[] = dataUrls.map((url, i) => {
        const arr = url.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] ?? "image/jpeg";
        const bstr = atob(arr[1]);
        const u8 = new Uint8Array(bstr.length);
        for (let j = 0; j < bstr.length; j++) u8[j] = bstr.charCodeAt(j);
        return new File([u8], `slide-${String(i + 1).padStart(2, "0")}.jpg`, { type: mime });
      });
      setProgress(90);
      const canShare = typeof navigator.share === "function" && navigator.canShare?.({ files });
      if (canShare) {
        await navigator.share({ files, title: "XPost Carrossel" });
        setProgress(100); setStatus("success");
        setMessage("Imagens enviadas para o Instagram!");
      } else {
        for (let i = 0; i < dataUrls.length; i++) {
          const a = document.createElement("a");
          a.href = dataUrls[i]; a.download = `slide-${String(i + 1).padStart(2, "0")}.jpg`;
          a.click();
          await new Promise((r) => setTimeout(r, 200));
        }
        setProgress(100); setStatus("success");
        setMessage("Imagens baixadas! Abra o Instagram para publicar.");
      }
    } catch (err: any) {
      if ((err as any)?.name === "AbortError") { setStatus("idle"); return; }
      setStatus("error"); setMessage(err.message ?? "Erro ao exportar");
    }
  };

  const handleSchedule = async () => {
    if (!account || !scheduledAt) return;
    setStatus("exporting"); setMessage(""); setProgress(0);
    try {
      const dataUrls = await exportSlides();
      setStatus("uploading");
      const blobUrls = await uploadToBlob(dataUrls);
      setProgress(80); setStatus("scheduling");
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, imageUrls: blobUrls, scheduledAt, igAccountId: account.accountId, igToken: account.token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProgress(100); setStatus("success");
      setMessage(`Post agendado para ${new Date(scheduledAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`);
    } catch (err: any) {
      setStatus("error"); setMessage(err.message ?? "Erro ao agendar");
    }
  };

  // "Sim" no pop-up de música: abre Instagram com as imagens para o usuário adicionar música nativamente
  const handleShareWithMusic = async () => {
    setShowMusicConfirm(false);
    setStatus("exporting"); setMessage(""); setProgress(0);
    try {
      const dataUrls = await exportSlides();
      setProgress(80);
      const files: File[] = dataUrls.map((url, i) => {
        const arr = url.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] ?? "image/jpeg";
        const bstr = atob(arr[1]);
        const u8 = new Uint8Array(bstr.length);
        for (let j = 0; j < bstr.length; j++) u8[j] = bstr.charCodeAt(j);
        return new File([u8], `slide-${String(i + 1).padStart(2, "0")}.jpg`, { type: mime });
      });
      // Copia legenda para área de transferência
      if (caption) navigator.clipboard.writeText(caption).catch(() => {});
      setProgress(90);
      const canShare = typeof navigator.share === "function" && navigator.canShare?.({ files });
      if (canShare) {
        await navigator.share({ files, text: caption, title: "XPost" });
      } else {
        // Fallback: baixa as imagens
        for (let i = 0; i < dataUrls.length; i++) {
          const a = document.createElement("a");
          a.href = dataUrls[i]; a.download = `slide-${String(i + 1).padStart(2, "0")}.jpg`;
          a.click();
          await new Promise((r) => setTimeout(r, 200));
        }
      }
      onClose(); // Volta para o editor
    } catch (err: any) {
      if ((err as any)?.name === "AbortError") { setStatus("idle"); setShowMusicConfirm(false); return; }
      setStatus("error"); setMessage(err.message ?? "Erro ao abrir Instagram");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-3)] border border-[var(--border-2)] rounded-2xl w-full max-w-md flex flex-col max-h-[90vh] relative overflow-hidden">

        {/* Pop-up confirmação de música (overlay) */}
        {showMusicConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6">
            <div className="bg-[var(--bg-3)] border border-[var(--border)] rounded-2xl p-6 flex flex-col items-center gap-4 w-full max-w-xs text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}>
                <Music size={22} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-[var(--text)] text-base mb-1">Adicionar música?</p>
                <p className="text-xs text-[var(--text-2)] leading-relaxed">
                  Deseja adicionar música ao post agendado? Você escolherá a música direto no Instagram.
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={async () => { setShowMusicConfirm(false); await handleSchedule(); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-4)] transition-colors"
                >
                  Não, agendar
                </button>
                <button
                  onClick={handleShareWithMusic}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}
                >
                  Sim, abrir IG
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-2)] shrink-0">
          <div className="flex items-center gap-2 font-semibold">
            <Instagram size={20} className="text-brand-500" />
            Publicar no Instagram
          </div>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text)]"><X size={20} /></button>
        </div>

        {/* Steps */}
        <div className="flex border-b border-[var(--border-2)] shrink-0">
          {STEPS.map((s, i) => (
            <button key={s.key} onClick={() => setStep(s.key)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${step === s.key ? "text-[var(--text)]" : "text-[var(--text-3)] hover:text-[var(--text)]"}`}>
              <span className="inline-flex items-center justify-center gap-1">
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${step === s.key ? "bg-brand-600 text-white" : "bg-[var(--bg-4)] text-[var(--text-3)]"}`}>{i + 1}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </span>
              {step === s.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          {/* ── Step 1: Legenda ── */}
          {step === "caption" && (
            <>
              <div>
                <label className="text-sm text-[var(--text-2)] mb-1 block">Legenda</label>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                  placeholder="Digite a legenda, hashtags..."
                  rows={6}
                  className="w-full bg-[var(--bg-3)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600 resize-none"
                  autoFocus />
                <p className="text-xs text-gray-600 mt-1">{caption.length} caracteres</p>
              </div>
            </>
          )}

          {/* ── Step 2: Modo de publicação ── */}
          {step === "mode" && (
            <>
              <div>
                <p className="text-sm text-[var(--text-2)] mb-2">Tipo de post:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPostType("carousel")}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${postType === "carousel" ? "border-brand-500 bg-brand-500/10" : "border-[var(--border-2)] hover:border-[var(--border)]"}`}>
                    <LayoutGrid size={20} className={postType === "carousel" ? "text-brand-400" : "text-[var(--text-3)]"} />
                    <div className="text-center">
                      <p className="text-xs font-semibold text-[var(--text)]">Carrossel</p>
                      <p className="text-[10px] text-[var(--text-3)]">Feed · até 10 slides</p>
                    </div>
                  </button>
                  <button onClick={() => setPostType("stories")}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${postType === "stories" ? "border-brand-500 bg-brand-500/10" : "border-[var(--border-2)] hover:border-[var(--border)]"}`}>
                    <BookImage size={20} className={postType === "stories" ? "text-brand-400" : "text-[var(--text-3)]"} />
                    <div className="text-center">
                      <p className="text-xs font-semibold text-[var(--text)]">Stories</p>
                      <p className="text-[10px] text-[var(--text-3)]">1 story por slide</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="w-full h-px bg-[var(--bg-4)]" />
              <p className="text-sm text-[var(--text-2)]">Como você quer publicar?</p>

              <button onClick={() => setPublishMode("api")}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${publishMode === "api" ? "border-brand-500 bg-brand-500/10" : "border-[var(--border-2)] hover:border-[var(--border)]"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${publishMode === "api" ? "bg-brand-600" : "bg-[var(--bg-4)]"}`}>
                  <Upload size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)] mb-0.5">Upload direto</p>
                  <p className="text-xs text-[var(--text-2)]">Publica automaticamente via API. Rápido, sem abrir o Instagram.</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 ml-auto ${publishMode === "api" ? "border-brand-500 bg-brand-500" : "border-[var(--border)]"}`} />
              </button>

              <button onClick={() => setPublishMode("manual")}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${publishMode === "manual" ? "border-brand-500 bg-brand-500/10" : "border-[var(--border-2)] hover:border-[var(--border)]"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${publishMode === "manual" ? "bg-brand-600" : "bg-[var(--bg-4)]"}`}>
                  <Pencil size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)] mb-0.5">Editar no Instagram</p>
                  <p className="text-xs text-[var(--text-2)]">Envia para o Instagram onde você adiciona música, localização e finaliza.</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 ml-auto ${publishMode === "manual" ? "border-brand-500 bg-brand-500" : "border-[var(--border)]"}`} />
              </button>
            </>
          )}

          {/* ── Step 3: Publicar ── */}
          {step === "publish" && (
            <>
              {publishMode === "api" && (
                account ? (
                  <div className="flex items-center gap-3 bg-green-900/20 border border-green-800/40 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <User size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text)]">@{account.username}</p>
                      <p className="text-xs text-green-400">Conta conectada</p>
                    </div>
                    <button onClick={onLoginClick} className="text-xs text-[var(--text-3)] hover:text-[var(--text)] underline">Trocar</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-[var(--text-2)]">Conecte sua conta Instagram:</p>
                    <button onClick={onLoginClick}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold text-sm">
                      <LogIn size={16} />Login com Instagram
                    </button>
                  </div>
                )
              )}

              <div className="bg-[var(--bg-3)] rounded-xl p-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">Slides</span>
                  <span className="text-[var(--text)] font-medium">{slides.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">Tipo</span>
                  <span className="text-[var(--text)] font-medium">{postType === "carousel" ? "Carrossel (Feed)" : "Stories"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">Modo</span>
                  <span className="text-[var(--text)] font-medium">{publishMode === "api" ? "Upload direto" : "Editar no Instagram"}</span>
                </div>
                {caption && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-3)] shrink-0">Legenda</span>
                    <span className="text-[var(--text)] text-xs text-right line-clamp-2">{caption.slice(0, 80)}{caption.length > 80 ? "…" : ""}</span>
                  </div>
                )}
              </div>

              {slides.length < 2 && publishMode === "api" && postType === "carousel" && (
                <p className="text-yellow-500 text-xs">Mínimo de 2 slides para carrossel</p>
              )}

              {isLoading && (
                <div>
                  <p className="text-xs text-[var(--text-2)] mb-1.5">{statusLabel[status] ?? ""}</p>
                  <div className="w-full bg-[var(--bg-4)] rounded-full h-1.5">
                    <div className="bg-brand-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="flex items-start gap-2 rounded-lg p-3 text-sm bg-red-900/30 border border-red-800/50 text-red-300">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />{message}
                </div>
              )}

              {status === "success" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 rounded-lg p-3 text-sm bg-green-900/30 border border-green-800/50 text-green-300">
                    <CheckCircle size={14} className="shrink-0" />{message}
                  </div>
                  {permalink && (
                    <a href={permalink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold text-sm">
                      <Instagram size={15} /><ExternalLink size={13} />Ver post no Instagram
                    </a>
                  )}
                </div>
              )}

              {/* Agendamento */}
              {status !== "success" && publishMode === "api" && account && (
                <div className="flex flex-col gap-2">
                  {!showSchedule ? (
                    <button onClick={() => setShowSchedule(true)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[var(--border-2)] hover:border-brand-500/40 bg-[var(--bg-3)] hover:bg-brand-500/5 text-[var(--text-2)] hover:text-[var(--text)] text-sm transition-all">
                      <Calendar size={14} /> Agendar para depois
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 p-3 rounded-xl border border-brand-500/30 bg-brand-500/5">
                      <p className="text-xs text-[var(--text-2)] flex items-center gap-1.5">
                        <Clock size={12} className="text-brand-400" /> Escolha data e hora:
                      </p>
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        min={new Date(Date.now() + 11 * 60 * 1000).toISOString().slice(0, 16)}
                        className="w-full bg-[var(--bg-3)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-brand-500"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setShowSchedule(false)}
                          className="flex-1 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-2)] hover:text-[var(--text)] transition-colors">
                          Cancelar
                        </button>
                        <button
                          onClick={() => setShowMusicConfirm(true)}
                          disabled={!scheduledAt || isLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium disabled:opacity-40 transition-colors">
                          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Calendar size={12} />}
                          {isLoading ? (statusLabel[status] ?? "") : "Confirmar agendamento"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {status !== "success" && (
                <button
                  onClick={publishMode === "api" ? handlePublishApi : handlePublishManual}
                  disabled={isLoading || (publishMode === "api" && (!account || (postType === "carousel" && slides.length < 2)))}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : publishMode === "api" ? <Upload size={16} /> : <Instagram size={16} />}
                  {isLoading ? (statusLabel[status] ?? "") : publishMode === "api" ? "Publicar Agora" : "Enviar para o Instagram"}
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer navegação */}
        {status !== "success" && (
          <div className="flex gap-2 p-4 border-t border-[var(--border-2)] shrink-0">
            {prevStep[step] && (
              <button onClick={() => setStep(prevStep[step]!)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--bg-4)] hover:bg-[var(--bg-4)] text-sm text-[var(--text)]">
                <ChevronLeft size={15} />Voltar
              </button>
            )}
            {nextStep[step] && (
              <button onClick={() => setStep(nextStep[step]!)}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-sm font-medium">
                Próximo<ChevronRight size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
