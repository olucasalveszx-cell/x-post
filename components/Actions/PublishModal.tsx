"use client";

import { useState, useRef, useEffect } from "react";
import { X, Instagram, Loader2, CheckCircle, AlertCircle, LogIn, User, ExternalLink, Music, Search, Play, Pause, ChevronRight, ChevronLeft, Upload, Pencil, Download, LayoutGrid, BookImage } from "lucide-react";
import { renderSlide } from "@/lib/render-slide";

interface IGAccount {
  token: string;
  accountId: string;
  username: string;
}

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  preview: string;
  duration: number;
}

interface Props {
  slides: any[];
  account: IGAccount | null;
  onClose: () => void;
  onLoginClick: () => void;
}

type Step = "music" | "caption" | "mode" | "publish";
type PublishMode = "api" | "manual";
type PostType = "carousel" | "stories";

export default function PublishModal({ slides, account, onClose, onLoginClick }: Props) {
  const [step, setStep] = useState<Step>("music");
  const [caption, setCaption] = useState("");
  const [publishMode, setPublishMode] = useState<PublishMode>("api");
  const [postType, setPostType] = useState<PostType>("carousel");
  const [status, setStatus] = useState<"idle" | "exporting" | "uploading" | "publishing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [permalink, setPermalink] = useState("");

  // Música
  const [musicQuery, setMusicQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!musicQuery.trim()) { setTracks([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/music?q=${encodeURIComponent(musicQuery)}`);
        const data = await res.json();
        setTracks(data.tracks ?? []);
      } finally {
        setSearching(false);
      }
    }, 500);
  }, [musicQuery]);

  const togglePlay = (track: Track) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(track.preview);
      audio.onended = () => setPlayingId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingId(track.id);
    }
  };

  const selectTrack = (track: Track) => {
    setSelectedTrack(track);
    const mention = `\n\n🎵 ${track.title} — ${track.artist}`;
    setCaption((prev) => prev.includes(mention.trim()) ? prev : prev + mention);
  };

  const clearTrack = () => {
    if (selectedTrack) {
      const mention = `\n\n🎵 ${selectedTrack.title} — ${selectedTrack.artist}`;
      setCaption((prev) => prev.replace(mention, ""));
    }
    setSelectedTrack(null);
    audioRef.current?.pause();
    setPlayingId(null);
  };

  // Export via Canvas 2D
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

  // Modo: upload direto via API
  const handlePublishApi = async () => {
    if (!account) return;
    setStatus("exporting");
    setMessage("");
    setProgress(0);
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

      setProgress(100);
      setStatus("success");
      setMessage(data.message);
      setPermalink(data.permalink ?? "");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message ?? "Erro ao publicar");
    }
  };

  // Modo: compartilha direto via Web Share API → abre Instagram nativo
  const handlePublishManual = async () => {
    setStatus("exporting");
    setMessage("");
    setProgress(0);
    try {
      const dataUrls = await exportSlides();
      setProgress(80);

      // Converte dataURLs em Files
      const files: File[] = dataUrls.map((url, i) => {
        const arr = url.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] ?? "image/jpeg";
        const bstr = atob(arr[1]);
        const u8 = new Uint8Array(bstr.length);
        for (let j = 0; j < bstr.length; j++) u8[j] = bstr.charCodeAt(j);
        return new File([u8], `slide-${String(i + 1).padStart(2, "0")}.jpg`, { type: mime });
      });

      setProgress(90);

      // Web Share API — abre share sheet nativo (Instagram, WhatsApp, etc)
      const canShare = typeof navigator.share === "function" && navigator.canShare?.({ files });
      if (canShare) {
        await navigator.share({ files, title: "X-Post Carrossel" });
        setProgress(100);
        setStatus("success");
        setMessage("Imagens enviadas para o Instagram!");
      } else {
        // Fallback: baixa os arquivos
        for (let i = 0; i < dataUrls.length; i++) {
          const a = document.createElement("a");
          a.href = dataUrls[i];
          a.download = `slide-${String(i + 1).padStart(2, "0")}.jpg`;
          a.click();
          await new Promise((r) => setTimeout(r, 200));
        }
        setProgress(100);
        setStatus("success");
        setMessage("Imagens baixadas! Abra o Instagram para publicar.");
      }
    } catch (err: any) {
      if ((err as any)?.name === "AbortError") {
        // Usuário fechou o share sheet — não é erro
        setStatus("idle");
        return;
      }
      setStatus("error");
      setMessage(err.message ?? "Erro ao exportar");
    }
  };

  const handleAction = () => {
    if (publishMode === "api") handlePublishApi();
    else handlePublishManual();
  };

  const isLoading = ["exporting", "uploading", "publishing"].includes(status);
  const statusLabel = {
    exporting: "Exportando slides...",
    uploading: "Enviando imagens...",
    publishing: "Publicando no Instagram...",
  }[status as string] ?? "";

  const STEPS: { key: Step; label: string }[] = [
    { key: "music",   label: "Música" },
    { key: "caption", label: "Legenda" },
    { key: "mode",    label: "Modo" },
    { key: "publish", label: "Publicar" },
  ];

  const nextStep: Record<Step, Step | null> = { music: "caption", caption: "mode", mode: "publish", publish: null };
  const prevStep: Record<Step, Step | null> = { music: null, caption: "music", mode: "caption", publish: "mode" };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a] shrink-0">
          <div className="flex items-center gap-2 font-semibold">
            <Instagram size={20} className="text-brand-500" />
            Publicar no Instagram
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        {/* Steps */}
        <div className="flex border-b border-[#2a2a2a] shrink-0">
          {STEPS.map((s, i) => (
            <button key={s.key} onClick={() => setStep(s.key)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${step === s.key ? "text-white" : "text-gray-500 hover:text-gray-300"}`}>
              <span className="inline-flex items-center justify-center gap-1">
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${step === s.key ? "bg-brand-600 text-white" : "bg-[#2a2a2a] text-gray-500"}`}>{i + 1}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </span>
              {step === s.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          {/* ── Step 1: Música ── */}
          {step === "music" && (
            <>
              <p className="text-sm text-gray-400">Escolha uma música para adicionar ao post:</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" value={musicQuery} onChange={(e) => setMusicQuery(e.target.value)}
                  placeholder="Buscar artista ou música..."
                  className="w-full bg-[#111] border border-[#333] rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600" autoFocus />
                {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />}
              </div>

              {selectedTrack && (
                <div className="flex items-center gap-3 bg-brand-500/10 border border-brand-500/30 rounded-xl p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedTrack.cover} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{selectedTrack.title}</p>
                    <p className="text-xs text-brand-400 truncate">{selectedTrack.artist}</p>
                  </div>
                  <button onClick={clearTrack} className="text-gray-500 hover:text-red-400 shrink-0"><X size={15} /></button>
                </div>
              )}

              {tracks.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {tracks.map((track) => (
                    <div key={track.id} onClick={() => selectTrack(track)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors border ${selectedTrack?.id === track.id ? "border-brand-500/50 bg-brand-500/10" : "border-transparent hover:bg-[#222]"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={track.cover} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{track.title}</p>
                        <p className="text-xs text-gray-400 truncate">{track.artist} · {track.album}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); togglePlay(track); }}
                        className="w-8 h-8 rounded-full bg-[#333] hover:bg-brand-600 flex items-center justify-center shrink-0 transition-colors">
                        {playingId === track.id ? <Pause size={13} /> : <Play size={13} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!musicQuery && !selectedTrack && (
                <p className="text-xs text-gray-600 text-center py-4">
                  Pule esta etapa se não quiser música.<br />
                  <span className="text-gray-700">Preview de 30s via Deezer.</span>
                </p>
              )}
            </>
          )}

          {/* ── Step 2: Legenda ── */}
          {step === "caption" && (
            <>
              {selectedTrack && (
                <div className="flex items-center gap-2 bg-[#111] rounded-lg p-2.5 text-xs text-gray-400">
                  <Music size={12} className="text-brand-400 shrink-0" />
                  <span className="truncate">🎵 {selectedTrack.title} — {selectedTrack.artist}</span>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Legenda</label>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                  placeholder="Digite a legenda, hashtags..."
                  rows={5}
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600 resize-none"
                  autoFocus />
                <p className="text-xs text-gray-600 mt-1">{caption.length} caracteres</p>
              </div>
            </>
          )}

          {/* ── Step 3: Modo de publicação ── */}
          {step === "mode" && (
            <>
              {/* Tipo de post */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Tipo de post:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPostType("carousel")}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${postType === "carousel" ? "border-brand-500 bg-brand-500/10" : "border-[#2a2a2a] hover:border-[#444]"}`}>
                    <LayoutGrid size={20} className={postType === "carousel" ? "text-brand-400" : "text-gray-500"} />
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white">Carrossel</p>
                      <p className="text-[10px] text-gray-500">Feed · até 10 slides</p>
                    </div>
                  </button>
                  <button onClick={() => setPostType("stories")}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${postType === "stories" ? "border-brand-500 bg-brand-500/10" : "border-[#2a2a2a] hover:border-[#444]"}`}>
                    <BookImage size={20} className={postType === "stories" ? "text-brand-400" : "text-gray-500"} />
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white">Stories</p>
                      <p className="text-[10px] text-gray-500">1 story por slide</p>
                    </div>
                  </button>
                </div>
                {postType === "stories" && (
                  <p className="text-[10px] text-yellow-500/80 mt-1.5">Recomendado: use formato 9:16 para stories</p>
                )}
              </div>

              <div className="w-full h-px bg-[#2a2a2a]" />
              <p className="text-sm text-gray-400">Como você quer publicar?</p>

              <button onClick={() => setPublishMode("api")}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${publishMode === "api" ? "border-brand-500 bg-brand-500/10" : "border-[#2a2a2a] hover:border-[#444]"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${publishMode === "api" ? "bg-brand-600" : "bg-[#222]"}`}>
                  <Upload size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">Upload direto</p>
                  <p className="text-xs text-gray-400">Publica automaticamente via API. Rápido, sem abrir o Instagram. Música é adicionada na legenda.</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 ml-auto ${publishMode === "api" ? "border-brand-500 bg-brand-500" : "border-[#444]"}`} />
              </button>

              <button onClick={() => setPublishMode("manual")}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${publishMode === "manual" ? "border-brand-500 bg-brand-500/10" : "border-[#2a2a2a] hover:border-[#444]"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${publishMode === "manual" ? "bg-brand-600" : "bg-[#222]"}`}>
                  <Pencil size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">Editar no Instagram</p>
                  <p className="text-xs text-gray-400">Envia direto para o Instagram sem baixar. Você escolhe música, legenda, localização e tags no próprio app.</p>
                  {selectedTrack && <p className="text-xs text-brand-400 mt-1">Recomendado — adiciona música nativa do Instagram</p>}
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 ml-auto ${publishMode === "manual" ? "border-brand-500 bg-brand-500" : "border-[#444]"}`} />
              </button>
            </>
          )}

          {/* ── Step 4: Publicar ── */}
          {step === "publish" && (
            <>
              {/* Conta */}
              {publishMode === "api" && (
                account ? (
                  <div className="flex items-center gap-3 bg-green-900/20 border border-green-800/40 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <User size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">@{account.username}</p>
                      <p className="text-xs text-green-400">Conta conectada</p>
                    </div>
                    <button onClick={onLoginClick} className="text-xs text-gray-500 hover:text-white underline">Trocar</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-gray-400">Conecte sua conta Instagram:</p>
                    <button onClick={onLoginClick}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold text-sm">
                      <LogIn size={16} />Login com Instagram
                    </button>
                  </div>
                )
              )}

              {/* Resumo */}
              <div className="bg-[#111] rounded-xl p-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Slides</span>
                  <span className="text-white font-medium">{slides.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipo</span>
                  <span className="text-white font-medium">{postType === "carousel" ? "Carrossel (Feed)" : "Stories"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Modo</span>
                  <span className="text-white font-medium">{publishMode === "api" ? "Upload direto" : "Editar no Instagram"}</span>
                </div>
                {selectedTrack && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Música</span>
                    <span className="text-brand-400 truncate ml-2 text-right max-w-[55%]">{selectedTrack.title}</span>
                  </div>
                )}
                {caption && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">Legenda</span>
                    <span className="text-gray-300 text-xs text-right line-clamp-2">{caption.slice(0, 80)}{caption.length > 80 ? "…" : ""}</span>
                  </div>
                )}
              </div>

              {slides.length < 2 && publishMode === "api" && postType === "carousel" && (
                <p className="text-yellow-500 text-xs">Mínimo de 2 slides para carrossel</p>
              )}

              {isLoading && (
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">{statusLabel}</p>
                  <div className="w-full bg-[#333] rounded-full h-1.5">
                    <div className="bg-brand-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {/* Erro */}
              {status === "error" && (
                <div className="flex items-start gap-2 rounded-lg p-3 text-sm bg-red-900/30 border border-red-800/50 text-red-300">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />{message}
                </div>
              )}

              {/* Sucesso — upload direto */}
              {status === "success" && publishMode === "api" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 rounded-lg p-3 text-sm bg-green-900/30 border border-green-800/50 text-green-300">
                    <CheckCircle size={14} className="shrink-0" />{message}
                  </div>
                  {selectedTrack && (
                    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 flex flex-col gap-3">
                      <p className="text-sm font-medium text-white flex items-center gap-2"><Music size={14} className="text-brand-400" />Adicionar música ao post</p>
                      <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg p-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedTrack.cover} alt="" className="w-9 h-9 rounded object-cover" />
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{selectedTrack.title}</p>
                          <p className="text-xs text-gray-400">{selectedTrack.artist}</p>
                        </div>
                      </div>
                      <ol className="flex flex-col gap-1.5">
                        {[`Abra o post no Instagram`, `Toque nos "..." no canto`, `Selecione "Editar"`, `Toque no ícone de música 🎵`, `Busque "${selectedTrack.title}"`, "Salve"].map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                            <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>{s}
                          </li>
                        ))}
                      </ol>
                      {permalink && (
                        <a href={permalink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold text-sm">
                          <Instagram size={15} />Abrir post no Instagram
                        </a>
                      )}
                    </div>
                  )}
                  {!selectedTrack && permalink && (
                    <a href={permalink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold text-sm">
                      <Instagram size={15} />Ver post no Instagram
                    </a>
                  )}
                </div>
              )}

              {/* Sucesso — manual */}
              {status === "success" && publishMode === "manual" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 rounded-lg p-3 text-sm bg-green-900/30 border border-green-800/50 text-green-300">
                    <CheckCircle size={14} className="shrink-0" />{message}
                  </div>
                  {selectedTrack && (
                    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-3 flex flex-col gap-2">
                      <p className="text-xs font-medium text-white flex items-center gap-1.5">
                        <Music size={12} className="text-brand-400" /> No Instagram, adicione a música:
                      </p>
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedTrack.cover} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-white truncate font-medium">{selectedTrack.title}</p>
                          <p className="text-[10px] text-gray-400">{selectedTrack.artist}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold text-sm">
                    <Instagram size={15} />Abrir Instagram
                  </a>
                </div>
              )}

              {status !== "success" && (
                <button onClick={handleAction}
                  disabled={isLoading || (publishMode === "api" && (!account || (postType === "carousel" && slides.length < 2)))}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : publishMode === "api" ? <Upload size={16} /> : <Instagram size={16} />}
                  {isLoading ? statusLabel : publishMode === "api" ? "Publicar Agora" : "Enviar para o Instagram"}
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer navegação */}
        {status !== "success" && (
          <div className="flex gap-2 p-4 border-t border-[#2a2a2a] shrink-0">
            {prevStep[step] && (
              <button onClick={() => setStep(prevStep[step]!)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-sm text-gray-300">
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
