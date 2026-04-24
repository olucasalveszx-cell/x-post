"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import { X, Download, Loader2, ImageIcon, Layers, RefreshCw, LogOut, LayoutDashboard, Zap, Crown, ArrowRight, Instagram, Trash2, Sun, Moon, PlayCircle, MessageSquare, Bell, CheckCircle2, Lightbulb, Video, Star } from "lucide-react";
import FeedbackModal from "@/components/FeedbackModal";
import { useTheme } from "next-themes";
import Link from "next/link";

interface HistoryEntry {
  id: string;
  title: string;
  coverUrl: string;
  slideCount: number;
  createdAt: string;
}

interface ImageEntry {
  id: string;
  url: string;
  savedAt: string;
}

interface CreditsInfo {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  bonus: number;
  total: number;
}

const PLAN_LABEL: Record<string, string> = {
  free: "Free", basic: "Basic", pro: "Pro", business: "Business",
};
const PLAN_COLOR: Record<string, string> = {
  free: "#9ca3af", basic: "#60a5fa", pro: "#4c6ef5", business: "#f59e0b",
};

interface TutorialData {
  url: string;
  title: string;
  description: string;
  uploadedAt: string;
}

interface MemberVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  addedAt: string;
}

interface MemberTopic {
  id: string;
  emoji: string;
  title: string;
  description: string;
  videos: MemberVideo[];
}

interface Notification {
  id: string;
  type: "feedback_reply" | "idea_approved" | "idea_rejected" | "member_video";
  title: string;
  body: string;
  originalText?: string;
  createdAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initialTab?: "history" | "images" | "instagram" | "tutorial" | "inbox";
  onOpenTutorial?: () => void;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ProfileModal({ open, onClose, initialTab, onOpenTutorial }: Props) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [tab, setTab]         = useState<"history" | "images" | "instagram" | "tutorial" | "inbox">("history");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [images,  setImages]  = useState<ImageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [tutorial, setTutorial] = useState<TutorialData | null>(null);
  const [loadingTutorial, setLoadingTutorial] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [topics, setTopics] = useState<MemberTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<MemberVideo | null>(null);

