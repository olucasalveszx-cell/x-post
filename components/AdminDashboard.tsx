"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, LogOut, Users, Loader2, RefreshCw,
  Activity, TrendingUp, Image, Layers, DollarSign, Crown,
} from "lucide-react";

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

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());

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

        <div className="flex items-center gap-4">
          <span className="text-[10px] text-gray-600">
            Atualizado {lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <LogOut size={13} /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {loading && !stats && (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="text-purple-400 animate-spin" />
          </div>
        )}

        {error && (
          <p className="text-center text-sm text-red-400 py-10">{error}</p>
        )}

        {stats && (
          <>
            {/* KPIs — linha 1 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard
                label="Usuários"
                value={stats.totalUsers}
                icon={Users}
                accent="#a855f7"
                sub="total cadastrados"
              />
              <KpiCard
                label="Online agora"
                value={stats.onlineNow}
                icon={Activity}
                accent="#22c55e"
                sub="últimos 2 min"
              />
              <KpiCard
                label="Ativos hoje"
                value={stats.activeToday}
                icon={TrendingUp}
                accent="#3b82f6"
                sub="usuários únicos"
              />
              <KpiCard
                label="Pro"
                value={stats.proCount}
                icon={Crown}
                accent="#f59e0b"
                sub="assinaturas ativas"
              />
              <KpiCard
                label="MRR"
                value={`R$ ${parseFloat(stats.mrr).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
                icon={DollarSign}
                accent="#10b981"
                sub="receita mensal"
              />
              <KpiCard
                label="Carrosséis hoje"
                value={stats.carouselsToday}
                icon={Layers}
                accent="#ec4899"
                sub={`${stats.imagesToday} imagens geradas`}
              />
            </div>

            {/* Live indicator */}
            {stats.onlineNow > 0 && (
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-2"
                style={{ background: "#0d1f0d", border: "1px solid #14532d" }}
              >
                <OnlineDot />
                <span className="text-sm text-green-400 font-semibold">
                  {stats.onlineNow} {stats.onlineNow === 1 ? "usuário" : "usuários"} online agora
                </span>
                <span className="text-xs text-green-700 ml-1">— no editor</span>
              </div>
            )}

            {/* Gráfico semanal */}
            <WeekChart data={stats.weekData} />

            {/* Tabela usuários recentes */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
                <p className="font-bold text-sm">Últimos cadastros</p>
                <span className="text-[10px] text-gray-600 uppercase tracking-wider">
                  {stats.recentUsers.length} de {stats.totalUsers}
                </span>
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
                    <div
                      key={i}
                      className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="col-span-4 flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                        >
                          {u.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm text-gray-200 truncate">{u.name || "—"}</span>
                      </div>
                      <div className="col-span-5 text-xs text-gray-500 truncate">{u.email}</div>
                      <div className="col-span-3 text-right text-xs text-gray-600">
                        {u.createdAt ? fmt(u.createdAt) : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
