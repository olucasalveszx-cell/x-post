"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic2, Link2, Loader2, Check, ChevronRight, Trash2,
  FileAudio, FileVideo, Clock, BookOpen, Sparkles, Zap, List,
  GraduationCap, Megaphone, AlignLeft, BarChart3, Copy, ExternalLink,
  ArrowLeft, X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { CarouselFormat } from "@/app/api/transcricao/carousel/route";
import type { TranscriptionRecord } from "@/app/api/transcricao/process/route";

interface LibraryItem {
  id: string; title: string; sourceType: string; language: string;
  duration?: number; wordCount: number;
  summary: { short: string; medium: string; detailed: string };
  topics: { main: string; keywords: string[] };
  createdAt: string; status: string; errorMsg?: string;
}

type ProcessStep = "idle" | "uploading" | "transcribing" | "analyzing" | "done" | "error";
type ResultTab = "transcript" | "summary" | "topics" | "carousel";

const FORMATS: { id: CarouselFormat; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { id: "educativo",     label: "Educativo",       desc: "Ensina de forma didática",       icon: <GraduationCap size={15} />, color: "#6366f1" },
  { id: "storytelling",  label: "Storytelling",    desc: "Narrativa envolvente",            icon: <BookOpen size={15} />,      color: "#d946ef" },
  { id: "twitter",       label: "Twitter / X",     desc: "Frases curtas e impactantes",    icon: <Zap size={15} />,           color: "#1d9bf0" },
  { id: "viral",         label: "Viral",           desc: "Gancho poderoso, para o scroll", icon: <Megaphone size={15} />,     color: "#f97316" },
  { id: "lista",         label: "Lista",           desc: "Top X itens numerados",          icon: <List size={15} />,          color: "#22c55e" },
  { id: "passo_a_passo", label: "Passo a Passo",   desc: "Tutorial com etapas claras",     icon: <AlignLeft size={15} />,     color: "#38bdf8" },
  { id: "executivo",     label: "Resumo Executivo",desc: "Profissional e direto",           icon: <BarChart3 size={15} />,     color: "#d4a017" },
];

function fmtDuration(s?: number) {
  if (!s) return "—";
  const m = Math.floor(s / 60), sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function MiniWaveform({ color = "rgba(139,92,246,0.5)" }: { color?: string }) {
  const bars = [0.3,0.7,1,0.6,0.9,0.5,0.8,1,0.65,0.4,0.85,0.6,0.35];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:2, height:20 }}>
      {bars.map((h,i) => (
        <div key={i} style={{ width:2.5, height:`${h*100}%`, borderRadius:99, background:color, opacity:0.7+h*0.3 }} />
      ))}
    </div>
  );
}

