"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Instagram, Sparkles, ArrowRight, Check, X,
  Zap, Star, ChevronDown,
  Loader2, Crown, Brain, Globe, Image as ImageIcon,
  MousePointer, TrendingUp, Shield,
} from "lucide-react";
import MarqueeImages from "@/components/MarqueeImages";
import LoginModal from "@/components/LoginModal";

// ── Botão flutuante WhatsApp ───────────────────────────────────
const WA_NUMBER = "5581973014080";
const WA_MSG = encodeURIComponent("Olá! Vim pelo XPost e quero saber mais sobre os planos 🦜");

function WhatsAppButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-5 z-[9990] flex flex-col items-end gap-3">
      {open && (
        <div className="bg-[#111] border border-[#222] rounded-2xl shadow-2xl p-4 w-72 flex flex-col gap-3 animate-in slide-in-from-bottom-4"
          style={{ backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#25d366" }}>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Fale com a gente</p>
              <p className="text-gray-500 text-[11px]">(81) 97301-4080</p>
            </div>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">
            Dúvidas sobre os planos ou quer ver uma demo ao vivo? Chama no WhatsApp — respondemos na hora! 🚀
          </p>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 hover:scale-105"
            style={{ background: "#25d366" }}
          >
            <svg viewBox="0 0 24 24" width={15} height={15} fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Chamar no WhatsApp
          </a>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"
        style={{ background: "#25d366", boxShadow: "0 4px 24px rgba(37,211,102,0.45)" }}
        aria-label="WhatsApp"
      >
        <svg viewBox="0 0 24 24" width={28} height={28} fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </button>
    </div>
  );
}

// ── Ícone Zora (avatar IA) ────────────────────────────────────
function ZoraAvatar({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="zoraBg" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
        <filter id="zoraGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx="24" cy="24" r="24" fill="url(#zoraBg)" />
      <g filter="url(#zoraGlow)" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M14 18 L34 18 L24 32 Z" />
        <path d="M18 26 L30 26" opacity="0.5" />
      </g>
      <circle cx="24" cy="24" r="3.5" fill="#e9d5ff" opacity="0.9" />
    </svg>
  );
}

// ── [SVG mascote removido] — mantido apenas como guard de TS ──
function __LegacySVG({ size = 200, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 -35 200 255" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <filter id="pxglow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="pbodyg" cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3b0764" />
        </radialGradient>
        <radialGradient id="pheadg" cx="35%" cy="28%" r="65%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
        <radialGradient id="pwingg" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#2e1065" />
        </radialGradient>
      </defs>

      {/* Sombra */}
      <ellipse cx="102" cy="215" rx="50" ry="7" fill="rgba(124,58,237,0.18)" />

      {/* Penas da cauda */}
      <path d="M82 170 Q58 200 50 216" stroke="#0d9488" strokeWidth="16" strokeLinecap="round" fill="none" />
      <path d="M96 176 Q89 210 86 220" stroke="#6d28d9" strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M116 170 Q134 200 144 214" stroke="#f59e0b" strokeWidth="15" strokeLinecap="round" fill="none" />

      {/* Asa esquerda */}
      <path d="M44 118 Q8 92 6 126 Q5 162 40 168 Q62 166 68 146 Z" fill="url(#pwingg)" />
      <path d="M18 110 Q12 128 15 146" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35" />

      {/* Asa direita */}
      <path d="M156 118 Q192 92 194 126 Q195 162 160 168 Q138 166 132 146 Z" fill="url(#pwingg)" />
      <path d="M182 110 Q188 128 185 146" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35" />

      {/* Corpo */}
      <ellipse cx="100" cy="150" rx="63" ry="55" fill="url(#pbodyg)" />
      <ellipse cx="76" cy="128" rx="22" ry="30" fill="rgba(255,255,255,0.07)" />
      <ellipse cx="100" cy="152" rx="38" ry="34" fill="rgba(196,181,253,0.09)" />

      {/* Cabeça */}
      <circle cx="100" cy="73" r="52" fill="url(#pheadg)" />
      <ellipse cx="76" cy="52" rx="16" ry="22" fill="rgba(255,255,255,0.07)" />

      {/* Bico superior */}
      <path d="M97 87 Q128 80 132 97 Q128 107 97 102 Z" fill="#f59e0b" />
      <path d="M99 88 Q122 83 124 95" stroke="#fde68a" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* Bico inferior */}
      <path d="M97 102 Q124 107 126 115 Q116 121 97 112 Z" fill="#d97706" />

      {/* Olho esquerdo (principal) */}
      <circle cx="74" cy="65" r="20" fill="white" />
      <circle cx="76" cy="67" r="13" fill="#0d0d0d" />
      <circle cx="82" cy="61" r="5" fill="white" />
      <circle cx="73" cy="73" r="2" fill="white" opacity="0.4" />
      <circle cx="74" cy="65" r="20" fill="none" stroke="rgba(196,181,253,0.2)" strokeWidth="2" />

      {/* Olho direito */}
      <circle cx="118" cy="65" r="14" fill="white" />
      <circle cx="119" cy="67" r="9.5" fill="#0d0d0d" />
      <circle cx="124" cy="62" r="3.5" fill="white" />
      <circle cx="118" cy="65" r="14" fill="none" stroke="rgba(196,181,253,0.15)" strokeWidth="1.5" />

      {/* Crista — 4 penas coloridas */}
      <path d="M72 24 Q60 -6 65 -22" stroke="#0d9488" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M87 16 Q80 -16 84 -30" stroke="#fbbf24" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M102 12 Q100 -18 105 -32" stroke="#a855f7" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M117 16 Q124 -10 122 -24" stroke="#f472b6" strokeWidth="9" strokeLinecap="round" fill="none" />
      <circle cx="65" cy="-22" r="6.5" fill="#0d9488" />
      <circle cx="84" cy="-30" r="6.5" fill="#fbbf24" />
      <circle cx="105" cy="-32" r="6.5" fill="#a855f7" />
      <circle cx="122" cy="-24" r="6.5" fill="#f472b6" />

      {/* X no peito — marca da brand */}
      <g filter="url(#pxglow)">
        <line x1="78" y1="122" x2="122" y2="172" stroke="#7c3aed" strokeWidth="12" strokeLinecap="round" />
        <line x1="122" y1="122" x2="78" y2="172" stroke="#7c3aed" strokeWidth="12" strokeLinecap="round" />
      </g>
      <line x1="80" y1="124" x2="120" y2="170" stroke="#c084fc" strokeWidth="5.5" strokeLinecap="round" opacity="0.9" />
      <line x1="120" y1="124" x2="80" y2="170" stroke="#c084fc" strokeWidth="5.5" strokeLinecap="round" opacity="0.9" />

      {/* Patas */}
      <g stroke="#f59e0b" strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M80 198 Q70 207 65 215 M80 198 Q77 208 74 216 M80 198 Q86 208 90 215" />
        <path d="M120 198 Q130 207 135 215 M120 198 Q123 208 126 216 M120 198 Q114 208 110 215" />
      </g>
    </svg>
  );
}

// ── Logo header ───────────────────────────────────────────────
function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-[17px] text-white select-none"
        style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 12px rgba(124,58,237,0.4)" }}>
        X
      </div>
      <span className="text-[22px] font-black tracking-tight text-white leading-none">
        xpost
      </span>
    </div>
  );
}

