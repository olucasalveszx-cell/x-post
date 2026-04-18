"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  FileText, Calendar, Send, Loader2, Trash2, FolderOpen, Clock,
  Save, ChevronLeft, ChevronRight, CheckCircle, XCircle, Music,
  Search, Play, Pause, Hash, Image as ImageIcon, X, CalendarClock,
  Layers, BookOpen,
} from "lucide-react";
import StorytellingAssistant from "@/components/Calendar/StorytellingAssistant";
import { Slide } from "@/types";
import { renderSlide } from "@/lib/render-slide";
import { v4 as uuid } from "uuid";

/* ── tipos ── */
interface DraftMeta {
  id: string; name: string; slideCount: number;
  thumbnail?: string; createdAt: string; updatedAt: string;
}
interface Track {
  id: number; title: string; artist: string;
  album: string; cover: string; preview: string; duration: number;
}
interface ScheduledPost {
  id: string; caption: string; imageUrls: string[];
  scheduledAt: string; status: "scheduled" | "published" | "failed";
  igMediaId?: string;
}
interface Props {
  currentSlides: Slide[];
  onLoad: (slides: Slide[]) => void;
}

const MONTHS    = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const WEEKDAYS  = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstWeekday(y: number, m: number) { return new Date(y, m, 1).getDay(); }

type Section = "drafts" | "schedule" | "calendar" | "storytelling";

