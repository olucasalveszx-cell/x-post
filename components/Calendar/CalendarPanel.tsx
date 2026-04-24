"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Calendar, ChevronLeft, ChevronRight, Clock, Trash2,
  Loader2, Plus, CheckCircle, XCircle, AlertCircle, Image as ImageIcon,
} from "lucide-react";

interface ScheduledPost {
  id: string;
  caption: string;
  imageUrls: string[];
  scheduledAt: string;
  status: "scheduled" | "published" | "failed";
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

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstWeekday = getFirstWeekday(viewYear, viewMonth);

  // Agrupa posts por dia
  const postsByDay: Record<number, ScheduledPost[]> = {};
  for (const post of posts) {
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold mb-0.5 flex items-center gap-2">
          <Calendar size={18} className="text-brand-500" />
          Calendário
        </h2>
        <p className="text-xs text-gray-500">Posts agendados para o Instagram.</p>
      </div>

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
        {/* Cabeçalho dias da semana */}
        <div className="grid grid-cols-7 border-b border-[#1e1e1e]">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] text-gray-600 font-medium py-2">{d}</div>
          ))}
        </div>

        {/* Dias */}
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

          {selectedPosts.map(post => {
            const sc = STATUS_CONFIG[post.status];
            const time = new Date(post.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={post.id} className="flex gap-2 p-3 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]">
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-[#1a1a1a] flex items-center justify-center">
                  {post.imageUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={16} className="text-gray-600" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${sc.color}`}>
                      {sc.icon} {sc.label}
                    </span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                      <Clock size={9} /> {time}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{post.caption || "Sem legenda"}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{post.imageUrls.length} imagem{post.imageUrls.length > 1 ? "ns" : ""}</p>
                </div>

                {/* Deletar */}
                {post.status === "scheduled" && (
                  <button
                    onClick={() => deletePost(post)}
                    disabled={deletingId === post.id}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors shrink-0"
                  >
                    {deletingId === post.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lista de todos os posts futuros */}
      {!selectedDay && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500 font-medium">Próximos agendamentos</p>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-gray-500" />
            </div>
          )}
          {!loading && posts.filter(p => p.status === "scheduled").length === 0 && (
            <div className="text-center py-8 text-xs text-gray-600">
              Nenhum post agendado.<br />
              Use o botão "Agendar" ao publicar um carrossel.
            </div>
          )}
          {!loading && posts
            .filter(p => p.status === "scheduled" && new Date(p.scheduledAt) > new Date())
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
            .slice(0, 5)
            .map(post => {
              const d = new Date(post.scheduledAt);
              return (
                <div key={post.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]">
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-[#1a1a1a]">
                    {post.imageUrls[0]
                      ? <img src={post.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                      : <ImageIcon size={14} className="text-gray-600 m-auto mt-2.5" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">{post.caption || "Sem legenda"}</p>
                    <p className="text-[10px] text-blue-400 mt-0.5">
                      {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} às {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}
    </div>
  );
}
