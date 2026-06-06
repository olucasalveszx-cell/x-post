"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic2, Upload, Link2, Loader2, Check, ChevronRight, Trash2,
  FileAudio, FileVideo, Clock, BookOpen, Sparkles, Zap, List,
  GraduationCap, Megaphone, AlignLeft, BarChart3, Copy, ExternalLink,
  ArrowLeft, X, ChevronDown,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { CarouselFormat } from "@/app/api/transcricao/carousel/route";
import type { TranscriptionRecord } from "@/app/api/transcricao/process/route";

// ── Types ─────────────────────────────────────────────────────────────────────
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
  { id: "educativo",     label: "Educativo",       desc: "Ensina de forma didática",       icon: <GraduationCap size={16} />, color: "#6366f1" },
  { id: "storytelling",  label: "Storytelling",    desc: "Narrativa envolvente",            icon: <BookOpen size={16} />,      color: "#d946ef" },
  { id: "twitter",       label: "Twitter / X",     desc: "Frases curtas e impactantes",    icon: <Zap size={16} />,           color: "#1d9bf0" },
  { id: "viral",         label: "Viral",           desc: "Gancho poderoso, para o scroll", icon: <Megaphone size={16} />,     color: "#f97316" },
  { id: "lista",         label: "Lista",           desc: "Top X itens numerados",          icon: <List size={16} />,          color: "#22c55e" },
  { id: "passo_a_passo", label: "Passo a Passo",   desc: "Tutorial com etapas claras",     icon: <AlignLeft size={16} />,     color: "#38bdf8" },
  { id: "executivo",     label: "Resumo Executivo",desc: "Profissional e direto",           icon: <BarChart3 size={16} />,     color: "#d4a017" },
];