  /* ── Instagram ── */
  const [igAccount, setIgAccount] = useState<{ username: string; accountId: string; token: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.history ?? []);
      setImages(data.images ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInstagram = useCallback(() => {
    try {
      const saved = localStorage.getItem("ig_account");
      if (saved) setIgAccount(JSON.parse(saved));
      else setIgAccount(null);
    } catch {}
  }, []);

  const loadTutorial = useCallback(async () => {
    setLoadingTutorial(true);
    try {
      const res = await fetch("/api/tutorial");
      if (!res.ok) return;
      const data = await res.json();
      setTutorial(data.tutorial ?? null);
      await fetch("/api/tutorial", { method: "POST" });
    } finally {
      setLoadingTutorial(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setNotifUnread(data.unread ?? 0);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const markNotifsRead = useCallback(async () => {
    setNotifUnread(0);
    await fetch("/api/notifications", { method: "POST" }).catch(() => {});
  }, []);

  const loadTopics = useCallback(async () => {
    setLoadingTopics(true);
    try {
      const res = await fetch("/api/members-area");
      if (!res.ok) return;
      const data = await res.json();
      setTopics(data.topics ?? []);
    } finally {
      setLoadingTopics(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    load();
    fetch("/api/admin/me").then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => {});
    fetch("/api/credits").then(r => r.ok ? r.json() : null).then(d => { if (d) setCredits(d); }).catch(() => {});
    loadInstagram();
    loadNotifications();
    if (initialTab) setTab(initialTab);
  }, [open, load, loadInstagram, loadNotifications, initialTab]);

  useEffect(() => {
    if (tab === "tutorial" && !tutorial && !loadingTutorial) loadTutorial();
    if (tab === "tutorial" && topics.length === 0 && !loadingTopics) loadTopics();
    if (tab === "inbox") markNotifsRead();
  }, [tab, tutorial, loadingTutorial, loadTutorial, topics.length, loadingTopics, loadTopics, markNotifsRead]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl bg-[var(--bg-2)] border-t sm:border border-[var(--border-2)] rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
          {session?.user?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="w-8 h-8 rounded-full border border-[var(--border)] shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-[var(--text)] truncate">{session?.user?.name ?? "Meu Perfil"}</p>
            <p className="text-[10px] text-[var(--text-3)] truncate">{session?.user?.email}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Credits card */}
        {credits && (
          <div className="mx-4 mt-3 mb-1 rounded-xl border border-[var(--border)] overflow-hidden shrink-0" style={{ background: "var(--bg)" }}>
            <div className="flex items-center justify-between px-4 py-3">
              {/* Plan + total */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${PLAN_COLOR[credits.plan] ?? "#9ca3af"}18` }}>
                  <Crown size={13} style={{ color: PLAN_COLOR[credits.plan] ?? "#9ca3af" }} />
                </div>
                <div>
                  <p className="text-[11px] font-bold" style={{ color: PLAN_COLOR[credits.plan] ?? "#9ca3af" }}>
                    {PLAN_LABEL[credits.plan] ?? credits.plan}
                  </p>
                  <p className="text-[10px] text-[var(--text-3)]">{credits.used}/{credits.limit} mensais usados</p>
                </div>
              </div>

              {/* Total badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{
                  background: credits.total > 5 ? "rgba(76,110,245,0.12)" : credits.total > 0 ? "rgba(251,191,36,0.12)" : "rgba(239,68,68,0.12)",
                  color: credits.total > 5 ? "##818cf8" : credits.total > 0 ? "#fbbf24" : "#f87171",
                }}>
                <Zap size={11} />
                <span className="text-xs font-black">{credits.total}</span>
                <span className="text-[10px] opacity-70">créditos</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-4 pb-1">
              <div className="h-1 rounded-full bg-[var(--bg-4)] overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (credits.used / credits.limit) * 100)}%`,
                    background: credits.used / credits.limit > 0.85 ? "#ef4444" : credits.used / credits.limit > 0.6 ? "#f59e0b" : "#4c6ef5",
                  }} />
              </div>
            </div>

            {/* Bonus + actions */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] mt-1">
              <p className="text-[10px] text-[var(--text-3)]">
                {credits.bonus > 0
                  ? <span className="text-yellow-600">+{credits.bonus} créditos extras</span>
                  : "Sem créditos extras"}
              </p>
              <div className="flex items-center gap-2">
                <Link href="/credits" onClick={onClose}
                  className="text-[11px] font-semibold text-brand-500 hover:text-brand-400 transition-colors flex items-center gap-0.5">
                  Comprar mais <ArrowRight size={10} />
                </Link>
                <span className="text-[var(--text-3)]">·</span>
                <Link href="/#pricing" onClick={onClose}
                  className="text-[11px] font-semibold text-yellow-500 hover:text-yellow-400 transition-colors flex items-center gap-0.5">
                  Upgrade <Crown size={10} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] shrink-0 mt-2 overflow-x-auto scrollbar-none">
          {(["history", "images", "instagram", "tutorial", "inbox"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 min-w-fit py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 px-2 whitespace-nowrap ${
                tab === t ? "text-[var(--text)] border-b-2 border-brand-500" : "text-[var(--text-3)] hover:text-[var(--text)]"
              }`}
            >
              {t === "history" ? <><Layers size={13} /> Histórico</>
                : t === "images" ? <><ImageIcon size={13} /> Biblioteca</>
                : t === "instagram" ? <><Instagram size={13} /> Instagram</>
                : t === "tutorial" ? <><PlayCircle size={13} /> Tutorial</>
                : (
                  <span className="relative flex items-center gap-1.5">
                    <Bell size={13} /> Inbox
                    {notifUnread > 0 && (
                      <span className="absolute -top-2 -right-3 bg-purple-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {notifUnread > 9 ? "9+" : notifUnread}
                      </span>
                    )}
                  </span>
                )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="text-brand-500 animate-spin" />
            </div>
          )}

          {!loading && tab === "history" && (
            <>
              {history.length === 0 ? (
                <div className="text-center py-16 text-[var(--text-3)] text-sm">
                  <Layers size={32} className="mx-auto mb-3 opacity-30" />
                  Nenhum carrossel salvo ainda.<br />
                  <span className="text-xs">Exporte um carrossel para salvar no histórico.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-2)] flex flex-col"
                    >
                      <div className="relative aspect-[4/5] bg-[var(--bg-3)]">
                        {item.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Layers size={24} className="text-[var(--text-3)]" />
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 px-2 py-1 text-[10px] text-[var(--text-2)]"
                          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
                          {item.slideCount} slide{item.slideCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="px-2.5 py-2 flex flex-col gap-1">
                        <p className="text-xs font-semibold text-[var(--text)] truncate">{item.title}</p>
                        <p className="text-[10px] text-[var(--text-3)]">{fmt(item.createdAt)}</p>
                        <a
                          href={item.coverUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium text-brand-500 border border-brand-500/30 hover:bg-brand-500/8 transition-colors"
                        >
                          <Download size={11} /> Baixar capa
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "instagram" && (
            <div className="flex flex-col items-center gap-5 max-w-sm mx-auto w-full py-6">
              {igAccount ? (
                <>
                  {/* Conectado */}
                  <div className="flex flex-col items-center gap-3 w-full">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
                      <Instagram size={28} color="white" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-[var(--text)] text-sm">@{igAccount.username}</p>
                      <p className="text-[11px] text-green-400 mt-0.5 flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                        Conta conectada
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      localStorage.removeItem("ig_account");
                      setIgAccount(null);
                      window.dispatchEvent(new CustomEvent("ig-disconnected"));
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} /> Desconectar Instagram
                  </button>
                </>
              ) : (
                <>
                  {/* Desconectado */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--bg-3)] border border-[var(--border-2)]">
                    <Instagram size={28} className="text-[var(--text-3)]" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-[var(--text)] text-sm">Nenhuma conta conectada</p>
                    <p className="text-[11px] text-[var(--text-3)] mt-1">Conecte seu Instagram para publicar diretamente.</p>
                  </div>

                  <a
                    href="/api/instagram/auth"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
                  >
                    <Instagram size={15} /> Conectar com Instagram
                  </a>

                  <p className="text-[10px] text-[var(--text-3)] text-center leading-relaxed">
                    Você será redirecionado para o Facebook para autorizar o acesso.
                  </p>
                </>
              )}
            </div>
          )}

          {tab === "tutorial" && (
            <div className="flex flex-col gap-4">

              {/* Ações principais */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { onClose(); onOpenTutorial?.(); }}
                  className="flex flex-col items-center gap-2.5 px-4 py-4 rounded-2xl border border-brand-500/25 bg-brand-500/8 hover:bg-brand-500/14 transition-colors text-center"
                >
                  <PlayCircle size={24} className="text-brand-400" />
                  <div>
                    <p className="text-xs font-bold text-[var(--text)]">Ver tutorial</p>
                    <p className="text-[10px] text-[var(--text-3)] mt-0.5">Tour interativo de 6 passos</p>
                  </div>
                </button>
                <button
                  onClick={() => setInboxOpen((v) => !v)}
                  className={`flex flex-col items-center gap-2.5 px-4 py-4 rounded-2xl border transition-colors text-center ${
                    inboxOpen ? "border-purple-500/40 bg-purple-500/10" : "border-[var(--border-2)] bg-[var(--bg-3)] hover:border-[var(--border-2)]"
                  }`}
                >
                  <span className="text-2xl">📬</span>
                  <div>
                    <p className="text-xs font-bold text-[var(--text)]">Caixa de entrada</p>
                    <p className="text-[10px] text-[var(--text-3)] mt-0.5">Vídeos de tutorial por tópico</p>
                  </div>
                </button>
              </div>

              {/* Caixa de entrada — tópicos */}
              {inboxOpen && (
                <div className="flex flex-col gap-2">
                  {/* Player ativo */}
                  {activeVideo && (
                    <div className="rounded-xl overflow-hidden bg-black border border-[var(--border)] mb-1">
                      <video src={activeVideo.url} controls autoPlay className="w-full" style={{ maxHeight: 260 }} />
                      <div className="px-3 py-2.5">
                        <p className="text-xs font-bold text-[var(--text)]">{activeVideo.title}</p>
                        {activeVideo.description && (
                          <p className="text-[10px] text-[var(--text-3)] mt-0.5 leading-relaxed">{activeVideo.description}</p>
                        )}
                        <button onClick={() => setActiveVideo(null)} className="text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)] mt-1 transition-colors">
                          Fechar player
                        </button>
                      </div>
                    </div>
                  )}

                  {loadingTopics ? (
                    <div className="flex justify-center py-8">
                      <Loader2 size={20} className="text-brand-500 animate-spin" />
                    </div>
                  ) : (
                    topics.map((topic) => (
                      <div key={topic.id} className="rounded-xl border border-[var(--border)] overflow-hidden">
                        <button
                          onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-3)] transition-colors text-left"
                        >
                          <span className="text-lg shrink-0">{topic.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[var(--text)] truncate">{topic.title}</p>
                            <p className="text-[10px] text-[var(--text-3)] truncate">{topic.videos.length === 0 ? "Em breve" : `${topic.videos.length} vídeo${topic.videos.length > 1 ? "s" : ""}`}</p>
                          </div>
                          <span className="text-[var(--text-3)] text-xs shrink-0">{expandedTopic === topic.id ? "▲" : "▼"}</span>
                        </button>

                        {expandedTopic === topic.id && (
                          <div className="border-t border-[var(--border)] px-4 py-3 flex flex-col gap-2 bg-[var(--bg)]">
                            {topic.videos.length === 0 ? (
                              <p className="text-[11px] text-[var(--text-3)] text-center py-3">
                                Nenhum vídeo publicado ainda para este tópico.
                              </p>
                            ) : (
                              topic.videos.map((video) => (
                                <button
                                  key={video.id}
                                  onClick={() => setActiveVideo(video)}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--bg-3)] border border-[var(--border)] hover:border-brand-500/30 transition-colors text-left w-full"
                                >
                                  <PlayCircle size={18} className="text-brand-400 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-[var(--text)] truncate">{video.title}</p>
                                    {video.description && (
                                      <p className="text-[10px] text-[var(--text-3)] truncate">{video.description}</p>
                                    )}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {!loading && tab === "images" && (
            <>
              {images.length === 0 ? (
                <div className="text-center py-16 text-[var(--text-3)] text-sm">
                  <ImageIcon size={32} className="mx-auto mb-3 opacity-30" />
                  Nenhuma imagem salva ainda.<br />
                  <span className="text-xs">As imagens exportadas aparecem aqui.</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {images.map((img) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-[3/4] bg-[var(--bg-3)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a
                          href={img.url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                          <Download size={14} className="text-white" />
                        </a>
                      </div>
                      <div className="absolute bottom-1 left-1 right-1 text-[9px] text-[var(--text-2)] truncate">
                        {fmt(img.savedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Inbox ── */}
          {tab === "inbox" && (
            <div className="flex flex-col gap-3">
              {notifLoading && notifications.length === 0 && (
                <div className="flex justify-center py-12">
                  <Loader2 size={20} className="text-brand-500 animate-spin" />
                </div>
              )}

              {!notifLoading && notifications.length === 0 && (
                <div className="text-center py-16">
                  <Bell size={30} className="mx-auto mb-3 text-[var(--text-3)]" />
                  <p className="text-sm text-[var(--text-3)]">Nenhuma notificação ainda.</p>
                  <p className="text-[11px] text-[var(--text-3)] mt-1">As respostas do admin e novos conteúdos aparecerão aqui.</p>
                </div>
              )}

              {notifications.map((n) => {
                const isApproved = n.type === "idea_approved";
                const isRejected = n.type === "idea_rejected";
                const isReply    = n.type === "feedback_reply";
                const isVideo    = n.type === "member_video";

                const iconColor = isApproved ? "#22c55e" : isRejected ? "#6b7280" : isReply ? "#4c6ef5" : "#a78bfa";
                const bgColor   = isApproved ? "rgba(34,197,94,0.08)" : isRejected ? "rgba(107,114,128,0.08)" : isReply ? "rgba(76,110,245,0.08)" : "rgba(167,139,250,0.08)";
                const borderColor = isApproved ? "rgba(34,197,94,0.2)" : isRejected ? "rgba(107,114,128,0.18)" : isReply ? "rgba(76,110,245,0.2)" : "rgba(167,139,250,0.2)";

                const Icon = isApproved ? CheckCircle2 : isRejected ? Lightbulb : isReply ? MessageSquare : Video;

                return (
                  <div key={n.id} className="rounded-xl border p-3.5 flex gap-3" style={{ background: bgColor, borderColor }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${iconColor}18` }}>
                      <Icon size={15} style={{ color: iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--text)] leading-snug">{n.title}</p>
                      <p className="text-[11px] text-[var(--text-2)] mt-1 leading-relaxed">{n.body}</p>
                      {n.originalText && (
                        <p className="text-[10px] text-[var(--text-3)] mt-1.5 italic border-l-2 border-[var(--border-2)] pl-2 leading-relaxed">
                          "{n.originalText}{n.originalText.length >= 120 ? "..." : ""}"
                        </p>
                      )}
                      {isVideo && (
                        <button
                          onClick={() => { setTab("tutorial"); setInboxOpen(true); }}
                          className="mt-2 text-[10px] font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          Ver na área de membros →
                        </button>
                      )}
                      <p className="text-[9px] text-[var(--text-3)] mt-1.5">
                        {new Date(n.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Aparência */}
        <div className="mx-4 mb-2 rounded-xl border border-[var(--border)] px-4 py-3 shrink-0 flex items-center justify-between" style={{ background: "var(--bg)" }}>
          <div className="flex items-center gap-2">
            {theme === "dark" ? <Moon size={13} className="text-brand-500" /> : <Sun size={13} className="text-yellow-400" />}
            <span className="text-xs font-semibold text-[var(--text)]">Aparência</span>
          </div>
          <div className="flex items-center gap-1 bg-[var(--bg-3)] rounded-lg p-0.5 border border-[var(--border-2)]">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${theme === "light" ? "bg-white text-gray-900 shadow-sm" : "text-[var(--text-3)] hover:text-[var(--text)]"}`}
            >
              <Sun size={11} /> Claro
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${theme === "dark" ? "bg-[#333] text-white shadow-sm" : "text-[var(--text-3)] hover:text-[var(--text)]"}`}
            >
              <Moon size={11} /> Escuro
            </button>
          </div>
        </div>

        <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} />

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] shrink-0 flex items-center gap-3">
          <p className="text-[10px] text-[var(--text-3)] flex-1">
            {tab === "history" ? `${history.length}/30 carrosséis` : tab === "images" ? `${images.length}/100 imagens` : ""}
          </p>
          <button
            onClick={() => setShowFeedback(true)}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors border border-purple-500/20 hover:border-purple-500/40 px-2.5 py-1.5 rounded-lg"
          >
            <MessageSquare size={13} /> Feedback
          </button>
          <button onClick={load} className="flex items-center gap-1 text-xs text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
            <RefreshCw size={12} />
          </button>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-400 font-semibold transition-colors border border-brand-500/30 hover:border-brand-500/60 px-2.5 py-1.5 rounded-lg"
            >
              <LayoutDashboard size={13} /> Dashboard
            </Link>
          )}
          <button
            onClick={() => {
              localStorage.removeItem("ig_account");
              signOut();
            }}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors border border-red-500/20 hover:border-red-500/40 px-2.5 py-1.5 rounded-lg"
          >
            <LogOut size={13} /> Sair
          </button>
        </div>
      </div>
    </div>
  );
}
