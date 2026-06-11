"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Brain, Upload, Link2, FileText, Loader2, Check, X, Trash2,
  Sparkles, ArrowLeft, FileAudio, FileVideo,
  Target, Tag, Plus, Save, Database,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// ── Types ───────────────────────────────────────────────────────────────────

interface TrainingSource {
  id: string;
  source_type: string;
  title: string;
  summary?: string;
  topics?: string[];
  keywords?: string[];
  tone?: string;
  target_audience?: string;
  status: "processing" | "done" | "error";
  error_msg?: string;
  chunk_count?: number;
  created_at: string;
}

interface AIProfile {
  brand_voice?: string;
  writing_style?: string;
  preferred_structure?: string;
  forbidden_terms?: string[];
  target_audience?: string;
  main_topics?: string[];
}

type InputMode = "text" | "link" | "file";
type MainTab = "treinar" | "base" | "perfil";

// ── File upload helpers ──────────────────────────────────────────────────────

const AUDIO_EXTS = /\.(mp3|wav|m4a|ogg|webm|aac)$/i;
const VIDEO_EXTS = /\.(mp4|mov|avi|mkv|webm)$/i;
const PDF_EXT    = /\.pdf$/i;
const MAX_BYTES  = 25 * 1024 * 1024;

function getSourceType(file: File): "file_pdf" | "file_audio" | "file_video" | null {
  if (PDF_EXT.test(file.name) || file.type === "application/pdf") return "file_pdf";
  if (AUDIO_EXTS.test(file.name) || file.type.startsWith("audio/"))  return "file_audio";
  if (VIDEO_EXTS.test(file.name) || file.type.startsWith("video/"))  return "file_video";
  return null;
}

async function uploadToStorage(file: File, onProgress: (p: number) => void): Promise<string> {
  const { signedUrl, path } = await fetch(
    `/api/ai-training/upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || "application/octet-stream")}`
  ).then(r => r.json());

  if (!signedUrl) throw new Error("Não foi possível gerar URL de upload");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload falhou: ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Erro de rede no upload"));
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });

  return path;
}

// ── Tag input component ──────────────────────────────────────────────────────

function TagInput({
  tags, setTags, placeholder, color = "violet",
}: {
  tags: string[]; setTags: (t: string[]) => void;
  placeholder?: string; color?: "violet" | "rose" | "emerald";
}) {
  const [input, setInput] = useState("");
  const colors = {
    violet: { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)", text: "rgba(196,181,253,0.9)" },
    rose:   { bg: "rgba(244,63,94,0.1)",  border: "rgba(244,63,94,0.25)",  text: "rgba(253,164,175,0.9)" },
    emerald:{ bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", text: "rgba(110,231,183,0.9)" },
  }[color];

  const add = (raw: string) => {
    const tag = raw.trim().replace(/,+$/, "");
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setInput("");
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => (
        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium"
          style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
          {tag}
          <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:opacity-60 transition-opacity ml-0.5">
            <X size={9} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); }
          if (e.key === "Backspace" && !input && tags.length) setTags(tags.slice(0, -1));
        }}
        onBlur={() => { if (input.trim()) add(input); }}
        placeholder={tags.length ? "" : placeholder}
        className="flex-1 min-w-24 bg-transparent text-xs text-white/70 placeholder:text-white/18 outline-none"
      />
    </div>
  );
}

// ── Source card ───────────────────────────────────────────────────────────────

function typeIcon(t: string) {
  if (t === "file_audio")  return <FileAudio size={13} className="text-blue-400" />;
  if (t === "file_video")  return <FileVideo size={13} className="text-fuchsia-400" />;
  if (t === "file_pdf")    return <FileText size={13} className="text-orange-400" />;
  if (t === "link")        return <Link2 size={13} className="text-sky-400" />;
  if (t === "carousel")    return <Sparkles size={13} className="text-violet-400" />;
  return <FileText size={13} className="text-white/40" />;
}