// ── Dados ──────────────────────────────────────────────────────
const FEATURES = [
  { icon: <Globe size={22} />,        title: "Pesquisa real na web",        desc: "A IA busca dados atuais sobre qualquer tema para embasar seu conteúdo com informações reais." },
  { icon: <Brain size={22} />,        title: "Texto escrito por IA",        desc: "Claude AI escreve títulos impactantes, corpo e CTA adaptados ao seu nicho e estilo." },
  { icon: <ImageIcon size={22} />,    title: "Imagens cinematográficas",    desc: "Gera imagens únicas com Gemini AI para cada slide — dark, dramáticas e profissionais." },
  { icon: <Instagram size={22} />,    title: "Publica direto no Instagram", desc: "Conecte sua conta Business e publique carrosséis com um único clique, sem sair da plataforma." },
  { icon: <MousePointer size={22} />, title: "Editor visual completo",      desc: "Edite textos, imagens, cores e layout de cada slide com total liberdade, sem precisar de Canva." },
  { icon: <TrendingUp size={22} />,   title: "Crescimento consistente",     desc: "Conteúdo diário profissional que gera engajamento real e atrai seguidores qualificados." },
];

const PLANS = [
  {
    key: "basic",
    label: "Básico",
    price: "29,90",
    period: "/ mês",
    equiv: null as string | null,
    highlight: false,
    badge: null as string | null,
    cta: "Começar agora",
    features: ["Carrosséis ilimitados com IA", "Pesquisa web em tempo real", "Editor visual completo", "Publicação no Instagram"],
    missing: ["Flyer promocional com IA", "Assistente IA (Zora)", "Suporte prioritário"],
  },
  {
    key: "pro",
    label: "Pro",
    price: "61,90",
    period: "/ mês",
    equiv: null as string | null,
    highlight: true,
    badge: "Mais popular" as string | null,
    cta: "Assinar agora",
    features: ["Carrosséis ilimitados com IA", "Pesquisa web em tempo real", "Editor visual completo", "Publicação no Instagram", "Flyer promocional com IA", "Assistente IA (Zora)"],
    missing: ["Suporte prioritário"],
  },
  {
    key: "business",
    label: "Business",
    price: "99,90",
    period: "/ mês",
    equiv: null as string | null,
    highlight: false,
    badge: "Mais completo" as string | null,
    cta: "Quero o melhor",
    features: ["Carrosséis ilimitados com IA", "Pesquisa web em tempo real", "Editor visual completo", "Publicação no Instagram", "Flyer promocional com IA", "Assistente IA (Zora)", "Suporte prioritário"],
    missing: [],
  },
];

