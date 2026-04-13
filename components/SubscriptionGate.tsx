"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Lock, ArrowRight, Check } from "lucide-react";
import LoginModal from "@/components/LoginModal";

const PLANS = [
  { key: "basic",    label: "Básico",   price: "29,90", period: "mês" },
  { key: "pro",      label: "Pro",      price: "61,90", period: "mês", popular: true },
  { key: "business", label: "Business", price: "99,90", period: "mês", badge: "Completo" },
];

export default function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    const run = async () => {
      // 1. Token Kirvano
      const kirvanoToken = localStorage.getItem("xpz_activation_token");
      if (kirvanoToken) { setAuthorized(true); setChecking(false); return; }

      // 2. Stripe customer ID local
      const customerId = localStorage.getItem("xpz_customer_id");
      if (customerId) {
        const res = await fetch(`/api/stripe/verify?customer_id=${customerId}`).catch(() => null);
        const data = await res?.json().catch(() => null);
        if (data?.active) { setAuthorized(true); setChecking(false); return; }
      }

      // 3. Sessão Google → verifica por email
      if (session?.user?.email) {
        const res = await fetch(`/api/stripe/verify?email=${encodeURIComponent(session.user.email)}`).catch(() => null);
        const data = await res?.json().catch(() => null);
        if (data?.active) { setAuthorized(true); setChecking(false); return; }
      }

      setAuthorized(false);
      setChecking(false);
    };

    run();
  }, [session, status]);

  const goToCheckout = async (plan: string) => {
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Erro ao abrir checkout: " + (data.error ?? "tente novamente"));
    } catch {
      alert("Erro de conexão.");
    } finally {
      setLoadingPlan(null);
    }
  };

  // Carregando verificação
  if (checking || status === "loading") {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="text-purple-400 animate-spin" />
          <p className="text-sm text-gray-500">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Autorizado → mostra editor normalmente
  if (authorized) return <>{children}</>;

  // Não autorizado → gate de compra
  return (
    <div className="min-h-screen bg-[#060606] text-white flex flex-col">
      {/* Header mínimo */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
          ← Voltar
        </button>
        <span className="font-black text-sm tracking-tight">XPost Zone</span>
        {!session?.user ? (
          <button onClick={() => setLoginOpen(true)} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
            Já tenho conta
          </button>
        ) : (
          <span className="text-xs text-gray-600">{session.user.email}</span>
        )}
      </header>

      {/* Conteúdo do gate */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        {/* Ícone */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(168,85,247,0.2))", border: "1px solid rgba(168,85,247,0.3)" }}>
          <Lock size={28} className="text-purple-400" />
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-center mb-3">
          Escolha seu plano<br />
          <span style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            para acessar o editor
          </span>
        </h1>
        <p className="text-gray-500 text-center mb-12 max-w-md">
          Acesso completo a todos os recursos. IA que pesquisa, escreve e publica por você.
        </p>

        {/* Cards de plano */}
        <div className="grid sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`rounded-2xl p-5 flex flex-col gap-4 relative ${plan.popular ? "border-2 border-purple-500" : "border border-white/10"}`}
              style={plan.popular ? { background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(168,85,247,0.08))" } : { background: "rgba(255,255,255,0.03)" }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}>
                  Mais popular
                </div>
              )}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-green-600 text-white">
                  {plan.badge}
                </div>
              )}

              <p className="text-xs font-bold uppercase tracking-widest text-purple-400">{plan.label}</p>

              <div>
                <p className="text-3xl font-black">R${plan.price}</p>
                <p className="text-xs text-gray-500">por {plan.period}</p>
              </div>

              <button
                onClick={() => goToCheckout(plan.key)}
                disabled={loadingPlan !== null}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 disabled:opacity-40 flex items-center justify-center gap-1.5"
                style={plan.popular
                  ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
                  : { background: "rgba(255,255,255,0.07)", color: "white" }}
              >
                {loadingPlan === plan.key ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <><Sparkles size={14} /> Assinar</>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm text-gray-600">
          {["Cancele quando quiser", "Sem fidelidade", "Suporte dedicado"].map((f) => (
            <span key={f} className="flex items-center gap-1.5">
              <Check size={12} className="text-purple-500" /> {f}
            </span>
          ))}
        </div>

        {!session?.user && (
          <p className="mt-6 text-xs text-gray-600">
            Já assinou?{" "}
            <button onClick={() => setLoginOpen(true)} className="text-purple-400 hover:text-purple-300 underline transition-colors">
              Entrar
            </button>
          </p>
        )}

        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </div>
    </div>
  );
}
