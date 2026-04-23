"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  Instagram, Sparkles, ArrowRight, Check, X,
  Zap, Star, ChevronDown,
  Loader2, Crown, Brain, Globe, Image as ImageIcon,
  MousePointer, TrendingUp, Shield, PenLine, Cpu, Send,
} from "lucide-react";
import MarqueeImages from "@/components/MarqueeImages";
import LoginModal from "@/components/LoginModal";
import AppLogo from "@/components/AppLogo";
import ZoraOrb from "@/components/ZoraOrb";

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
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
        <filter id="zoraGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx="24" cy="24" r="24" fill="url(#zoraBg)" />
      <g filter="url(#zoraGlow)" stroke="##818cf8" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M14 18 L34 18 L24 32 Z" />
        <path d="M18 26 L30 26" opacity="0.5" />
      </g>
      <circle cx="24" cy="24" r="3.5" fill="#e9d5ff" opacity="0.9" />
    </svg>
  );
}

// ── Logo header ───────────────────────────────────────────────
function Logo({ className = "" }: { className?: string }) {
  return (
    <AppLogo
      variant="dark"
      size={36}
      textClassName="text-[22px] font-black tracking-tight text-white leading-none"
      className={className}
    />
  );
}

// ── Dados ──────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "Mariana Costa",
    handle: "@maricosta.nutri",
    avatar: "MC",
    color: "#ec4899",
    niche: "Nutrição",
    text: "Passei 2 anos tentando criar conteúdo consistente e nunca conseguia manter. Com o XPost faço um carrossel por dia em menos de 5 minutos. Meu engajamento triplicou em 2 meses.",
    stars: 5,
    result: "+3.200 seguidores em 60 dias",
  },
  {
    name: "Rafael Torres",
    handle: "@rafaterapia",
    avatar: "RT",
    color: "#3b5bdb",
    niche: "Psicologia",
    text: "Era difícil transformar conhecimento técnico em conteúdo acessível. A IA faz isso pra mim agora. Hoje tenho 3 clientes novos por mês vindos direto do Instagram.",
    stars: 5,
    result: "3 clientes novos/mês pelo Instagram",
  },
  {
    name: "Juliana Santos",
    handle: "@ju.negociosdigitais",
    avatar: "JS",
    color: "#f97316",
    niche: "Marketing Digital",
    text: "Achei que era mais uma ferramenta de IA genérica. Mas o resultado é absurdo — os carrosséis ficam tão bons que meu cliente perguntou se tinha contratado agência.",
    stars: 5,
    result: "Taxa de salvamento 4x maior",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: <PenLine size={22} />,
    title: "Digite o tema",
    desc: "Escreva qualquer assunto — sua especialidade, uma tendência do nicho, um produto. A IA entende qualquer área.",
  },
  {
    step: "02",
    icon: <Cpu size={22} />,
    title: "A IA cria tudo",
    desc: "Em 30 segundos a IA pesquisa na web, escreve o texto de cada slide e gera imagens únicas. Carrossel completo.",
  },
  {
    step: "03",
    icon: <Send size={22} />,
    title: "Revise e publique",
    desc: "Edite o que quiser no editor visual. Satisfeito? Publique direto no Instagram com 1 clique.",
  },
];

const FEATURES = [
  { icon: <Globe size={22} />,        title: "Pesquisa real na web",        desc: "A IA busca dados atuais sobre qualquer tema para embasar seu conteúdo com informações reais — não inventa nada." },
  { icon: <Brain size={22} />,        title: "Texto escrito por IA",        desc: "Títulos impactantes, corpo e CTA adaptados ao seu nicho e estilo. Você revisa, ajusta o que quiser." },
  { icon: <ImageIcon size={22} />,    title: "Imagens geradas por IA",      desc: "Cada slide recebe uma imagem única criada pelo Gemini AI — sem banco de imagem, sem foto genérica." },
  { icon: <Instagram size={22} />,    title: "Publica direto no Instagram", desc: "Conecte sua conta Business e publique com 1 clique, sem baixar nada, sem copiar pro celular." },
  { icon: <MousePointer size={22} />, title: "Editor visual completo",      desc: "Edite fonte, cor, layout e imagem de cada slide com total liberdade — sem precisar abrir o Canva." },
  { icon: <TrendingUp size={22} />,   title: "Funciona pra qualquer nicho", desc: "Nutrição, direito, psicologia, marketing, finanças, moda... A IA adapta a linguagem automaticamente." },
];

const PLANS = [
  {
    key: "basic",
    label: "Básico",
    price: "29,90",
    period: "/ mês",
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
    highlight: false,
    badge: "Mais completo" as string | null,
    cta: "Quero o melhor",
    features: ["Carrosséis ilimitados com IA", "Pesquisa web em tempo real", "Editor visual completo", "Publicação no Instagram", "Flyer promocional com IA", "Assistente IA (Zora)", "Suporte prioritário"],
    missing: [],
  },
];

const FAQS = [
  {
    q: "Preciso instalar alguma coisa?",
    a: "Não. Funciona 100% no browser — Chrome, Safari, qualquer um. Sem app, sem download. Abre o link e já começa. Tem 4 créditos grátis pra testar sem nem precisar colocar cartão.",
  },
  {
    q: "Funciona para qualquer nicho?",
    a: "Sim. Nutrição, psicologia, direito, marketing, finanças, gastronomia, moda... A IA pesquisa o que está em alta no seu nicho e adapta a linguagem automaticamente. Se você entende do assunto, a IA cria o conteúdo.",
  },
  {
    q: "As imagens são realmente geradas por IA?",
    a: "Sim. Usamos Gemini AI (do Google) para criar imagens únicas pra cada slide — não são fotos de banco de imagem. Cada carrossel sai com um visual exclusivo feito especificamente pro seu tema.",
  },
  {
    q: "Consigo publicar direto no Instagram?",
    a: "Sim. Conecte sua conta Instagram Business nas configurações e publique direto do editor com 1 clique. Não precisa baixar a imagem, não precisa copiar pro celular. É literalmente 1 clique.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, e é simples. É só cancelar pelo portal do cliente — menos de 1 minuto. Sem multa, sem fidelidade, sem precisar falar com atendente pra cancelar. Cancela na hora.",
  },
  {
    q: "Tem alguma garantia?",
    a: "Sim. Se em 7 dias você não estiver satisfeito com o resultado, devolvemos 100% do valor. Sem perguntas, sem burocracia. É o suficiente pra você testar de verdade e ver se funciona pra você.",
  },
];