export default function TranscricaoPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ProcessStep>("idle");
  const [stepLabel, setStepLabel] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [result, setResult] = useState<TranscriptionRecord | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>("transcript");
  const [copied, setCopied] = useState(false);

  const [selectedFormat, setSelectedFormat] = useState<CarouselFormat>("educativo");
  const [generatingCarousel, setGeneratingCarousel] = useState(false);
  const [carouselDone, setCarouselDone] = useState(false);
  const [carouselDraftId, setCarouselDraftId] = useState<string | null>(null);
  const [carouselError, setCarouselError] = useState("");

  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  useEffect(() => {
    fetch("/api/transcricao/list")
      .then(r => r.json())
      .then(d => setLibrary(d.records ?? []))
      .catch(() => {})
      .finally(() => setLoadingLibrary(false));
  }, []);

  const refreshLibrary = () => {
    fetch("/api/transcricao/list").then(r => r.json()).then(d => setLibrary(d.records ?? [])).catch(() => {});
  };

  const ACCEPT_TYPES = ["audio/mpeg","audio/mp3","audio/wav","audio/x-wav","audio/wave","audio/mp4","audio/m4a","audio/x-m4a","audio/ogg","audio/webm","video/mp4","video/quicktime","video/webm"];
  const MAX_SIZE = 25 * 1024 * 1024;

  const handleFile = (f: File) => {
    if (!ACCEPT_TYPES.includes(f.type) && !f.name.match(/\.(mp3|wav|m4a|ogg|mp4|mov|webm|avi)$/i)) {
      setErrorMsg("Formato não suportado. Use MP3, WAV, M4A, MP4, MOV ou WEBM.");
      return;
    }
    if (f.size > MAX_SIZE) { setErrorMsg("Arquivo muito grande. Máximo 25MB."); return; }
    setFile(f);
    setErrorMsg("");
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [title]); // eslint-disable-line

  const uploadFile = async (f: File): Promise<string> => {
    const { signedUrl, path } = await fetch(
      `/api/transcricao/upload-url?filename=${encodeURIComponent(f.name)}&contentType=${encodeURIComponent(f.type || "audio/mpeg")}`
    ).then(r => r.json());
    if (!signedUrl) throw new Error("Não foi possível gerar URL de upload");
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100));
      };
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload falhou: ${xhr.status}`));
      xhr.onerror = () => reject(new Error("Erro de rede no upload"));
      xhr.open("PUT", signedUrl);
      xhr.setRequestHeader("Content-Type", f.type || "audio/mpeg");
      xhr.send(f);
    });
    return path;
  };

  const process = async () => {
    if (!session) { router.push("/"); return; }
    if (!file && !urlInput.trim()) return;
    setStep("uploading"); setStepLabel("Fazendo upload..."); setErrorMsg(""); setResult(null);
    setCarouselDone(false); setCarouselDraftId(null); setUploadProgress(0);
    try {
      let path: string | null = null;
      let sourceUrl: string | undefined;
      const isUrl = !file && urlInput.trim();
      if (file) {
        setStepLabel(`Enviando ${file.name}...`);
        path = await uploadFile(file);
      } else {
        sourceUrl = urlInput.trim();
      }
      setStep("transcribing"); setStepLabel("Transcrevendo com Whisper IA...");
      const res = await fetch("/api/transcricao/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, title: title || undefined, sourceType: isUrl ? "url" : "upload", sourceUrl }),
      });
      setStep("analyzing"); setStepLabel("Analisando conteúdo com IA...");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro no processamento");
      setResult(data.record);
      setStep("done"); setStepLabel("Concluído!");
      setActiveTab("summary");
      refreshLibrary();
    } catch (e: any) {
      setStep("error"); setStepLabel(""); setErrorMsg(e.message ?? "Erro desconhecido");
    }
  };

  const loadFromLibrary = async (id: string) => {
    const res = await fetch(`/api/transcricao/${id}`);
    const data = await res.json();
    if (data.record) { setResult(data.record); setActiveTab("summary"); setStep("done"); }
  };

  const deleteFromLibrary = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/transcricao/${id}`, { method: "DELETE" });
    setLibrary(prev => prev.filter(r => r.id !== id));
    if (result?.id === id) { setResult(null); setStep("idle"); }
  };

  const generateCarousel = async () => {
    if (!result) return;
    setGeneratingCarousel(true);
    setCarouselError("");
    try {
      const res = await fetch("/api/transcricao/carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptionId: result.id, format: selectedFormat }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);
      if (!data.draftId) throw new Error("Servidor não retornou o rascunho. Tente novamente.");
      setCarouselDraftId(data.draftId);
      setCarouselDone(true);
    } catch (e: any) {
      setCarouselError(e.message ?? "Erro desconhecido");
    } finally {
      setGeneratingCarousel(false);
    }
  };

  const copyTranscript = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isProcessing = ["uploading", "transcribing", "analyzing"].includes(step);
  const hasResult = step === "done" && result;

  const STEPS = [
    { id: "uploading",    label: "Upload" },
    { id: "transcribing", label: "Transcrição" },
    { id: "analyzing",    label: "Análise IA" },
    { id: "done",         label: "Concluído" },
  ];
  const currentStepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(160deg,#0b0718 0%,#07080f 60%,#09070f 100%)", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-30" style={{ background: "rgba(9,7,20,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(139,92,246,0.12)" }}>
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-3">
          <button onClick={() => router.push("/editor")} className="flex items-center gap-1.5 text-white/30 hover:text-white/65 text-sm transition-colors">
            <ArrowLeft size={15} /> Voltar
          </button>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2 text-sm font-bold">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background:"linear-gradient(135deg,rgba(109,40,217,0.5),rgba(168,85,247,0.25))", border:"1px solid rgba(139,92,246,0.45)", boxShadow:"0 0 14px rgba(109,40,217,0.3)" }}>
              <Mic2 size={13} className="text-violet-300" />
            </div>
            <span className="text-white/80">Transcrição</span>
            <span style={{ background:"linear-gradient(90deg,#a78bfa,#e879f9)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Inteligente</span>
          </div>
          <div className="ml-auto">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase" style={{ background:"rgba(109,40,217,0.18)", border:"1px solid rgba(139,92,246,0.35)", color:"rgba(196,181,253,0.85)" }}>Beta</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-6">

        {/* ── Left column ── */}
        <div className="space-y-5">

          {/* Hero text — fora do card */}
          {!hasResult && step !== "done" && !isProcessing && (
            <div className="space-y-1 pt-2">
              <h1 className="text-2xl md:text-[28px] font-extrabold leading-tight tracking-tight">
                Transforme áudio e vídeo em{" "}
                <span style={{ background:"linear-gradient(90deg,#a78bfa,#e879f9,#f9a8d4)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  carrosséis virais
                </span>
              </h1>
              <p className="text-white/35 text-sm">A IA transcreve, analisa e gera slides automaticamente.</p>
            </div>
          )}

          {/* ── Upload card ── */}
          {!hasResult && step !== "done" && (
            <div className="rounded-2xl overflow-hidden" style={{ background:"linear-gradient(145deg,#120d2e 0%,#0e0b22 100%)", border:"1px solid rgba(139,92,246,0.25)", boxShadow:"0 0 0 1px rgba(109,40,217,0.08), 0 24px 60px rgba(0,0,0,0.5), 0 0 80px rgba(88,28,220,0.07)" }}>
              {/* Accent strip */}
              <div style={{ height:2, background:"linear-gradient(90deg,#6d28d9 0%,#a855f7 50%,#ec4899 100%)" }} />

              <div className="p-5 space-y-4">

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="relative cursor-pointer transition-all duration-200 rounded-xl"
                  style={{
                    border: `1.5px dashed ${file ? "rgba(139,92,246,0.65)" : isDragging ? "rgba(167,139,250,0.8)" : "rgba(139,92,246,0.28)"}`,
                    background: file ? "rgba(109,40,217,0.1)" : isDragging ? "rgba(109,40,217,0.13)" : "rgba(109,40,217,0.04)",
                    padding: "36px 24px",
                    textAlign: "center",
                    boxShadow: isDragging ? "0 0 40px rgba(109,40,217,0.2), inset 0 0 30px rgba(109,40,217,0.05)" : "none",
                  }}
                >
                  <input ref={fileInputRef} type="file" accept=".mp3,.wav,.m4a,.ogg,.mp4,.mov,.webm,.avi" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

                  {file ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background:"linear-gradient(135deg,rgba(109,40,217,0.3),rgba(168,85,247,0.15))", border:"1px solid rgba(139,92,246,0.4)", boxShadow:"0 0 28px rgba(109,40,217,0.25)" }}>
                        {file.type.startsWith("video") ? <FileVideo size={26} className="text-violet-300" /> : <FileAudio size={26} className="text-violet-300" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{file.name}</p>
                        <p className="text-xs text-violet-300/50 mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <MiniWaveform color="rgba(167,139,250,0.7)" />
                      <button onClick={e => { e.stopPropagation(); setFile(null); setTitle(""); }}
                        className="text-[11px] text-white/25 hover:text-red-400 transition-colors flex items-center gap-1 mt-1">
                        <X size={10} /> remover
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      {/* Mic com glow */}
                      <div className="relative flex items-center justify-center">
                        <div className="absolute w-20 h-20 rounded-full" style={{ background:"radial-gradient(ellipse,rgba(109,40,217,0.35),transparent 70%)", filter:"blur(12px)" }} />
                        <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background:"linear-gradient(135deg,rgba(109,40,217,0.4),rgba(168,85,247,0.2))", border:"1px solid rgba(139,92,246,0.4)", boxShadow:"0 0 24px rgba(109,40,217,0.3)" }}>
                          <Mic2 size={26} className="text-violet-200" />
                        </div>
                      </div>
                      {/* Waveform */}
                      <div style={{ display:"flex", alignItems:"center", gap:3, height:28 }}>
                        {[0.4,0.7,1,0.6,0.9,0.5,0.85,1,0.65,0.45,0.8,0.55,0.35,0.7,0.9,0.5,0.75,0.4].map((h,i)=>(
                          <div key={i} style={{ width:3, height:`${h*100}%`, borderRadius:99, background:`rgba(139,92,246,${isDragging ? 0.55+h*0.35 : 0.22+h*0.2})`, transition:"opacity 0.2s" }} />
                        ))}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white/85">{isDragging ? "Solte aqui!" : "Arraste um arquivo ou clique para selecionar"}</p>
                        <p className="text-xs text-white/28 mt-1">MP4 · MOV · MP3 · WAV · M4A · WEBM · até 25 MB</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background:"rgba(139,92,246,0.12)" }} />
                  <span className="text-[11px] font-bold text-white/20 tracking-widest uppercase">ou cole uma URL</span>
                  <div className="flex-1 h-px" style={{ background:"rgba(139,92,246,0.12)" }} />
                </div>

                {/* Inputs */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background:"rgba(0,0,0,0.25)", border:"1px solid rgba(139,92,246,0.15)" }}>
                    <Link2 size={14} className="text-violet-400/40 shrink-0" />
                    <input
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      placeholder="https://exemplo.com/video.mp4"
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-white/18 outline-none"
                      disabled={!!file}
                      style={{ opacity: file ? 0.3 : 1 }}
                    />
                  </div>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Título (opcional)"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/18 outline-none transition-all"
                    style={{ background:"rgba(0,0,0,0.25)", border:"1px solid rgba(255,255,255,0.08)" }}
                    onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.5)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm text-red-400" style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)" }}>
                    <X size={14} className="mt-0.5 shrink-0" /> <span>{errorMsg}</span>
                  </div>
                )}

                {/* CTA */}
                <button
                  onClick={process}
                  disabled={(!file && !urlInput.trim()) || isProcessing}
                  className="w-full py-4 rounded-xl font-extrabold text-sm tracking-wide transition-all flex items-center justify-center gap-2.5 relative overflow-hidden group disabled:opacity-30"
                  style={{ background:"linear-gradient(135deg,#5b21b6,#7c3aed,#9333ea)", boxShadow:"0 10px 40px rgba(109,40,217,0.45), 0 0 0 1px rgba(167,139,250,0.18)" }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.1),transparent)" }} />
                  <Sparkles size={16} className="relative z-10" />
                  <span className="relative z-10">Transcrever e Analisar com IA</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Processing ── */}
          {isProcessing && (
            <div className="rounded-2xl overflow-hidden" style={{ background:"linear-gradient(145deg,#120d2e 0%,#0e0b22 100%)", border:"1px solid rgba(139,92,246,0.22)", boxShadow:"0 24px 60px rgba(0,0,0,0.5)" }}>
              <div style={{ height:2, background:"linear-gradient(90deg,#6d28d9,#a855f7,#ec4899)" }} />
              <div className="p-8 space-y-8">
                <div className="text-center space-y-5">
                  {/* Waveform animado */}
                  <div className="flex items-center justify-center gap-1.5 h-12">
                    {[0.3,0.6,1,0.7,0.9,0.5,0.8,1,0.65,0.45,0.85,0.6,0.4,0.75,0.9,0.5].map((h,i)=>(
                      <div key={i} style={{ width:4, height:`${h*100}%`, borderRadius:99, background:`linear-gradient(to top,rgba(109,40,217,0.7),rgba(196,181,253,${0.5+h*0.4}))` }} />
                    ))}
                  </div>
                  <div>
                    <p className="font-bold text-base text-white">{stepLabel}</p>
                    <p className="text-xs text-white/30 mt-1">Isso pode levar até 60 segundos</p>
                  </div>
                </div>
                <div className="flex items-center justify-center flex-wrap gap-1">
                  {STEPS.map((s, i) => {
                    const done = i < currentStepIdx;
                    const isActive = i === currentStepIdx;
                    return (
                      <div key={s.id} className="flex items-center">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: done ? "rgba(16,185,129,0.1)" : isActive ? "rgba(109,40,217,0.2)" : "transparent",
                            border: done ? "1px solid rgba(16,185,129,0.25)" : isActive ? "1px solid rgba(139,92,246,0.4)" : "1px solid transparent",
                            color: done ? "#34d399" : isActive ? "#c4b5fd" : "rgba(255,255,255,0.18)",
                          }}>
                          {done ? <Check size={11} /> : isActive ? <Loader2 size={11} className="animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-current inline-block opacity-30" />}
                          {s.label}
                        </div>
                        {i < STEPS.length - 1 && <ChevronRight size={12} className="mx-0.5 text-white/10" />}
                      </div>
                    );
                  })}
                </div>
                {step === "uploading" && uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-white/30">
                      <span>Upload</span><span className="text-violet-300/60 font-bold">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all duration-300" style={{ width:`${uploadProgress}%`, background:"linear-gradient(90deg,#5b21b6,#a855f7)", boxShadow:"0 0 8px rgba(168,85,247,0.5)" }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {step === "error" && (
            <div className="rounded-2xl p-5 space-y-3" style={{ background:"linear-gradient(145deg,rgba(60,10,10,0.6),rgba(20,5,5,0.8))", border:"1px solid rgba(239,68,68,0.25)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.28)" }}>
                  <X size={15} className="text-red-400" />
                </div>
                <p className="text-red-300 text-sm font-bold">Erro no processamento</p>
              </div>
              <p className="text-red-300/50 text-sm">{errorMsg}</p>
              <button onClick={() => { setStep("idle"); setErrorMsg(""); }} className="text-sm text-white/35 hover:text-white/60 transition-colors flex items-center gap-1.5">
                <ArrowLeft size={13} /> Tentar novamente
              </button>
            </div>
          )}

          {/* ── Results ── */}
          {hasResult && (
            <div className="space-y-4">
              {/* Header do resultado */}
              <div className="rounded-2xl overflow-hidden" style={{ background:"linear-gradient(145deg,#120d2e 0%,#0e0b22 100%)", border:"1px solid rgba(139,92,246,0.22)" }}>
                <div style={{ height:2, background:"linear-gradient(90deg,#059669,#10b981,#34d399)" }} />
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.28)" }}>
                      <Check size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[11px] text-emerald-400 font-bold mb-0.5 uppercase tracking-wider">Concluída</p>
                      <h2 className="font-bold text-base text-white leading-snug">{result.title}</h2>
                      <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-white/35">
                        <span className="flex items-center gap-1"><Clock size={10} />{fmtDuration(result.duration)}</span>
                        <span>·</span><span>{result.wordCount.toLocaleString()} palavras</span>
                        <span>·</span><span className="uppercase">{result.language}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setResult(null); setStep("idle"); setFile(null); setTitle(""); setUrlInput(""); }}
                    className="p-1.5 rounded-lg text-white/20 hover:text-white/55 hover:bg-white/5 transition-colors shrink-0">
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-2xl" style={{ background:"rgba(18,13,46,0.8)", border:"1px solid rgba(139,92,246,0.18)" }}>
                {([
                  { id: "summary",    label: "Resumo",      icon: <Sparkles size={11} /> },
                  { id: "transcript", label: "Transcrição", icon: <AlignLeft size={11} /> },
                  { id: "topics",     label: "Tópicos",     icon: <Zap size={11} /> },
                  { id: "carousel",   label: "Carrossel",   icon: <GraduationCap size={11} /> },
                ] as { id: ResultTab; label: string; icon: React.ReactNode }[]).map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: activeTab === tab.id ? "linear-gradient(135deg,rgba(109,40,217,0.35),rgba(139,92,246,0.2))" : "transparent",
                      color: activeTab === tab.id ? "#c4b5fd" : "rgba(255,255,255,0.3)",
                      border: activeTab === tab.id ? "1px solid rgba(139,92,246,0.35)" : "1px solid transparent",
                      boxShadow: activeTab === tab.id ? "0 2px 16px rgba(109,40,217,0.2)" : "none",
                    }}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Conteúdo das tabs */}
              <div className="rounded-2xl overflow-hidden" style={{ background:"linear-gradient(145deg,#110c2a,#0e0b20)", border:"1px solid rgba(139,92,246,0.15)" }}>

                {activeTab === "summary" && (
                  <div className="divide-y" style={{ borderColor:"rgba(139,92,246,0.08)" }}>
                    {[
                      { label: "Resumo curto",      text: result.summary.short,    dot:"#a78bfa" },
                      { label: "Resumo médio",       text: result.summary.medium,   dot:"#c084fc" },
                      { label: "Análise detalhada",  text: result.summary.detailed, dot:"#e879f9" },
                    ].map((s, i) => (
                      <div key={i} className="p-5">
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="w-2 h-2 rounded-full" style={{ background:s.dot, boxShadow:`0 0 6px ${s.dot}` }} />
                          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color:`${s.dot}90` }}>{s.label}</p>
                        </div>
                        <p className="text-sm leading-relaxed text-white/65">{s.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "transcript" && (
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-violet-400" style={{ boxShadow:"0 0 6px #a78bfa" }} />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/60">Transcrição completa</p>
                      </div>
                      <button onClick={copyTranscript} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/65 transition-colors px-2.5 py-1.5 rounded-lg" style={{ background:"rgba(0,0,0,0.2)", border:"1px solid rgba(255,255,255,0.08)" }}>
                        {copied ? <><Check size={11} className="text-emerald-400" /> Copiado!</> : <><Copy size={11} /> Copiar</>}
                      </button>
                    </div>
                    <p className="text-sm text-white/55 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto pr-2">
                      {result.transcript}
                    </p>
                  </div>
                )}

                {activeTab === "topics" && (
                  <div className="p-5 space-y-5">
                    <div className="p-4 rounded-xl" style={{ background:"rgba(109,40,217,0.1)", border:"1px solid rgba(139,92,246,0.22)" }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/60 mb-1.5">Tema principal</p>
                      <p className="text-sm font-bold text-violet-200">{result.topics.main}</p>
                    </div>
                    {result.topics.subtopics.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/22 mb-3">Subtemas</p>
                        <div className="flex flex-wrap gap-2">
                          {result.topics.subtopics.map((t, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl text-xs text-white/55 font-medium" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.topics.keywords.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/50 mb-3">Palavras-chave</p>
                        <div className="flex flex-wrap gap-2">
                          {result.topics.keywords.map((k, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-violet-200" style={{ background:"rgba(109,40,217,0.14)", border:"1px solid rgba(139,92,246,0.28)" }}>{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.topics.insights.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/22 mb-3">Insights</p>
                        <ul className="space-y-2.5">
                          {result.topics.insights.map((ins, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-white/60">
                              <div className="mt-1 w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ background:"rgba(109,40,217,0.15)", border:"1px solid rgba(139,92,246,0.22)" }}>
                                <Zap size={9} className="text-violet-400" />
                              </div>
                              {ins}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.topics.cta && (
                      <div className="p-4 rounded-xl" style={{ background:"rgba(5,150,105,0.08)", border:"1px solid rgba(16,185,129,0.2)" }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 mb-1.5">CTA sugerida</p>
                        <p className="text-sm text-emerald-300 font-semibold">{result.topics.cta}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "carousel" && (
                  <div className="p-5 space-y-4">
                    <div>
                      <p className="font-bold text-sm text-white/80 mb-1">Escolha o formato</p>
                      <p className="text-xs text-white/30">A IA cria slides com base na transcrição e análise.</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {FORMATS.map(f => (
                        <button key={f.id} onClick={() => setSelectedFormat(f.id)}
                          className="flex flex-col gap-2 p-3.5 rounded-xl text-left transition-all"
                          style={{
                            border: `1px solid ${selectedFormat === f.id ? f.color + "55" : "rgba(255,255,255,0.07)"}`,
                            background: selectedFormat === f.id ? f.color + "11" : "rgba(0,0,0,0.2)",
                            boxShadow: selectedFormat === f.id ? `0 0 20px ${f.color}14` : "none",
                          }}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: selectedFormat === f.id ? f.color + "22" : "rgba(255,255,255,0.04)", border:`1px solid ${selectedFormat === f.id ? f.color + "40" : "rgba(255,255,255,0.07)"}` }}>
                            <span style={{ color: selectedFormat === f.id ? f.color : "rgba(255,255,255,0.22)" }}>{f.icon}</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold" style={{ color: selectedFormat === f.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}>{f.label}</p>
                            <p className="text-[10px] text-white/18 mt-0.5">{f.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    {carouselDone && carouselDraftId ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background:"rgba(5,150,105,0.08)", border:"1px solid rgba(16,185,129,0.22)" }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.28)" }}>
                          <Check size={16} className="text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-emerald-300">Carrossel gerado!</p>
                          <p className="text-xs text-emerald-300/45 mt-0.5">Salvo nos rascunhos</p>
                        </div>
                        <a href={`/editor?draft=${carouselDraftId}`} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background:"rgba(16,185,129,0.6)", border:"1px solid rgba(16,185,129,0.35)" }}>
                          <ExternalLink size={11} /> Abrir projeto
                        </a>
                      </div>
                    ) : (
                      <>
                      {carouselError && (
                        <div className="p-3 rounded-xl text-sm text-red-400 mb-3" style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)" }}>
                          ⚠ {carouselError}
                        </div>
                      )}
                      <button onClick={generateCarousel} disabled={generatingCarousel}
                        className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-35 relative overflow-hidden group"
                        style={{ background:"linear-gradient(135deg,#5b21b6,#7c3aed,#9333ea)", boxShadow:"0 8px 32px rgba(109,40,217,0.35)" }}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background:"rgba(255,255,255,0.08)" }} />
                        {generatingCarousel ? <><Loader2 size={14} className="animate-spin" /> Gerando...</> : <><Sparkles size={14} /> Gerar Carrossel com IA</>}
                      </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar — Biblioteca ── */}
        <aside>
          <div className="sticky top-20 rounded-2xl overflow-hidden" style={{ background:"linear-gradient(145deg,#0f0b28 0%,#0c0920 100%)", border:"1px solid rgba(139,92,246,0.18)", boxShadow:"0 16px 48px rgba(0,0,0,0.4)" }}>
            <div style={{ height:2, background:"linear-gradient(90deg,rgba(109,40,217,0.6),rgba(139,92,246,0.3),transparent)" }} />

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom:"1px solid rgba(139,92,246,0.1)" }}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-2">
                <BookOpen size={12} className="text-violet-400/50" /> Biblioteca
              </h3>
              {library.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:"rgba(109,40,217,0.2)", border:"1px solid rgba(139,92,246,0.3)", color:"rgba(167,139,250,0.8)" }}>{library.length}</span>
              )}
            </div>

            <div className="p-3">
              {loadingLibrary && (
                <div className="flex justify-center py-10">
                  <Loader2 size={15} className="animate-spin text-violet-400/25" />
                </div>
              )}

              {!loadingLibrary && library.length === 0 && (
                <div className="text-center py-10 space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background:"rgba(109,40,217,0.1)", border:"1px solid rgba(139,92,246,0.18)" }}>
                    <Mic2 size={18} className="text-violet-400/30" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/22">Biblioteca vazia</p>
                    <p className="text-[11px] text-white/14 mt-0.5">Transcreva seu primeiro arquivo</p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto">
                {library.map(item => {
                  const isAudio = item.sourceType === "upload";
                  const isActive = result?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => loadFromLibrary(item.id)}
                      className="group relative cursor-pointer rounded-xl overflow-hidden transition-all duration-150"
                      style={{
                        background: isActive ? "rgba(109,40,217,0.14)" : "rgba(0,0,0,0.2)",
                        border: `1px solid ${isActive ? "rgba(139,92,246,0.45)" : "rgba(255,255,255,0.055)"}`,
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.25)"; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.055)"; }}
                    >
                      {isActive && <div className="absolute left-0 inset-y-0 w-0.5" style={{ background:"linear-gradient(to bottom,#7c3aed,#a855f7)" }} />}

                      <div className="p-3 pl-3.5">
                        <div className="flex items-start gap-2 justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="w-4 h-4 rounded-md flex items-center justify-center shrink-0" style={{ background: isAudio ? "rgba(109,40,217,0.2)" : "rgba(37,99,235,0.2)", border:`1px solid ${isAudio ? "rgba(139,92,246,0.3)" : "rgba(59,130,246,0.3)"}` }}>
                                {isAudio ? <FileAudio size={8} style={{ color:"#a78bfa" }} /> : <FileVideo size={8} style={{ color:"#60a5fa" }} />}
                              </div>
                              <p className="text-xs font-bold text-white/75 truncate">{item.title}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-white/22">
                              <span className="flex items-center gap-0.5"><Clock size={8} />{fmtDuration(item.duration)}</span>
                              <span>·</span>
                              <span>{item.wordCount.toLocaleString()} palavras</span>
                            </div>
                            {item.topics.keywords?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.topics.keywords.slice(0, 3).map((k, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background:"rgba(109,40,217,0.12)", border:"1px solid rgba(139,92,246,0.2)", color:"rgba(167,139,250,0.6)" }}>{k}</span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-[10px] text-white/18">{fmtDate(item.createdAt)}</p>
                              <MiniWaveform color={isActive ? "rgba(167,139,250,0.55)" : "rgba(139,92,246,0.2)"} />
                            </div>
                          </div>
                          <button onClick={e => deleteFromLibrary(item.id, e)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-white/18 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      {item.status === "error" && (
                        <div className="px-3 pb-2 text-[10px] text-red-400/55 flex items-center gap-1">
                          <X size={9} /> {item.errorMsg?.substring(0, 40)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
