"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Newspaper, TrendingUp, Flame, Bookmark, BookmarkCheck,
  ExternalLink, RefreshCw, Loader2, X, Sparkles, LayoutGrid,
  Video, FileText, Lightbulb, ArrowLeft, Search,
  AlertCircle, CheckCircle2, Copy, Send,
} from "lucide-react";
import { v4 as uuid } from "uuid";
import type { Slide, SlideElement } from "@/types";
import type { NewsItem, TrendingTopic } from "@/lib/news";
import type { NewsAnalysis } from "@/app/api/news/analyze/route";
import type { GenerationType } from "@/app/api/news/generate/route";
import { useRouter } from "next/navigation";

// ─── Constantes ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "geral",                   label: "Geral" },
  { id: "tecnologia",              label: "Tecnologia" },
  { id: "inteligencia_artificial", label: "IA" },
  { id: "negocios",                label: "Negócios" },
  { id: "marketing",               label: "Marketing" },
  { id: "vendas",                  label: "Vendas" },
  { id: "financas",                label: "Finanças" },
  { id: "investimentos",           label: "Investimentos" },
  { id: "criptomoedas",            label: "Cripto" },
  { id: "startups",                label: "Startups" },
  { id: "esportes",                label: "Esportes" },
  { id: "futebol",                 label: "Futebol" },
  { id: "musica",                  label: "Música" },
  { id: "entretenimento",          label: "Entretenimento" },
  { id: "saude",                   label: "Saúde" },
  { id: "politica",                label: "Política" },
  { id: "mundo",                   label: "Mundo" },
  { id: "brasil",                  label: "Brasil" },
  { id: "educacao",                label: "Educação" },
  { id: "desenvolvimento_pessoal", label: "Dev. Pessoal" },
];

