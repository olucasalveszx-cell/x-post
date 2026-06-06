"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic2, Upload, Link2, Loader2, Check, ChevronRight, Trash2,
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
    try {
      const res = await fetch("/api/transcricao/carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptionId: result.id, format: selectedFormat }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCarouselDraftId(data.draftId);
      setCarouselDone(true);
    } catch (e: any) {
      setErrorMsg(e.message);
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
    <div className="min-h-screen text-white" style={{ background: "#070810", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06]" style={{ background: "rgba(7,8,16,0.92)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-4">
          <button onClick={() => router.push("/editor")} className="flex items-center gap-1.5 text-white/35 hover:text-white/70 text-sm transition-colors">
            <ArrowLeft size={15} /> Voltar
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background:"rgba(139,92,246,0.2)", border:"1px solid rgba(139,92,246,0.3)" }}>
              <Mic2 size={13} className="text-violet-400" />
            </div>
            <span className="text-white/90">Transcrição Inteligente</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-semibold text-violet-400/70 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full tracking-wide uppercase">Beta</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-8">

        {/* ── Left column ── */}
        <div className="space-y-6">

          {/* Upload zone */}
          {!hasResult && step !== "done" && (
            <div className="space-y-5">

              {/* Hero */}
              <div className="relative">
                <div className="absolute" style={{ left:"-10%", top:"-60%", width:"50%", height:180, borderRadius:"50%", background:"radial-gradient(ellipse, rgba(124,58,237,0.14), transparent 70%)", filter:"blur(32px)", pointerEvents:"none" }} />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background:"rgba(139,92,246,0.12)", border:"1px solid rgba(139,92,246,0.25)", color:"rgba(196,181,253,0.85)" }}>
                      <Sparkles size={10} /> Powered by Whisper + GPT-4o
                    </div>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold leading-tight mb-2">
                    Transforme áudio e vídeo em{" "}
                    <span style={{ background:"linear-gradient(90deg,#a78bfa,#e879f9,#f9a8d4)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                      carrosséis virais
                    </span>
                  </h1>
                  <p className="text-white/40 text-sm">Envie um arquivo ou cole uma URL — a IA transcreve, analisa e cria slides automaticamente.</p>
                </div>
              </div>

              {/* Drag & drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="relative cursor-pointer transition-all"
                style={{
                  borderRadius: 16,
                  border: `1.5px dashed ${file ? "rgba(139,92,246,0.55)" : isDragging ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.1)"}`,
                  background: file ? "rgba(139,92,246,0.05)" : isDragging ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.015)",
                  padding: "32px 24px",
                  textAlign: "center",
                  boxShadow: isDragging ? "0 0 30px rgba(124,58,237,0.15)" : "none",
                }}
              >
                <input ref={fileInputRef} type="file" accept=".mp3,.wav,.m4a,.ogg,.mp4,.mov,.webm,.avi" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.3)" }}>
                      {file.type.startsWith("video") ? <FileVideo size={24} className="text-violet-400" /> : <FileAudio size={24} className="text-violet-400" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white">{file.name}</p>
                      <p className="text-xs text-white/35 mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <MiniWaveform color="rgba(139,92,246,0.6)" />
                    <button onClick={e => { e.stopPropagation(); setFile(null); setTitle(""); }}
                      className="text-xs text-white/25 hover:text-red-400 transition-colors flex items-center gap-1 mt-1">
                      <X size={11} /> Remover
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    {/* Waveform visual */}
                    <div style={{ display:"flex", alignItems:"center", gap:3, height:36, opacity:0.3 }}>
                      {[0.3,0.6,0.9,1,0.75,0.5,0.85,1,0.6,0.4,0.75,0.95,0.5,0.8,0.35,0.65,0.45].map((h,i)=>(
                        <div key={i} style={{ width:3, height:`${h*100}%`, borderRadius:99, background:"#8b5cf6" }} />
                      ))}
                    </div>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
                      <Upload size={20} className="text-white/30" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white/85">Arraste um arquivo ou clique para selecionar</p>
                      <p className="text-xs text-white/25 mt-1">MP4 · MOV · WEBM · MP3 · WAV · M4A · até 25 MB</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background:"linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)" }} />
                <span className="text-xs text-white/20 font-medium">ou cole uma URL</span>
                <div className="flex-1 h-px" style={{ background:"linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)" }} />
              </div>

              {/* URL input */}
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                <Link2 size={14} className="text-white/20 shrink-0" />
                <input
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://exemplo.com/video.mp4 — URLs diretas de mídia"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/18 outline-none"
                  disabled={!!file}
                  style={{ color: file ? "rgba(255,255,255,0.25)" : undefined }}
                />
              </div>

              {/* Title input */}
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título (opcional) — ex: Reunião de vendas 20/06"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/18 outline-none transition-colors"
                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}
                onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
              />

              {errorMsg && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm text-red-400" style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.18)" }}>
                  <X size={14} className="mt-0.5 shrink-0" />
                  <span className="leading-snug">{errorMsg}</span>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={process}
                disabled={(!file && !urlInput.trim()) || isProcessing}
                className="w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 relative overflow-hidden disabled:opacity-35"
                style={{ background:"linear-gradient(135deg,#7c3aed,#9333ea,#a855f7)", boxShadow:"0 8px 32px rgba(124,58,237,0.35), 0 0 0 1px rgba(167,139,250,0.15)" }}
              >
                <Sparkles size={15} className="relative z-10" />
                <span className="relative z-10 tracking-wide">Transcrever e Analisar</span>
              </button>
            </div>
          )}

          {/* Processing */}
          {isProcessing && (
            <div className="rounded-2xl p-8 space-y-8" style={{ border:"1px solid rgba(139,92,246,0.15)", background:"rgba(124,58,237,0.04)" }}>
              <div className="text-center space-y-4">
                {/* Animated waveform */}
                <div className="flex items-center justify-center gap-1.5 h-10">
                  {[0.4,0.7,1,0.6,0.9,0.5,0.8,1,0.65,0.45,0.85,0.6].map((h,i)=>(
                    <div key={i} style={{ width:4, height:`${h*100}%`, borderRadius:99, background:`rgba(167,139,250,${0.35+h*0.45})` }} />
                  ))}
                </div>
                <div>
                  <p className="font-semibold text-sm text-white/90">{stepLabel}</p>
                  <p className="text-xs text-white/30 mt-1">Isso pode levar até 60 segundos</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-0">
                {STEPS.map((s, i) => {
                  const done = i < currentStepIdx;
                  const isActive = i === currentStepIdx;
                  return (
                    <div key={s.id} className="flex items-center">
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        done ? "text-emerald-400" : isActive ? "text-violet-300 bg-violet-500/10" : "text-white/20"
                      }`}>
                        {done ? <Check size={11} /> : isActive ? <Loader2 size={11} className="animate-spin" /> : <span className="w-2.5 h-2.5 rounded-full border border-current inline-block" />}
                        {s.label}
                      </div>
                      {i < STEPS.length - 1 && <ChevronRight size={13} className="text-white/12 mx-0.5" />}
                    </div>
                  );
                })}
              </div>

              {step === "uploading" && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white/30">
                    <span>Upload</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width:`${uploadProgress}%`, background:"linear-gradient(90deg,#7c3aed,#a855f7)" }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="rounded-2xl p-6 space-y-4" style={{ border:"1px solid rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.04)" }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:"rgba(239,68,68,0.12)" }}>
                  <X size={14} className="text-red-400" />
                </div>
                <p className="text-red-400 text-sm font-semibold">Erro no processamento</p>
              </div>
              <p className="text-red-300/60 text-sm leading-relaxed">{errorMsg}</p>
              <button onClick={() => { setStep("idle"); setErrorMsg(""); }}
                className="text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5">
                <ArrowLeft size={13} /> Tentar novamente
              </button>
            </div>
          )}

          {/* Results */}
          {hasResult && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs text-emerald-400 font-semibold">Transcrição concluída</span>
                  </div>
                  <h2 className="font-bold text-lg leading-tight text-white">{result.title}</h2>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-white/35">
                    <span className="flex items-center gap-1"><Clock size={11} />{fmtDuration(result.duration)}</span>
                    <span>{result.wordCount.toLocaleString()} palavras</span>
                    <span className="uppercase">{result.language}</span>
                  </div>
                </div>
                <button onClick={() => { setResult(null); setStep("idle"); setFile(null); setTitle(""); setUrlInput(""); }}
                  className="shrink-0 p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-colors">
                  <X size={15} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-xl" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
                {([
                  { id: "summary",    label: "Resumo",      icon: <Sparkles size={11} /> },
                  { id: "transcript", label: "Transcrição", icon: <AlignLeft size={11} /> },
                  { id: "topics",     label: "Tópicos",     icon: <Zap size={11} /> },
                  { id: "carousel",   label: "Carrossel",   icon: <GraduationCap size={11} /> },
                ] as { id: ResultTab; label: string; icon: React.ReactNode }[]).map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: activeTab === tab.id ? "rgba(139,92,246,0.18)" : "transparent",
                      color: activeTab === tab.id ? "rgba(196,181,253,0.95)" : "rgba(255,255,255,0.35)",
                      border: activeTab === tab.id ? "1px solid rgba(139,92,246,0.25)" : "1px solid transparent",
                    }}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="rounded-xl min-h-[300px]" style={{ border:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.015)" }}>

                {activeTab === "summary" && (
                  <div className="p-6 space-y-5">
                    {[
                      { label: "Resumo curto", text: result.summary.short, opacity: "text-white/80" },
                      { label: "Resumo médio", text: result.summary.medium, opacity: "text-white/65" },
                      { label: "Análise detalhada", text: result.summary.detailed, opacity: "text-white/55" },
                    ].map((s, i) => (
                      <div key={i}>
                        {i > 0 && <div className="h-px mb-5" style={{ background:"rgba(255,255,255,0.04)" }} />}
                        <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2 font-semibold">{s.label}</p>
                        <p className={`text-sm leading-relaxed ${s.opacity}`}>{s.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "transcript" && (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold">Transcrição completa</p>
                      <button onClick={copyTranscript} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors px-2.5 py-1 rounded-lg hover:bg-white/5">
                        {copied ? <><Check size={11} className="text-emerald-400" /> Copiado!</> : <><Copy size={11} /> Copiar</>}
                      </button>
                    </div>
                    <p className="text-sm text-white/55 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto pr-2">
                      {result.transcript}
                    </p>
                  </div>
                )}

                {activeTab === "topics" && (
                  <div className="p-6 space-y-5">
                    <div>
                      <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2 font-semibold">Tema principal</p>
                      <p className="text-sm font-semibold text-violet-300">{result.topics.main}</p>
                    </div>
                    {result.topics.subtopics.length > 0 && (
                      <div>
                        <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2 font-semibold">Subtemas</p>
                        <div className="flex flex-wrap gap-2">
                          {result.topics.subtopics.map((t, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg text-xs text-white/55" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.topics.keywords.length > 0 && (
                      <div>
                        <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2 font-semibold">Palavras-chave</p>
                        <div className="flex flex-wrap gap-2">
                          {result.topics.keywords.map((k, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg text-xs text-violet-300" style={{ background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.2)" }}>{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.topics.insights.length > 0 && (
                      <div>
                        <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2 font-semibold">Insights</p>
                        <ul className="space-y-2">
                          {result.topics.insights.map((ins, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-white/55">
                              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />{ins}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.topics.cta && (
                      <div>
                        <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2 font-semibold">CTA sugerida</p>
                        <p className="text-sm text-emerald-300 font-medium">{result.topics.cta}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "carousel" && (
                  <div className="p-6 space-y-5">
                    <div>
                      <p className="text-sm font-semibold text-white/90 mb-1">Escolha o formato do carrossel</p>
                      <p className="text-xs text-white/35">A IA vai criar slides baseados na transcrição e análise.</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {FORMATS.map(f => (
                        <button key={f.id} onClick={() => setSelectedFormat(f.id)}
                          className="flex flex-col gap-1.5 p-3 rounded-xl text-left transition-all"
                          style={{
                            border: `1px solid ${selectedFormat === f.id ? "rgba(139,92,246,0.45)" : "rgba(255,255,255,0.07)"}`,
                            background: selectedFormat === f.id ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.02)",
                          }}>
                          <div className="flex items-center gap-1.5">
                            <span style={{ color: selectedFormat === f.id ? f.color : "rgba(255,255,255,0.3)" }}>{f.icon}</span>
                            <span className="text-xs font-semibold" style={{ color: selectedFormat === f.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)" }}>{f.label}</span>
                          </div>
                          <p className="text-[11px] text-white/22">{f.desc}</p>
                        </button>
                      ))}
                    </div>

                    {carouselDone && carouselDraftId ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background:"rgba(16,185,129,0.07)", border:"1px solid rgba(16,185,129,0.2)" }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background:"rgba(16,185,129,0.15)" }}>
                          <Check size={15} className="text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-emerald-300">Carrossel gerado!</p>
                          <p className="text-xs text-emerald-300/50 mt-0.5">Salvo nos seus rascunhos</p>
                        </div>
                        <a href="/editor" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors" style={{ background:"rgba(16,185,129,0.8)" }}>
                          <ExternalLink size={11} /> Abrir
                        </a>
                      </div>
                    ) : (
                      <button onClick={generateCarousel} disabled={generatingCarousel}
                        className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                        style={{ background:"linear-gradient(135deg,#7c3aed,#9333ea)", boxShadow:"0 6px 24px rgba(124,58,237,0.28)" }}>
                        {generatingCarousel
                          ? <><Loader2 size={14} className="animate-spin" /> Gerando slides...</>
                          : <><Sparkles size={14} /> Gerar Carrossel</>}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Library ── */}
        <aside className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-sm font-semibold text-white/60 flex items-center gap-2">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background:"rgba(255,255,255,0.05)" }}>
                <BookOpen size={11} className="text-white/40" />
              </div>
              Biblioteca
            </h3>
            <span className="text-xs text-white/20">{library.length} item{library.length !== 1 ? "s" : ""}</span>
          </div>

          {loadingLibrary && (
            <div className="flex justify-center py-10">
              <Loader2 size={16} className="animate-spin text-white/15" />
            </div>
          )}

          {!loadingLibrary && library.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.12)" }}>
                <Mic2 size={18} className="text-violet-500/40" />
              </div>
              <p className="text-xs text-white/18">Nenhuma transcrição ainda</p>
            </div>
          )}

          <div className="space-y-2">
            {library.map(item => (
              <div
                key={item.id}
                onClick={() => loadFromLibrary(item.id)}
                className="group relative cursor-pointer rounded-xl p-3.5 transition-all"
                style={{
                  border: `1px solid ${result?.id === item.id ? "rgba(139,92,246,0.38)" : "rgba(255,255,255,0.055)"}`,
                  background: result?.id === item.id ? "rgba(139,92,246,0.07)" : "rgba(255,255,255,0.01)",
                }}
                onMouseEnter={e => { if (result?.id !== item.id) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)"; }}
                onMouseLeave={e => { if (result?.id !== item.id) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.01)"; }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white/75 truncate leading-tight">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/22">
                      <span className="flex items-center gap-1"><Clock size={9} />{fmtDuration(item.duration)}</span>
                      <span>·</span>
                      <span>{item.wordCount.toLocaleString()} palavras</span>
                    </div>
                    {item.summary.short && (
                      <p className="mt-2 text-[11px] text-white/30 line-clamp-2 leading-snug">{item.summary.short}</p>
                    )}
                    {item.topics.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.topics.keywords.slice(0, 3).map((k, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded text-[9px] text-white/22" style={{ background:"rgba(255,255,255,0.04)" }}>{k}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-white/18">{fmtDate(item.createdAt)}</p>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MiniWaveform color="rgba(139,92,246,0.4)" />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={e => deleteFromLibrary(item.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                {item.status === "error" && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-red-400/60">
                    <X size={9} /> Erro: {item.errorMsg?.substring(0, 50)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
