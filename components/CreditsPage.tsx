"use client";

import { useEffect, useState } from "react";
import { Zap, ArrowLeft, Loader2, Crown, ExternalLink, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import AppLogo from "@/components/AppLogo";

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
  pro:      { label: "Pro",      color: "#4c6ef5", bg: "rgba(76,110,245,0.1)"  },
  business: { label: "Business", color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
};

const KIRVANO_PLANS = [
  {
    id: "basic",
    label: "Basic",
    credits: 30,
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.08)",
    border: "rgba(96,165,250,0.2)",
    url: "https://pay.kirvano.com/d3f6da72-a6be-4d54-8268-20c725e4ab5b",
    features: ["30 créditos/mês", "Imagens por IA", "Todos os layouts", "Suporte padrão"],
    highlight: false,
  },
  {
    id: "pro",
    label: "Pro",
    credits: 45,
    color: "#4c6ef5",
    bg: "rgba(76,110,245,0.08)",
    border: "rgba(76,110,245,0.35)",
    url: "https://pay.kirvano.com/e5bdb60b-3d05-4338-bbb7-59e17b1b636f",
    features: ["45 créditos/mês", "Imagen 4 (Google)", "Edição com IA", "Suporte prioritário"],
    highlight: true,
  },
  {
    id: "business",
    label: "Business",
    credits: 100,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    url: "https://pay.kirvano.com/2aca1343-9b14-48d4-aedc-8f532b509abd",
    features: ["100 créditos/mês", "Todos os modelos", "Acesso prioritário", "Suporte VIP"],
    highlight: false,
  },
] as const;

export default function CreditsPage() {
  const [info, setInfo]       = useState<CreditsInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setInfo(d); })
      .finally(() => setLoading(false));
  }, []);

  const planStyle = PLAN_LABELS[info?.plan ?? "free"] ?? PLAN_LABELS.free;
  const pct = info ? Math.min(100, (info.used / info.limit) * 100) : 0;
  const barColor = pct > 85 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#4c6ef5";

  return (
    <div className="min-h-screen text-white" style={{ background: "#060606" }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-white/5" style={{ background: "#0d0d0d" }}>
        <Link href="/editor" className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <AppLogo variant="dark" size={28} textClassName="font-black text-sm tracking-tight text-white" />
        <span className="text-gray-600">·</span>
        <span className="text-sm text-gray-400 font-medium">Planos & Créditos</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">

        {/* Credits overview */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
        ) : info && (
          <div className="rounded-2xl p-6 space-y-5" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-1">Plano atual</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
                  style={{ color: planStyle.color, background: planStyle.bg, border: `1px solid ${planStyle.color}33` }}>
                  <Crown size={12} /> {planStyle.label}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-1">Disponível</p>
                <p className="text-3xl font-black" style={{ color: "#4c6ef5" }}>{info.total}</p>
                <p className="text-[11px] text-gray-600">créditos</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">Uso mensal <span className="text-gray-600">(reset todo mês)</span></p>
                <p className="text-xs font-semibold" style={{ color: barColor }}>{info.used} / {info.limit}</p>
              </div>
              <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: barColor }} />
              </div>
              <p className="text-[11px] text-gray-600 mt-1.5">{info.remaining} créditos restantes este mês</p>
            </div>

            {info.bonus > 0 && (
              <div className="flex items-center justify-between rounded-xl px-4 py-3 border border-yellow-500/20 bg-yellow-500/5">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-yellow-400" />
                  <p className="text-xs font-semibold text-yellow-300">Créditos bônus</p>
                </div>
                <p className="text-xl font-black text-yellow-400">+{info.bonus}</p>
              </div>
            )}
          </div>
        )}

        {/* Plans */}
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles size={18} className="text-brand-500" /> Escolha seu plano
            </h2>
            <p className="text-xs text-gray-500 mt-1">Pagamento processado com segurança pelo Kirvano. Ativação automática após confirmação.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {KIRVANO_PLANS.map((plan) => {
              const isCurrent = info?.plan === plan.id;
              return (
                <div key={plan.id}
                  className="relative rounded-2xl p-5 flex flex-col gap-4"
                  style={{
                    background: plan.bg,
                    border: `1px solid ${plan.highlight ? plan.border : "#1e1e1e"}`,
                  }}>
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full"
                      style={{ background: plan.color, color: "#fff" }}>
                      MAIS POPULAR
                    </span>
                  )}

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: plan.color }}>
                      {plan.label}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-4xl font-black text-white">{plan.credits}</p>
                      <p className="text-sm text-gray-500">créditos/mês</p>
                    </div>
                  </div>

                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                        <Check size={12} style={{ color: plan.color }} className="shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border"
                      style={{ borderColor: plan.color, color: plan.color }}>
                      <Check size={14} /> Plano atual
                    </div>
                  ) : (
                    <a
                      href={plan.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                      style={{ background: plan.color, color: plan.highlight ? "#fff" : "#000" }}>
                      <ExternalLink size={14} /> Assinar agora
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-600 text-center mt-5">
            Após o pagamento, seu plano é ativado automaticamente em até 1 minuto.
            Dúvidas? Entre em contato pelo Instagram.
          </p>
        </div>

      </main>
    </div>
  );
}
