"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Instagram, Sparkles, ArrowRight, Check, X,
  Zap, Clock, Star, Calendar, ChevronDown,
  Loader2, Crown, Brain, Globe, Image as ImageIcon,
  MousePointer, TrendingUp, Shield,
} from "lucide-react";
import MarqueeImages from "@/components/MarqueeImages";

// ── Dados ──────────────────────────────────────────────────────

const FEATURES = [
  { icon: <Globe size={22} />,       title: "Pesquisa real na web",        desc: "A IA busca dados atuais sobre qualquer tema para embasar seu conteúdo com informações reais." },
  { icon: <Brain size={22} />,       title: "Texto escrito por IA",        desc: "Claude AI escreve títulos impactantes, corpo e CTA adaptados ao seu nicho e estilo." },
  { icon: <ImageIcon size={22} />,   title: "Imagens cinematográficas",    desc: "Gera imagens únicas com FLUX AI para cada slide — dark, dramáticas e profissionais." },
  { icon: <Instagram size={22} />,   title: "Publica direto no Instagram", desc: "Conecte sua conta Business e publique carrosséis com um único clique, sem sair da plataforma." },
  { icon: <MousePointer size={22} />,title: "Editor visual completo",      desc: "Edite textos, imagens, cores e layout de cada slide com total liberdade, sem precisar de Canva." },
  { icon: <TrendingUp size={22} />,  title: "Crescimento consistente",     desc: "Conteúdo diário profissional que gera engajamento real e atrai seguidores qualificados." },
];

const PLANS = [
  {
    key: "weekly",
    label: "Semanal",
    price: "19,93",
    cents: "",
    period: "/ semana",
    equiv: "≈ R$ 86/mês",
    highlight: false,
    badge: null as string | null,
    cta: "Começar agora",
    features: [
      "Carrosséis ilimitados com IA",
      "Imagens geradas por IA",
      "Publicação no Instagram",
      "Pesquisa web em tempo real",
      "Editor visual completo",
    ],
    missing: ["Assistente IA de conteúdo", "Suporte prioritário"],
  },
  {
    key: "monthly",
    label: "Mensal",
    price: "39,97",
    cents: "",
    period: "/ mês",
    equiv: null as string | null,
    highlight: true,
    badge: "Mais popular" as string | null,
    cta: "Assinar agora",
    features: [
      "Carrosséis ilimitados com IA",
      "Imagens geradas por IA",
      "Publicação no Instagram",
      "Pesquisa web em tempo real",
      "Editor visual completo",
      "Assistente IA de conteúdo",
    ],
    missing: ["Suporte prioritário"],
  },
  {
    key: "annual",
    label: "Anual",
    price: "412,78",
    cents: "",
    period: "/ ano",
    equiv: "≈ R$ 34,40/mês",
    highlight: false,
    badge: "Economize 14%" as string | null,
    cta: "Melhor custo-benefício",
    features: [
      "Carrosséis ilimitados com IA",
      "Imagens geradas por IA",
      "Publicação no Instagram",
      "Pesquisa web em tempo real",
      "Editor visual completo",
      "Assistente IA de conteúdo",
      "Suporte prioritário",
    ],
    missing: [],
  },
];

const FAQS = [
  { q: "Preciso instalar alguma coisa?",    a: "Não. XPost Zone é 100% online, funciona direto no browser, em qualquer dispositivo." },
  { q: "Funciona para qualquer nicho?",     a: "Sim. A IA pesquisa na web e adapta o conteúdo ao seu nicho automaticamente — de finanças a gastronomia." },
  { q: "As imagens são realmente geradas por IA?", a: "Sim. Usamos modelos FLUX para criar imagens cinematográficas únicas para cada slide." },
  { q: "Consigo publicar direto no Instagram?", a: "Sim. Conecte sua conta Instagram Business e publique com um clique, sem sair da plataforma." },
  { q: "Posso cancelar quando quiser?",     a: "Sim. Sem fidelidade, sem multa. Cancele quando quiser pelo portal do cliente Stripe." },
  { q: "Meu carrossel vai parecer amador?", a: "Não. O editor permite customizar tudo — fontes, cores, layout, imagens. O resultado é profissional." },
];