function typeLabel(t: string) {
  const map: Record<string, string> = {
    text: "Texto", link: "Link", file_pdf: "PDF",
    file_audio: "Áudio", file_video: "Vídeo", carousel: "Carrossel",
  };
  return map[t] ?? t;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function SourceCard({ source, onDelete }: { source: TrainingSource; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl p-4 transition-all" style={{
      border: `1px solid ${source.status === "error" ? "rgba(239,68,68,0.2)" : source.status === "processing" ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.07)"}`,
      background: source.status === "error" ? "rgba(239,68,68,0.03)" : "rgba(255,255,255,0.015)",
    }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(255,255,255,0.06)" }}>
            {typeIcon(source.source_type)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-white/85 leading-tight">{source.title}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)",
              }}>{typeLabel(source.source_type)}</span>
              {source.status === "processing" && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400">
                  <Loader2 size={9} className="animate-spin" /> Processando...
                </span>
              )}
              {source.status === "done" && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <Check size={9} /> {source.chunk_count ?? 0} trechos
                </span>
              )}
              {source.status === "error" && (
                <span className="text-[10px] text-red-400">Erro</span>
              )}
            </div>
            <p className="text-[10px] text-white/22 mt-1">{fmtDate(source.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {source.status === "done" && (source.summary || source.topics?.length) && (
            <button onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-all">
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
          <button onClick={onDelete}
            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {source.status === "error" && source.error_msg && (
        <p className="mt-2 text-xs text-red-400/60 leading-snug">{source.error_msg}</p>
      )}

      {expanded && source.status === "done" && (
        <div className="mt-3 pt-3 space-y-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {source.summary && (
            <p className="text-xs text-white/45 leading-relaxed">{source.summary}</p>
          )}
          <div className="flex flex-wrap gap-3 text-[10px]">
            {source.tone && (
              <span className="text-white/30"><span className="text-white/18">Tom:</span> {source.tone}</span>
            )}
            {source.target_audience && (
              <span className="text-white/30"><span className="text-white/18">Público:</span> {source.target_audience}</span>
            )}
          </div>
          {source.topics && source.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {source.topics.map((t, i) => (
                <span key={i} className="px-2 py-0.5 rounded text-[10px]"
                  style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(196,181,253,0.8)" }}>
                  {t}
                </span>
              ))}
            </div>
          )}
          {source.keywords && source.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {source.keywords.slice(0, 8).map((k, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded text-[10px] text-white/28"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TreinarPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Tab state
  const [tab, setTab] = useState<MainTab>("treinar");

  // Input state
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [textValue, setTextValue] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [titleValue, setTitleValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Process state
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState("");
  const [processError, setProcessError] = useState("");

  // Library state
  const [sources, setSources] = useState<TrainingSource[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);

  // Profile state
  const [profile, setProfile] = useState<AIProfile>({
    brand_voice: "", writing_style: "", preferred_structure: "",
    forbidden_terms: [], target_audience: "", main_topics: [],
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Load data
  useEffect(() => {
    fetch("/api/ai-training/list")
      .then(r => r.json())
      .then(d => setSources(d.sources ?? []))
      .catch(() => {})
      .finally(() => setLoadingSources(false));

    fetch("/api/ai-profile")
      .then(r => r.json())
      .then(d => { if (d.profile) setProfile(d.profile); })
      .catch(() => {});
  }, []);

  const refreshSources = () => {
    fetch("/api/ai-training/list").then(r => r.json()).then(d => setSources(d.sources ?? [])).catch(() => {});
  };

  const handleFile = (f: File) => {
    if (f.size > MAX_BYTES) { setProcessError("Arquivo muito grande. Máximo 25 MB."); return; }
    if (!getSourceType(f)) { setProcessError("Formato não suportado. Use PDF, MP3, WAV, MP4, MOV ou WEBM."); return; }
    setFile(f);
    setProcessError("");
    if (!titleValue) setTitleValue(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [titleValue]); // eslint-disable-line

  const handleProcess = async () => {
    if (!session?.user) { router.push("/"); return; }
    setProcessing(true); setProcessError(""); setProcessStep("Iniciando...");

    try {
      let body: Record<string, unknown> = { title: titleValue || undefined };

      if (inputMode === "text") {
        if (!textValue.trim()) throw new Error("Cole ou escreva algum texto");
        body = { ...body, type: "text", text: textValue.trim() };
      } else if (inputMode === "link") {
        if (!urlValue.trim()) throw new Error("Informe uma URL válida");
        body = { ...body, type: "link", url: urlValue.trim() };
        setProcessStep("Acessando URL...");
      } else if (inputMode === "file") {
        if (!file) throw new Error("Selecione um arquivo");
        const sourceType = getSourceType(file)!;
        setProcessStep("Enviando arquivo...");
        setUploadProgress(0);
        const storagePath = await uploadToStorage(file, setUploadProgress);

        if (sourceType === "file_audio" || sourceType === "file_video") {
          setProcessStep("Transcrevendo com Whisper IA...");
        } else {
          setProcessStep("Extraindo texto do PDF...");
        }
        body = { ...body, type: sourceType, storagePath };
      }

      setProcessStep("Analisando com IA...");
      const res = await fetch("/api/ai-training/process", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro no processamento");

      setProcessStep("Gerando embeddings...");
      // Embeddings are done inside process route — this just shows UX continuity

      setProcessStep("Concluído!");
      setTextValue(""); setUrlValue(""); setTitleValue(""); setFile(null); setUploadProgress(0);
      setTimeout(() => { setProcessStep(""); setProcessing(false); }, 1500);
      refreshSources();
      setTab("base");
    } catch (e: any) {
      setProcessError(e.message ?? "Erro desconhecido");
      setProcessStep("");
      setProcessing(false);
    }
  };

  const deleteSource = async (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
    await fetch(`/api/ai-training/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/ai-profile", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch {}
    setSavingProfile(false);
  };

  const doneSources   = sources.filter(s => s.status === "done").length;
  const totalChunks   = sources.reduce((acc, s) => acc + (s.chunk_count ?? 0), 0);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white" style={{ background: "#070810", fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06]"
        style={{ background: "rgba(7,8,16,0.92)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-4">
          <button onClick={() => router.push("/editor")} className="flex items-center gap-1.5 text-white/35 hover:text-white/70 text-sm transition-colors">
            <ArrowLeft size={15} /> Voltar
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}>
              <Brain size={13} className="text-violet-400" />
            </div>
            <span className="text-white/90">Treinar IA</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {doneSources > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/30">
                <Database size={11} className="text-violet-400" />
                <span>{doneSources} fonte{doneSources !== 1 ? "s" : ""}</span>
                <span className="text-white/15">·</span>
                <span>{totalChunks} trechos</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">

        {/* Nav tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-8 w-fit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {([
            { id: "treinar", label: "Treinar", icon: <Upload size={12} /> },
            { id: "base",    label: `Base (${sources.length})`, icon: <Database size={12} /> },
            { id: "perfil",  label: "Perfil da IA", icon: <Brain size={12} /> },
          ] as { id: MainTab; label: string; icon: React.ReactNode }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t.id ? "rgba(139,92,246,0.18)" : "transparent",
                color: tab === t.id ? "rgba(196,181,253,0.95)" : "rgba(255,255,255,0.35)",
                border: tab === t.id ? "1px solid rgba(139,92,246,0.25)" : "1px solid transparent",
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: TREINAR ── */}
        {tab === "treinar" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            <div className="space-y-6">
              {/* Hero */}
              <div className="relative">
                <div className="absolute" style={{ left: "-5%", top: "-50%", width: "45%", height: 160, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(124,58,237,0.14), transparent 70%)", filter: "blur(32px)", pointerEvents: "none" }} />
                <div className="relative space-y-2">
                  <h1 className="text-2xl font-extrabold">
                    Ensine a IA com{" "}
                    <span style={{ background: "linear-gradient(90deg,#a78bfa,#e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      seu conteúdo
                    </span>
                  </h1>
                  <p className="text-white/40 text-sm">
                    Carregue materiais, vídeos, áudios ou textos. A IA aprende seu estilo e gera carrosséis muito mais alinhados com a sua marca.
                  </p>
                </div>
              </div>

              {/* Input mode selector */}
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {([
                  { id: "text", label: "Texto / Post", icon: <FileText size={12} /> },
                  { id: "link", label: "Link / URL",   icon: <Link2 size={12} /> },
                  { id: "file", label: "Arquivo",      icon: <Upload size={12} /> },
                ] as { id: InputMode; label: string; icon: React.ReactNode }[]).map(m => (
                  <button key={m.id} onClick={() => { setInputMode(m.id); setProcessError(""); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: inputMode === m.id ? "rgba(255,255,255,0.07)" : "transparent",
                      color: inputMode === m.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                    }}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>

              {/* Input area */}
              {inputMode === "text" && (
                <textarea
                  value={textValue}
                  onChange={e => setTextValue(e.target.value)}
                  placeholder="Cole aqui um post, roteiro, transcrição, artigo, legenda, script... quanto mais conteúdo, melhor o aprendizado da IA."
                  rows={9}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/18 outline-none resize-none leading-relaxed transition-colors"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
              )}

              {inputMode === "link" && (
                <div>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-3 transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <Link2 size={15} className="text-white/20 shrink-0" />
                    <input
                      value={urlValue}
                      onChange={e => setUrlValue(e.target.value)}
                      placeholder="https://exemplo.com/artigo-blog  —  qualquer URL pública"
                      className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/18 outline-none"
                    />
                  </div>
                  <p className="mt-2 text-xs text-white/22">Funciona com blogs, artigos, páginas de produto, transcrições online, etc.</p>
                </div>
              )}

              {inputMode === "file" && (
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                  className="relative cursor-pointer transition-all"
                  style={{
                    borderRadius: 16, padding: "32px 24px", textAlign: "center",
                    border: `1.5px dashed ${file ? "rgba(139,92,246,0.55)" : isDragging ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.1)"}`,
                    background: file ? "rgba(139,92,246,0.05)" : isDragging ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.015)",
                  }}
                >
                  <input ref={fileInputRef} type="file"
                    accept=".pdf,.mp3,.wav,.m4a,.ogg,.mp4,.mov,.webm"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                  />

                  {file ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                        {file.type.startsWith("video") ? <FileVideo size={22} className="text-fuchsia-400" /> :
                          file.type.startsWith("audio") ? <FileAudio size={22} className="text-blue-400" /> :
                          <FileText size={22} className="text-orange-400" />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-white">{file.name}</p>
                        <p className="text-xs text-white/35 mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setFile(null); setTitleValue(""); }}
                        className="text-xs text-white/25 hover:text-red-400 transition-colors flex items-center gap-1 mt-1">
                        <X size={10} /> Remover
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <Upload size={20} className="text-white/30" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-white/80">Arraste ou clique para selecionar</p>
                        <p className="text-xs text-white/25 mt-1">PDF · MP3 · WAV · M4A · MP4 · MOV · WEBM — até 25 MB</p>
                      </div>
                    </div>
                  )}

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-4 space-y-1.5">
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: "linear-gradient(90deg,#7c3aed,#a855f7)" }} />
                      </div>
                      <p className="text-xs text-white/30">{uploadProgress}%</p>
                    </div>
                  )}
                </div>
              )}

              {/* Optional title */}
              <input
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                placeholder="Título (opcional) — ex: Roteiro aula lançamento"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white/70 placeholder:text-white/18 outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
              />

              {/* Error */}
              {processError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm text-red-400"
                  style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
                  <X size={13} className="mt-0.5 shrink-0" />
                  <span className="leading-snug">{processError}</span>
                </div>
              )}

              {/* Process button */}
              {processing ? (
                <div className="w-full py-4 rounded-xl flex items-center justify-center gap-3 text-sm font-semibold"
                  style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
                  {processStep === "Concluído!" ? (
                    <><Check size={15} className="text-emerald-400" /><span className="text-emerald-400">{processStep}</span></>
                  ) : (
                    <><Loader2 size={15} className="animate-spin text-violet-400" /><span className="text-violet-300">{processStep}</span></>
                  )}
                </div>
              ) : (
                <button onClick={handleProcess}
                  disabled={inputMode === "text" ? !textValue.trim() : inputMode === "link" ? !urlValue.trim() : !file}
                  className="w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-35"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#9333ea,#a855f7)", boxShadow: "0 8px 32px rgba(124,58,237,0.3), 0 0 0 1px rgba(167,139,250,0.12)" }}>
                  <Brain size={15} />
                  <span className="tracking-wide">Processar e Treinar IA</span>
                </button>
              )}
            </div>

            {/* Right panel — how it works */}
            <aside className="space-y-5">
              <div className="rounded-xl p-5 space-y-4" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.12)" }}>
                <h3 className="text-sm font-bold text-white/70 flex items-center gap-2">
                  <Sparkles size={13} className="text-violet-400" /> Como funciona
                </h3>
                {[
                  { n: 1, title: "Envio", desc: "Você envia texto, áudio, vídeo, PDF ou link" },
                  { n: 2, title: "Extração", desc: "IA extrai e limpa todo o texto do conteúdo" },
                  { n: 3, title: "Análise", desc: "Identifica temas, tom de voz, público e palavras-chave" },
                  { n: 4, title: "Embeddings", desc: "Gera vetores semânticos para busca inteligente" },
                  { n: 5, title: "Uso na geração", desc: "Ao gerar carrosséis com 'IA Treinada', busca trechos relevantes e usa como contexto" },
                ].map(s => (
                  <div key={s.n} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5"
                      style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)", color: "rgba(196,181,253,0.8)" }}>
                      {s.n}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white/65">{s.title}</p>
                      <p className="text-[11px] text-white/30 leading-snug">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-xs font-semibold text-white/45">Exemplos de material ideal</p>
                <ul className="space-y-1.5 text-[11px] text-white/28">
                  {[
                    "Scripts de aulas e vídeos do YouTube",
                    "Transcrições de podcasts próprios",
                    "Posts do Instagram/LinkedIn que viralizaram",
                    "E-books ou artigos de blog",
                    "Roteiros de lives e webinars",
                    "Materiais de vendas e landing pages",
                  ].map((ex, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-violet-400 mt-0.5">·</span> {ex}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        )}

        {/* ── TAB: BASE ── */}
        {tab === "base" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-base font-bold text-white/80">Base de Conhecimento</h2>
                <p className="text-xs text-white/30 mt-0.5">{doneSources} material{doneSources !== 1 ? "is" : ""} processado{doneSources !== 1 ? "s" : ""} · {totalChunks} trechos indexados</p>
              </div>
              <button onClick={() => setTab("treinar")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/10"
                style={{ border: "1px solid rgba(139,92,246,0.25)" }}>
                <Plus size={11} /> Adicionar
              </button>
            </div>

            {loadingSources ? (
              <div className="flex justify-center py-12"><Loader2 size={16} className="animate-spin text-white/15" /></div>
            ) : sources.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.12)" }}>
                  <Brain size={24} className="text-violet-500/30" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/30">Base vazia</p>
                  <p className="text-xs text-white/18 mt-1">Adicione materiais para treinar a IA com seu conteúdo</p>
                </div>
                <button onClick={() => setTab("treinar")}
                  className="mx-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-violet-300 transition-colors"
                  style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
                  <Plus size={13} /> Adicionar primeiro material
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sources.map(source => (
                  <SourceCard key={source.id} source={source} onDelete={() => deleteSource(source.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: PERFIL DA IA ── */}
        {tab === "perfil" && (
          <div className="max-w-2xl space-y-8">
            <div>
              <h2 className="text-base font-bold text-white/80 mb-1 flex items-center gap-2">
                <Target size={15} className="text-violet-400" /> Perfil da minha IA
              </h2>
              <p className="text-xs text-white/35">Define como a IA deve se comunicar ao gerar conteúdo com a opção "IA Treinada" ativada.</p>
            </div>

            {[
              { key: "brand_voice", label: "Tom de voz", placeholder: "ex: direto, persuasivo, premium, descontraído, especialista..." },
              { key: "writing_style", label: "Estilo de escrita", placeholder: "ex: frases curtas e impactantes, storytelling, técnico mas acessível..." },
              { key: "target_audience", label: "Público-alvo", placeholder: "ex: donos de pequenos negócios no Brasil, médicos entre 30-45 anos..." },
              { key: "preferred_structure", label: "Estrutura preferida do carrossel", placeholder: "ex: dor → agitação → solução → benefício → CTA\nou: hook → lista de 5 itens → resultado → call to action" },
            ].map(field => (
              <div key={field.key} className="space-y-2">
                <label className="block text-xs font-semibold text-white/45 uppercase tracking-widest">{field.label}</label>
                <textarea
                  value={(profile as any)[field.key] ?? ""}
                  onChange={e => setProfile(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  rows={field.key === "preferred_structure" ? 3 : 2}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white/75 placeholder:text-white/18 outline-none resize-none leading-relaxed transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
              </div>
            ))}

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-white/45 uppercase tracking-widest flex items-center gap-1.5">
                <Tag size={10} /> Temas principais
              </label>
              <p className="text-[11px] text-white/22">Digite e pressione Enter para adicionar</p>
              <div className="rounded-xl px-3 py-2.5 min-h-[44px] flex flex-wrap items-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <TagInput
                  tags={profile.main_topics ?? []}
                  setTags={t => setProfile(p => ({ ...p, main_topics: t }))}
                  placeholder="marketing digital, produtividade, saúde..."
                  color="violet"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-white/45 uppercase tracking-widest flex items-center gap-1.5">
                <X size={10} /> Termos proibidos
              </label>
              <p className="text-[11px] text-white/22">Palavras ou expressões que a IA NUNCA deve usar</p>
              <div className="rounded-xl px-3 py-2.5 min-h-[44px] flex flex-wrap items-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <TagInput
                  tags={profile.forbidden_terms ?? []}
                  setTags={t => setProfile(p => ({ ...p, forbidden_terms: t }))}
                  placeholder="ex: foda-se, concorrente X, expressão que não combina..."
                  color="rose"
                />
              </div>
            </div>

            {/* Example block */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.12)" }}>
              <p className="text-[10px] text-violet-400/60 uppercase tracking-widest font-bold">Exemplo de perfil bem configurado</p>
              <div className="text-xs text-white/40 space-y-1 leading-relaxed">
                <p><span className="text-white/25">Tom de voz:</span> direto, persuasivo e premium — como um mentor experiente</p>
                <p><span className="text-white/25">Público:</span> empreendedores de e-commerce faturando 10k-100k/mês</p>
                <p><span className="text-white/25">Estrutura:</span> problema real → insight único → solução prática → resultado tangível → CTA urgente</p>
              </div>
            </div>

            <button onClick={saveProfile} disabled={savingProfile}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: profileSaved ? "rgba(16,185,129,0.2)" : "linear-gradient(135deg,#7c3aed,#9333ea)", boxShadow: profileSaved ? "none" : "0 6px 24px rgba(124,58,237,0.25)", border: profileSaved ? "1px solid rgba(16,185,129,0.3)" : "none" }}>
              {savingProfile ? <Loader2 size={14} className="animate-spin" /> : profileSaved ? <Check size={14} className="text-emerald-400" /> : <Save size={14} />}
              <span style={{ color: profileSaved ? "rgba(110,231,183,0.9)" : undefined }}>
                {savingProfile ? "Salvando..." : profileSaved ? "Perfil salvo!" : "Salvar Perfil"}
              </span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
