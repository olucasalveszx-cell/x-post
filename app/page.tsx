"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Instagram, Sparkles, Zap, ArrowRight, Check, X,
  Star, Clock, Calendar, Crown, ChevronDown, Loader2,
} from "lucide-react";
import MarqueeImages from "@/components/MarqueeImages";

const PLANS = [
  {
    key: "weekly",
    label: "Semanal",
    price: "19,93",
    period: "por semana",
    monthly: "≈ R$86/mês",
    highlight: false,
    badge: null as string | null,
    features: [
      "Carrosséis ilimitados com IA",
      "Imagens geradas por IA",
      "Publicação no Instagram",
      "Pesquisa web em tempo real",
    ],
  },
  {
    key: "monthly",
    label: "Mensal",
    price: "39,97",
    period: "por mês",
    monthly: null as string | null,
    highlight: true,
    badge: "Mais popular" as string | null,
    features: [
      "Carrosséis ilimitados com IA",
      "Imagens geradas por IA",
      "Publicação no Instagram",
      "Pesquisa web em tempo real",
      "Assistente IA de conteúdo",
    ],
  },
  {
    key: "annual",
    label: "Anual",
    price: "412,78",
    period: "por ano",
    monthly: "≈ R$34,40/mês" as string | null,
    highlight: false,
    badge: "Economize 14%" as string | null,
    features: [
      "Carrosséis ilimitados com IA",
      "Imagens geradas por IA",
      "Publicação no Instagram",
      "Pesquisa web em tempo real",
      "Assistente IA de conteúdo",
      "Suporte prioritário",
    ],
  },
];