function fmtDuration(s?: number) {
  if (!s) return "—";
  const m = Math.floor(s / 60), sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TranscricaoPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processing state
  const [step, setStep] = useState<ProcessStep>("idle");
  const [stepLabel, setStepLabel] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Result state
  const [result, setResult] = useState<TranscriptionRecord | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>("transcript");
  const [copied, setCopied] = useState(false);

  // Carousel state
  const [selectedFormat, setSelectedFormat] = useState<CarouselFormat>("educativo");
  const [generatingCarousel, setGeneratingCarousel] = useState(false);
  const [carouselDone, setCarouselDone] = useState(false);
  const [carouselDraftId, setCarouselDraftId] = useState<string | null>(null);
  const [showFormats, setShowFormats] = useState(false);

  // Library
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

  // ── File handling ──────────────────────────────────────────────────────────
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

  // ── Upload to Supabase ─────────────────────────────────────────────────────
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

  // ── Main process ───────────────────────────────────────────────────────────
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

  // ── Load from library ──────────────────────────────────────────────────────
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

  // ── Generate carousel ──────────────────────────────────────────────────────
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

  // ── UI ─────────────────────────────────────────────────────────────────────
  const isProcessing = ["uploading", "transcribing", "analyzing"].includes(step);
  const hasResult = step === "done" && result;

  const STEPS = [
    { id: "uploading",   label: "Upload" },
    { id: "transcribing",label: "Transcrição" },
    { id: "analyzing",   label: "Análise IA" },
    { id: "done",        label: "Concluído" },
  ];
  const currentStepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div className="min-h-screen bg-[#080808] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#080808]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-4">
          <button onClick={() => router.push("/editor")} className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors">
            <ArrowLeft size={15} /> Voltar
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Mic2 size={16} className="text-violet-400" />
            <span>Transcrição Inteligente</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-white/25 bg-white/5 px-2 py-0.5 rounded-full">Beta</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

        {/* ── Left column: Upload + Results ── */}
        <div className="space-y-6">

          {/* Upload zone */}
          {!hasResult && step !== "done" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">
                Transforme áudio e vídeo em{" "}
                <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  carrosséis virais
                </span>
              </h1>
              <p className="text-white/40 text-sm">Envie um arquivo ou cole uma URL para transcrever e gerar conteúdo automaticamente.</p>

              {/* Drag & drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-10 text-center ${
                  file ? "border-violet-500/60 bg-violet-500/5" :
                  isDragging ? "border-violet-400 bg-violet-500/10 scale-[1.01]" :
                  "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".mp3,.wav,.m4a,.ogg,.mp4,.mov,.webm,.avi" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    {file.type.startsWith("video") ? <FileVideo size={36} className="text-violet-400" /> : <FileAudio size={36} className="text-violet-400" />}
                    <div>
                      <p className="font-semibold text-sm text-white">{file.name}</p>
                      <p className="text-xs text-white/40 mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setFile(null); setTitle(""); }} className="text-xs text-white/30 hover:text-red-400 transition-colors flex items-center gap-1">
                      <X size={11} /> Remover
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                      <Upload size={22} className="text-white/30" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white">Arraste um arquivo ou clique para selecionar</p>
                      <p className="text-xs text-white/30 mt-1">MP4 · MOV · WEBM · MP3 · WAV · M4A · até 25 MB</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-xs text-white/25">ou cole uma URL</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              {/* URL input */}
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-violet-500/50 rounded-xl px-3 py-2.5 transition-colors">
                  <Link2 size={14} className="text-white/25 shrink-0" />
                  <input
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://exemplo.com/video.mp4 — URLs diretas de mídia"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 outline-none"
                    disabled={!!file}
                  />
                </div>
              </div>

              {/* Title input */}
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título (opcional) — ex: Reunião de vendas 20/06"
                className="w-full bg-white/5 border border-white/10 focus:border-violet-500/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition-colors"
              />

              {errorMsg && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  <X size={14} className="mt-0.5 shrink-0" /> {errorMsg}
                </div>
              )}

              <button
                onClick={process}
                disabled={(!file && !urlInput.trim()) || isProcessing}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
              >
                <Sparkles size={15} />
                Transcrever e Analisar
              </button>
            </div>
          )}

          {/* Processing */}
          {isProcessing && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 space-y-8">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto">
                  <Loader2 size={24} className="text-violet-400 animate-spin" />
                </div>
                <p className="font-semibold text-sm">{stepLabel}</p>
                <p className="text-xs text-white/30">Isso pode levar até 60 segundos</p>
              </div>

              {/* Steps */}
              <div className="flex items-center justify-center gap-0">
                {STEPS.map((s, i) => {
                  const done = i < currentStepIdx;
                  const active = i === currentStepIdx;
                  return (
                    <div key={s.id} className="flex items-center">
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        done ? "text-emerald-400" : active ? "text-violet-300 bg-violet-500/10" : "text-white/20"
                      }`}>
                        {done ? <Check size={12} /> : active ? <Loader2 size={12} className="animate-spin" /> : <span className="w-3 h-3 rounded-full border border-current inline-block" />}
                        {s.label}
                      </div>
                      {i < STEPS.length - 1 && <ChevronRight size={14} className="text-white/15 mx-1" />}
                    </div>
                  );
                })}
              </div>

              {/* Upload progress bar */}
              {step === "uploading" && uploadProgress > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-white/30">
                    <span>Upload</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error after processing */}
          {step === "error" && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
              <p className="text-red-400 text-sm font-medium">Erro no processamento</p>
              <p className="text-red-300/70 text-sm">{errorMsg}</p>
              <button onClick={() => { setStep("idle"); setErrorMsg(""); }} className="text-sm text-white/50 hover:text-white transition-colors flex items-center gap-1.5">
                <ArrowLeft size={13} /> Tentar novamente
              </button>
            </div>
          )}

          {/* Results */}
          {hasResult && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-lg leading-tight">{result.title}</h2>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-white/35">
                    <span className="flex items-center gap-1"><Clock size={11} />{fmtDuration(result.duration)}</span>
                    <span>{result.wordCount.toLocaleString()} palavras</span>
                    <span className="uppercase">{result.language}</span>
                  </div>
                </div>
                <button onClick={() => { setResult(null); setStep("idle"); setFile(null); setTitle(""); setUrlInput(""); }}
                  className="shrink-0 text-white/20 hover:text-white/60 transition-colors p-1">
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                {([
                  { id: "summary",    label: "Resumo",      icon: <Sparkles size={12} /> },
                  { id: "transcript", label: "Transcrição", icon: <AlignLeft size={12} /> },
                  { id: "topics",     label: "Tópicos",     icon: <Zap size={12} /> },
                  { id: "carousel",   label: "Carrossel",   icon: <GraduationCap size={12} /> },
                ] as { id: ResultTab; label: string; icon: React.ReactNode }[]).map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      activeTab === tab.id ? "bg-white/10 text-white shadow-sm" : "text-white/35 hover:text-white/60"
                    }`}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="rounded-xl border border-white/8 bg-white/[0.02] min-h-[300px]">

                {/* Summary */}
                {activeTab === "summary" && (
                  <div className="p-6 space-y-5">
                    <div>
                      <p className="text-xs text-white/30 uppercase tracking-wide mb-2 font-medium">Resumo curto</p>
                      <p className="text-sm text-white/80 leading-relaxed">{result.summary.short}</p>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div>
                      <p className="text-xs text-white/30 uppercase tracking-wide mb-2 font-medium">Resumo médio</p>
                      <p className="text-sm text-white/70 leading-relaxed">{result.summary.medium}</p>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div>
                      <p className="text-xs text-white/30 uppercase tracking-wide mb-2 font-medium">Análise detalhada</p>
                      <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{result.summary.detailed}</p>
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {activeTab === "transcript" && (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white/30 uppercase tracking-wide font-medium">Transcrição completa</p>
                      <button onClick={copyTranscript} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/70 transition-colors">
                        {copied ? <><Check size={12} className="text-emerald-400" /> Copiado!</> : <><Copy size={12} /> Copiar</>}
                      </button>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                      {result.transcript}
                    </p>
                  </div>
                )}

                {/* Topics */}
                {activeTab === "topics" && (
                  <div className="p-6 space-y-5">
                    <div>
                      <p className="text-xs text-white/30 uppercase tracking-wide mb-2 font-medium">Tema principal</p>
                      <p className="text-sm font-semibold text-violet-300">{result.topics.main}</p>
                    </div>
                    {result.topics.subtopics.length > 0 && (
                      <div>
                        <p className="text-xs text-white/30 uppercase tracking-wide mb-2 font-medium">Subtemas</p>
                        <div className="flex flex-wrap gap-2">
                          {result.topics.subtopics.map((t, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-xs text-white/60">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.topics.keywords.length > 0 && (
                      <div>
                        <p className="text-xs text-white/30 uppercase tracking-wide mb-2 font-medium">Palavras-chave</p>
                        <div className="flex flex-wrap gap-2">
                          {result.topics.keywords.map((k, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.topics.insights.length > 0 && (
                      <div>
                        <p className="text-xs text-white/30 uppercase tracking-wide mb-2 font-medium">Insights</p>
                        <ul className="space-y-2">
                          {result.topics.insights.map((ins, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />{ins}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.topics.cta && (
                      <div>
                        <p className="text-xs text-white/30 uppercase tracking-wide mb-2 font-medium">CTA sugerida</p>
                        <p className="text-sm text-emerald-300 font-medium">{result.topics.cta}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Carousel generator */}
                {activeTab === "carousel" && (
                  <div className="p-6 space-y-5">
                    <div>
                      <p className="text-sm font-semibold mb-1">Escolha o formato do carrossel</p>
                      <p className="text-xs text-white/35">A IA vai criar slides baseados na transcrição e análise.</p>
                    </div>

                    {/* Format selector */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {FORMATS.map(f => (
                        <button key={f.id} onClick={() => setSelectedFormat(f.id)}
                          className={`flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all ${
                            selectedFormat === f.id
                              ? "border-violet-500/60 bg-violet-500/8"
                              : "border-white/8 hover:border-white/15 bg-white/[0.02]"
                          }`}>
                          <div className="flex items-center gap-1.5">
                            <span style={{ color: selectedFormat === f.id ? f.color : "rgba(255,255,255,0.4)" }}>{f.icon}</span>
                            <span className={`text-xs font-semibold ${selectedFormat === f.id ? "text-white" : "text-white/50"}`}>{f.label}</span>
                          </div>
                          <p className="text-[11px] text-white/25">{f.desc}</p>
                        </button>
                      ))}
                    </div>

                    {carouselDone && carouselDraftId ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                        <Check size={18} className="text-emerald-400 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-emerald-300">Carrossel gerado!</p>
                          <p className="text-xs text-emerald-300/60 mt-0.5">Salvo nos seus rascunhos</p>
                        </div>
                        <a href="/editor" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-white transition-colors">
                          <ExternalLink size={12} /> Abrir no Editor
                        </a>
                      </div>
                    ) : (
                      <button
                        onClick={generateCarousel}
                        disabled={generatingCarousel}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/15"
                      >
                        {generatingCarousel ? <><Loader2 size={15} className="animate-spin" /> Gerando slides...</> : <><Sparkles size={15} /> Gerar Carrossel</>}
                      </button>
                    )}

                    {!carouselDone && (
                      <button
                        onClick={() => { setCarouselDone(false); generateCarousel(); }}
                        disabled={generatingCarousel || !carouselDone}
                        className="w-full py-2 rounded-xl border border-white/8 hover:border-white/15 text-xs text-white/30 hover:text-white/60 transition-colors disabled:opacity-0"
                      >
                        Gerar outro formato
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: Library ── */}
        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/70 flex items-center gap-1.5">
              <BookOpen size={14} /> Biblioteca
            </h3>
            <span className="text-xs text-white/25">{library.length} item{library.length !== 1 ? "s" : ""}</span>
          </div>

          {loadingLibrary && (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin text-white/20" />
            </div>
          )}

          {!loadingLibrary && library.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <Mic2 size={24} className="text-white/10 mx-auto" />
              <p className="text-xs text-white/20">Nenhuma transcrição ainda</p>
            </div>
          )}

          <div className="space-y-2">
            {library.map(item => (
              <div
                key={item.id}
                onClick={() => loadFromLibrary(item.id)}
                className={`group relative cursor-pointer rounded-xl border p-3.5 transition-all ${
                  result?.id === item.id
                    ? "border-violet-500/40 bg-violet-500/5"
                    : "border-white/6 hover:border-white/12 bg-white/[0.01] hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white/80 truncate leading-tight">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/25">
                      <span className="flex items-center gap-1"><Clock size={9} />{fmtDuration(item.duration)}</span>
                      <span>{item.wordCount.toLocaleString()} palavras</span>
                    </div>
                    {item.summary.short && (
                      <p className="mt-1.5 text-[11px] text-white/35 line-clamp-2 leading-snug">{item.summary.short}</p>
                    )}
                    {item.topics.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {item.topics.keywords.slice(0, 3).map((k, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-white/25">{k}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-white/20 mt-1.5">{fmtDate(item.createdAt)}</p>
                  </div>
                  <button
                    onClick={e => deleteFromLibrary(item.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/20 hover:text-red-400 transition-all shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {item.status === "error" && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-red-400/70">
                    <X size={10} /> Erro: {item.errorMsg?.substring(0, 50)}
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