// ── Phone + Laptop Hologram ────────────────────────────────────
const HOLO_SLIDES = [
  { bg: "linear-gradient(150deg,#0c0c2e,#1a1060,#2d1b8a)", accent: "#6366f1", title: "Como vender no Direct", sub: "3 técnicas que convertem", tag: "VENDAS", isLogo: false },
  { bg: "linear-gradient(150deg,#0a1628,#1e3a8a,#1e40af)", accent: "#60a5fa", title: "5 Segredos do Instagram", sub: "Que os top criadores usam", tag: "CRESCIMENTO", isLogo: false },
  { bg: "linear-gradient(150deg,#052e16,#14532d,#15803d)", accent: "#4ade80", title: "Engajamento em 30 dias", sub: "Método comprovado", tag: "ESTRATÉGIA", isLogo: false },
  { bg: "linear-gradient(150deg,#06051a,#0e0c3a,#1a1680)", accent: "#818cf8", title: "", sub: "", tag: "XP", isLogo: true },
];

function PhoneHologram() {
  const [slideIdx, setSlideIdx] = useState(0);
  const [phase, setPhase] = useState(0);
  const [likes, setLikes] = useState(1295);

  useEffect(() => {
    const TIMINGS = [3800, 2000, 2000];
    let t: ReturnType<typeof setTimeout>;
    const advance = (cur: number) => {
      t = setTimeout(() => {
        const next = (cur + 1) % 3;
        setPhase(next);
        if (next === 0) {
          setSlideIdx((i) => (i + 1) % HOLO_SLIDES.length);
          setLikes((l) => l + Math.floor(Math.random() * 60 + 20));
        }
        advance(next);
      }, TIMINGS[cur]);
    };
    advance(0);
    return () => clearTimeout(t);
  }, []);

  const slide = HOLO_SLIDES[slideIdx];
  const todayLikes = 83 + (likes - 1295);

  return (
    <div className="relative select-none" style={{ width: 300, height: 640 }}>
      {/* Sem glow externo — só bordas nos aparelhos */}

      {/* Anel orbital 1 — roxo */}
      <div style={{
        position: "absolute", left: -22, top: 228,
        width: 344, height: 200, borderRadius: "50%",
        border: "1.5px solid rgba(99,102,241,0.45)",
        boxShadow: "0 0 18px rgba(99,102,241,0.2), inset 0 0 12px rgba(99,102,241,0.08)",
        transform: "rotate(-22deg)", pointerEvents: "none", zIndex: 0,
      }} />
      {/* Anel orbital 2 — rosa */}
      <div style={{
        position: "absolute", left: 2, top: 264,
        width: 296, height: 160, borderRadius: "50%",
        border: "1px solid rgba(236,72,153,0.32)",
        boxShadow: "0 0 14px rgba(236,72,153,0.14)",
        transform: "rotate(14deg)", pointerEvents: "none", zIndex: 0,
      }} />
      {/* Ponto luminoso no anel 1 */}
      <div style={{
        position: "absolute", left: -18, top: 315,
        width: 8, height: 8, borderRadius: "50%",
        background: "#6366f1", boxShadow: "0 0 12px 4px rgba(99,102,241,0.7)",
        pointerEvents: "none", zIndex: 1,
        animation: "pulse-ring 2s ease-in-out infinite",
      }} />

      {/* Phone frame */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%,-50%)",
        width: 262, height: 548, borderRadius: 46,
        background: "#05050f",
        border: "2px solid rgba(110,85,255,0.75)",
        boxShadow: "0 0 0 1px rgba(150,120,255,0.15), 0 0 35px rgba(99,70,245,0.6), 0 0 90px rgba(80,40,220,0.3), inset 0 0 60px rgba(0,0,30,0.5), 0 40px 90px rgba(0,0,0,0.9)",
        overflow: "hidden", display: "flex", flexDirection: "column",
        animation: "float-phone 5s ease-in-out infinite",
      }}>
        {/* Scan line */}
        <div style={{
          position: "absolute", left: 0, right: 0, height: 2, zIndex: 30, pointerEvents: "none",
          background: "linear-gradient(90deg,transparent,rgba(140,110,255,0.8) 50%,transparent)",
          animation: "scan-line 6s linear infinite",
        }} />

        {/* Status bar */}
        <div style={{ height: 44, flexShrink: 0, background: "#05050f", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>9:41</span>
          <div style={{ width: 90, height: 26, borderRadius: 13, background: "#000" }} />
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
              {[0,1,2,3].map(i => <rect key={i} x={i*4} y={10-i*2.5} width="3" height={i*2.5+2} rx="0.8" fill={i<3 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)"} />)}
            </svg>
            <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
              <path d="M7.5 9 C7.5 9 7.5 9 7.5 9Z" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M5 7 C5.8 6 6.6 5.5 7.5 5.5 C8.4 5.5 9.2 6 10 7" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
              <path d="M2.5 5 C4 3 5.7 2 7.5 2 C9.3 2 11 3 12.5 5" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
            </svg>
            <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
              <rect x="0.5" y="0.5" width="18" height="10" rx="2.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
              <rect x="2" y="2" width="14" height="7" rx="1.5" fill="rgba(255,255,255,0.9)"/>
              <path d="M19.5 3.5 L19.5 7.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* IG content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#000", overflow: "hidden" }}>
          {/* IG header */}
          <div style={{ padding: "6px 14px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "white", fontFamily: "Georgia,serif", letterSpacing: -0.5 }}>Instagram</span>
            <div style={{ display: "flex", gap: 16 }}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </div>
          </div>

          {/* Stories row */}
          <div style={{ display: "flex", gap: 12, padding: "0 12px 10px", overflowX: "hidden", flexShrink: 0 }}>
            {[
              { gradient: "linear-gradient(45deg,#6366f1,#8b5cf6,#a855f7)", label: "xpost_ia", isActive: true },
              { gradient: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366)", label: "user2", isActive: false },
              { gradient: "linear-gradient(45deg,#405de6,#5851db,#833ab4)", label: "user3", isActive: false },
              { gradient: "linear-gradient(45deg,#10b981,#059669)", label: "user4", isActive: false },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", padding: 2, background: s.gradient }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#000", border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {i === 0 ? <AppLogo variant="dark" size={30} showText={false} /> : <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg,#1a1a2e,#0f0f23)` }} />}
                  </div>
                </div>
                <span style={{ fontSize: 8.5, color: i === 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)", maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>{s.label}</span>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />

          {/* Post header */}
          <div style={{ padding: "8px 14px 6px", display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
            <div style={{ width: 33, height: 33, borderRadius: "50%", flexShrink: 0, overflow: "hidden", border: "2px solid rgba(99,80,255,0.6)", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AppLogo variant="dark" size={24} showText={false} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: "white" }}>xpost_ia</p>
            </div>
            <span style={{ fontSize: 20, color: "rgba(255,255,255,0.45)", letterSpacing: 1, lineHeight: 1 }}>···</span>
          </div>

          {/* Carousel slide */}
          <div style={{ position: "relative", height: 230, flexShrink: 0, background: slide.bg, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(ellipse at 80% 20%,${slide.accent}30 0%,transparent 55%)` }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.55) 100%)" }} />
            {slide.isLogo ? (
              /* Slide especial — logo XP grande centralizada */
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div style={{ filter: "drop-shadow(0 0 28px rgba(99,102,241,0.9)) drop-shadow(0 0 60px rgba(99,102,241,0.5))", animation: "float-phone 4s ease-in-out infinite" }}>
                  <AppLogo variant="dark" size={100} showText={false} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 3 }}>XPOST IA</span>
              </div>
            ) : (
              <>
                <div style={{ position: "absolute", top: 10, left: 10, padding: "3px 8px", borderRadius: 5, background: slide.accent + "25", border: `1px solid ${slide.accent}60`, fontSize: 10, fontWeight: 800, color: slide.accent, letterSpacing: 1 }}>{slide.tag}</div>
                <div style={{ position: "absolute", bottom: 24, left: 14, right: 14 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 900, color: "white", lineHeight: 1.15, textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}>{slide.title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{slide.sub}</p>
                </div>
              </>
            )}
            <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4 }}>
              {[0,1,2,3,4].map(i => <div key={i} style={{ width: i===0?18:4, height: 4, borderRadius: 2, background: i===0?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.25)" }} />)}
            </div>
            {phase === 1 && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div style={{ display: "flex", gap: 7 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: `pulse-ring 0.9s ${i*0.25}s ease-in-out infinite` }} />)}
                </div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>Gerando com IA...</p>
                <div style={{ width: 120, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.1)" }}>
                  <div style={{ height: "100%", width: "70%", borderRadius: 2, background: "linear-gradient(90deg,#6366f1,#a855f7)" }} />
                </div>
              </div>
            )}
            {phase === 2 && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9, animation: "fade-in-up 0.35s ease" }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(34,197,94,0.2)", border: "2px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "white" }}>Publicado!</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ padding: "9px 14px 4px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={phase===2?"#ef4444":"none"} stroke={phase===2?"#ef4444":"white"} strokeWidth="2.2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div style={{ padding: "0 14px 2px", fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0 }}>{likes.toLocaleString("pt-BR")} curtidas</div>
          <div style={{ padding: "0 14px 6px", fontSize: 9.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.4, flexShrink: 0 }}>
            <span style={{ fontWeight: 700, color: "white" }}>xpost_ia</span>{" "}Criado com IA em 2 min 🚀
          </div>

          {/* Bottom nav */}
          <div style={{ background: "#05050f", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "8px 6px 4px", flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <div style={{ width: 28, height: 28, borderRadius: 8, border: "2px solid rgba(255,255,255,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
        </div>

        {/* Home indicator */}
        <div style={{ height: 24, flexShrink: 0, background: "#05050f", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 88, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.25)" }} />
        </div>
      </div>

      {/* Badge publicado */}
      {phase === 2 && (
        <div style={{
          position: "absolute", top: 34, right: -10,
          padding: "8px 14px", borderRadius: 14,
          background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.5)",
          boxShadow: "0 0 24px rgba(34,197,94,0.2)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "fade-in-up 0.4s ease", zIndex: 10, whiteSpace: "nowrap",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#4ade80" }}>Publicado no Instagram!</span>
        </div>
      )}

      {/* Badge curtidas */}
      <div style={{
        position: "absolute", bottom: 100, left: -14,
        padding: "7px 12px", borderRadius: 12,
        background: "rgba(8,8,20,0.95)", border: "1px solid rgba(99,80,255,0.35)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", gap: 7, zIndex: 10, whiteSpace: "nowrap",
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="#ec4899"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>+{todayLikes} curtidas hoje</span>
      </div>
    </div>
  );
}

// ── Logo pulando acima da tela do celular ─────────────────────
// Celular: left:8, bottom:0, scale(0.68), rotateZ(-4deg) do bottom-center (x=158)
// Top do celular (after scale): y = 500 - 640*0.68 ≈ 65px
// Tilt -4°: top-center desloca -sin(4°)×435 ≈ -30px → top-center-x ≈ 128
// Badge ~106px wide → left = 128 - 53 = 75
function FloatingLogo() {
  return (
    <div style={{
      position: "absolute", left: 75, top: 8, zIndex: 20,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      pointerEvents: "none",
    }}>
      {/* Logo pulando com glow roxo */}
      <div style={{
        animation: "logo-jump 2.2s ease-in-out infinite",
        filter: "drop-shadow(0 0 20px rgba(99,102,241,1)) drop-shadow(0 0 40px rgba(99,102,241,0.5)) drop-shadow(0 10px 24px rgba(0,0,0,0.7))",
      }}>
        <AppLogo variant="dark" size={60} showText={false} />
      </div>

      {/* Badge "Publicado!" */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 12px", borderRadius: 20,
        background: "rgba(4,4,14,0.96)",
        border: "1px solid rgba(34,197,94,0.55)",
        boxShadow: "0 0 16px rgba(34,197,94,0.25), 0 4px 14px rgba(0,0,0,0.6)",
        whiteSpace: "nowrap",
        animation: "float-phone 3s ease-in-out 0.5s infinite",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: "#4ade80", letterSpacing: 0.3 }}>Publicado!</span>
      </div>

      {/* Fio de luz até a tela */}
      <div style={{
        width: 1, height: 44,
        background: "linear-gradient(to bottom, rgba(99,102,241,0.5), transparent)",
      }} />
    </div>
  );
}

// ── Laptop Mockup ──────────────────────────────────────────────
const LAPTOP_SLIDES = [
  { bg: "linear-gradient(135deg,#0a1628,#1e3a8a,#1e40af)", accent: "#60a5fa", title: "Estratégia de Lançamento", sub: "Como dominar o feed em 7 dias", tag: "ESTRATÉGIA" },
  { bg: "linear-gradient(135deg,#0c0c2e,#1a1060,#2d1b8a)", accent: "#818cf8", title: "Como Vender no Direct", sub: "3 técnicas que convertem", tag: "VENDAS" },
  { bg: "linear-gradient(135deg,#052e16,#14532d,#15803d)", accent: "#4ade80", title: "Engajamento em 30 Dias", sub: "Plano prático para crescer seu perfil todos os dias.", tag: "ESTRATÉGIA" },
];

function LaptopMockup() {
  const [slideIdx, setSlideIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlideIdx(i => (i + 1) % LAPTOP_SLIDES.length), 4200);
    return () => clearInterval(t);
  }, []);
  const slide = LAPTOP_SLIDES[slideIdx];

  return (
    <div className="relative select-none" style={{ width: 500, height: 360 }}>
      {/* Sem glow externo — só bordas nos aparelhos */}

      {/* Screen / Lid */}
      <div style={{
        position: "absolute", top: 0, left: 6, right: 6,
        height: 324, borderRadius: "16px 16px 3px 3px",
        background: "#05050f",
        border: "2px solid rgba(90,80,255,0.72)",
        boxShadow: "0 0 0 1px rgba(150,130,255,0.12), 0 0 40px rgba(80,60,245,0.55), 0 0 100px rgba(60,40,220,0.25), inset 0 0 80px rgba(0,0,40,0.4), 0 28px 90px rgba(0,0,0,0.9)",
        overflow: "hidden",
      }}>
        {/* Scan line */}
        <div style={{
          position: "absolute", left: 0, right: 0, height: 2, zIndex: 30, pointerEvents: "none",
          background: "linear-gradient(90deg,transparent,rgba(130,110,255,0.7) 50%,transparent)",
          animation: "scan-line 7s 2s linear infinite",
        }} />
        {/* Camera bar */}
        <div style={{ height: 18, background: "#030308", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(90,80,255,0.12)" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(90,80,255,0.45)", border: "1px solid rgba(90,80,255,0.3)" }} />
        </div>

        {/* Editor UI */}
        <div style={{ display: "flex", height: "calc(100% - 18px)", fontFamily: "system-ui,sans-serif" }}>

          {/* Sidebar */}
          <div style={{ width: 82, background: "#04040e", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "7px 5px", display: "flex", flexDirection: "column", gap: 5, overflow: "hidden" }}>
            {/* App logo header */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 4px 7px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AppLogo variant="dark" size={14} showText={false} />
              </div>
              <span style={{ fontSize: 8.5, fontWeight: 800, color: "rgba(255,255,255,0.75)" }}>XPost</span>
            </div>
            {/* Slide thumbnails */}
            {LAPTOP_SLIDES.map((s, i) => (
              <div key={i} style={{
                height: 54, borderRadius: 5, background: s.bg, flexShrink: 0,
                border: `1.5px solid ${i === slideIdx ? s.accent + "bb" : "transparent"}`,
                boxShadow: i === slideIdx ? `0 0 12px ${s.accent}40` : "none",
                overflow: "hidden", position: "relative", transition: "border-color 0.3s, box-shadow 0.3s",
              }}>
                <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(ellipse at 70% 20%,${s.accent}20,transparent 60%)` }} />
                <div style={{ position: "absolute", bottom: 5, left: 5, right: 5, fontSize: 5.5, fontWeight: 800, color: "rgba(255,255,255,0.9)", lineHeight: 1.3 }}>{s.title}</div>
                <div style={{ position: "absolute", top: 4, left: 4, padding: "1.5px 4px", borderRadius: 2, background: s.accent + "25", fontSize: 4.5, fontWeight: 800, color: s.accent }}>{i + 1}</div>
              </div>
            ))}
            {/* Empty placeholder */}
            <div style={{ height: 54, borderRadius: 5, background: "rgba(255,255,255,0.02)", border: "1.5px dashed rgba(255,255,255,0.08)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18, color: "rgba(255,255,255,0.12)", lineHeight: 1 }}>+</span>
            </div>
          </div>

          {/* Main canvas area */}
          <div style={{ flex: 1, background: "#0a0a18", display: "flex", flexDirection: "column" }}>
            {/* Toolbar */}
            <div style={{ height: 28, background: "#07070f", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", padding: "0 10px", gap: 5 }}>
              {[["T","rgba(255,255,255,0.9)"],["B","#6366f1"],["I","rgba(255,255,255,0.4)"]].map(([l,c],i) => (
                <div key={i} style={{ width: 18, height: 18, borderRadius: 3, background: i===1?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.04)", border: i===1?"1px solid rgba(99,102,241,0.4)":"1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 800, color: c as string }}>{l}</div>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{ padding: "3px 10px", borderRadius: 4, background: "linear-gradient(135deg,#4f46e5,#6366f1)", fontSize: 7, fontWeight: 800, color: "white", boxShadow: "0 0 10px rgba(99,102,241,0.5)" }}>Publicar</div>
            </div>
            {/* Canvas */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 10, background: "repeating-conic-gradient(rgba(255,255,255,0.012) 0% 25%,transparent 0% 50%) 0 0/14px 14px" }}>
              <div style={{ width: 210, height: 210, borderRadius: 10, background: slide.bg, position: "relative", overflow: "hidden", boxShadow: "0 0 0 1px rgba(255,255,255,0.07),0 12px 50px rgba(0,0,0,0.8)", transition: "background 0.7s ease" }}>
                <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(ellipse at 80% 20%,${slide.accent}28 0%,transparent 55%)` }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 30%,rgba(0,0,0,0.45) 100%)" }} />
                <div style={{ position: "absolute", top: 9, left: 9, padding: "3px 7px", borderRadius: 4, background: slide.accent + "22", border: `1px solid ${slide.accent}55`, fontSize: 6, fontWeight: 800, color: slide.accent, letterSpacing: 0.8 }}>{slide.tag}</div>
                <div style={{ position: "absolute", top: 9, right: 9, padding: "2.5px 6px", borderRadius: 4, background: "rgba(79,70,229,0.92)", fontSize: 6, fontWeight: 800, color: "white" }}>IA</div>
                <div style={{ position: "absolute", bottom: 20, left: 11, right: 11 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 900, color: "white", lineHeight: 1.15, textShadow: "0 2px 14px rgba(0,0,0,0.6)" }}>{slide.title}</p>
                  <p style={{ margin: 0, fontSize: 7.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{slide.sub}</p>
                </div>
                <div style={{ position: "absolute", bottom: 7, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 3.5 }}>
                  {[0,1,2,3,4].map(i => <div key={i} style={{ width: i===0?16:4, height: 4, borderRadius: 2, background: i===0?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.22)" }} />)}
                </div>
                {/* Selection handles */}
                <div style={{ position: "absolute", inset: -1, border: "1.5px solid rgba(99,102,241,0.75)", borderRadius: 10, pointerEvents: "none" }}>
                  {[{top:-5,left:-5},{top:-5,right:-5},{bottom:-5,left:-5},{bottom:-5,right:-5}].map((p,i) => (
                    <div key={i} style={{ position: "absolute", width: 8, height: 8, borderRadius: 2, background: "#6366f1", border: "1.5px solid white", ...p }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Properties panel — fiel à imagem de referência */}
          <div style={{ width: 88, background: "#04040e", borderLeft: "1px solid rgba(255,255,255,0.06)", padding: "10px 7px", display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>Editar post</div>

            {/* Cor de fundo */}
            <div>
              <div style={{ fontSize: 5.5, color: "rgba(255,255,255,0.38)", marginBottom: 3 }}>Cor de fundo</div>
              <div style={{ height: 12, borderRadius: 3, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>

            {/* Tamanho */}
            <div>
              <div style={{ fontSize: 5.5, color: "rgba(255,255,255,0.38)", marginBottom: 3 }}>Tamanho</div>
              <div style={{ height: 14, borderRadius: 3, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 5.5, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>1080 x 1080</span>
              </div>
            </div>

            {/* Alinhamento */}
            <div>
              <div style={{ fontSize: 5.5, color: "rgba(255,255,255,0.38)", marginBottom: 3 }}>Alinhamento</div>
              <div style={{ display: "flex", gap: 2 }}>
                {[
                  <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
                  <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></>,
                  <><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
                ].map((path, i) => (
                  <div key={i} style={{ flex: 1, height: 18, borderRadius: 3, background: i===0?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.03)", border: i===0?"1px solid rgba(99,102,241,0.5)":"1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={i===0?"rgba(99,102,241,0.9)":"rgba(255,255,255,0.3)"} strokeWidth="2.5" strokeLinecap="round">{path}</svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Opacidade */}
            <div>
              <div style={{ fontSize: 5.5, color: "rgba(255,255,255,0.38)", marginBottom: 3 }}>Opacidade</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "100%", borderRadius: 2, background: "linear-gradient(to right,#4f46e5,#818cf8)" }} />
                  <div style={{ position: "absolute", right: -4, top: "50%", transform: "translateY(-50%)", width: 9, height: 9, borderRadius: "50%", background: "#818cf8", border: "1.5px solid white", boxShadow: "0 0 5px rgba(129,140,248,0.7)" }} />
                </div>
                <span style={{ fontSize: 5, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>100%</span>
              </div>
            </div>

            {/* Cores */}
            <div>
              <div style={{ fontSize: 5.5, color: "rgba(255,255,255,0.38)", marginBottom: 4 }}>Cores</div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {["#6366f1","#ec4899","#10b981","#f97316","#f8fafc"].map((c,i) => (
                  <div key={i} style={{ width: 13, height: 13, borderRadius: 3, background: c, border: i===0?"2px solid rgba(255,255,255,0.9)":"1px solid rgba(255,255,255,0.12)", boxShadow: i===0?`0 0 6px ${c}80`:undefined }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Base / keyboard */}
      <div style={{
        position: "absolute", bottom: 12, left: 0, right: 0,
        height: 24, borderRadius: "3px 3px 14px 14px",
        background: "linear-gradient(to bottom,#0a0a1a,#060610)",
        border: "1px solid rgba(90,80,255,0.28)",
        borderTop: "2px solid rgba(90,80,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 88, height: 12, borderRadius: 5, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }} />
      </div>

      {/* Reflection */}
      <div style={{ position: "absolute", bottom: 0, left: 18, right: 18, height: 12, background: "linear-gradient(to bottom,rgba(90,80,255,0.12),transparent)", filter: "blur(4px)" }} />

      {/* "Gerando" badge — animado */}
      <div style={{
        position: "absolute", top: 20, right: -16,
        padding: "6px 12px", borderRadius: 11,
        background: "rgba(6,6,18,0.95)", border: "1px solid rgba(99,102,241,0.4)",
        display: "flex", alignItems: "center", gap: 7,
        boxShadow: "0 4px 24px rgba(0,0,0,0.6), 0 0 16px rgba(99,102,241,0.2)",
        whiteSpace: "nowrap", zIndex: 10,
        animation: "float-phone 5s ease-in-out 0.5s infinite",
      }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 8px #6366f1", animation: "pulse-ring 1.5s ease-in-out infinite" }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.82)" }}>Gerando com IA...</span>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────
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
    window.open(KIRVANO_URLS[plan] ?? KIRVANO_URLS.pro, "_blank");
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
            style={{ background: "linear-gradient(135deg,#3b5bdb,#4c6ef5)" }}>
            Ver planos
          </button>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] px-5 md:px-10 pt-20 pb-16 overflow-hidden flex items-center">

        <div className="relative z-10 max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-8">

          {/* Coluna texto */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">

            {/* Logo + brand */}
            <div className="flex items-center gap-3 mb-8">
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: "linear-gradient(135deg,#1e1b4b,#312e81,#4f46e5)",
                boxShadow: "0 0 0 1px rgba(99,102,241,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "logo-pulse 3s ease-in-out infinite",
              }}>
                <AppLogo variant="dark" size={32} showText={false} />
              </div>
              <span className="text-[22px] font-extrabold tracking-tight text-white">xpost</span>
            </div>

            {/* Headline */}
            <h1 className="text-[46px] md:text-[56px] lg:text-[62px] font-black leading-[1.05] tracking-tighter">
              Crie conteúdos<br/>
              que{" "}
              <span style={{ background: "linear-gradient(135deg,#f472b6,#ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                engajam.
              </span>
              <br/>
              Com{" "}
              <span style={{ background: "linear-gradient(135deg,#60a5fa,#818cf8)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                IA.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mt-5 text-[17px] text-gray-400 leading-relaxed max-w-[360px] lg:max-w-none">
              Ideias, estratégias e conteúdos prontos para<br className="hidden lg:block"/>
              crescer seu perfil todos os dias.
            </p>

            {/* Feature bullets */}
            <div className="flex flex-col gap-4 mt-8 text-left w-full max-w-[360px] lg:max-w-none">
              {[
                { icon: <Sparkles size={15} />, title: "Ideias em segundos", desc: "Gere conteúdos criativos com IA em poucos cliques." },
                { icon: <TrendingUp size={15} />, title: "Mais engajamento", desc: "Técnicas testadas para crescer seu perfil todos os dias." },
                { icon: <Zap size={15} />, title: "Prático e rápido", desc: "Do planejamento à publicação, tudo em um só lugar." },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: "linear-gradient(135deg,rgba(79,70,229,0.22),rgba(99,102,241,0.12))",
                    border: "1px solid rgba(99,102,241,0.22)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#818cf8",
                  }}>
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{f.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA principal */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-9 w-full sm:w-auto">
              <Link href="/editor"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-[15px] transition-all hover:scale-105 hover:brightness-110 active:scale-95"
                style={{
                  background: "linear-gradient(135deg,#3730a3,#4f46e5,#6366f1)",
                  boxShadow: "0 8px 32px rgba(79,70,229,0.55), 0 0 0 1px rgba(99,102,241,0.15)",
                }}>
                <Sparkles size={17} />
                Criar meu post grátis
                <ArrowRight size={17} />
              </Link>
              <button onClick={scrollToPricing}
                className="text-sm font-semibold text-gray-400 hover:text-white transition-colors">
                Ver planos →
              </button>
            </div>

            {/* Status pill */}
            <div className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)" }}>
              <Zap size={12} className="text-indigo-400" />
              <span className="text-indigo-300 font-bold">XP</span>
              <span className="text-gray-600 mx-0.5">·</span>
              <span className="text-gray-400">Publicado com IA</span>
            </div>

          </div>

          {/* Coluna visual — mockup animado */}
          <div className="flex flex-shrink-0 items-center justify-center py-4 lg:py-8 lg:w-[580px]">

            {/* Composição phone+laptop — todos os breakpoints           */}
            {/* Fórmula neg-margin: (dim × (1 - scale)) / 2               */}
            {/* xs  scale=0.46 → ml/mr=-189  mt/mb=-135                   */}
            {/* sm  scale=0.82 → ml/mr=-63   mt/mb=-45                    */}
            {/* md  scale=0.62 → ml/mr=-133  mt/mb=-95                    */}
            {/* lg  scale=0.82 → ml/mr=-63   mt/mb=-45                    */}
            {/* xl  scale=0.95 → ml/mr=-18   mt/mb=-13                    */}
            <div className="origin-center
              scale-[0.46]    -mt-[135px]   -mb-[135px]   -ml-[189px]   -mr-[189px]
              sm:scale-[0.82] sm:-mt-[45px] sm:-mb-[45px] sm:-ml-[63px] sm:-mr-[63px]
              md:scale-[0.62] md:-mt-[95px] md:-mb-[95px] md:-ml-[133px] md:-mr-[133px]
              lg:scale-[0.82] lg:-mt-[45px] lg:-mb-[45px] lg:-ml-[63px]  lg:-mr-[63px]
              xl:scale-[0.95] xl:-mt-[13px] xl:-mb-[13px] xl:-ml-[18px]  xl:-mr-[18px]">

              <div style={{ position: "relative", width: 700, height: 500 }}>

                {/* Celular — posição da referência: quase vertical, leve inclinação */}
                <div style={{
                  position: "absolute", left: 8, bottom: 0, zIndex: 2,
                  transform: "perspective(1800px) rotateY(5deg) rotateZ(-4deg) scale(0.68)",
                  transformOrigin: "bottom center",
                  filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.8))",
                }}>
                  <PhoneHologram />
                </div>

                {/* Logo pulando acima da tela */}
                <FloatingLogo />

                {/* Laptop — elemento dominante */}
                <div style={{ position: "absolute", right: 0, bottom: 0, zIndex: 1 }}>
                  <LaptopMockup />
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── MARQUEE ────────────────────────────────────────── */}
      <section className="relative w-full py-10 overflow-hidden">
        <div className="text-center mb-8">
          <p className="text-[11px] text-gray-600 uppercase tracking-[0.2em] font-bold mb-2">Criado com XPost</p>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            Exemplos reais de carrosséis gerados por IA
          </h2>
        </div>
        <div className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right,#060606,transparent)" }} />
        <div className="absolute inset-y-0 right-0 w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left,#060606,transparent)" }} />
        <MarqueeImages />
        <div className="flex justify-center mt-8">
          <button onClick={scrollToPricing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold border border-brand-500/25 text-brand-400 hover:bg-brand-600/8 transition-colors"
            style={{ background: "rgba(59,91,219,0.06)" }}>
            Quero criar assim também <ArrowRight size={13} />
          </button>
        </div>
      </section>

      {/* ── DEPOIMENTOS ────────────────────────────────────── */}
      <section className="px-5 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[11px] text-gray-600 uppercase tracking-[0.2em] font-bold mb-3">Quem já usa</p>
          <h2 className="text-2xl md:text-3xl font-black">O que dizem os criadores</h2>
          <p className="text-sm text-gray-500 mt-2">Resultados reais de pessoas reais — não atores contratados.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div key={t.handle} className="flex flex-col rounded-3xl p-6"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {/* Cabeçalho */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${t.color}cc,${t.color}66)`, border: `1.5px solid ${t.color}55` }}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{t.name}</p>
                  <p className="text-[11px] text-gray-500">{t.handle}</p>
                </div>
                <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0"
                  style={{ background: `${t.color}18`, border: `1px solid ${t.color}30`, color: t.color }}>
                  {t.niche}
                </span>
              </div>

              {/* Estrelas */}
              <div className="flex gap-0.5 mb-3">
                {[1,2,3,4,5].map(i => <Star key={i} size={11} className="text-yellow-400 fill-yellow-400" />)}
              </div>

              {/* Texto */}
              <p className="text-sm text-gray-400 leading-relaxed flex-1 mb-4">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Resultado */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "rgba(59,91,219,0.1)", border: "1px solid rgba(76,110,245,0.2)" }}>
                <TrendingUp size={13} className="text-brand-500 flex-shrink-0" />
                <span className="text-[11px] font-bold text-brand-400">{t.result}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMO FUNCIONA ──────────────────────────────────── */}
      <section className="px-5 py-16 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[11px] text-gray-600 uppercase tracking-[0.2em] font-bold mb-3">Simples assim</p>
          <h2 className="text-3xl md:text-4xl font-black">Do zero ao carrossel publicado</h2>
          <p className="text-gray-500 text-sm mt-2">Sem curva de aprendizado. Sem tutorial de 30 minutos.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Linha conectando os passos (desktop) */}
          <div className="hidden md:block absolute top-8 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(76,110,245,0.4),transparent)" }} />

          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.step} className="flex flex-col items-center text-center">
              {/* Número + ícone */}
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-brand-500 relative z-10"
                  style={{ background: "rgba(59,91,219,0.12)", border: "1.5px solid rgba(76,110,245,0.3)" }}>
                  {step.icon}
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                  style={{ background: "linear-gradient(135deg,#3b5bdb,#4c6ef5)" }}>
                  {i + 1}
                </div>
              </div>
              <h3 className="font-bold text-white text-[15px] mb-2">{step.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-[220px]">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <Link href="/editor"
            className="flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-[15px] transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#3b5bdb,#4c6ef5)", boxShadow: "0 8px 32px rgba(59,91,219,0.35)" }}>
            <Sparkles size={16} /> Testar grátis agora <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── ZORA — ASSISTENTE IA ────────────────────────────── */}
      <ZoraOrb />

      {/* ── CENÁRIO A vs B ─────────────────────────────────── */}
      <section className="px-5 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-[44px] font-black leading-tight max-w-2xl mx-auto">
            Daqui a 3 meses, seu Instagram vai estar{" "}
            <span style={{ background: "linear-gradient(135deg,#4c6ef5,#ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
              crescendo todo dia
            </span>{" "}
            — ou continuar igual?
          </h2>
          <p className="mt-4 text-gray-500 text-sm max-w-md mx-auto">
            A diferença entre esses dois caminhos começa com uma decisão hoje.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-3xl p-7" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500/60 mb-5">Sem XPost</p>
            <ul className="space-y-4">
              {[
                "3h no Canva pra fazer um post que nem chega a 200 views",
                "Acordar sem ideia do que postar — e não postar nada",
                "Visual caseiro que faz o seguidor scrollar sem parar",
                "Meses sem crescimento sem entender o que tá errando",
                "Concorrentes crescendo enquanto seu perfil fica parado",
              ].map((i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                  <X size={15} className="text-red-500/80 flex-shrink-0 mt-0.5" /> {i}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl p-7 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,rgba(59,91,219,0.12),rgba(236,72,153,0.06))", border: "1.5px solid rgba(76,110,245,0.35)" }}>
            <div className="absolute -top-3 right-5 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide"
              style={{ background: "linear-gradient(135deg,#3b5bdb,#4c6ef5)", color: "white" }}>
              ✦ Sua melhor escolha
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500/70 mb-5">Com XPost</p>
            <ul className="space-y-4">
              {[
                "Carrossel profissional pronto antes do café esfriar",
                "Nunca mais sem pauta — a IA pesquisa o que tá em alta no seu nicho",
                "Visual que para o scroll e faz o seguidor salvar e compartilhar",
                "Crescimento real: mais alcance, mais seguidores, mais clientes",
                "Posta todo dia sem estresse — e ainda sobra tempo pra viver",
              ].map((i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-200">
                  <Check size={15} className="text-brand-500 flex-shrink-0 mt-0.5" /> {i}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-center mt-10">
          <button onClick={scrollToPricing}
            className="flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-[15px] transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#3b5bdb,#ec4899)", boxShadow: "0 8px 32px rgba(59,91,219,0.3)" }}>
            Quero começar a crescer <ArrowRight size={17} />
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
            <div key={f.title} className="rounded-2xl p-5 flex gap-4 items-start hover:border-brand-500/30 transition-colors"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-brand-500"
                style={{ background: "rgba(76,110,245,0.12)" }}>
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
            <span style={{ background: "linear-gradient(135deg,#4c6ef5,#ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
              comece hoje
            </span>
          </h2>
          <p className="mt-3 text-gray-500 text-sm">Sem fidelidade. Cancele quando quiser.</p>

          {/* Garantia */}
          <div className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-full"
            style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <Shield size={14} className="text-green-400" />
            <span className="text-sm text-green-300 font-semibold">Garantia de 7 dias — se não gostar, devolvemos 100% do valor</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {PLANS.map((plan) => (
            <div key={plan.key} className="relative flex flex-col rounded-3xl p-7 transition-transform hover:-translate-y-1"
              style={{
                background: plan.highlight ? "linear-gradient(160deg,rgba(59,91,219,0.22),rgba(76,110,245,0.1))" : "rgba(255,255,255,0.03)",
                border: plan.highlight ? "2px solid rgba(76,110,245,0.6)" : "1px solid rgba(255,255,255,0.08)",
                boxShadow: plan.highlight ? "0 0 40px rgba(59,91,219,0.15)" : "none",
              }}>
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wide whitespace-nowrap"
                  style={{ background: plan.highlight ? "linear-gradient(135deg,#3b5bdb,#4c6ef5)" : "rgba(255,255,255,0.1)", color: "white" }}>
                  {plan.badge}
                </div>
              )}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: plan.highlight ? "rgba(76,110,245,0.3)" : "rgba(255,255,255,0.07)" }}>
                  {plan.key === "basic"    && <Zap    size={14} className="text-brand-400" />}
                  {plan.key === "pro"      && <Star   size={14} className="text-brand-400" />}
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
                  ? { background: "linear-gradient(135deg,#3b5bdb,#4c6ef5)", color: "white", boxShadow: "0 4px 20px rgba(59,91,219,0.4)" }
                  : { background: "rgba(255,255,255,0.07)", color: "white", border: "1px solid rgba(255,255,255,0.1)" }}>
                {loadingPlan === plan.key ? <><Loader2 size={14} className="animate-spin" /> Aguarde...</> : plan.cta}
              </button>
              <div className="w-full h-px mb-5" style={{ background: "rgba(255,255,255,0.07)" }} />
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px] text-gray-300">
                    <Check size={14} className="text-brand-500 flex-shrink-0" /> {f}
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
              <div key={p.key} className={`px-3 py-3.5 text-center ${p.highlight ? "text-brand-500" : "text-gray-500"}`}>{p.label}</div>
            ))}
          </div>
          {["Carrosséis ilimitados", "Pesquisa na web", "Editor visual", "Publicação Instagram", "Flyer promocional IA", "Assistente IA (Zora)", "Suporte prioritário"].map((row, ri) => (
            <div key={row} className="grid grid-cols-4 text-[13px]"
              style={{ borderBottom: ri < 6 ? "1px solid rgba(255,255,255,0.05)" : "none", background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
              <div className="px-5 py-3 text-gray-400">{row}</div>
              <div className="px-3 py-3 flex justify-center">
                {ri <= 3 ? <Check size={16} className="text-brand-500" /> : <X size={14} className="text-gray-700" />}
              </div>
              <div className="px-3 py-3 flex justify-center">
                {ri <= 5 ? <Check size={16} className="text-brand-500" /> : <X size={14} className="text-gray-700" />}
              </div>
              <div className="px-3 py-3 flex justify-center">
                <Check size={16} className="text-brand-500" />
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
            <button onClick={() => setLoginOpen(true)} className="text-brand-500 hover:text-brand-400 underline transition-colors">
              Fazer login
            </button>
          </p>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section className="px-5 py-16 max-w-2xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-center mb-2">Dúvidas frequentes</h2>
        <p className="text-center text-gray-500 text-sm mb-8">Se tiver outra dúvida, chama no WhatsApp — respondemos na hora.</p>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.07)", background: openFaq === i ? "rgba(59,91,219,0.06)" : "rgba(255,255,255,0.02)" }}>
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
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 100%,rgba(59,91,219,0.12) 0%,transparent 70%)" }} />
        <p className="text-[11px] text-gray-600 uppercase tracking-[0.2em] font-bold mb-4">Comece hoje</p>
        <h2 className="text-3xl md:text-5xl font-black leading-tight max-w-xl mx-auto mb-5">
          Seu concorrente vai postar{" "}
          <span style={{ background: "linear-gradient(135deg,#4c6ef5,#ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
            amanhã de manhã.
          </span>
        </h2>
        <p className="text-gray-400 text-base mb-3 max-w-md mx-auto">
          Você também pode — e em 30 segundos, com um carrossel que realmente para o scroll.
        </p>
        <p className="text-gray-600 text-sm mb-10">
          Começa grátis. 4 créditos sem cartão. Sem risco.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/editor"
            className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#3b5bdb,#ec4899)", boxShadow: "0 8px 40px rgba(59,91,219,0.4)" }}>
            <Sparkles size={20} /> Começar grátis agora
          </Link>
          <button onClick={scrollToPricing}
            className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl font-semibold text-sm text-gray-300 border border-white/10 hover:border-white/20 hover:text-white transition-all"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            Ver planos e preços →
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-5 flex items-center justify-center gap-1.5">
          <Shield size={11} className="text-green-400" />
          Garantia de 7 dias · A partir de R$29,90/mês · Cancele quando quiser
        </p>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="px-5 py-10 text-center text-xs text-gray-600"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-center mb-3">
          <AppLogo variant="dark" size={24} textClassName="font-black text-gray-400 text-sm" />
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
