"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, LogOut, Users, Loader2, RefreshCw,
  Activity, TrendingUp, Image, Layers, DollarSign, Crown, ArrowLeft,
  LayoutGrid, ImageOff, Download, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import type { AdminDraftMeta } from "@/app/api/admin/carousels/route";
import type { AdminImageEntry } from "@/app/api/admin/images/route";

interface Stats {
  totalUsers: number;
  onlineNow: number;
  activeToday: number;
  proCount: number;
  mrr: string;
  carouselsToday: number;
  imagesToday: number;
  weekData: { date: string; count: number }[];
  recentUsers: { name: string; email: string; createdAt: string; plan?: string }[];
}

function KpiCard({
  label, value, icon: Icon, accent, sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-2xl px-5 py-4 flex flex-col gap-3"
      style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</p>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}22` }}
        >
          <Icon size={13} style={{ color: accent }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-black tracking-tight">{value}</p>
        {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function WeekChart({ data }: { data: Stats["weekData"] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
    >
      <p className="text-xs font-bold mb-4 text-gray-300">Carrosséis gerados — últimos 7 dias</p>
      <div className="flex items-end gap-2 h-24">
        {data.map((d, i) => {
          const pct = (d.count / max) * 100;
          const date = new Date(d.date + "T12:00:00Z");
          const dayLabel = dayLabels[date.getUTCDay()];
          const isToday = i === data.length - 1;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-gray-600">{d.count || ""}</span>
              <div className="w-full rounded-t-md relative" style={{ height: "64px" }}>
                <div
                  className="absolute bottom-0 w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${Math.max(pct, d.count > 0 ? 4 : 0)}%`,
                    background: isToday
                      ? "linear-gradient(to top, #a855f7, #ec4899)"
                      : "#1e1e1e",
                    border: isToday ? "none" : "1px solid #2a2a2a",
                  }}
                />
              </div>
              <span
                className="text-[9px] font-medium"
                style={{ color: isToday ? "#a855f7" : "#4b5563" }}
              >
                {dayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OnlineDot() {
  return (
    <span className="relative inline-flex h-2 w-2 mr-1.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

type Tab = "overview" | "carousels" | "images";

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  /* ── Carrosséis ── */
  const [drafts, setDrafts] = useState<AdminDraftMeta[]>([]);
  const [draftsTotal, setDraftsTotal] = useState(0);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState("");

  /* ── Imagens ── */
  const [images, setImages] = useState<AdminImageEntry[]>([]);
  const [imagesTotal, setImagesTotal] = useState(0);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 401) { router.push("/admin/login"); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar stats");
      setStats(data);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30_000);
    return () => clearInterval(id);
  }, [fetchStats]);

  const fetchCarousels = useCallback(async () => {
    setDraftsLoading(true); setDraftsError("");
    try {
      const res = await fetch("/api/admin/carousels");
      if (res.status === 401) { router.push("/admin/login"); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      setDrafts(data.drafts);
      setDraftsTotal(data.total);
    } catch (e: any) {
      setDraftsError(e.message);
    } finally {
      setDraftsLoading(false);
    }
  }, [router]);

  const fetchImages = useCallback(async () => {
    setImagesLoading(true); setImagesError("");
    try {
      const res = await fetch("/api/admin/images");
      if (res.status === 401) { router.push("/admin/login"); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      setImages(data.images);
      setImagesTotal(data.total);
    } catch (e: any) {
      setImagesError(e.message);
    } finally {
      setImagesLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (tab === "carousels" && drafts.length === 0) fetchCarousels();
    if (tab === "images" && images.length === 0) fetchImages();
  }, [tab, drafts.length, images.length, fetchCarousels, fetchImages]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen text-white" style={{ background: "#060606" }}>
      {/* Topbar */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 z-10"
        style={{ background: "#0d0d0d" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
          >
            <Sparkles size={15} color="white" />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight">XPost Zone</p>
            <p className="text-[10px] text-purple-400">Admin Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-600 hidden sm:block">
            {lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <Link
            href="/editor"
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors border border-purple-500/30 hover:border-purple-500/60 px-2.5 py-1.5 rounded-lg"
          >
            <ArrowLeft size={13} /> Editor
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <LogOut size={13} /> Sair
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/5 px-6" style={{ background: "#0d0d0d" }}>
        <div className="flex gap-1 max-w-5xl mx-auto">
          {(["overview", "carousels", "images"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-purple-500 text-white"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "overview" ? <Activity size={12} /> : t === "carousels" ? <LayoutGrid size={12} /> : <Image size={12} />}
              {t === "overview" ? "Visão geral" : t === "carousels" ? "Carrosséis" : "Imagens"}
              {t === "carousels" && draftsTotal > 0 && (
                <span className="ml-1 bg-purple-500/20 text-purple-300 text-[10px] px-1.5 py-0.5 rounded-full">
                  {draftsTotal}
                </span>
              )}
              {t === "images" && imagesTotal > 0 && (
                <span className="ml-1 bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full">
                  {imagesTotal}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* ═══ ABA OVERVIEW ═══ */}
        {tab === "overview" && (
          <>
            {loading && !stats && (
              <div className="flex justify-center py-20">
                <Loader2 size={28} className="text-purple-400 animate-spin" />
              </div>
            )}
            {error && <p className="text-center text-sm text-red-400 py-10">{error}</p>}

            {stats && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <KpiCard label="Usuários" value={stats.totalUsers} icon={Users} accent="#a855f7" sub="total cadastrados" />
                  <KpiCard label="Online agora" value={stats.onlineNow} icon={Activity} accent="#22c55e" sub="últimos 2 min" />
                  <KpiCard label="Ativos hoje" value={stats.activeToday} icon={TrendingUp} accent="#3b82f6" sub="usuários únicos" />
                  <KpiCard label="Pro" value={stats.proCount} icon={Crown} accent="#f59e0b" sub="assinaturas ativas" />
                  <KpiCard label="MRR" value={`R$ ${parseFloat(stats.mrr).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} icon={DollarSign} accent="#10b981" sub="receita mensal" />
                  <KpiCard label="Carrosséis hoje" value={stats.carouselsToday} icon={Layers} accent="#ec4899" sub={`${stats.imagesToday} imagens geradas`} />
                </div>

                {stats.onlineNow > 0 && (
                  <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: "#0d1f0d", border: "1px solid #14532d" }}>
                    <OnlineDot />
                    <span className="text-sm text-green-400 font-semibold">
                      {stats.onlineNow} {stats.onlineNow === 1 ? "usuário" : "usuários"} online agora
                    </span>
                    <span className="text-xs text-green-700 ml-1">— no editor</span>
                  </div>
                )}

                <WeekChart data={stats.weekData} />

                <div className="rounded-2xl overflow-hidden" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
                    <p className="font-bold text-sm">Últimos cadastros</p>
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">{stats.recentUsers.length} de {stats.totalUsers}</span>
                  </div>
                  {stats.recentUsers.length === 0 ? (
                    <p className="text-center text-sm text-gray-600 py-10">Nenhum usuário cadastrado ainda.</p>
                  ) : (
                    <div className="divide-y divide-[#1a1a1a]">
                      <div className="grid grid-cols-12 px-5 py-2 text-[10px] text-gray-600 uppercase tracking-wider">
                        <span className="col-span-4">Nome</span>
                        <span className="col-span-5">E-mail</span>
                        <span className="col-span-3 text-right">Cadastro</span>
                      </div>
                      {stats.recentUsers.map((u, i) => (
                        <div key={i} className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors">
                          <div className="col-span-4 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                              {u.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <span className="text-sm text-gray-200 truncate">{u.name || "—"}</span>
                          </div>
                          <div className="col-span-5 text-xs text-gray-500 truncate">{u.email}</div>
                          <div className="col-span-3 text-right text-xs text-gray-600">{u.createdAt ? fmt(u.createdAt) : "—"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ═══ ABA IMAGENS ═══ */}
        {tab === "images" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Banco de imagens geradas</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{imagesTotal} imagens salvas (últimas 300)</p>
              </div>
              <button onClick={fetchImages} disabled={imagesLoading}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40">
                <RefreshCw size={12} className={imagesLoading ? "animate-spin" : ""} /> Atualizar
              </button>
            </div>

            {imagesLoading && images.length === 0 && (
              <div className="flex justify-center py-20">
                <Loader2 size={28} className="text-purple-400 animate-spin" />
              </div>
            )}

            {imagesError && <p className="text-center text-sm text-red-400 py-10">{imagesError}</p>}

            {!imagesLoading && images.length === 0 && !imagesError && (
              <div className="text-center py-16 text-gray-600 text-sm">
                <Image size={32} className="mx-auto mb-3 opacity-30" />
                Nenhuma imagem salva ainda.<br />
                <span className="text-xs">As imagens são salvas automaticamente ao serem geradas.</span>
              </div>
            )}

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden aspect-[3/4] bg-[#111] border border-[#1e1e1e]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      <a href={img.url} target="_blank" rel="noreferrer"
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <ExternalLink size={13} className="text-white" />
                      </a>
                      <a href={img.url} download target="_blank" rel="noreferrer"
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <Download size={13} className="text-white" />
                      </a>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 p-1.5 text-[8px] text-gray-400 truncate"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)" }}>
                      <span className="text-blue-400">{img.source}</span> · {img.email !== "anon" ? img.email.split("@")[0] : "anon"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ ABA CARROSSÉIS ═══ */}
        {tab === "carousels" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Todos os carrosséis salvos</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{draftsTotal} rascunhos no total</p>
              </div>
              <button onClick={fetchCarousels} disabled={draftsLoading}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40">
                <RefreshCw size={12} className={draftsLoading ? "animate-spin" : ""} /> Atualizar
              </button>
            </div>

            {draftsLoading && drafts.length === 0 && (
              <div className="flex justify-center py-20">
                <Loader2 size={28} className="text-purple-400 animate-spin" />
              </div>
            )}

            {draftsError && <p className="text-center text-sm text-red-400 py-10">{draftsError}</p>}

            {!draftsLoading && drafts.length === 0 && !draftsError && (
              <p className="text-center text-sm text-gray-600 py-16">Nenhum carrossel salvo ainda.</p>
            )}

            {drafts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {drafts.map((d) => (
                  <div key={`${d.email}-${d.id}`}
                    className="rounded-xl overflow-hidden border border-[#1e1e1e] hover:border-purple-500/40 transition-colors group"
                    style={{ background: "#0d0d0d" }}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square bg-[#111] flex items-center justify-center overflow-hidden">
                      {d.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.thumbnail} alt={d.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <ImageOff size={24} className="text-gray-700" />
                      )}
                      {/* Slide count badge */}
                      <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        {d.slideCount} slides
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-200 truncate">{d.name || "Sem nome"}</p>
                      <p className="text-[10px] text-purple-400 truncate mt-0.5">{d.email}</p>
                      <p className="text-[10px] text-gray-600 mt-1">{fmt(d.updatedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