const FAQS = [
  { q: "Preciso instalar alguma coisa?",            a: "Não. XPost é 100% online, funciona direto no browser, em qualquer dispositivo." },
  { q: "Funciona para qualquer nicho?",             a: "Sim. A IA pesquisa na web e adapta o conteúdo ao seu nicho automaticamente — de finanças a gastronomia." },
  { q: "As imagens são realmente geradas por IA?",  a: "Sim. Usamos Gemini AI para criar imagens cinematográficas únicas para cada slide." },
  { q: "Consigo publicar direto no Instagram?",     a: "Sim. Conecte sua conta Instagram Business e publique com um clique, sem sair da plataforma." },
  { q: "Posso cancelar quando quiser?",             a: "Sim. Sem fidelidade, sem multa. Cancele quando quiser pelo portal do cliente Stripe." },
  { q: "Meu carrossel vai parecer amador?",         a: "Não. O editor permite customizar tudo — fontes, cores, layout, imagens. O resultado é profissional." },
];

// ── Componente ─────────────────────────────────────────────────
export default function LandingPage() {
  const pricingRef = useRef<HTMLDivElement>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const scrollToPricing = () =>
    pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const KIRVANO_URLS: Record<string, string> = {
    basic:    "https://pay.kirvano.com/d3f6da72-a6be-4d54-8268-20c725e4ab5b",
    pro:      "https://pay.kirvano.com/e5bdb60b-3d05-4338-bbb7-59e17b1b636f",
    business: "https://pay.kirvano.com/2aca1343-9b14-48d4-aedc-8f532b509abd",
  };

  const goToCheckout = (plan: string) => {
    const url = KIRVANO_URLS[plan] ?? KIRVANO_URLS.pro;
    window.open(url, "_blank");
  };

  return (
    <main className="min-h-screen bg-[#060606] text-white">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 md:px-10 py-3 border-b border-white/5"
        style={{ background: "rgba(6,6,6,0.92)", backdropFilter: "blur(12px)" }}>
        <Logo />
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
          <button onClick={scrollToPricing} className="hover:text-white transition-colors">Preços</button>
          <Link href="/editor" className="hover:text-white transition-colors">Editor</Link>
          <button onClick={() => setLoginOpen(true)} className="hover:text-white transition-colors">Entrar</button>
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => setLoginOpen(true)}
            className="hidden sm:block px-4 py-2 rounded-full text-sm font-medium text-gray-300 border border-white/10 hover:border-white/20 hover:text-white transition-all">
            Entrar
          </button>
          <button onClick={scrollToPricing}
            className="px-4 py-2 rounded-full text-sm font-bold text-white transition-all hover:opacity-90 hover:scale-105"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
            Ver planos
          </button>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] px-5 md:px-10 pt-20 pb-16 overflow-hidden flex items-center">
        {/* Grid de fundo */}
        <div className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: "linear-gradient(rgba(124,58,237,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.07) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }} />
        {/* Fade do grid nas bordas */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%,transparent 40%,#060606 75%)" }} />

        {/* Glow principal */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse,rgba(124,58,237,0.22) 0%,transparent 60%)", filter: "blur(70px)" }} />
        {/* Glow rosa canto direito */}
        <div className="absolute top-10 right-[-100px] w-[500px] h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse,rgba(236,72,153,0.1) 0%,transparent 65%)", filter: "blur(80px)" }} />

        <div className="relative z-10 max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-8">

          {/* Coluna texto */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/30 text-green-300 text-xs font-bold mb-6 tracking-wide"
              style={{ background: "rgba(16,185,129,0.08)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              4 créditos grátis · Sem cartão de crédito
            </div>

            <h1 className="text-[40px] md:text-[64px] lg:text-[72px] font-black leading-[1.0] tracking-tighter max-w-2xl">
              Carrosséis{" "}
              <span style={{ background: "linear-gradient(135deg,#c084fc 0%,#ec4899 55%,#f97316 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
                virais
              </span>
              <br />
              no Instagram em{" "}
              <span className="relative inline-block">
                <span style={{ background: "linear-gradient(135deg,#818cf8,#a855f7)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
                  segundos
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full"
                  style={{ background: "linear-gradient(90deg,#818cf8,#a855f7)", opacity: 0.5 }} />
              </span>
            </h1>

            <p className="mt-5 text-gray-400 text-lg max-w-md leading-relaxed">
              IA que pesquisa na web, escreve o copy e gera as imagens.
              Do zero ao carrossel publicado — sem Canva, sem ChatGPT.
            </p>

            {/* Social proof */}
            <div className="flex items-center gap-3 mt-6">
              <div className="flex -space-x-2">
                {["#7c3aed","#ec4899","#f97316","#10b981","#3b82f6"].map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-[#060606] flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: c }}>
                    {["L","M","R","A","K"][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} size={11} className="text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-[11px] text-gray-500">+2.000 criadores já usam</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
              <Link href="/editor"
                className="flex items-center gap-2.5 px-9 py-4 rounded-2xl font-bold text-[16px] transition-all hover:scale-105 hover:brightness-110"
                style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow: "0 8px 40px rgba(124,58,237,0.5)" }}>
                <Sparkles size={18} />
                Começar grátis agora
                <ArrowRight size={18} />
              </Link>
              <button onClick={scrollToPricing}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl text-sm font-semibold text-gray-300 border border-white/10 hover:border-white/20 hover:text-white transition-all"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                Ver planos →
              </button>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start gap-5 mt-6 text-xs text-gray-500">
              {[
                { icon: <Shield size={12} className="text-green-400" />,  text: "Sem cartão de crédito" },
                { icon: <Zap size={12} className="text-yellow-400" />,    text: "4 créditos grátis" },
                { icon: <Check size={12} className="text-purple-400" />,  text: "Cancele quando quiser" },
              ].map((b) => (
                <span key={b.text} className="flex items-center gap-1.5">{b.icon}{b.text}</span>
              ))}
            </div>
          </div>

          {/* Coluna visual — mockup do editor */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center relative lg:w-[480px]">
            {/* Glow externo */}
            <div className="absolute -inset-16 pointer-events-none"
              style={{ background: "radial-gradient(ellipse,rgba(124,58,237,0.18) 0%,transparent 65%)", filter: "blur(50px)" }} />

            {/* Card mockup editor */}
            <div className="relative w-full rounded-[28px] overflow-hidden"
              style={{
                background: "linear-gradient(160deg,rgba(22,12,48,0.97),rgba(8,4,20,0.99))",
                border: "1px solid rgba(168,85,247,0.35)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.7), 0 0 100px rgba(124,58,237,0.18)",
              }}>

              {/* Browser chrome */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.06]"
                style={{ background: "rgba(255,255,255,0.025)" }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <div className="flex-1 h-6 rounded-md flex items-center px-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-[10px] text-gray-600 font-mono">xpostzone.online/editor</span>
                </div>
              </div>

              {/* Editor layout simulado */}
              <div className="flex" style={{ height: 290 }}>
                {/* Painel slides */}
                <div className="w-[96px] border-r border-white/[0.05] p-2.5 flex flex-col gap-2"
                  style={{ background: "rgba(255,255,255,0.018)" }}>
                  {[
                    { grad: "linear-gradient(135deg,#4c1d95,#7c3aed)", active: true },
                    { grad: "linear-gradient(135deg,#0f172a,#1e3a5f)", active: false },
                    { grad: "linear-gradient(135deg,#1a0533,#6d28d9)", active: false },
                    { grad: "linear-gradient(135deg,#0c1a0f,#166534)", active: false },
                    { grad: "linear-gradient(135deg,#2d1a00,#92400e)", active: false },
                  ].map((s, i) => (
                    <div key={i} className="rounded-lg overflow-hidden relative flex-shrink-0"
                      style={{
                        height: 52,
                        background: s.grad,
                        border: s.active ? "1.5px solid rgba(168,85,247,0.7)" : "1px solid rgba(255,255,255,0.06)",
                        boxShadow: s.active ? "0 0 12px rgba(124,58,237,0.35)" : "none",
                      }}>
                      <div className="absolute bottom-0 left-0 right-0 p-1.5">
                        <div className="h-[5px] rounded-sm mb-1" style={{ width: "75%", background: "rgba(255,255,255,0.5)" }} />
                        <div className="h-[3px] rounded-sm" style={{ width: "55%", background: "rgba(255,255,255,0.25)" }} />
                      </div>
                      {s.active && (
                        <div className="absolute top-1 right-1 px-1 py-0.5 rounded text-[5px] font-bold"
                          style={{ background: "rgba(168,85,247,0.8)", color: "white" }}>IA</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Canvas central */}
                <div className="flex-1 flex items-center justify-center p-4"
                  style={{ background: "rgba(0,0,0,0.35)" }}>
                  <div className="rounded-2xl overflow-hidden relative"
                    style={{ width: 150, height: 200, background: "linear-gradient(150deg,#1a0533 0%,#3b0764 60%,#4c1d95 100%)" }}>
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 55%)" }} />
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[7px] font-black"
                      style={{ background: "rgba(168,85,247,0.75)", color: "white" }}>IA</div>
                    <div className="absolute top-4 left-0 right-0 flex justify-center">
                      <div className="w-12 h-12 rounded-full opacity-20"
                        style={{ background: "radial-gradient(circle,#a855f7,transparent)" }} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="font-black text-white leading-tight mb-1.5" style={{ fontSize: 10 }}>
                        5 Segredos do<br />Instagram em 2025
                      </div>
                      <div className="text-purple-300 leading-tight" style={{ fontSize: 7.5 }}>
                        Descubra o que os top<br />criadores estão fazendo
                      </div>
                    </div>
                  </div>
                </div>

                {/* Painel propriedades */}
                <div className="w-[100px] border-l border-white/[0.05] p-3 flex flex-col gap-2.5"
                  style={{ background: "rgba(255,255,255,0.018)" }}>
                  <p className="text-[7px] font-bold uppercase tracking-wider text-gray-600">Texto</p>
                  <div className="space-y-1.5">
                    <div className="h-[5px] rounded-sm w-full" style={{ background: "rgba(168,85,247,0.4)" }} />
                    <div className="h-[4px] rounded-sm w-4/5 bg-white/10" />
                    <div className="h-[4px] rounded-sm w-3/5 bg-white/10" />
                  </div>
                  <p className="text-[7px] font-bold uppercase tracking-wider text-gray-600 mt-1">Cor</p>
                  <div className="flex gap-1">
                    {["#7c3aed","#ec4899","#f97316","#0d9488"].map((c) => (
                      <div key={c} className="w-4 h-4 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                  <div className="mt-2 h-7 rounded-lg flex items-center justify-center gap-1 text-[7px] font-bold text-purple-300"
                    style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(168,85,247,0.25)" }}>
                    <Sparkles size={7} /> Zora IA
                  </div>
                  <div className="h-7 rounded-lg flex items-center justify-center gap-1 text-[7px] font-bold"
                    style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" }}>
                    <Instagram size={7} /> Publicar
                  </div>
                </div>
              </div>

              {/* Status bar */}
              <div className="px-5 py-3 flex items-center justify-between border-t border-white/[0.05]"
                style={{ background: "rgba(255,255,255,0.018)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                    <Sparkles size={8} className="text-white" />
                  </div>
                  <span className="text-[10px] text-gray-500">Gerando imagens com IA...</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-[9px] text-gray-600">5 / 5 slides</span>
                </div>
              </div>
            </div>

            {/* Badges flutuantes */}
            <div className="absolute -top-4 -right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(168,85,247,0.55)", color: "#c084fc", backdropFilter: "blur(10px)" }}>
              <Sparkles size={9} /> IA gerada
            </div>
            <div className="absolute -bottom-4 -left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{ background: "rgba(236,72,153,0.18)", border: "1px solid rgba(236,72,153,0.4)", color: "#f472b6", backdropFilter: "blur(10px)" }}>
              <Instagram size={9} /> Pronto pra postar
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ────────────────────────────────────────── */}
      <section className="relative w-full py-10 overflow-hidden">
        <div className="text-center mb-8">
          <p className="text-[11px] text-gray-600 uppercase tracking-[0.2em] font-bold mb-2">Criado com XPost</p>
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
            { num: "30s",      label: "para gerar um carrossel" },
            { num: "100%",     label: "online, zero instalação" },
            { num: "IA",       label: "pesquisa + texto + imagem" },
            { num: "1 clique", label: "para publicar no Instagram" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center text-center p-5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-2xl md:text-3xl font-black"
                style={{ background: "linear-gradient(135deg,#c084fc,#818cf8)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
                {s.num}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ZORA — ASSISTENTE IA ────────────────────────────── */}
      <section className="px-5 py-10 max-w-4xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden flex flex-col md:flex-row items-center gap-8 p-8 md:p-10"
          style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.14),rgba(236,72,153,0.06))", border: "1.5px solid rgba(168,85,247,0.25)" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 80% at 80% 50%,rgba(124,58,237,0.10) 0%,transparent 70%)" }} />

          {/* Avatar Zora */}
          <div className="flex-shrink-0 relative flex flex-col items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(ellipse,rgba(124,58,237,0.4) 0%,transparent 70%)", filter: "blur(18px)", transform: "scale(1.4)" }} />
              <div className="relative w-28 h-28 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#4c1d95,#7c3aed)", border: "2px solid rgba(168,85,247,0.5)", boxShadow: "0 0 32px rgba(124,58,237,0.4)" }}>
                <ZoraAvatar size={64} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", border: "2px solid #060606" }}>
                <Sparkles size={12} className="text-white" />
              </div>
            </div>
            <div className="px-3 py-1 rounded-full text-[11px] font-bold"
              style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc" }}>
              Planos Pro & Business
            </div>
          </div>

          <div className="relative text-center md:text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-purple-400/70 mb-2">Sua assistente de IA</p>
            <h3 className="text-2xl md:text-3xl font-black mb-3">
              Conheça a{" "}
              <span style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
                Zora
              </span>
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-md mb-4">
              A Zora é a assistente de IA integrada ao XPost. Ela sugere pautas, responde perguntas sobre o seu nicho, ajuda a refinar textos e orienta sua estratégia de conteúdo — disponível direto no editor.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-5">
              {["Sugestão de pautas", "Refinar textos", "Estratégia de nicho", "Responde dúvidas", "Sempre disponível"].map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", color: "#d8b4fe" }}>
                  {tag}
                </span>
              ))}
            </div>
            <button onClick={scrollToPricing}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 4px 20px rgba(124,58,237,0.35)" }}>
              <Sparkles size={14} /> Acessar a Zora
            </button>
          </div>
        </div>
      </section>

      {/* ── CENÁRIO A vs B ─────────────────────────────────── */}
      <section className="px-5 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-[44px] font-black leading-tight max-w-2xl mx-auto">
            Daqui a 6 meses, seu Instagram vai estar{" "}
            <span style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
              vendendo todos os dias
            </span>{" "}
            — ou continuar como está?
          </h2>
          <p className="mt-4 text-gray-500 text-sm max-w-md mx-auto">
            A diferença entre esses dois caminhos começa com uma decisão simples.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-3xl p-7" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500/60 mb-4">Sem XPost</p>
            <ul className="space-y-3">
              {["Horas no Canva sem resultado nenhum", "Posts inconsistentes que ninguém vê", "Sem estratégia de crescimento", "Vendo concorrentes crescerem enquanto você trava", "Sem previsibilidade de clientes ou vendas"].map((i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                  <X size={15} className="text-red-500 flex-shrink-0 mt-0.5" /> {i}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl p-7 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(236,72,153,0.06))", border: "1.5px solid rgba(168,85,247,0.35)" }}>
            <div className="absolute -top-3 right-5 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}>
              ✦ Sua melhor escolha
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-400/70 mb-4">Com XPost</p>
            <ul className="space-y-3">
              {["Carrossel pronto em 30 segundos com IA", "Conteúdo profissional todos os dias", "Mais alcance, engajamento e seguidores", "Crescimento constante e previsível", "Mais vendas no automático"].map((i) => (
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
        <div className="text-center mb-14 relative">
          <p className="text-[11px] text-gray-600 uppercase tracking-[0.2em] font-bold mb-3">Planos e preços</p>
          <h2 className="text-3xl md:text-5xl font-black">
            Escolha e{" "}
            <span style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
              comece hoje
            </span>
          </h2>
          <p className="mt-3 text-gray-500 text-sm">Sem fidelidade. Cancele quando quiser.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {PLANS.map((plan) => (
            <div key={plan.key} className="relative flex flex-col rounded-3xl p-7 transition-transform hover:-translate-y-1"
              style={{
                background: plan.highlight ? "linear-gradient(160deg,rgba(124,58,237,0.22),rgba(168,85,247,0.1))" : "rgba(255,255,255,0.03)",
                border: plan.highlight ? "2px solid rgba(168,85,247,0.6)" : "1px solid rgba(255,255,255,0.08)",
                boxShadow: plan.highlight ? "0 0 40px rgba(124,58,237,0.15)" : "none",
              }}>
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wide whitespace-nowrap"
                  style={{ background: plan.highlight ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.1)", color: "white" }}>
                  {plan.badge}
                </div>
              )}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: plan.highlight ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.07)" }}>
                  {plan.key === "basic"    && <Zap    size={14} className="text-purple-300" />}
                  {plan.key === "pro"      && <Star   size={14} className="text-purple-300" />}
                  {plan.key === "business" && <Crown  size={14} className="text-yellow-400" />}
                </div>
                <span className="text-sm font-bold uppercase tracking-widest text-gray-300">{plan.label}</span>
              </div>
              <div className="mb-6">
                <div className="flex items-start gap-1">
                  <span className="text-sm text-gray-400 mt-2">R$</span>
                  <span className="text-[52px] font-black leading-none tracking-tight text-white">{plan.price}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{plan.period}</p>
              </div>
              <button
                onClick={() => goToCheckout(plan.key)}
                disabled={loadingPlan !== null}
                className="w-full py-3.5 rounded-xl font-bold text-sm mb-6 flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
                style={plan.highlight
                  ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }
                  : { background: "rgba(255,255,255,0.07)", color: "white", border: "1px solid rgba(255,255,255,0.1)" }}>
                {loadingPlan === plan.key ? <><Loader2 size={14} className="animate-spin" /> Aguarde...</> : plan.cta}
              </button>
              <div className="w-full h-px mb-5" style={{ background: "rgba(255,255,255,0.07)" }} />
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
              <div key={p.key} className={`px-3 py-3.5 text-center ${p.highlight ? "text-purple-400" : "text-gray-500"}`}>{p.label}</div>
            ))}
          </div>
          {["Carrosséis ilimitados", "Pesquisa na web", "Editor visual", "Publicação Instagram", "Flyer promocional IA", "Assistente IA (Zora)", "Suporte prioritário"].map((row, ri) => (
            <div key={row} className="grid grid-cols-4 text-[13px]"
              style={{ borderBottom: ri < 6 ? "1px solid rgba(255,255,255,0.05)" : "none", background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
              <div className="px-5 py-3 text-gray-400">{row}</div>
              <div className="px-3 py-3 flex justify-center">
                {ri <= 3 ? <Check size={16} className="text-purple-400" /> : <X size={14} className="text-gray-700" />}
              </div>
              <div className="px-3 py-3 flex justify-center">
                {ri <= 5 ? <Check size={16} className="text-purple-400" /> : <X size={14} className="text-gray-700" />}
              </div>
              <div className="px-3 py-3 flex justify-center">
                <Check size={16} className="text-purple-400" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 mt-6">
          <p className="text-xs text-gray-600 flex items-center gap-1.5">
            <Crown size={11} className="text-yellow-500/60" />
            Pagamento seguro via Stripe · Cartão de crédito · Cancele quando quiser
          </p>
          <p className="text-xs text-gray-600">
            Já tem conta?{" "}
            <button onClick={() => setLoginOpen(true)} className="text-purple-400 hover:text-purple-300 underline transition-colors">
              Fazer login
            </button>
          </p>
        </div>
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
          <span style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
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
        <p className="text-xs text-gray-600 mt-4">A partir de R$29,90/mês · Cancele quando quiser</p>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="px-5 py-10 text-center text-xs text-gray-600"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-[12px] text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>X</div>
          <span className="font-black text-gray-400 text-sm">xpost</span>
        </div>
        <p>© 2025 XPost · Todos os direitos reservados</p>
        <div className="flex justify-center gap-5 mt-3">
          <Link href="/editor" className="hover:text-gray-400 transition-colors">Editor</Link>
          <span className="text-gray-700">·</span>
          <button onClick={scrollToPricing} className="hover:text-gray-400 transition-colors">Preços</button>
          <span className="text-gray-700">·</span>
          <a href="mailto:suporte@xpost.app" className="hover:text-gray-400 transition-colors">Suporte</a>
        </div>
      </footer>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <WhatsAppButton />
    </main>
  );
}