const VIRAL_CONFIG = {
  alta:    { icon: "🔥", label: "Alta Viralização",  className: "bg-orange-500/20 text-orange-400 border border-orange-500/30" },
  media:   { icon: "⚡", label: "Média Viralização", className: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
  nichado: { icon: "📌", label: "Nichado",            className: "bg-slate-500/20 text-slate-400 border border-slate-500/30"  },
};

const GEN_ACTIONS: Array<{ type: GenerationType; icon: React.ReactNode; label: string; color: string }> = [
  { type: "carousel", icon: <LayoutGrid size={14} />, label: "Carrossel",  color: "#6366f1" },
  { type: "reels",    icon: <Video      size={14} />, label: "Reels",      color: "#ec4899" },
  { type: "post",     icon: <FileText   size={14} />, label: "Post",       color: "#10b981" },
  { type: "ideas",    icon: <Lightbulb  size={14} />, label: "5 Ideias",   color: "#f59e0b" },
];

// ─── Utilidades ────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

function ViralBadge({ label }: { label: string }) {
  const cfg = VIRAL_CONFIG[label as keyof typeof VIRAL_CONFIG] ?? VIRAL_CONFIG.nichado;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Card de notícia ────────────────────────────────────────────────────────

function NewsCard({
  news, saved, onSelect, onSave, onGenerate,
}: {
  news: NewsItem;
  saved: boolean;
  onSelect: () => void;
  onSave: () => void;
  onGenerate: (type: GenerationType) => void;
}) {
  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden hover:border-white/18 active:scale-[0.99] transition-all group flex flex-col">
      {/* Imagem */}
      <div
        className="relative bg-gradient-to-br from-indigo-900/30 to-purple-900/30 cursor-pointer overflow-hidden"
        style={{ aspectRatio: "16/9" }}
        onClick={onSelect}
      >
        {news.image_url ? (
          <img
            src={news.image_url}
            alt={news.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Newspaper size={28} className="text-white/15" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-2 left-2">
          <ViralBadge label={news.viral_label} />
        </div>
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => { e.stopPropagation(); onSave(); }}
            className={`p-1.5 rounded-full backdrop-blur-sm transition-all ${saved ? "bg-indigo-500 text-white" : "bg-black/40 text-white/60 hover:text-white"}`}
          >
            {saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </button>
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center gap-1.5 text-[10px] text-white/60">
            <span className="font-medium truncate">{news.source}</span>
            <span>·</span>
            <span className="shrink-0">{timeAgo(news.published_at || news.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-col flex-1 p-3 gap-2.5">
        <h3
          className="text-sm font-semibold text-white line-clamp-3 cursor-pointer hover:text-indigo-300 active:text-indigo-300 transition-colors leading-snug"
          onClick={onSelect}
        >
          {news.title}
        </h3>

        {/* Botões de geração — touch-friendly */}
        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/8">
          {GEN_ACTIONS.map((a) => (
            <button
              key={a.type}
              onClick={() => onGenerate(a.type)}
              className="flex items-center justify-center gap-1.5 text-xs py-2 px-2 rounded-xl bg-white/6 hover:bg-white/12 active:bg-white/18 text-white/65 hover:text-white transition-all"
            >
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Modal de notícia ───────────────────────────────────────────────────────

function NewsModal({
  news, saved, onClose, onSave, onGenerate,
}: {
  news: NewsItem;
  saved: boolean;
  onClose: () => void;
  onSave: () => void;
  onGenerate: (type: GenerationType) => void;
}) {
  const [analysis, setAnalysis]       = useState<NewsAnalysis | null>(null);
  const [analyzing, setAnalyzing]     = useState(false);
  const [analyzeError, setAnalyzeErr] = useState("");
  const [activeTab, setActiveTab]     = useState<"resumo" | "pontos" | "keywords" | "oportunidades">("resumo");

  useEffect(() => {
    let cancelled = false;
    setAnalyzing(true);
    setAnalyzeErr("");
    fetch("/api/news/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newsId: news.id }),
    })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { if (d.analysis) setAnalysis(d.analysis); else setAnalyzeErr(d.error || "Erro na análise"); } })
      .catch(() => { if (!cancelled) setAnalyzeErr("Erro de conexão"); })
      .finally(() => { if (!cancelled) setAnalyzing(false); });
    return () => { cancelled = true; };
  }, [news.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative">
          {news.image_url ? (
            <img src={news.image_url} alt={news.title} className="w-full h-48 object-cover rounded-t-2xl" />
          ) : (
            <div className="w-full h-32 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-t-2xl flex items-center justify-center">
              <Newspaper size={40} className="text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-t-2xl" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all"
          >
            <X size={16} />
          </button>
          <div className="absolute bottom-3 left-4 right-12">
            <ViralBadge label={news.viral_label} />
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Título e meta */}
          <div>
            <h2 className="text-lg font-bold text-white leading-snug mb-2">{news.title}</h2>
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span>{news.source}</span>
              <span>•</span>
              <span>{timeAgo(news.published_at || news.created_at)}</span>
              <span>•</span>
              <span className="capitalize">{news.category.replace(/_/g, " ")}</span>
            </div>
          </div>

          {/* Análise IA */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Análise IA</span>
              {analyzing && <Loader2 size={12} className="text-indigo-400 animate-spin ml-auto" />}
            </div>

            {analyzing && (
              <div className="space-y-2">
                {[80, 60, 70].map((w, i) => (
                  <div key={i} className="h-3 bg-white/5 rounded animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
            )}

            {analyzeError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle size={12} /> {analyzeError}
              </p>
            )}

            {analysis && (
              <>
                {/* Tabs */}
                <div className="flex gap-1 mb-3 overflow-x-auto">
                  {(["resumo", "pontos", "keywords", "oportunidades"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`text-[10px] px-3 py-1 rounded-full whitespace-nowrap transition-all ${
                        activeTab === tab
                          ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/40"
                          : "text-white/40 hover:text-white/70"
                      }`}
                    >
                      {tab === "resumo" ? "Resumo" : tab === "pontos" ? "Pontos-chave" : tab === "keywords" ? "Palavras-chave" : "Oportunidades"}
                    </button>
                  ))}
                </div>

                {activeTab === "resumo" && (
                  <div className="space-y-2">
                    <p className="text-sm text-white/80 leading-relaxed">{analysis.summary}</p>
                    <p className="text-xs text-white/40 italic">Potencial viral: {analysis.viralPotential}</p>
                    <p className="text-xs text-white/40">Público-alvo: {analysis.targetAudience}</p>
                  </div>
                )}

                {activeTab === "pontos" && (
                  <ul className="space-y-1.5">
                    {analysis.keyPoints.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                        <CheckCircle2 size={12} className="text-indigo-400 mt-0.5 shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                )}

                {activeTab === "keywords" && (
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords.map((kw, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                {activeTab === "oportunidades" && (
                  <ul className="space-y-2">
                    {analysis.opportunities.map((op, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                        <Lightbulb size={12} className="text-yellow-400 mt-0.5 shrink-0" />
                        {op}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Conteúdo completo */}
          {(news.content || news.description) && (
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2 font-semibold">Conteúdo da Notícia</p>
              <p className="text-sm text-white/60 leading-relaxed line-clamp-6">
                {news.content || news.description}
              </p>
            </div>
          )}

          {/* Ações de geração */}
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2 font-semibold">Gerar Conteúdo</p>
            <div className="grid grid-cols-2 gap-2">
              {GEN_ACTIONS.map((a) => (
                <button
                  key={a.type}
                  onClick={() => onGenerate(a.type)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-all border border-white/10 hover:border-white/20"
                  style={{ "--hover-color": a.color } as any}
                >
                  <span style={{ color: a.color }}>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-2 border-t border-white/10">
            <a
              href={news.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/10"
            >
              <ExternalLink size={12} /> Ver notícia original
            </a>
            <button
              onClick={onSave}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all border ${
                saved
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border-white/10"
              }`}
            >
              {saved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
              {saved ? "Salvo" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de Resultado de Geração ─────────────────────────────────────────

function GenerationModal({
  type, result, newsTitle, onClose, onSendToEditor, sendingToEditor,
}: {
  type: GenerationType;
  result: any;
  newsTitle: string;
  onClose: () => void;
  onSendToEditor?: (slides: any[]) => void;
  sendingToEditor?: boolean;
}) {
  const [copied, setCopied] = useState("");

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {type === "carousel" && <><LayoutGrid size={16} className="text-indigo-400" /> Carrossel Gerado</>}
              {type === "reels"    && <><Video      size={16} className="text-pink-400"   /> Roteiro de Reels</>}
              {type === "post"     && <><FileText   size={16} className="text-emerald-400"/> Posts Gerados</>}
              {type === "ideas"    && <><Lightbulb  size={16} className="text-yellow-400" /> 5 Ideias de Conteúdo</>}
            </h3>
            <p className="text-xs text-white/40 mt-0.5 truncate max-w-xs">{newsTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {type === "carousel" && result?.slides && (
            <>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => onSendToEditor?.(result.slides)}
                  disabled={sendingToEditor}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sendingToEditor ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  {sendingToEditor ? "Buscando imagens..." : "Abrir no Editor"}
                </button>
              </div>
              {result.slides.map((slide: any, i: number) => (
                <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-1">
                  <span className="text-[10px] text-white/30 uppercase font-semibold">Slide {i + 1}</span>
                  <p className="font-bold text-white text-sm">{slide.title}</p>
                  <p className="text-sm text-white/60 leading-relaxed">{slide.body}</p>
                  {slide.callToAction && (
                    <p className="text-xs text-indigo-400 italic">CTA: {slide.callToAction}</p>
                  )}
                </div>
              ))}
            </>
          )}

          {type === "reels" && result && (
            <div className="space-y-3">
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                <p className="text-[10px] text-orange-400 uppercase font-semibold mb-1">Hook</p>
                <p className="text-sm text-white/80">{result.hook}</p>
              </div>
              {result.script?.map((scene: any, i: number) => (
                <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-[10px] text-white/30 font-semibold">{scene.time}</span>
                  <p className="text-sm text-white mt-1">{scene.text}</p>
                  <p className="text-xs text-white/40 mt-1 italic">Visual: {scene.visual}</p>
                </div>
              ))}
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-[10px] text-emerald-400 uppercase font-semibold mb-1">CTA</p>
                <p className="text-sm text-white/80">{result.cta}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-white/40 uppercase font-semibold">Legenda</p>
                  <button onClick={() => copy(result.caption, "caption")} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    {copied === "caption" ? <CheckCircle2 size={10} /> : <Copy size={10} />} Copiar
                  </button>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{result.caption}</p>
              </div>
            </div>
          )}

          {type === "post" && result && (
            <div className="space-y-3">
              {[
                { key: "instagram", label: "Instagram",  color: "#e1306c" },
                { key: "linkedin",  label: "LinkedIn",   color: "#0077b5" },
                { key: "facebook",  label: "Facebook",   color: "#1877f2" },
                { key: "twitter",   label: "X/Twitter",  color: "#1d9bf0" },
              ].map(({ key, label, color }) => result[key] && (
                <div key={key} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                    <button onClick={() => copy(result[key], key)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      {copied === key ? <CheckCircle2 size={10} /> : <Copy size={10} />} Copiar
                    </button>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{result[key]}</p>
                </div>
              ))}
            </div>
          )}

          {type === "ideas" && result?.ideas && (
            <div className="space-y-3">
              {result.ideas.map((idea: any, i: number) => (
                <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-2 py-0.5 bg-white/10 rounded-full text-white/50 capitalize">{idea.type}</span>
                        <ViralBadge label={idea.viralPotential} />
                      </div>
                      <p className="text-sm font-semibold text-white">{idea.title}</p>
                    </div>
                    <span className="text-2xl">{i + 1}</span>
                  </div>
                  <p className="text-xs text-indigo-300 italic">{idea.angle}</p>
                  <p className="text-xs text-white/50">Hook: <span className="text-white/70">{idea.hook}</span></p>
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-white/10">
                    {idea.slides?.map((s: string, j: number) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 bg-white/5 text-white/50 rounded-md">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Construtor de slides reais com imagem e perfil IG ─────────────────────

function buildNewsSlides(
  rawSlides: Array<{ title: string; body: string; callToAction?: string }>,
  newsImageUrl: string | null,
  igAccount: { username?: string; name?: string; picture?: string } | null,
  slideImages: (string | null)[] = [],
): Slide[] {
  const W = 1080, H = 1350;
  const displayName = igAccount?.name ?? igAccount?.username ?? "Meu Perfil";
  // profileHandle é armazenado SEM @; a renderização já adiciona o @
  const handle = igAccount?.username ?? "meuperfil";
  const picture = igAccount?.picture ?? "";
  const total = rawSlides.length;

  return rawSlides.map((raw, i): Slide => {
    const isFirst = i === 0;
    const isLast = i === total - 1;
    // Slide 1 usa a foto da notícia; demais usam imagem buscada por assunto
    const slideImg = isFirst ? newsImageUrl : (slideImages[i - 1] ?? null);

    const elements: SlideElement[] = [];
    let bgImageUrl: string | undefined;
    let bgGradient: string | undefined;

    if (isFirst && slideImg) {
      // Slide 1: imagem cobre o topo (52% da altura)
      elements.push({
        id: uuid(), type: "image",
        x: 0, y: 0, width: W, height: Math.round(H * 0.52),
        src: slideImg,
        zIndex: 1,
      });
      // Gradient de fade para o fundo escuro
      elements.push({
        id: uuid(), type: "shape",
        x: 0, y: Math.round(H * 0.3), width: W, height: Math.round(H * 0.25),
        style: { fill: "rgba(10,10,10,0)", stroke: "none", strokeWidth: 0, borderRadius: 0 },
        gradient: "linear-gradient(to bottom, rgba(10,10,10,0), rgba(10,10,10,1))",
        zIndex: 2,
      });
    } else if (!isFirst && slideImg) {
      // Demais slides: imagem como backgroundImageUrl com gradiente leve (sem camada separada)
      bgImageUrl = slideImg;
      bgGradient = "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 35%, rgba(0,0,0,0.12) 65%, rgba(0,0,0,0) 100%)";
    }

    // Perfil IG — locked para não ser deletado acidentalmente
    elements.push({
      id: uuid(), type: "profile",
      x: 40, y: isFirst && newsImageUrl ? Math.round(H * 0.52) + 24 : 40,
      width: 620, height: 72,
      profileName: displayName,
      profileHandle: handle,
      profileVerified: false,
      profileNameColor: "#ffffff",
      profileHandleColor: "rgba(255,255,255,0.55)",
      zIndex: 10,
      locked: true,
      ...(picture ? { src: picture } : {}),
    });

    // Numeração dos slides (exceto primeiro e último)
    if (!isFirst && !isLast && total > 2) {
      elements.push({
        id: uuid(), type: "text",
        x: W - 130, y: 44, width: 90, height: 36,
        content: `${i + 1}/${total}`,
        style: { fontSize: 22, fontWeight: "normal", fontFamily: "sans-serif", color: "rgba(255,255,255,0.35)", textAlign: "right", lineHeight: 1 },
        zIndex: 10,
      });
    }

    // Título
    const titleY = isFirst && newsImageUrl
      ? Math.round(H * 0.52) + 116
      : (isFirst ? 140 : 160);
    elements.push({
      id: uuid(), type: "text",
      x: 40, y: titleY, width: W - 80, height: 240,
      content: raw.title,
      style: {
        fontSize: isFirst ? 54 : 50,
        fontWeight: "bold",
        fontFamily: "sans-serif",
        color: "#ffffff",
        textAlign: "left",
        lineHeight: 1.25,
      },
      zIndex: 10,
    });

    // Corpo / descrição
    elements.push({
      id: uuid(), type: "text",
      x: 40, y: titleY + 260, width: W - 80, height: 260,
      content: raw.body,
      style: {
        fontSize: 30,
        fontWeight: "normal",
        fontFamily: "sans-serif",
        color: "rgba(255,255,255,0.72)",
        textAlign: "left",
        lineHeight: 1.5,
      },
      zIndex: 10,
    });

    // CTA no último slide
    if (isLast && raw.callToAction) {
      elements.push({
        id: uuid(), type: "text",
        x: 40, y: H - 180, width: W - 80, height: 120,
        content: raw.callToAction,
        style: {
          fontSize: 28,
          fontWeight: "bold",
          fontFamily: "sans-serif",
          color: "#a78bfa",
          textAlign: "center",
          lineHeight: 1.4,
        },
        zIndex: 10,
      });
    }

    const slide: Slide = {
      id: uuid(),
      backgroundColor: "#0a0a0a",
      ...(bgImageUrl ? { backgroundImageUrl: bgImageUrl } : {}),
      ...(bgGradient ? { backgroundGradient: bgGradient } : {}),
      elements,
      width: W,
      height: H,
    };

    return slide;
  });
}

// ─── Componente principal ───────────────────────────────────────────────────

export default function NewsPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("geral");
  const [news, setNews]                     = useState<NewsItem[]>([]);
  const [trending, setTrending]             = useState<TrendingTopic[]>([]);
  const [savedIds, setSavedIds]             = useState<Set<string>>(new Set());
  const [loadingNews, setLoadingNews]       = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [selectedNews, setSelectedNews]     = useState<NewsItem | null>(null);
  const [generatingFor, setGeneratingFor]   = useState<string | null>(null);
  const [genResult, setGenResult]           = useState<{ type: GenerationType; result: any; news: NewsItem } | null>(null);
  const [activeView, setActiveView]         = useState<"feed" | "saved">("feed");
  const [savedNews, setSavedNews]           = useState<NewsItem[]>([]);
  const [loadingSaved, setLoadingSaved]     = useState(false);
  const [sendingToEditor, setSendingToEditor] = useState(false);
  const [lastHour, setLastHour]               = useState(false);
  const [searchQuery, setSearchQuery]         = useState("");
  const [showSearch, setShowSearch]           = useState(false);
  const trendingRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Busca notícias por categoria
  const fetchNews = useCallback(async (category: string, force = false) => {
    setLoadingNews(true);
    try {
      const params = new URLSearchParams({ category });
      if (force) params.set("refresh", "true");
      const res = await fetch(`/api/news?${params}`);
      const data = await res.json();
      setNews(data.news ?? []);
    } catch {
      setNews([]);
    } finally {
      setLoadingNews(false);
    }
  }, []);

  // Modo grandão: todas as categorias em paralelo, últimas 3h, até 50 artigos
  const fetchRecentAll = useCallback(async () => {
    setLoadingNews(true);
    try {
      const res = await fetch("/api/news?hours=3&all=true&limit=50");
      const data = await res.json();
      setNews(data.news ?? []);
    } catch {
      setNews([]);
    } finally {
      setLoadingNews(false);
    }
  }, []);

  // Busca tendências
  const fetchTrending = useCallback(async () => {
    try {
      const res = await fetch("/api/news/trending");
      const data = await res.json();
      setTrending(data.trending ?? []);
    } catch {}
  }, []);

  // Busca salvas do usuário
  const fetchSaved = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const res = await fetch("/api/news/saved");
      const data = await res.json();
      setSavedNews(data.saved ?? []);
      setSavedIds(new Set((data.saved ?? []).map((n: NewsItem) => n.id)));
    } catch {} finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    // fetchNews é controlado pelo segundo effect (evita dupla chamada no mount)
    fetchTrending();
    fetchSaved();
  }, []);

  useEffect(() => {
    if (lastHour) fetchRecentAll();
    else fetchNews(activeCategory);
  }, [activeCategory, lastHour]); // dispara no mount com valores iniciais

  // Salvar / remover notícia
  const toggleSave = useCallback(async (news: NewsItem) => {
    const isSaved = savedIds.has(news.id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(news.id); else next.add(news.id);
      return next;
    });

    await fetch("/api/news/saved", {
      method: isSaved ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newsId: news.id }),
    });

    if (!isSaved) {
      setSavedNews((prev) => [news, ...prev.filter((n) => n.id !== news.id)]);
    } else {
      setSavedNews((prev) => prev.filter((n) => n.id !== news.id));
    }
  }, [savedIds]);

  // Gerar conteúdo
  const handleGenerate = useCallback(async (news: NewsItem, type: GenerationType) => {
    setGeneratingFor(`${news.id}-${type}`);
    try {
      const res  = await fetch("/api/news/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsId: news.id, type }),
      });
      const data = await res.json();
      if (data.result) {
        setGenResult({ type, result: data.result, news });
        setSelectedNews(null);
      } else {
        alert(data.error || "Erro ao gerar conteúdo");
      }
    } catch {
      alert("Erro de conexão");
    } finally {
      setGeneratingFor(null);
    }
  }, []);

  // Enviar carrossel para o editor — busca imagens por assunto para cada slide
  const handleSendToEditor = useCallback(async (rawSlides: any[], news: NewsItem) => {
    setSendingToEditor(true);
    try {
      const igAccount = JSON.parse(localStorage.getItem("ig_account") ?? "null");

      // Busca e proxia imagens para todos os slides em paralelo (base64 evita CORS no canvas)
      const toDataUrl = (d: { base64: string; mimeType: string } | null) =>
        d ? `data:${d.mimeType};base64,${d.base64}` : null;

      const proxyUrl = async (url: string | null): Promise<string | null> => {
        if (!url) return null;
        try {
          const r = await fetch("/api/image-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          if (!r.ok) return null;
          return toDataUrl(await r.json());
        } catch { return null; }
      };

      const [extraImages, proxiedNewsImage] = await Promise.all([
        Promise.all(
          rawSlides.slice(1).map(async (slide: any) => {
            try {
              const query = `${slide.title} ${news.keywords?.[0] ?? ""}`.trim();
              const res = await fetch("/api/image-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
              });
              const data = await res.json();
              return proxyUrl((data.images?.[0]?.url as string) ?? null);
            } catch { return null; }
          })
        ),
        proxyUrl(news.image_url),
      ]);

      const properSlides = buildNewsSlides(rawSlides, proxiedNewsImage ?? news.image_url, igAccount, extraImages);
      localStorage.setItem("xpost_news_carousel", JSON.stringify(properSlides));
      router.push("/editor?from=news");
    } finally {
      setSendingToEditor(false);
    }
  }, [router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (lastHour) await fetchRecentAll();
    else await fetchNews(activeCategory, true);
    setRefreshing(false);
  };

  const baseNews    = activeView === "saved" ? savedNews : news;
  const displayNews = searchQuery.trim()
    ? baseNews.filter((n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.source.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : baseNews;

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">

      {/* ── Header sticky ── */}
      <div className="sticky top-0 z-20 bg-[#080808]/95 backdrop-blur-md border-b border-white/8">
        <div className="flex items-center gap-2 px-3 py-2.5 max-w-5xl mx-auto">
          <button
            onClick={() => router.push("/editor")}
            className="p-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all shrink-0"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Newspaper size={18} className="text-indigo-400 shrink-0" />
            <h1 className="text-sm font-bold text-white truncate">Notícias em Alta</h1>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Search toggle */}
            <button
              onClick={() => {
                setShowSearch((v) => {
                  if (!v) setTimeout(() => searchInputRef.current?.focus(), 80);
                  else setSearchQuery("");
                  return !v;
                });
              }}
              className={`p-2 rounded-xl transition-all ${showSearch ? "bg-indigo-500/20 text-indigo-300" : "hover:bg-white/10 text-white/50 hover:text-white"}`}
            >
              <Search size={16} />
            </button>

            {/* Última 1h */}
            <button
              onClick={() => setLastHour((v) => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${lastHour ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" : "hover:bg-white/10 text-white/50 hover:text-white"}`}
            >
              <Flame size={12} />
              <span className="hidden sm:inline">1h</span>
              <span className="sm:hidden">1h</span>
            </button>

            {/* Salvas */}
            <button
              onClick={() => { setActiveView(activeView === "saved" ? "feed" : "saved"); if (activeView !== "saved") fetchSaved(); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${activeView === "saved" ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "hover:bg-white/10 text-white/50 hover:text-white"}`}
            >
              <Bookmark size={12} />
              {savedIds.size > 0 && <span>{savedIds.size}</span>}
            </button>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all disabled:opacity-40"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="px-3 pb-2.5 max-w-5xl mx-auto">
            <div className="flex items-center gap-2 bg-white/8 border border-white/12 rounded-xl px-3 py-2">
              <Search size={14} className="text-white/40 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar notícias..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-white/40 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Categorias (só no feed) ── */}
      {activeView === "feed" && !searchQuery && (
        <div className="border-b border-white/8 bg-[#080808]">
          <div className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none max-w-5xl mx-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  activeCategory === cat.id
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                    : "bg-white/6 text-white/55 hover:bg-white/12 hover:text-white border border-white/8"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 max-w-5xl mx-auto w-full px-3 py-3 space-y-4">

        {/* Tendências */}
        {trending.length > 0 && activeView === "feed" && !searchQuery && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={13} className="text-orange-400" />
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Em alta agora</span>
            </div>
            <div ref={trendingRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {trending.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setActiveView("feed"); setActiveCategory(t.category); setLastHour(false); setSearchQuery(""); }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/30 rounded-full text-xs text-white/70 hover:text-white transition-all"
                >
                  <Flame size={10} className="text-orange-400" />
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Label de contexto */}
        {(searchQuery || activeView === "saved" || lastHour) && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            {searchQuery   && <span>Resultados para "<span className="text-white/70">{searchQuery}</span>"</span>}
            {!searchQuery && activeView === "saved" && <span>Notícias salvas</span>}
            {!searchQuery && lastHour && activeView !== "saved" && <span className="flex items-center gap-1"><Flame size={11} className="text-orange-400" /> Última hora</span>}
            <span className="ml-auto">{displayNews.length} notícias</span>
          </div>
        )}

        {/* Grid */}
        {loadingNews || (activeView === "saved" && loadingSaved) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-44 bg-white/5" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-white/5 rounded-full w-3/4" />
                  <div className="h-3 bg-white/5 rounded-full w-1/2" />
                  <div className="h-8 bg-white/5 rounded-xl mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayNews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/30">
            <Newspaper size={44} className="mb-4 opacity-30" />
            <p className="text-sm font-medium">
              {searchQuery
                ? `Nenhum resultado para "${searchQuery}"`
                : activeView === "saved"
                ? "Nenhuma notícia salva ainda"
                : "Nenhuma notícia encontrada"}
            </p>
            {activeView === "feed" && !searchQuery && (
              <button onClick={handleRefresh} className="mt-4 flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2 rounded-xl transition-all">
                <RefreshCw size={13} /> Atualizar
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayNews.map((n) => (
              <div key={n.id} className="relative">
                {generatingFor?.startsWith(n.id) && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl gap-2">
                    <Loader2 size={22} className="text-indigo-400 animate-spin" />
                    <span className="text-xs text-white/60">Gerando...</span>
                  </div>
                )}
                <NewsCard
                  news={n}
                  saved={savedIds.has(n.id)}
                  onSelect={() => setSelectedNews(n)}
                  onSave={() => toggleSave(n)}
                  onGenerate={(type) => handleGenerate(n, type)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de notícia */}
      {selectedNews && (
        <NewsModal
          news={selectedNews}
          saved={savedIds.has(selectedNews.id)}
          onClose={() => setSelectedNews(null)}
          onSave={() => toggleSave(selectedNews)}
          onGenerate={(type) => {
            setSelectedNews(null);
            handleGenerate(selectedNews, type);
          }}
        />
      )}

      {/* Modal de resultado de geração */}
      {genResult && (
        <GenerationModal
          type={genResult.type}
          result={genResult.result}
          newsTitle={genResult.news.title}
          onClose={() => setGenResult(null)}
          onSendToEditor={(slides) => handleSendToEditor(slides, genResult.news)}
          sendingToEditor={sendingToEditor}
        />
      )}
    </div>
  );
}