// ── Componente ─────────────────────────────────────────────────
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
    <main className="min-h-screen bg-[#060606] text-white overflow-x-hidden">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 md:px-10 py-3.5 border-b border-white/5"
        style={{ background: "rgba(6,6,6,0.92)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="XPost Zone" className="h-10 w-auto object-contain" />
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
          <button onClick={scrollToPricing} className="hover:text-white transition-colors">Preços</button>
          <Link href="/editor" className="hover:text-white transition-colors">Editor</Link>
        </nav>
        <button onClick={scrollToPricing}
          className="px-4 py-2 rounded-full text-sm font-bold text-white transition-all hover:opacity-90 hover:scale-105"
          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
          Ver planos
        </button>
      </header>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center px-5 pt-24 pb-16 overflow-hidden">
        {/* Glow fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse,rgba(124,58,237,0.18) 0%,transparent 70%)", filter: "blur(40px)" }} />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/25 bg-purple-500/8 text-purple-300 text-xs font-semibold mb-7 tracking-wide"
          style={{ background: "rgba(124,58,237,0.1)" }}>
          <Zap size={11} className="text-yellow-400" />
          IA que pesquisa, escreve e publica por você
        </div>

        <h1 className="text-[42px] md:text-[72px] lg:text-[84px] font-black leading-[1.0] max-w-4xl tracking-tight">
          Carrosséis{" "}
          <span style={{ background: "linear-gradient(135deg,#c084fc,#ec4899,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            virais
          </span>
          <br />no Instagram em{" "}
          <span style={{ background: "linear-gradient(135deg,#818cf8,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            segundos
          </span>
        </h1>

        <p className="mt-6 text-gray-400 text-lg md:text-xl max-w-xl leading-relaxed">
          IA que pesquisa na web, escreve o texto e gera as imagens.
          Do zero ao carrossel publicado — sem Canva, sem ChatGPT.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-10">
          <button onClick={scrollToPricing}
            className="flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-[15px] transition-all hover:scale-105 hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow: "0 8px 32px rgba(124,58,237,0.4)" }}>
            <Sparkles size={17} />
            Criar meu carrossel agora
            <ArrowRight size={17} />
          </button>
          <Link href="/editor"
            className="flex items-center gap-2 px-5 py-4 rounded-2xl text-sm font-semibold text-gray-300 border border-white/10 hover:border-white/20 hover:text-white transition-all"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            Ver editor →
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-5 mt-10 text-xs text-gray-500">
          {[
            { icon: <Shield size={12} className="text-green-400" />, text: "Pagamento seguro" },
            { icon: <Star size={12} className="text-yellow-400" />,  text: "Cancele quando quiser" },
            { icon: <Zap size={12} className="text-purple-400" />,   text: "Acesso imediato" },
          ].map((b) => (
            <span key={b.text} className="flex items-center gap-1.5">{b.icon}{b.text}</span>
          ))}
        </div>
      </section>

      {/* ── MARQUEE ────────────────────────────────────────── */}
      <section className="relative w-full py-10 overflow-hidden">
        <div className="text-center mb-8">
          <p className="text-[11px] text-gray-600 uppercase tracking-[0.2em] font-bold mb-2">Criado com XPost Zone</p>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            Veja exemplos reais de carrosséis gerados por IA
          </h2>
        </div>
        <div className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right,#060606,transparent)" }} />
        <div className="absolute inset-y-0 right-0 w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left,#060606,transparent)" }} />
        <MarqueeImages />

        <div className="flex justify-center mt-8">
          <button onClick={scrollToPricing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold border border-purple-500/25 text-purple-300 hover:bg-purple-500/8 transition-colors"
            style={{ background: "rgba(124,58,237,0.06)" }}>
            Quero criar assim também <ArrowRight size={13} />
          </button>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────── */}
      <section className="px-5 py-12 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { num: "30s",   label: "para gerar um carrossel" },
            { num: "100%",  label: "online, zero instalação" },
            { num: "IA",    label: "pesquisa + texto + imagem" },
            { num: "1 clique", label: "para publicar no Instagram" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center text-center p-5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-2xl md:text-3xl font-black"
                style={{ background: "linear-gradient(135deg,#c084fc,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {s.num}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CENÁRIO A vs B ─────────────────────────────────── */}
      <section className="px-5 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-[44px] font-black leading-tight max-w-2xl mx-auto">
            Daqui a 6 meses, seu Instagram vai estar{" "}
            <span style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              vendendo todos os dias
            </span>{" "}
            — ou continuar como está?
          </h2>
          <p className="mt-4 text-gray-500 text-sm max-w-md mx-auto">
            A diferença entre esses dois caminhos começa com uma decisão simples.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Sem XPost */}
          <div className="rounded-3xl p-7" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500/60 mb-4">Sem XPost Zone</p>
            <ul className="space-y-3">
              {[
                "Horas no Canva sem resultado nenhum",
                "Posts inconsistentes que ninguém vê",
                "Sem estratégia de crescimento",
                "Vendo concorrentes crescerem enquanto você trava",
                "Sem previsibilidade de clientes ou vendas",
              ].map((i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                  <X size={15} className="text-red-500 flex-shrink-0 mt-0.5" /> {i}
                </li>
              ))}
            </ul>
          </div>

          {/* Com XPost */}
          <div className="rounded-3xl p-7 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(236,72,153,0.06))", border: "1.5px solid rgba(168,85,247,0.35)" }}>
            <div className="absolute -top-3 right-5 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}>
              ✦ Sua melhor escolha
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-400/70 mb-4">Com XPost Zone</p>
            <ul className="space-y-3">
              {[
                "Carrossel pronto em 30 segundos com IA",
                "Conteúdo profissional todos os dias",
                "Mais alcance, engajamento e seguidores",
                "Crescimento constante e previsível",
                "Mais vendas no automático",
              ].map((i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-200">
                  <Check size={15} className="text-purple-400 flex-shrink-0 mt-0.5" /> {i}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-center mt-10">
          <button onClick={scrollToPricing}
            className="flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-[15px] transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow: "0 8px 32px rgba(124,58,237,0.3)" }}>
            Quero ativar minha máquina de conteúdo <ArrowRight size={17} />
          </button>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section className="px-5 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[11px] text-gray-600 uppercase tracking-[0.2em] font-bold mb-3">Tudo incluso</p>
          <h2 className="text-3xl md:text-4xl font-black">O que você recebe</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl p-5 flex gap-4 items-start group hover:border-purple-500/30 transition-colors"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-purple-400"
                style={{ background: "rgba(168,85,247,0.12)" }}>
                {f.icon}
              </div>
              <div>
                <p className="font-bold text-[14px] text-white mb-1">{f.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────── */}
      <section ref={pricingRef} id="pricing" className="px-5 py-20 max-w-5xl mx-auto scroll-mt-16">
        <div className="text-center mb-14">
          <p className="text-[11px] text-gray-600 uppercase tracking-[0.2em] font-bold mb-3">Planos e preços</p>
          <h2 className="text-3xl md:text-5xl font-black">
            Escolha e{" "}
            <span style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              comece hoje
            </span>
          </h2>
          <p className="mt-3 text-gray-500 text-sm">Sem fidelidade. Cancele quando quiser.</p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {PLANS.map((plan) => (
            <div key={plan.key} className="relative flex flex-col rounded-3xl p-7 transition-transform hover:-translate-y-1"
              style={{
                background: plan.highlight
                  ? "linear-gradient(160deg,rgba(124,58,237,0.22),rgba(168,85,247,0.1))"
                  : "rgba(255,255,255,0.03)",
                border: plan.highlight ? "2px solid rgba(168,85,247,0.6)" : "1px solid rgba(255,255,255,0.08)",
                boxShadow: plan.highlight ? "0 0 40px rgba(124,58,237,0.15)" : "none",
              }}>

              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wide whitespace-nowrap"
                  style={{ background: plan.highlight ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.1)", color: "white" }}>
                  {plan.badge}
                </div>
              )}

              {/* Label */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: plan.highlight ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.07)" }}>
                  {plan.key === "weekly"  && <Clock    size={14} className="text-purple-300" />}
                  {plan.key === "monthly" && <Star     size={14} className="text-purple-300" />}
                  {plan.key === "annual"  && <Calendar size={14} className="text-purple-300" />}
                </div>
                <span className="text-sm font-bold uppercase tracking-widest text-gray-300">{plan.label}</span>
              </div>

              {/* Preço */}
              <div className="mb-6">
                <div className="flex items-start gap-1">
                  <span className="text-sm text-gray-400 mt-2">R$</span>
                  <span className="text-[52px] font-black leading-none tracking-tight text-white">{plan.price}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{plan.period}</p>
                {plan.equiv && <p className="text-xs text-purple-400 mt-1 font-medium">{plan.equiv}</p>}
              </div>

              {/* Botão */}
              <button
                onClick={() => goToCheckout(plan.key)}
                disabled={loadingPlan !== null}
                className="w-full py-3.5 rounded-xl font-bold text-sm mb-6 flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
                style={plan.highlight
                  ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }
                  : { background: "rgba(255,255,255,0.07)", color: "white", border: "1px solid rgba(255,255,255,0.1)" }}>
                {loadingPlan === plan.key
                  ? <><Loader2 size={14} className="animate-spin" /> Aguarde...</>
                  : plan.cta}
              </button>

              {/* Divisor */}
              <div className="w-full h-px mb-5" style={{ background: "rgba(255,255,255,0.07)" }} />

              {/* Features incluídas */}
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px] text-gray-300">
                    <Check size={14} className="text-purple-400 flex-shrink-0" /> {f}
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px] text-gray-600 line-through">
                    <X size={14} className="text-gray-700 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Tabela comparativa */}
        <div className="mt-12 rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="grid grid-cols-4 text-[12px] font-bold uppercase tracking-wider"
            style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="px-5 py-3.5 text-gray-500">Recurso</div>
            {PLANS.map((p) => (
              <div key={p.key} className={`px-3 py-3.5 text-center ${p.highlight ? "text-purple-400" : "text-gray-500"}`}>
                {p.label}
              </div>
            ))}
          </div>
          {[
            "Carrosséis ilimitados",
            "Imagens IA (FLUX)",
            "Publicação Instagram",
            "Pesquisa na web",
            "Editor visual",
            "Assistente IA (Zora)",
            "Suporte prioritário",
          ].map((row, ri) => (
            <div key={row} className="grid grid-cols-4 text-[13px]"
              style={{ borderBottom: ri < 6 ? "1px solid rgba(255,255,255,0.05)" : "none", background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
              <div className="px-5 py-3 text-gray-400">{row}</div>
              {/* Semanal */}
              <div className="px-3 py-3 flex justify-center">
                {ri <= 4 ? <Check size={16} className="text-purple-400" /> : <X size={14} className="text-gray-700" />}
              </div>
              {/* Mensal */}
              <div className="px-3 py-3 flex justify-center">
                {ri <= 5 ? <Check size={16} className="text-purple-400" /> : <X size={14} className="text-gray-700" />}
              </div>
              {/* Anual */}
              <div className="px-3 py-3 flex justify-center">
                <Check size={16} className="text-purple-400" />
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6 flex items-center justify-center gap-1.5">
          <Crown size={11} className="text-yellow-500/60" />
          Pagamento seguro via Stripe · Cartão de crédito · Cancele quando quiser
        </p>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section className="px-5 py-16 max-w-2xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-center mb-8">Dúvidas frequentes</h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.07)", background: openFaq === i ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)" }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-white">
                {faq.q}
                <ChevronDown size={15} className="text-gray-500 flex-shrink-0 transition-transform"
                  style={{ transform: openFaq === i ? "rotate(180deg)" : "none" }} />
              </button>
              {openFaq === i && (
                <p className="px-5 pb-4 text-sm text-gray-400 leading-relaxed" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────────── */}
      <section className="px-5 py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 100%,rgba(124,58,237,0.12) 0%,transparent 70%)" }} />
        <p className="text-[11px] text-gray-600 uppercase tracking-[0.2em] font-bold mb-4">Comece hoje</p>
        <h2 className="text-3xl md:text-5xl font-black leading-tight max-w-xl mx-auto mb-5">
          Pare de perder tempo.{" "}
          <span style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Comece a crescer.
          </span>
        </h2>
        <p className="text-gray-500 text-sm mb-10 max-w-sm mx-auto">
          Cada dia sem conteúdo é um dia que seu concorrente está na frente.
        </p>
        <button onClick={scrollToPricing}
          className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow: "0 8px 40px rgba(124,58,237,0.4)" }}>
          <Sparkles size={20} /> Começar agora <ArrowRight size={20} />
        </button>
        <p className="text-xs text-gray-600 mt-4">A partir de R$19,93/semana · Cancele quando quiser</p>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="px-5 py-10 text-center text-xs text-gray-600"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}>
            <Instagram size={12} color="white" />
          </div>
          <span className="font-black text-gray-400 text-sm">XPost Zone</span>
        </div>
        <p>© 2025 XPost Zone · Todos os direitos reservados</p>
        <div className="flex justify-center gap-5 mt-3">
          <Link href="/editor" className="hover:text-gray-400 transition-colors">Editor</Link>
          <span className="text-gray-700">·</span>
          <button onClick={scrollToPricing} className="hover:text-gray-400 transition-colors">Preços</button>
          <span className="text-gray-700">·</span>
          <a href="mailto:suporte@xpostzone.com" className="hover:text-gray-400 transition-colors">Suporte</a>
        </div>
      </footer>

    </main>
  );
}
