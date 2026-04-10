"use client";

import { useState, useRef, useEffect } from "react";
import { X, Instagram, Loader2, CheckCircle, AlertCircle, LogIn, User, ExternalLink, Music, Search, Play, Pause, ChevronRight, ChevronLeft } from "lucide-react";
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

type Step = "music" | "caption" | "publish";

export default function PublishModal({ slides, account, onClose, onLoginClick }: Props) {
  const [step, setStep] = useState<Step>("music");
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<"idle" | "exporting" | "uploading" | "publishing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);

  // Música
  const [musicQuery, setMusicQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Busca automática ao digitar
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
    // Adiciona menção da música na legenda
    const mention = `\n\n🎵 ${track.title} — ${track.artist}`;
    setCaption((prev) => {
      if (prev.includes(mention.trim())) return prev;
      return prev + mention;
    });
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

  const handlePublish = async () => {
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
        body: JSON.stringify({ imageUrls: publicUrls, caption, igToken: account.token, igAccountId: account.accountId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProgress(100);
      setStatus("success");
      setMessage(data.message);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message ?? "Erro ao publicar");
    }
  };

  const isLoading = ["exporting", "uploading", "publishing"].includes(status);
  const statusLabel = { exporting: "Exportando slides...", uploading: "Enviando imagens...", publishing: "Publicando no Instagram..." }[status as string] ?? "";

  const STEPS: { key: Step; label: string }[] = [
    { key: "music", label: "Música" },
    { key: "caption", label: "Legenda" },
    { key: "publish", label: "Publicar" },
  ];

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
              className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${step === s.key ? "text-white" : "text-gray-500 hover:text-gray-300"}`}>
              <span className={`inline-flex items-center gap-1.5`}>
                <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${step === s.key ? "bg-brand-600 text-white" : "bg-[#2a2a2a] text-gray-500"}`}>{i + 1}</span>
                {s.label}
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
              <div>
                <p className="text-sm text-gray-400 mb-3">Escolha uma música para inspirar sua legenda:</p>

                {/* Campo de busca */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={musicQuery}
                    onChange={(e) => setMusicQuery(e.target.value)}
                    placeholder="Buscar artista ou música..."
                    className="w-full bg-[#111] border border-[#333] rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600"
                    autoFocus
                  />
                  {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />}
                </div>
              </div>

              {/* Selecionada */}
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

              {/* Lista de resultados */}
              {tracks.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {tracks.map((track) => (
                    <div key={track.id}
                      onClick={() => selectTrack(track)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors border ${selectedTrack?.id === track.id ? "border-brand-500/50 bg-brand-500/10" : "border-transparent hover:bg-[#222]"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={track.cover} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{track.title}</p>
                        <p className="text-xs text-gray-400 truncate">{track.artist} · {track.album}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePlay(track); }}
                        className="w-8 h-8 rounded-full bg-[#333] hover:bg-brand-600 flex items-center justify-center shrink-0 transition-colors">
                        {playingId === track.id ? <Pause size={13} /> : <Play size={13} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!musicQuery && !selectedTrack && (
                <p className="text-xs text-gray-600 text-center py-4">
                  A música selecionada será adicionada na legenda do post.<br />
                  <span className="text-gray-700">(Instagram não suporta música em carrosséis via API)</span>
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
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Digite a legenda, hashtags..."
                  rows={5}
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600 resize-none"
                  autoFocus
                />
                <p className="text-xs text-gray-600 mt-1">{caption.length} caracteres</p>
              </div>
            </>
          )}

          {/* ── Step 3: Publicar ── */}
          {step === "publish" && (
            <>
              {account ? (
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
              )}

              {/* Resumo */}
              <div className="bg-[#111] rounded-xl p-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Slides</span>
                  <span className="text-white font-medium">{slides.length}</span>
                </div>
                {selectedTrack && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Música</span>
                    <span className="text-brand-400 truncate ml-2 text-right max-w-[60%]">{selectedTrack.title}</span>
                  </div>
                )}
                {caption && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">Legenda</span>
                    <span className="text-gray-300 text-xs text-right line-clamp-2">{caption.slice(0, 80)}{caption.length > 80 ? "…" : ""}</span>
                  </div>
                )}
              </div>

              {slides.length < 2 && (
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

              {message && (
                <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${status === "success" ? "bg-green-900/30 border border-green-800/50 text-green-300" : "bg-red-900/30 border border-red-800/50 text-red-300"}`}>
                  {status === "success" ? <CheckCircle size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
                  {message}
                </div>
              )}

              {status === "idle" && (
                <p className="text-[11px] text-gray-600 flex items-center gap-1">
                  <ExternalLink size={10} />
                  Para publicar, o app precisa estar acessível publicamente
                </p>
              )}

              <button
                onClick={handlePublish}
                disabled={!account || isLoading || status === "success" || slides.length < 2}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : status === "success" ? <CheckCircle size={16} /> : <Instagram size={16} />}
                {isLoading ? statusLabel : status === "success" ? "Publicado!" : "Publicar Agora"}
              </button>
            </>
          )}
        </div>

        {/* Footer navegação */}
        {status !== "success" && (
          <div className="flex gap-2 p-4 border-t border-[#2a2a2a] shrink-0">
            {step !== "music" && (
              <button onClick={() => setStep(step === "publish" ? "caption" : "music")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-sm text-gray-300">
                <ChevronLeft size={15} /> Voltar
              </button>
            )}
            {step !== "publish" && (
              <button onClick={() => setStep(step === "music" ? "caption" : "publish")}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-sm font-medium">
                Próximo <ChevronRight size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