export default function PostsPanel({ currentSlides, onLoad }: Props) {
  const { data: session } = useSession();
  const [section, setSection] = useState<Section>("drafts");

  /* ── drafts ── */
  const [drafts, setDrafts]         = useState<DraftMeta[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingId, setLoadingId]   = useState<string | null>(null);
  const [draftName, setDraftName]   = useState("");
  const [showNameInput, setShowNameInput] = useState(false);

  /* ── schedule ── */
  const [caption, setCaption]       = useState("");
  const [hashtags, setHashtags]     = useState("");
  const [schedAt, setSchedAt]       = useState("");
  const [postType, setPostType]     = useState<"carousel" | "story">("carousel");
  const [schedStatus, setSchedStatus] = useState<"idle"|"exporting"|"uploading"|"scheduling"|"done"|"error">("idle");
  const [schedMsg, setSchedMsg]     = useState("");

  /* ── music ── */
  const [musicQuery, setMusicQuery] = useState("");
  const [tracks, setTracks]         = useState<Track[]>([]);
  const [searchingMusic, setSearchingMusic] = useState(false);
  const [playingId, setPlayingId]   = useState<number | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── calendar ── */
  const [posts, setPosts]           = useState<ScheduledPost[]>([]);
  const [calLoading, setCalLoading] = useState(true);
  const [today]                     = useState(new Date());
  const [viewYear, setViewYear]     = useState(today.getFullYear());
  const [viewMonth, setViewMonth]   = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  /* ── load drafts ── */
  const loadDrafts = useCallback(async () => {
    if (!session?.user?.email) { setDraftsLoading(false); return; }
    setDraftsLoading(true);
    try {
      const res = await fetch("/api/drafts");
      const data = await res.json();
      setDrafts(data.drafts ?? []);
    } catch {}
    setDraftsLoading(false);
  }, [session]);

  /* ── load calendar ── */
  const loadPosts = useCallback(async () => {
    if (!session?.user?.email) { setCalLoading(false); return; }
    setCalLoading(true);
    try {
      const res = await fetch("/api/schedule");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch {}
    setCalLoading(false);
  }, [session]);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);
  useEffect(() => { loadPosts(); }, [loadPosts]);

  /* ── music search (debounce 400ms) ── */
  useEffect(() => {
    if (musicTimer.current) clearTimeout(musicTimer.current);
    if (!musicQuery.trim()) { setTracks([]); return; }
    musicTimer.current = setTimeout(async () => {
      setSearchingMusic(true);
      try {
        const res = await fetch(`/api/music?q=${encodeURIComponent(musicQuery)}`);
        const data = await res.json();
        setTracks(data.tracks ?? []);
      } catch {}
      setSearchingMusic(false);
    }, 400);
  }, [musicQuery]);

  const togglePlay = (track: Track) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      audioRef.current?.pause();
      audioRef.current = new Audio(track.preview);
      audioRef.current.play();
      setPlayingId(track.id);
    }
  };

  const selectTrack = (track: Track) => {
    setSelectedTrack(track);
    audioRef.current?.pause();
    setPlayingId(null);
    setTracks([]);
    setMusicQuery("");
  };

  /* ── draft actions ── */
  // Remove data: URLs para evitar estourar o limite de 4MB do body da API
  const stripDataUrls = (slides: Slide[]) => slides.map((s) => ({
    ...s,
    backgroundImageUrl: s.backgroundImageUrl?.startsWith("data:") ? undefined : s.backgroundImageUrl,
    elements: s.elements.map((el) => ({
      ...el,
      src: el.src?.startsWith("data:") ? undefined : el.src,
      frameImageUrl: el.frameImageUrl?.startsWith("data:") ? undefined : el.frameImageUrl,
    })),
  }));

  const saveDraft = async () => {
    if (!session?.user?.email) return;
    setSaving(true);
    try {
      const id = uuid();
      const name = draftName.trim() || `Rascunho ${new Date().toLocaleDateString("pt-BR")}`;
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, slides: stripDataUrls(currentSlides) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDraftName(""); setShowNameInput(false);
      await loadDrafts();
    } catch (err: any) {
      alert(`Erro ao salvar rascunho: ${err.message ?? "tente novamente"}`);
    }
    setSaving(false);
  };

  const openDraft = async (draft: DraftMeta) => {
    setLoadingId(draft.id);
    try {
      const res = await fetch(`/api/drafts/${draft.id}`);
      const data = await res.json();
      if (data.slides) onLoad(data.slides);
    } catch {}
    setLoadingId(null);
  };

  const deleteDraft = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch("/api/drafts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setDrafts(prev => prev.filter(d => d.id !== id));
    } catch {}
    setDeletingId(null);
  };

  /* ── schedule ── */
  const schedulePost = async () => {
    const igAccount = JSON.parse(localStorage.getItem("ig_account") ?? "null");
    if (!igAccount) {
      setSchedMsg("Conecte sua conta do Instagram primeiro (botão no topo do editor).");
      setSchedStatus("error"); return;
    }
    if (!schedAt) {
      setSchedMsg("Escolha a data e horário do agendamento.");
      setSchedStatus("error"); return;
    }
    const scheduledDate = new Date(schedAt);
    const minDate = new Date(Date.now() + 11 * 60 * 1000);
    if (scheduledDate < minDate) {
      setSchedMsg("O horário deve ser pelo menos 11 minutos no futuro.");
      setSchedStatus("error"); return;
    }

    const fullCaption = [caption.trim(), hashtags.trim()].filter(Boolean).join("\n\n");
    const slidesToExport = postType === "story" ? currentSlides.slice(0, 1) : currentSlides;

    try {
      /* 1. Export */
      setSchedStatus("exporting"); setSchedMsg("Exportando slides...");
      const dataUrls: string[] = [];
      for (const slide of slidesToExport) {
        const canvas = await renderSlide(slide);
        dataUrls.push(canvas.toDataURL("image/jpeg", 0.92));
      }

      /* 2. Upload to Blob */
      setSchedStatus("uploading"); setSchedMsg("Enviando imagens...");
      const publicUrls: string[] = [];
      for (let i = 0; i < dataUrls.length; i++) {
        const base64 = dataUrls[i].split(",")[1];
        const res = await fetch("/api/blob-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg", filename: `slide-${i + 1}-${Date.now()}.jpg` }),
        });
        const data = await res.json();
        if (!data.url) throw new Error("Falha no upload da imagem " + (i + 1));
        publicUrls.push(data.url);
      }

      /* 3. Schedule */
      setSchedStatus("scheduling"); setSchedMsg("Agendando post...");
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls: publicUrls,
          caption: fullCaption,
          scheduledAt: scheduledDate.toISOString(),
          igToken: igAccount.token,
          igAccountId: igAccount.accountId,
          mediaType: postType,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Erro ao agendar");

      setSchedStatus("done");
      setSchedMsg("Post agendado com sucesso!");
      setCaption(""); setHashtags(""); setSchedAt(""); setSelectedTrack(null);
      await loadPosts();
    } catch (err: any) {
      setSchedStatus("error");
      setSchedMsg(err.message ?? "Erro desconhecido");
    }
  };

  /* ── calendar helpers ── */
  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); setSelectedDay(null); };

  const daysInMonth    = getDaysInMonth(viewYear, viewMonth);
  const firstWeekday   = getFirstWeekday(viewYear, viewMonth);
  const postsByDay: Record<number, ScheduledPost[]> = {};
  for (const p of posts) {
    const d = new Date(p.scheduledAt);
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate();
      if (!postsByDay[day]) postsByDay[day] = [];
      postsByDay[day].push(p);
    }
  }

  const deletePost = async (post: ScheduledPost) => {
    setDeletingPostId(post.id);
    try {
      const igAccount = JSON.parse(localStorage.getItem("ig_account") ?? "null");
      await fetch("/api/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, igMediaId: post.igMediaId, igToken: igAccount?.token, igAccountId: igAccount?.accountId }),
      });
      setPosts(prev => prev.filter(p => p.id !== post.id));
      if ((postsByDay[selectedDay!] ?? []).length <= 1) setSelectedDay(null);
    } catch {}
    setDeletingPostId(null);
  };

  const hasContent = currentSlides.some(s => s.elements.length > 0 || s.backgroundImageUrl);

  /* ── min datetime (11 min from now) ── */
  const minDateTime = new Date(Date.now() + 11 * 60 * 1000).toISOString().slice(0, 16);

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-2">
        <CalendarClock size={32} className="text-gray-600" />
        <p className="text-sm text-gray-400">Entre na sua conta para usar os Posts</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* ── Section tabs ── */}
      <div className="flex border-b border-[#1e1e1e] mb-4">
        {(["drafts", "schedule", "calendar", "storytelling"] as Section[]).map((s) => {
          const labels: Record<Section, string> = { drafts: "Rascunhos", schedule: "Agendar", calendar: "Calendário", storytelling: "Story IA" };
          return (
            <button key={s} onClick={() => setSection(s)}
              className={`flex-1 py-2 text-[11px] font-medium transition-colors border-b-2 ${
                section === s ? "text-white border-brand-500" : "text-gray-500 border-transparent hover:text-gray-300"
              }`}>
              {labels[s]}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════
          RASCUNHOS
      ══════════════════════════════ */}
      {section === "drafts" && (
        <div className="flex flex-col gap-4">
          {/* Salvar atual */}
          {hasContent && (
            <div className="flex flex-col gap-2">
              {showNameInput ? (
                <div className="flex gap-2">
                  <input type="text" value={draftName} onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Nome do rascunho..." autoFocus
                    onKeyDown={(e) => e.key === "Enter" && saveDraft()}
                    className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-500 placeholder:text-gray-600 text-white" />
                  <button onClick={saveDraft} disabled={saving}
                    className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium disabled:opacity-40 flex items-center gap-1 transition-colors">
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
                  </button>
                  <button onClick={() => setShowNameInput(false)} className="p-2 rounded-lg text-gray-500 hover:text-white">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowNameInput(true)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-brand-500/40 hover:border-brand-500/70 bg-brand-500/5 hover:bg-brand-500/10 text-brand-400 text-xs font-medium transition-all">
                  <Save size={13} /> Salvar carrossel atual como rascunho
                </button>
              )}
            </div>
          )}

          {draftsLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={18} className="animate-spin text-gray-500" /></div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <FolderOpen size={28} className="text-gray-700" />
              <p className="text-sm text-gray-500">Nenhum rascunho salvo</p>
              <p className="text-xs text-gray-600">Gere um carrossel e salve aqui</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {drafts.map(draft => (
                <div key={draft.id} className="flex gap-2.5 p-3 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]">
                  <div className="w-10 h-12 rounded-lg overflow-hidden shrink-0 bg-[#1a1a1a] flex items-center justify-center">
                    {draft.thumbnail
                      ? <img src={draft.thumbnail} alt="" className="w-full h-full object-cover" />
                      : <FileText size={14} className="text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{draft.name}</p>
                    <p className="text-[10px] text-gray-500">{draft.slideCount} slide{draft.slideCount > 1 ? "s" : ""}</p>
                    <p className="text-[10px] text-gray-600 flex items-center gap-0.5 mt-0.5">
                      <Clock size={8} /> {new Date(draft.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => openDraft(draft)} disabled={loadingId === draft.id}
                      className="px-2 py-1 rounded-lg bg-brand-600/20 hover:bg-brand-600 text-brand-400 hover:text-white text-[10px] font-medium transition-colors flex items-center gap-1 disabled:opacity-40">
                      {loadingId === draft.id ? <Loader2 size={9} className="animate-spin" /> : <FolderOpen size={9} />} Abrir
                    </button>
                    <button onClick={() => deleteDraft(draft.id)} disabled={deletingId === draft.id}
                      className="px-2 py-1 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 text-[10px] transition-colors flex items-center gap-1">
                      {deletingId === draft.id ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />} Apagar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════
          AGENDAR
      ══════════════════════════════ */}
      {section === "schedule" && (
        <div className="flex flex-col gap-4">
          {!hasContent && (
            <div className="rounded-xl border border-dashed border-[#2a2a2a] p-4 text-center text-xs text-gray-500">
              Gere ou carregue um carrossel no editor antes de agendar.
            </div>
          )}

          {hasContent && (
            <>
              {/* Tipo de post */}
              <div className="flex rounded-xl overflow-hidden border border-[#2a2a2a] text-xs font-medium">
                <button onClick={() => setPostType("carousel")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${postType === "carousel" ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
                  <Layers size={12} /> Carrossel
                </button>
                <button onClick={() => setPostType("story")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${postType === "story" ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
                  <BookOpen size={12} /> Story
                </button>
              </div>

              {postType === "story" && (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-[10px] text-yellow-400">
                  Apenas o 1º slide será usado como Story. Slides adicionais serão ignorados.
                </div>
              )}

              {/* Preview slides */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {(postType === "story" ? currentSlides.slice(0, 1) : currentSlides.slice(0, 8)).map((s, i) => (
                  <div key={s.id} className="w-12 h-14 shrink-0 rounded-lg overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center relative">
                    {s.backgroundImageUrl
                      ? <img src={s.backgroundImageUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full" style={{ background: s.backgroundColor || "#111" }} />}
                    <span className="absolute bottom-0.5 right-1 text-[8px] text-white/60 font-bold">{i + 1}</span>
                  </div>
                ))}
                {postType === "carousel" && currentSlides.length > 8 && (
                  <div className="w-12 h-14 shrink-0 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[10px] text-gray-500">
                    +{currentSlides.length - 8}
                  </div>
                )}
              </div>

              {/* Legenda */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium">Legenda</label>
                <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={4}
                  placeholder="Escreva a legenda do post..."
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 resize-none" />
              </div>

              {/* Hashtags */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <Hash size={12} /> Hashtags
                </label>
                <textarea value={hashtags} onChange={e => setHashtags(e.target.value)} rows={2}
                  placeholder="#instagram #carrossel #viral"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 resize-none" />
              </div>

              {/* Música */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <Music size={12} /> Música (menção na legenda)
                </label>

                {selectedTrack ? (
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#0f0f0f] border border-brand-500/30">
                    <img src={selectedTrack.cover} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate font-medium">{selectedTrack.title}</p>
                      <p className="text-[10px] text-brand-400 truncate">{selectedTrack.artist}</p>
                    </div>
                    <button onClick={() => setSelectedTrack(null)} className="p-1 text-gray-600 hover:text-white shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    <input type="text" value={musicQuery} onChange={e => setMusicQuery(e.target.value)}
                      placeholder="Buscar música..."
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500" />
                  </div>
                )}

                {/* Resultados */}
                {(searchingMusic || tracks.length > 0) && (
                  <div className="flex flex-col gap-1 max-h-36 overflow-y-auto rounded-xl border border-[#1e1e1e] bg-[#0a0a0a]">
                    {searchingMusic && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={14} className="animate-spin text-gray-500" />
                      </div>
                    )}
                    {tracks.map(track => (
                      <div key={track.id} className="flex items-center gap-2 px-2.5 py-2 hover:bg-white/5 cursor-pointer"
                        onClick={() => selectTrack(track)}>
                        <img src={track.cover} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white truncate">{track.title}</p>
                          <p className="text-[10px] text-gray-500 truncate">{track.artist}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); togglePlay(track); }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 shrink-0">
                          {playingId === track.id ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Data e Hora */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <CalendarClock size={12} /> Data e horário do post
                </label>
                <input type="datetime-local" value={schedAt} onChange={e => setSchedAt(e.target.value)}
                  min={minDateTime}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 [color-scheme:dark]" />
                <p className="text-[10px] text-gray-600">Mínimo: 11 minutos no futuro. Máximo: 75 dias.</p>
              </div>

              {/* Feedback */}
              {schedStatus !== "idle" && (
                <div className={`rounded-xl px-3 py-2.5 text-xs font-medium flex items-center gap-2 ${
                  schedStatus === "done" ? "bg-green-500/10 border border-green-500/20 text-green-400" :
                  schedStatus === "error" ? "bg-red-500/10 border border-red-500/20 text-red-400" :
                  "bg-brand-500/10 border border-brand-500/20 text-brand-400"
                }`}>
                  {schedStatus === "done" ? <CheckCircle size={14} /> :
                   schedStatus === "error" ? <XCircle size={14} /> :
                   <Loader2 size={14} className="animate-spin" />}
                  {schedMsg || {
                    exporting: "Exportando slides...",
                    uploading: "Enviando imagens...",
                    scheduling: "Agendando post...",
                  }[schedStatus as string] || ""}
                </div>
              )}

              {/* Botão agendar */}
              <button onClick={schedulePost}
                disabled={["exporting","uploading","scheduling"].includes(schedStatus)}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", boxShadow: "0 0 20px rgba(168,85,247,0.3)" }}>
                {["exporting","uploading","scheduling"].includes(schedStatus)
                  ? <><Loader2 size={16} className="animate-spin" /> Agendando...</>
                  : <><Send size={16} /> {postType === "story" ? "Agendar Story" : "Agendar post"}</>}
              </button>

              {schedStatus === "done" && (
                <button onClick={() => { setSchedStatus("idle"); setSchedMsg(""); }}
                  className="text-xs text-gray-500 hover:text-gray-300 text-center transition-colors">
                  Agendar outro post
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════
          CALENDÁRIO
      ══════════════════════════════ */}
      {section === "calendar" && (
        <div className="flex flex-col gap-4">
          {/* Navegação */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-white">{MONTHS_PT[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Grid */}
          <div className="rounded-xl border border-[#1e1e1e] overflow-hidden">
            <div className="grid grid-cols-7 border-b border-[#1e1e1e]">
              {WEEKDAYS.map(d => <div key={d} className="text-center text-[9px] text-gray-600 py-1.5">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} className="h-9 border-b border-r border-[#111]" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                const isSelected = day === selectedDay;
                const dayPosts = postsByDay[day] ?? [];
                const col = (firstWeekday + i) % 7;
                return (
                  <button key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`h-9 flex flex-col items-center justify-center gap-0.5 border-b transition-colors ${col < 6 ? "border-r" : ""} border-[#111] ${isSelected ? "bg-brand-500/20" : "hover:bg-white/[0.03]"}`}>
                    <span className={`text-[11px] font-medium leading-none ${isToday ? "text-brand-400 font-bold" : isSelected ? "text-white" : "text-gray-400"}`}>
                      {day}
                    </span>
                    {dayPosts.length > 0 && (
                      <div className="flex gap-0.5">
                        {dayPosts.slice(0, 3).map((p, pi) => (
                          <div key={pi} className={`w-1 h-1 rounded-full ${p.status === "published" ? "bg-green-400" : p.status === "failed" ? "bg-red-400" : "bg-blue-400"}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Posts do dia */}
          {selectedDay && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500 font-medium">{selectedDay} de {MONTHS_PT[viewMonth]}</p>
              {(postsByDay[selectedDay] ?? []).length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">Nenhum post neste dia</p>
              ) : (
                (postsByDay[selectedDay] ?? []).map(post => {
                  const time = new Date(post.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={post.id} className="flex gap-2 p-2.5 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]">
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[#1a1a1a] flex items-center justify-center">
                        {post.imageUrls[0] ? <img src={post.imageUrls[0]} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={13} className="text-gray-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                            post.status === "published" ? "text-green-400 border-green-400/20 bg-green-400/10" :
                            post.status === "failed" ? "text-red-400 border-red-400/20 bg-red-400/10" :
                            "text-blue-400 border-blue-400/20 bg-blue-400/10"
                          }`}>
                            {post.status === "published" ? "Publicado" : post.status === "failed" ? "Falhou" : "Agendado"}
                          </span>
                          <span className="text-[9px] text-gray-500">{time}</span>
                          {(post as any).mediaType === "story" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded border text-purple-400 border-purple-400/20 bg-purple-400/10">Story</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 truncate">{post.caption || "Sem legenda"}</p>
                      </div>
                      {post.status === "scheduled" && (
                        <button onClick={() => deletePost(post)} disabled={deletingPostId === post.id}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors shrink-0">
                          {deletingPostId === post.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Próximos */}
          {!selectedDay && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500 font-medium">Próximos agendamentos</p>
              {calLoading ? (
                <div className="flex items-center justify-center py-6"><Loader2 size={16} className="animate-spin text-gray-500" /></div>
              ) : posts.filter(p => p.status === "scheduled" && new Date(p.scheduledAt) > new Date()).length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-600">
                  Nenhum post agendado.<br />
                  Use a aba <span className="text-brand-400">Agendar</span> para programar posts.
                </div>
              ) : (
                posts
                  .filter(p => p.status === "scheduled" && new Date(p.scheduledAt) > new Date())
                  .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                  .slice(0, 6)
                  .map(post => {
                    const d = new Date(post.scheduledAt);
                    return (
                      <div key={post.id} className="flex items-center gap-2 p-2 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]">
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-[#1a1a1a] flex items-center justify-center">
                          {post.imageUrls[0] ? <img src={post.imageUrls[0]} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={12} className="text-gray-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-300 truncate">{post.caption || "Sem legenda"}</p>
                          <p className="text-[10px] text-blue-400 mt-0.5">
                            {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} às {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════
          STORY IA — Assistente de Storytelling
      ══════════════════════════════ */}
      {section === "storytelling" && (
        <StorytellingAssistant onGenerate={onLoad} />
      )}
    </div>
  );
}