const FAQS = [
  { q: "Preciso instalar alguma coisa?", a: "Não. XPost Zone é 100% online. Funciona direto no browser, sem downloads." },
  { q: "Consigo publicar direto no Instagram?", a: "Sim. Conecte sua conta Business do Instagram e publique carrosséis com um clique." },
  { q: "As imagens são geradas por IA?", a: "Sim. Usamos modelos FLUX para gerar imagens cinematográficas únicas para cada slide." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Sem multa, sem burocracia. Cancele a qualquer momento pelo painel do cliente." },
  { q: "Funciona para qualquer nicho?", a: "Funciona para qualquer tema. A IA pesquisa na web e adapta ao seu nicho automaticamente." },
];

export default function LandingPage() {
  const pricingRef = useRef<HTMLDivElement>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollToPricing = () =>
    pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

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
      else alert("Erro: " + (data.error ?? "tente novamente"));
    } catch {
      alert("Erro de conexão. Tente novamente.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-5 md:px-10 py-4 border-b border-white/5 bg-[#050505]/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}>
            <Instagram size={16} color="white" />
          </div>
          <span className="font-black text-base tracking-tight">XPost Zone</span>
        </div>
        <button
          onClick={scrollToPricing}
          className="px-5 py-2 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
        >
          Ver planos
        </button>
      </header>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-14 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%,rgba(168,85,247,0.15) 0%,transparent 70%)" }}
        />
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-semibold mb-6 tracking-wide">
          <Zap size={11} /> IA que pesquisa, escreve e publica por você
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight max-w-4xl">
          Crie carrosséis{" "}
          <span style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            virais
          </span>{" "}
          no Instagram<br className="hidden md:block" /> em segundos
        </h1>
        <p className="mt-6 text-gray-400 text-lg md:text-xl max-w-2xl leading-relaxed">
          IA que pesquisa na web, escreve o texto e gera as imagens.
          Pronto para publicar direto no Instagram — sem Canva, sem ChatGPT avulso.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
          <button
            onClick={scrollToPricing}
            className="flex items-center gap-2.5 px-8 py-4 rounded-full font-bold text-base transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow: "0 0 40px rgba(168,85,247,0.3)" }}
          >
            <Sparkles size={18} />
            Quero criar carrosséis virais
            <ArrowRight size={18} />
          </button>
          <span className="text-xs text-gray-600">A partir de R$19,93/semana</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-gray-500">
          {["IA gera o conteúdo", "Imagens cinematográficas", "Publica no Instagram", "Pesquisa na web"].map((f) => (
            <span key={f} className="flex items-center gap-1.5">
              <Check size={13} className="text-purple-400" /> {f}
            </span>
          ))}
        </div>
      </section>

      {/* ── Marquee ── */}
      <section className="w-full py-14 relative overflow-hidden">
        <div className="text-center mb-8 px-6">
          <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-2">Resultados reais</p>
          <h2 className="text-2xl md:text-3xl font-bold">
            O que você vai criar <span className="text-purple-400">com XPost Zone</span>
          </h2>
        </div>
        <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />
        <MarqueeImages />
        <div className="flex justify-center mt-8">
          <button
            onClick={scrollToPricing}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition-colors"
          >
            <ArrowRight size={15} /> Quero começar agora
          </button>
        </div>
      </section>

      {/* ── Comparação A vs B ── */}
      <section className="px-6 py-16 max-w-5xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black leading-tight max-w-2xl mx-auto">
            Daqui a 6 meses, seu Instagram vai estar{" "}
            <span style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              vendendo todos os dias
            </span>{" "}
            ou vai continuar como está?
          </h2>
          <p className="mt-4 text-gray-500">A diferença entre esses dois cenários começa com uma decisão simples.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {/* Cenário A */}
          <div className="rounded-2xl border border-white/10 p-7" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                <X size={20} className="text-red-400" />
              </div>
              <div>
                <p className="font-bold text-white">Continuar como está</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Cenário A</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-5">Continuar gastando horas no Canva e no ChatGPT para criar posts que ninguém vê.</p>
            <ul className="space-y-3">
              {["Sem alcance e sem novos seguidores", "Posts inconsistentes sem estratégia", "Sem previsibilidade de vendas", "Vendo concorrentes crescerem enquanto você trava", "Horas perdidas toda semana"].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-gray-500">
                  <X size={14} className="text-red-500 flex-shrink-0" /> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Cenário B */}
          <div className="rounded-2xl border-2 border-purple-500/60 p-7 relative" style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(236,72,153,0.06))" }}>
            <div className="absolute -top-3.5 right-5 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}>
              <Star size={10} /> Sua melhor escolha
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.25)" }}>
                <Check size={20} className="text-purple-300" />
              </div>
              <div>
                <p className="font-bold text-white">Ativar o XPost Zone</p>
                <p className="text-xs text-purple-400 uppercase tracking-wide">Cenário B</p>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-5">Transforme seu Instagram em uma máquina de conteúdo com carrosséis virais criados por IA em segundos.</p>
            <ul className="space-y-3">
              {["Conteúdo profissional todos os dias", "Mais alcance e engajamento garantido", "Mais seguidores qualificados no seu nicho", "Mais vendas no automático", "Horas economizadas toda semana"].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-gray-200">
                  <Check size={14} className="text-purple-400 flex-shrink-0" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center mt-10 gap-2">
          <button
            onClick={scrollToPricing}
            className="flex items-center gap-2.5 px-8 py-4 rounded-full font-bold text-base transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow: "0 0 30px rgba(168,85,247,0.25)" }}
          >
            Quero ativar minha máquina de vendas <ArrowRight size={18} />
          </button>
          <p className="text-xs text-gray-600 mt-1">Suporte dedicado para você publicar sem travar.</p>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section className="px-6 py-16 max-w-5xl mx-auto w-full">
        <div className="text-center mb-12">
          <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-2">Simples assim</p>
          <h2 className="text-3xl md:text-4xl font-black">Como funciona</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { num: "01", title: "Digite o tema", desc: "Fala para IA qual é o assunto do carrossel. Pode ser qualquer nicho." },
            { num: "02", title: "IA cria tudo", desc: "A IA pesquisa na web, escreve os textos e gera imagens cinematográficas únicas." },
            { num: "03", title: "Publique no Instagram", desc: "Com um clique, o carrossel vai direto para o seu perfil Business do Instagram." },
          ].map((step) => (
            <div key={step.num} className="rounded-2xl border border-white/10 p-6" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="text-4xl font-black mb-4" style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {step.num}
              </p>
              <p className="font-bold text-lg mb-2 text-white">{step.title}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section ref={pricingRef} id="pricing" className="px-6 py-20 max-w-5xl mx-auto w-full">
        <div className="text-center mb-14">
          <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-3">Investimento</p>
          <h2 className="text-3xl md:text-5xl font-black leading-tight">
            Escolha seu plano e{" "}
            <span style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              comece agora
            </span>
          </h2>
          <p className="mt-4 text-gray-500 text-sm">Cancele quando quiser. Sem fidelidade.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className="rounded-2xl p-6 flex flex-col gap-5 relative"
              style={{
                border: plan.highlight ? "2px solid #a855f7" : "1px solid rgba(255,255,255,0.1)",
                background: plan.highlight
                  ? "linear-gradient(135deg,rgba(124,58,237,0.18),rgba(168,85,247,0.08))"
                  : "rgba(255,255,255,0.03)",
              }}
            >
              {plan.badge && (
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                  style={{
                    background: plan.highlight ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.12)",
                    color: "white",
                  }}
                >
                  {plan.badge}
                </div>
              )}

              <div className="flex items-center gap-2 text-purple-400">
                {plan.key === "weekly"  && <Clock   size={16} />}
                {plan.key === "monthly" && <Star    size={16} />}
                {plan.key === "annual"  && <Calendar size={16} />}
                <span className="font-bold text-sm uppercase tracking-widest">{plan.label}</span>
              </div>

              <div>
                <div className="flex items-end gap-1">
                  <span className="text-sm text-gray-400 leading-none mb-1">R$</span>
                  <span className="text-5xl font-black text-white leading-none">{plan.price}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{plan.period}</p>
                {plan.monthly && <p className="text-xs text-purple-400 mt-0.5">{plan.monthly}</p>}
              </div>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check size={13} className="text-purple-400 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => goToCheckout(plan.key)}
                disabled={loadingPlan !== null}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
                style={plan.highlight
                  ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
                  : { background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                {loadingPlan === plan.key
                  ? <><Loader2 size={14} className="animate-spin" /> Aguarde...</>
                  : <>Assinar plano {plan.label}</>
                }
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-600 mt-8 flex items-center justify-center gap-1.5">
          <Crown size={11} className="text-yellow-500" />
          Pagamento seguro via Stripe · Cartão de crédito · Cancele quando quiser
        </p>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 py-16 max-w-2xl mx-auto w-full">
        <h2 className="text-2xl md:text-3xl font-black text-center mb-10">Perguntas frequentes</h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-white hover:bg-white/5 transition-colors"
              >
                {faq.q}
                <ChevronDown
                  size={16}
                  className="text-gray-500 flex-shrink-0 transition-transform"
                  style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="flex flex-col items-center text-center py-20 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%,rgba(168,85,247,0.10) 0%,transparent 70%)" }}
        />
        <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-4">Última chance</p>
        <h2 className="text-3xl md:text-5xl font-black leading-tight max-w-2xl mb-6">
          Pare de perder tempo.<br />
          <span style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Comece a crescer hoje.
          </span>
        </h2>
        <p className="text-gray-500 mb-8 max-w-md text-sm leading-relaxed">
          Cada dia sem conteúdo é um dia que seu concorrente está na frente.
        </p>
        <button
          onClick={scrollToPricing}
          className="flex items-center gap-2.5 px-10 py-4 rounded-full font-bold text-lg transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow: "0 0 50px rgba(168,85,247,0.35)" }}
        >
          <Sparkles size={20} /> Começar agora <ArrowRight size={20} />
        </button>
        <p className="text-xs text-gray-600 mt-4">A partir de R$19,93/semana · Cancele quando quiser</p>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t px-6 py-8 text-center text-xs text-gray-600" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}>
            <Instagram size={11} color="white" />
          </div>
          <span className="font-bold text-gray-400">XPost Zone</span>
        </div>
        <p>© 2025 XPost Zone · Todos os direitos reservados</p>
        <div className="flex justify-center gap-4 mt-3">
          <Link href="/editor" className="hover:text-gray-400 transition-colors">Editor</Link>
          <span>·</span>
          <a href="mailto:suporte@xpostzone.com" className="hover:text-gray-400 transition-colors">Suporte</a>
        </div>
      </footer>

    </main>
  );
}
