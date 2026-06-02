"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Calendar, ChevronLeft, ChevronRight, Clock, Trash2,
  Loader2, Plus, CheckCircle, XCircle, Image as ImageIcon,
  History, Filter,
} from "lucide-react";

interface ScheduledPost {
  id: string;
  caption: string;
  imageUrls: string[];
  scheduledAt: string;
  status: "scheduled" | "published" | "failed";
  igAccountId?: string;
  igMediaId?: string;
  errorMsg?: string;
}

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const STATUS_CONFIG = {
  scheduled: { icon: <Clock size={11} />, label: "Agendado", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  published:  { icon: <CheckCircle size={11} />, label: "Publicado", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  failed:     { icon: <XCircle size={11} />, label: "Falhou", color: "text-red-400 bg-red-400/10 border-red-400/20" },
};

export default function CalendarPanel() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [profileFilter, setProfileFilter] = useState<string>("all");
  const [view, setView] = useState<"calendar" | "history">("calendar");

  const load = useCallback(async () => {
    if (!session?.user?.email) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/schedule");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch {}
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  };

  // Perfis únicos disponíveis
  const profiles = Array.from(new Set(posts.map(p => p.igAccountId).filter(Boolean))) as string[];

  // Posts filtrados por perfil
  const filteredPosts = profileFilter === "all" ? posts : posts.filter(p => p.igAccountId === profileFilter);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstWeekday = getFirstWeekday(viewYear, viewMonth);

  // Agrupa posts por dia (mês atual)
  const postsByDay: Record<number, ScheduledPost[]> = {};
  for (const post of filteredPosts) {
    const d = new Date(post.scheduledAt);
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate();
      if (!postsByDay[day]) postsByDay[day] = [];
      postsByDay[day].push(post);
    }
  }

  const selectedPosts = selectedDay ? (postsByDay[selectedDay] ?? []) : [];

  const deletePost = async (post: ScheduledPost) => {
    setDeletingId(post.id);
    try {
      const igAccount = JSON.parse(localStorage.getItem("ig_account") ?? "null");
      await fetch("/api/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.id,
          igMediaId: post.igMediaId,
          igToken: igAccount?.token,
          igAccountId: igAccount?.accountId,
        }),
      });
      setPosts(prev => prev.filter(p => p.id !== post.id));
      if (selectedPosts.length <= 1) setSelectedDay(null);
    } catch {}
    setDeletingId(null);
  };

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
        <Calendar size={32} className="text-gray-600" />
        <p className="text-sm text-gray-400">Entre para ver seu calendário de postagens</p>
      </div>
    );
  }

  // Histórico: todos os posts ordenados por data
  const historySorted = [...filteredPosts].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );
  const scheduled = filteredPosts.filter(p => p.status === "scheduled");
  const published = filteredPosts.filter(p => p.status === "published");
  const failed = filteredPosts.filter(p => p.status === "failed");

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold mb-0.5 flex items-center gap-2">
            <Calendar size={18} className="text-brand-500" />
            Calendário
          </h2>
          <p className="text-xs text-gray-500">
            {scheduled.length} agendado{scheduled.length !== 1 ? "s" : ""} · {published.length} publicado{published.length !== 1 ? "s" : ""} · {failed.length} falhou
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-4)] text-gray-500 hover:text-gray-300 transition-colors"
          title="Atualizar"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <History size={14} />}
        </button>
      </div>

      {/* Filtro por perfil */}
      {profiles.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={11} className="text-gray-500 shrink-0" />
          <button
            onClick={() => setProfileFilter("all")}
            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${profileFilter === "all" ? "bg-brand-600/20 border-brand-500/40 text-brand-400" : "border-[#2a2a2a] text-gray-500 hover:text-gray-300"}`}
          >
            Todos
          </button>
          {profiles.map(pid => (
            <button
              key={pid}
              onClick={() => setProfileFilter(pid)}
              className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${profileFilter === pid ? "bg-brand-600/20 border-brand-500/40 text-brand-400" : "border-[#2a2a2a] text-gray-500 hover:text-gray-300"}`}
            >
              {pid.slice(0, 12)}
            </button>
          ))}
        </div>
      )}

      {/* Tabs Calendário / Histórico */}
      <div className="flex border-b border-[#1e1e1e]">
        <button
          onClick={() => { setView("calendar"); setSelectedDay(null); }}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${view === "calendar" ? "text-[var(--text)] border-b-2 border-brand-500" : "text-gray-500 hover:text-gray-300"}`}
        >
          Calendário
        </button>
        <button
          onClick={() => { setView("history"); setSelectedDay(null); }}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${view === "history" ? "text-[var(--text)] border-b-2 border-brand-500" : "text-gray-500 hover:text-gray-300"}`}
        >
          Histórico ({filteredPosts.length})
        </button>
      </div>

      {/* ── Vista Calendário ── */}
      {view === "calendar" && (
        <>
          {/* Navegação do mês */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--bg-4)] text-gray-400 hover:text-[var(--text)] transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-[var(--text)]">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[var(--bg-4)] text-gray-400 hover:text-[var(--text)] transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Grid do calendário */}
          <div className="rounded-xl border border-[#1e1e1e] overflow-hidden">
            <div className="grid grid-cols-7 border-b border-[#1e1e1e]">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[10px] text-gray-600 font-medium py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10 border-b border-r border-[#111]" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                const isSelected = day === selectedDay;
                const dayPosts = postsByDay[day] ?? [];
                const hasPosts = dayPosts.length > 0;
                const col = (firstWeekday + i) % 7;
                const isLastCol = col === 6;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`h-10 flex flex-col items-center justify-center gap-0.5 border-b transition-colors relative
                      ${isLastCol ? "" : "border-r"} border-[#111]
                      ${isSelected ? "bg-brand-500/20" : hasPosts ? "hover:bg-white/5" : "hover:bg-white/[0.02]"}
                    `}
                  >
                    <span className={`text-xs font-medium leading-none ${
                      isToday ? "text-brand-400 font-bold" : isSelected ? "text-[var(--text)]" : "text-gray-400"
                    }`}>
                      {day}
                    </span>
                    {hasPosts && (
                      <div className="flex gap-0.5">
                        {dayPosts.slice(0, 3).map((p, pi) => (
                          <div key={pi} className={`w-1 h-1 rounded-full ${
                            p.status === "published" ? "bg-green-400" :
                            p.status === "failed" ? "bg-red-400" : "bg-blue-400"
                          }`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Posts do dia selecionado */}
          {selectedDay && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500 font-medium">
                {selectedDay} de {MONTHS[viewMonth]}
                {selectedPosts.length === 0 && " · Nenhum post"}
              </p>
              {selectedPosts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 gap-2 rounded-xl border border-dashed border-[#2a2a2a] text-gray-600">
                  <Plus size={18} />
                  <span className="text-xs">Nenhum post agendado</span>
                </div>
              )}
              {selectedPosts.map(post => <PostCard key={post.id} post={post} deletingId={deletingId} onDelete={deletePost} />)}
            </div>
          )}

          {/* Posts futuros agendados */}
          {!selectedDay && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500 font-medium">Próximos agendamentos</p>
              {loading && <div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin text-gray-500" /></div>}
              {!loading && scheduled.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-600">
                  Nenhum post agendado.<br />
                  Use o botão "Agendar" ao publicar um carrossel.
                </div>
              )}
              {!loading && scheduled
                .filter(p => new Date(p.scheduledAt) > new Date())
                .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                .map(post => <PostCard key={post.id} post={post} deletingId={deletingId} onDelete={deletePost} compact />)}
            </div>
          )}
        </>
      )}

      {/* ── Vista Histórico ── */}
      {view === "history" && (
        <div className="flex flex-col gap-2">
          {loading && <div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin text-gray-500" /></div>}
          {!loading && historySorted.length === 0 && (
            <div className="text-center py-12 text-xs text-gray-600">
              Nenhum post encontrado.<br />
              Agende ou publique para ver o histórico.
            </div>
          )}
          {!loading && historySorted.map(post => <PostCard key={post.id} post={post} deletingId={deletingId} onDelete={deletePost} />)}
        </div>
      )}
    </div>
  );
}

function PostCard({ post, deletingId, onDelete, compact = false }: {
  post: ScheduledPost;
  deletingId: string | null;
  onDelete: (post: ScheduledPost) => void;
  compact?: boolean;
}) {
  const sc = STATUS_CONFIG[post.status];
  const d = new Date(post.scheduledAt);
  const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
  const timeStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]">
        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-[#1a1a1a]">
          {post.imageUrls[0]
            ? <img src={post.imageUrls[0]} alt="" className="w-full h-full object-cover" />
            : <ImageIcon size={14} className="text-gray-600 m-auto mt-2.5" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-300 truncate">{post.caption || "Sem legenda"}</p>
          <p className="text-[10px] text-blue-400 mt-0.5">{dateStr} às {timeStr}</p>
        </div>
        {post.status === "scheduled" && (
          <button
            onClick={() => onDelete(post)}
            disabled={deletingId === post.id}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors shrink-0"
          >
            {deletingId === post.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2 p-3 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]">
      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-[#1a1a1a] flex items-center justify-center">
        {post.imageUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.imageUrls[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={16} className="text-gray-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${sc.color}`}>
            {sc.icon} {sc.label}
          </span>
          <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
            <Clock size={9} /> {dateStr} {timeStr}
          </span>
        </div>
        <p className="text-xs text-gray-400 truncate">{post.caption || "Sem legenda"}</p>
        <p className="text-[10px] text-gray-600 mt-0.5">{post.imageUrls.length} imagem{post.imageUrls.length > 1 ? "ns" : ""}</p>
        {post.status === "failed" && post.errorMsg && (
          <p className="text-[10px] text-red-400/80 mt-0.5 truncate" title={post.errorMsg}>Erro: {post.errorMsg}</p>
        )}
      </div>
      {post.status === "scheduled" && (
        <button
          onClick={() => onDelete(post)}
          disabled={deletingId === post.id}
          className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors shrink-0"
        >
          {deletingId === post.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      )}
    </div>
  );
}
