"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Zap, ArrowLeft, Loader2, CheckCircle, Crown, Sparkles, ShoppingCart,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { CREDIT_PACKS, type CreditPackId } from "@/lib/credits";

interface CreditsInfo {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
  bonus: number;
  total: number;
}

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  free:     { label: "Free",     color: "#9ca3af", bg: "rgba(156,163,175,0.1)" },
  basic:    { label: "Basic",    color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
  pro:      { label: "Pro",      color: "#a855f7", bg: "rgba(168,85,247,0.1)"  },
  business: { label: "Business", color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
};

const PACK_STYLES = [
  { accent: "#60a5fa", bg: "rgba(96,165,250,0.08)",   highlight: false },
  { accent: "#a855f7", bg: "rgba(168,85,247,0.08)",   highlight: false },
  { accent: "#10b981", bg: "rgba(16,185,129,0.08)",   highlight: true  },
  { accent: "#f59e0b", bg: "rgba(245,158,11,0.08)",   highlight: false },
];

export default function CreditsPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [info, setInfo]       = useState<CreditsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying]   = useState<CreditPackId | null>(null);
  const [success, setSuccess] = useState(false);
  const [successCredits, setSuccessCredits] = useState(0);
  const [error, setError]     = useState("");

  const fetchInfo = async () => {
    setLoading(true);
    const res = await fetch("/api/credits");
    if (res.ok) setInfo(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchInfo(); }, []);

  /* Fulfill after Stripe success redirect */
  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId || params.get("success") !== "1") return;

    fetch("/api/credits/fulfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setSuccessCredits(d.credits ?? 0);
          setSuccess(true);
          fetchInfo();
          window.history.replaceState({}, "", "/credits");
        }
      })
      .catch(() => {});
  }, [params]);

  const handleBuy = async (packId: CreditPackId) => {
    setBuying(packId);
    setError("");
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro");
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
      setBuying(null);
    }
  };

  const planStyle = PLAN_LABELS[info?.plan ?? "free"] ?? PLAN_LABELS.free;
  const pct = info ? Math.min(100, (info.used / info.limit) * 100) : 0;
  const barColor = pct > 85 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#a855f7";

  return (
    <div className="min-h-screen text-white" style={{ background: "#060606" }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-white/5" style={{ background: "#0d0d0d" }}>
        <Link href="/editor" className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
            X
          </div>
          <span className="font-black text-sm tracking-tight">xpost</span>
        </div>
        <span className="text-gray-600">·</span>
        <span className="text-sm text-gray-400 font-medium">Créditos</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Success banner */}
        {success && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3.5 border border-green-500/30 bg-green-500/10">
            <CheckCircle size={18} className="text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-300">Compra confirmada!</p>
              {successCredits > 0 && (
                <p className="text-xs text-green-600 mt-0.5">+{successCredits} créditos adicionados à sua conta</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3.5 border border-red-500/30 bg-red-500/10">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Credits overview */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-purple-400" /></div>
        ) : info && (
          <div className="rounded-2xl p-6 space-y-6" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
            {/* Plan badge */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-1">Plano atual</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
                  style={{ color: planStyle.color, background: planStyle.bg, border: `1px solid ${planStyle.color}33` }}>
                  <Crown size={12} /> {planStyle.label}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-1">Total disponível</p>
                <p className="text-3xl font-black" style={{ color: "#a855f7" }}>{info.total}</p>
                <p className="text-[11px] text-gray-600">créditos</p>
              </div>
            </div>

            {/* Monthly bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">Créditos do plano <span className="text-gray-600">(reset mensal)</span></p>
                <p className="text-xs font-semibold" style={{ color: barColor }}>{info.used} / {info.limit} usados</p>
              </div>
              <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: barColor }} />
              </div>
              <p className="text-[11px] text-gray-600 mt-1.5">{info.remaining} restantes este mês</p>
            </div>

            {/* Bonus credits */}
            {info.bonus > 0 && (
              <div className="flex items-center justify-between rounded-xl px-4 py-3 border border-yellow-500/20 bg-yellow-500/5">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-yellow-400" />
                  <div>
                    <p className="text-xs font-semibold text-yellow-300">Créditos extras comprados</p>
                    <p className="text-[11px] text-yellow-700">Usados após os do plano esgotarem</p>
                  </div>
                </div>
                <p className="text-xl font-black text-yellow-400">+{info.bonus}</p>
              </div>
            )}
          </div>
        )}

        {/* Buy more */}
        <div>
          <div className="mb-5">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShoppingCart size={18} className="text-purple-400" /> Comprar mais créditos
            </h2>
            <p className="text-xs text-gray-500 mt-1">Créditos extras não expiram e são usados quando o plano mensal esgota.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CREDIT_PACKS.map((pack, i) => {
              const style = PACK_STYLES[i];
              const isBuying = buying === pack.id;
              return (
                <div key={pack.id}
                  className="relative rounded-2xl p-5 flex flex-col gap-4 border transition-all"
                  style={{
                    background: style.bg,
                    border: style.highlight ? `1px solid ${style.accent}44` : "1px solid #1e1e1e",
                  }}>
                  {style.highlight && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{ background: style.accent, color: "#000" }}>
                      POPULAR
                    </span>
                  )}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: style.accent }}>
                      {pack.label}
                    </p>
                    <p className="text-4xl font-black text-white">{pack.credits}</p>
                    <p className="text-xs text-gray-500">créditos</p>
                  </div>
                  <button
                    onClick={() => handleBuy(pack.id as CreditPackId)}
                    disabled={!!buying}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    style={{ background: style.accent, color: "#000" }}>
                    {isBuying ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {isBuying ? "Abrindo..." : "Comprar"}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-600 text-center mt-4">
            Os preços são definidos na sua dashboard do Stripe. Configure as env vars:{" "}
            <code className="text-gray-500">STRIPE_PRICE_CREDITS_10 / 25 / 50 / 100</code>
          </p>
        </div>

      </main>
    </div>
  );
}
