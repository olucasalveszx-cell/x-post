"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  ShoppingBag, Upload, Camera, Loader2, AlertCircle, Sparkles,
  Crown, Zap, LogIn, X, DollarSign, Tag, Star, Layers, LayoutTemplate,
  Globe, Instagram, Phone,
} from "lucide-react";
import LoginModal from "@/components/LoginModal";
import { GeneratedContent, Slide, SlideElement } from "@/types";
import { v4 as uuid } from "uuid";

interface Props {
  onGenerate: (slides: Slide[]) => void;
}

const SLIDE_W = 1080;
const SLIDE_H = 1350;

/* ── Selos de oferta ── */
const BADGES = [
  { label: "🔥 SALE",             title: "SALE",               sub: "Promoção imperdível" },
  { label: "🚚 Frete Grátis",     title: "FRETE GRÁTIS",       sub: "Compre agora" },
  { label: "⚡ 50% OFF",          title: "50% OFF",             sub: "Oferta por tempo limitado" },
  { label: "🆕 Lançamento",       title: "LANÇAMENTO",          sub: "Chegou o novo" },
  { label: "⏰ Últimas unidades", title: "ÚLTIMAS UNIDADES",    sub: "Corre, acabando!" },
  { label: "💎 Exclusivo",        title: "EXCLUSIVO",           sub: "Edição limitada" },
] as const;

/* ── Presets de cor para flyer ── */
const PRESETS = [
  { name: "Teal",   bg: "linear-gradient(135deg,#00C9FF 0%,#00B894 100%)", accent: "#FFB300", bar: "#005f4b" },
  { name: "Fogo",   bg: "linear-gradient(135deg,#FF6B35 0%,#c62828 100%)", accent: "#FFD166", bar: "#8b0000" },
  { name: "Royal",  bg: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)", accent: "#FFD700", bar: "#3d2270" },
  { name: "Fresh",  bg: "linear-gradient(135deg,#11998e 0%,#38ef7d 100%)", accent: "#FFD700", bar: "#0a6b60" },
  { name: "Rosa",   bg: "linear-gradient(135deg,#f953c6 0%,#b91d73 100%)", accent: "#FFD700", bar: "#7a0a50" },
  { name: "Dark",   bg: "linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)", accent: "#E94560", bar: "#0a0a15" },
];

function applyAccent(text: string, accentColor: string): string {
  return text.replace(/\[([^\]]+)\]/g, `<span style="color:${accentColor};font-style:normal">$1</span>`);
}

export default function PromoPanel({ onGenerate }: Props) {
  const { data: session } = useSession();
  const [isPro, setIsPro] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [activationToken, setActivationToken] = useState<string | null>(null);

  /* ── Modo: carrossel ou post único ── */
  const [mode, setMode] = useState<"carousel" | "flyer">("flyer");

  /* ── Campos compartilhados ── */
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [benefit, setBenefit] = useState("");
  const [slideCount, setSlideCount] = useState(7);

  /* ── Campos exclusivos do flyer ── */
  const [promoTitle, setPromoTitle] = useState("");
  const [promoSubtitle, setPromoSubtitle] = useState("");
  const [installments, setInstallments] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [colorPreset, setColorPreset] = useState(0);

  /* ── Foto do produto ── */
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState("image/jpeg");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  /* ── Status (carousel) ── */
  const [status, setStatus] = useState<"idle" | "generating" | "images" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [imageProgress, setImageProgress] = useState(0);

  /* ── Status (flyer IA) ── */
  const [flyerStatus, setFlyerStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [flyerError, setFlyerError] = useState("");

  /* ── 3 variações ── */
  const [flyerVariations, setFlyerVariations] = useState<Array<string | null>>([]);
  const [variationsStatus, setVariationsStatus] = useState<"idle" | "generating" | "done" | "error">("idle");

  useEffect(() => {
    const token = localStorage.getItem("xpz_activation_token");
    if (token) { setActivationToken(token); setIsPro(true); return; }
    if (session?.user?.email) {
      fetch("/api/credits")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d?.plan && d.plan !== "free") setIsPro(true); })
        .catch(() => {});
    }
  }, [session]);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPhotoPreview(dataUrl);
      const [header, b64] = dataUrl.split(",");
      const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      setPhotoBase64(b64);
      setPhotoMime(mime);
    };
    reader.readAsDataURL(file);
  };

  /* ──────────────────────────────────────────
     BUILD FLYER (post único)
  ────────────────────────────────────────── */
  const buildPromoFlyer = (): Slide => {
    const preset = PRESETS[colorPreset];
    const W = 1080, H = 1080;
    const els: SlideElement[] = [];
    let topH = 0;

    /* Top bar — website */
    if (website.trim()) {
      els.push({
        id: uuid(), type: "shape",
        x: 0, y: 0, width: W, height: 72,
        style: { fill: preset.bar, stroke: "transparent", strokeWidth: 0, borderRadius: 0 },
      });
      els.push({
        id: uuid(), type: "text",
        x: 0, y: 0, width: W, height: 72,
        content: `🌐 ${website.trim()}`,
        style: { fontSize: 26, fontWeight: "bold", fontFamily: "sans-serif", color: "#ffffff", textAlign: "center", lineHeight: 1 },
      });
      topH = 72;
    }

    /* Círculos decorativos com % */
    const circles = [
      { cx: 860, cy: topH + 130, r: 110 },
      { cx: -45, cy: 430,        r: 85  },
      { cx: 940, cy: 620,        r: 75  },
    ];
    circles.forEach(({ cx, cy, r }) => {
      els.push({
        id: uuid(), type: "shape",
        x: cx - r, y: cy - r, width: r * 2, height: r * 2,
        opacity: 0.9,
        style: { fill: preset.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 50 },
      });
      els.push({
        id: uuid(), type: "text",
        x: cx - r, y: cy - r, width: r * 2, height: r * 2,
        content: "%",
        style: { fontSize: Math.round(r * 0.95), fontWeight: "bold", fontFamily: "sans-serif", color: "#000000", textAlign: "center", lineHeight: 1 },
      });
    });

    /* Subtítulo promocional */
    const subY = topH + 50;
    if (promoSubtitle.trim()) {
      els.push({
        id: uuid(), type: "text",
        x: 60, y: subY, width: 680, height: 60,
        content: promoSubtitle.trim(),
        style: { fontSize: 28, fontWeight: "normal", fontFamily: "sans-serif", color: "rgba(255,255,255,0.92)", textAlign: "left", lineHeight: 1.2 },
      });
    }

    /* Título grande */
    const titleY = promoSubtitle.trim() ? subY + 58 : subY;
    if (promoTitle.trim()) {
      els.push({
        id: uuid(), type: "text",
        x: 60, y: titleY, width: 660, height: 280,
        content: promoTitle.trim(),
        style: { fontSize: 108, fontWeight: "bold", fontFamily: "sans-serif", color: "#ffffff", textAlign: "left", lineHeight: 1.0 },
      });
    }

    /* Foto do produto (direita) */
    if (photoPreview) {
      els.push({
        id: uuid(), type: "image",
        x: 490, y: topH + 60, width: 560, height: 560,
        src: photoPreview,
      });
    }

    /* Nome do produto */
    const infoY = 720;
    if (productName.trim()) {
      els.push({
        id: uuid(), type: "text",
        x: 60, y: infoY, width: 500, height: 60,
        content: productName.trim(),
        style: { fontSize: 34, fontWeight: "bold", fontFamily: "sans-serif", color: "#ffffff", textAlign: "left", lineHeight: 1.2 },
      });
    }

    /* Badge de preço */
    if (price.trim()) {
      const badgeH = installments.trim() ? 130 : 100;
      els.push({
        id: uuid(), type: "shape",
        x: 60, y: infoY + 70, width: 330, height: badgeH,
        style: { fill: preset.accent, stroke: "transparent", strokeWidth: 0, borderRadius: 20 },
      });
      els.push({
        id: uuid(), type: "text",
        x: 60, y: infoY + 70, width: 330, height: installments.trim() ? 80 : badgeH,
        content: `R$ ${price.trim()}`,
        style: { fontSize: 54, fontWeight: "bold", fontFamily: "sans-serif", color: "#000000", textAlign: "center", lineHeight: 1 },
      });
      if (installments.trim()) {
        els.push({
          id: uuid(), type: "text",
          x: 60, y: infoY + 148, width: 330, height: 50,
          content: installments.trim(),
          style: { fontSize: 24, fontWeight: "normal", fontFamily: "sans-serif", color: "rgba(0,0,0,0.72)", textAlign: "center", lineHeight: 1 },
        });
      }
    }

    /* Bottom bar — redes sociais */
    const hasBottom = instagram.trim() || phone.trim();
    if (hasBottom) {
      els.push({
        id: uuid(), type: "shape",
        x: 0, y: H - 80, width: W, height: 80,
        style: { fill: preset.bar, stroke: "transparent", strokeWidth: 0, borderRadius: 0 },
      });
      const parts = [
        instagram.trim() ? `📷 @${instagram.trim()}` : "",
        phone.trim()     ? `📞 ${phone.trim()}`       : "",
      ].filter(Boolean).join("     •     ");
      els.push({
        id: uuid(), type: "text",
        x: 0, y: H - 80, width: W, height: 80,
        content: parts,
        style: { fontSize: 26, fontWeight: "bold", fontFamily: "sans-serif", color: "#ffffff", textAlign: "center", lineHeight: 1 },
      });
    }

    return {
      id: uuid(),
      backgroundColor: "#00C9FF",
      backgroundGradient: preset.bg,
      elements: els,
      width: W,
      height: H,
    };
  };

  /* ──────────────────────────────────────────
     BUILD CAROUSEL (lógica existente)
  ────────────────────────────────────────── */
  const buildSlides = (generated: GeneratedContent): Slide[] => {
    return generated.slides.map((gs, i) => {
      const bg = gs.colorScheme.background;
      const accent = gs.colorScheme.accent;
      const isLast = i === generated.slides.length - 1;
      const elements: SlideElement[] = [];

      if (isLast) {
        elements.push({
          id: uuid(), type: "shape",
          x: 64, y: 64, width: 140, height: 40,
          style: { fill: accent, stroke: "transparent", strokeWidth: 0, borderRadius: 8 },
        });
        elements.push({
          id: uuid(), type: "text",
          x: 64, y: 64, width: 140, height: 40,
          content: "OFERTA ESPECIAL",
          style: { fontSize: 14, fontWeight: "bold", fontFamily: "sans-serif", color: "#000000", textAlign: "center", lineHeight: 1 },
        });
      }

      elements.push({
        id: uuid(), type: "text",
        x: 64, y: SLIDE_H - 520, width: SLIDE_W - 128, height: 340,
        content: applyAccent(gs.title, accent),
        style: { fontSize: 92, fontWeight: "bold", fontFamily: "sans-serif", color: "#ffffff", textAlign: "left", lineHeight: 1.0 },
      });

      elements.push({
        id: uuid(), type: "text",
        x: 64, y: SLIDE_H - 172, width: SLIDE_W - 128, height: 108,
        content: gs.body,
        style: { fontSize: 26, fontWeight: "normal", fontFamily: "sans-serif", color: "rgba(255,255,255,0.65)", textAlign: "left", lineHeight: 1.45 },
      });

      if (isLast && gs.callToAction) {
        elements.push({
          id: uuid(), type: "text",
          x: 64, y: SLIDE_H - 64, width: SLIDE_W - 128, height: 48,
          content: `<span style="color:${accent}">${gs.callToAction}</span>`,
          style: { fontSize: 24, fontWeight: "bold", fontFamily: "sans-serif", color: accent, textAlign: "left", lineHeight: 1 },
        });
      }

      return {
        id: uuid(),
        backgroundColor: bg,
        backgroundImageUrl: undefined,
        backgroundImageLoading: true,
        backgroundGradient: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.80) 40%, rgba(0,0,0,0.30) 70%, rgba(0,0,0,0.10) 100%)",
        elements,
        width: SLIDE_W,
        height: SLIDE_H,
        _imagePrompt: gs.imagePrompt || productName,
        _searchQuery: gs.searchQuery || productName,
      } as Slide & { _imagePrompt: string; _searchQuery: string };
    });
  };

  const generateImages = async (
    slides: (Slide & { _imagePrompt?: string; _searchQuery?: string })[],
    onProgress: (done: number) => void
  ): Promise<Slide[]> => {
    let done = 0;
    const withImages = await Promise.all(
      slides.map(async (slide) => {
        const prompt = (slide as any)._imagePrompt ?? productName;
        try {
          const body: Record<string, any> = {
            prompt,
            imageStyle: isPro ? "cinematico" : "foto_real",
            customerId,
            activationToken,
          };
          if (isPro && photoBase64) {
            body.referenceImageBase64 = photoBase64;
            body.referenceImageMime = photoMime;
          } else if (!isPro) {
            body.prompt = (slide as any)._searchQuery ?? productName;
          }
          const res = await fetch("/api/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          done++;
          onProgress(done);
          const { _imagePrompt, _searchQuery, ...cleanSlide } = slide as any;
          if (data.imageUrl) return { ...cleanSlide, backgroundImageUrl: data.imageUrl, backgroundImageLoading: false };
          return { ...cleanSlide, backgroundImageLoading: false };
        } catch {
          done++;
          onProgress(done);
          const { _imagePrompt, _searchQuery, ...cleanSlide } = slide as any;
          return { ...cleanSlide, backgroundImageLoading: false };
        }
      })
    );
    return withImages;
  };

  const buildFlyerBody = (preset: number) => {
    const body: Record<string, any> = {
      productName, price, promoTitle, promoSubtitle,
      colorPreset: preset, website, instagram, phone,
      customerId, activationToken,
    };
    if (photoBase64 && photoMime) {
      body.productPhotoBase64 = photoBase64;
      body.productPhotoMime = photoMime;
    }
    return body;
  };

  const handleGenerateVariations = async () => {
    if (!promoTitle.trim() && !productName.trim()) return;
    if (!session?.user) { setLoginOpen(true); return; }
    setVariationsStatus("generating");
    setFlyerVariations([null, null, null]);

    const presets = [colorPreset, (colorPreset + 2) % 6, (colorPreset + 4) % 6];
    const results = await Promise.all(presets.map(async (preset) => {
      try {
        const res = await fetch("/api/generate-flyer-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildFlyerBody(preset)),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erro");
        return data.imageUrl as string;
      } catch { return null; }
    }));
    setFlyerVariations(results);
    setVariationsStatus("done");
  };

  const selectVariation = (url: string) => {
    onGenerate([{
      id: uuid(),
      backgroundColor: "#000000",
      backgroundImageUrl: url,
      backgroundImageLoading: false,
      elements: [],
      width: 1080,
      height: 1080,
    }]);
    setVariationsStatus("idle");
    setFlyerVariations([]);
  };

  /* Gerar flyer com IA (Imagen3 / Gemini) */
  const handleGenerateFlyerAI = async () => {
    if (!promoTitle.trim() && !productName.trim()) return;
    if (!session?.user) { setLoginOpen(true); return; }

    setFlyerStatus("generating");
    setFlyerError("");

    try {
      const res = await fetch("/api/generate-flyer-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildFlyerBody(colorPreset)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar imagem");

      const slide: Slide = {
        id: uuid(),
        backgroundColor: "#000000",
        backgroundImageUrl: data.imageUrl,
        backgroundImageLoading: false,
        elements: [],
        width: 1080,
        height: 1080,
      };
      onGenerate([slide]);
      setFlyerStatus("done");
    } catch (err: any) {
      setFlyerError(err.message ?? "Erro desconhecido");
      setFlyerStatus("error");
    }
  };

  /* Fallback: montar flyer sem IA */
  const handleGenerateFlyer = () => {
    if (!productName.trim() && !promoTitle.trim()) return;
    if (!session?.user) { setLoginOpen(true); return; }
    onGenerate([buildPromoFlyer()]);
  };

  const handleGenerateCarousel = async () => {
    if (!productName.trim()) return;
    setError("");
    setImageProgress(0);
    if (!session?.user) { setLoginOpen(true); return; }
    try {
      setStatus("generating");
      const genRes = await fetch("/api/generate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, price, description, benefit, slideCount }),
      });
      const genData: GeneratedContent = await genRes.json();
      if (!genRes.ok) throw new Error((genData as any).error);

      setStatus("images");
      setImageProgress(0);
      const slidesWithoutImages = buildSlides(genData);
      onGenerate(slidesWithoutImages);

      const slidesWithImages = await generateImages(slidesWithoutImages, (done) => setImageProgress(done));
      onGenerate(slidesWithImages);
      setStatus("done");
    } catch (err: any) {
      setError(err.message ?? "Erro desconhecido");
      setStatus("error");
    }
  };

  const goToCheckout = () => {
    window.open("https://pay.kirvano.com/e5bdb60b-3d05-4338-bbb7-59e17b1b636f", "_blank");
  };

  const isLoading = status === "generating" || status === "images";

  /* ────────────────────────── Foto compartilhada ────────────────────────── */
  const photoSection = (
    <div>
      <label className="text-sm text-gray-400 mb-2 flex items-center gap-1.5">
        <Camera size={13} className="text-brand-400" /> Foto do produto
        {isPro && <span className="text-[10px] text-yellow-400 ml-1 flex items-center gap-0.5"><Crown size={10} /> IA usa como referência</span>}
      </label>
      {photoPreview ? (
        <div className="relative rounded-xl overflow-hidden border border-[#2a2a2a] group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoPreview} alt="Produto" className="w-full h-36 object-cover" />
          <button
            onClick={() => { setPhotoBase64(null); setPhotoPreview(null); }}
            className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black/90"
          ><X size={12} /></button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border border-dashed border-[#2a2a2a] hover:border-brand-500/50 hover:bg-brand-500/5 text-gray-500 hover:text-gray-300 transition-all">
            <Upload size={16} /><span className="text-xs">Enviar foto</span>
          </button>
          <button onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border border-dashed border-[#2a2a2a] hover:border-brand-500/50 hover:bg-brand-500/5 text-gray-500 hover:text-gray-300 transition-all">
            <Camera size={16} /><span className="text-xs">Tirar foto</span>
          </button>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">

      {/* Badge Pro/Free */}
      {!session?.user ? (
        <button onClick={() => setLoginOpen(true)}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors">
          <LogIn size={14} /> Entrar para gerar
        </button>
      ) : isPro ? (
        <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
          <Crown size={12} className="text-yellow-400" />
          <span className="text-xs text-yellow-400 font-medium">Pro · {session.user.name?.split(" ")[0]}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2">
          <span className="text-xs text-gray-500">Grátis · {session.user.name?.split(" ")[0]}</span>
          <button onClick={goToCheckout} className="text-[11px] text-brand-400 hover:text-brand-300 underline">Upgrade Pro</button>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold mb-0.5 flex items-center gap-2">
          <ShoppingBag size={18} className="text-brand-500" /> Post Promocional
        </h2>
        <p className="text-xs text-gray-500">Flyer ou carrossel de vendas gerado por IA.</p>
      </div>

      {/* Toggle de modo */}
      <div className="flex rounded-lg border border-[#1e1e1e] overflow-hidden">
        <button
          onClick={() => setMode("flyer")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            mode === "flyer" ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <LayoutTemplate size={13} /> Post Único
        </button>
        <button
          onClick={() => setMode("carousel")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            mode === "carousel" ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Layers size={13} /> Carrossel
        </button>
      </div>

      {/* ═══════════════════ FLYER MODE ═══════════════════ */}
      {mode === "flyer" && (
        <>
          {/* Paleta de cores */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Paleta de cores</label>
            <div className="grid grid-cols-6 gap-1.5">
              {PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => setColorPreset(i)}
                  title={p.name}
                  style={{ background: p.bg }}
                  className={`h-9 rounded-lg transition-all ${
                    colorPreset === i ? "ring-2 ring-white ring-offset-1 ring-offset-[#080808] scale-110" : "opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Foto */}
          {photoSection}

          {/* Selos rápidos */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block flex items-center gap-1.5">
              <Zap size={13} className="text-yellow-400" /> Selos de oferta
            </label>
            <div className="flex flex-wrap gap-1.5">
              {BADGES.map((b) => (
                <button
                  key={b.label}
                  onClick={() => { setPromoTitle(b.title); setPromoSubtitle(b.sub); }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    promoTitle === b.title
                      ? "bg-brand-600 border-brand-500 text-white"
                      : "bg-[#0f0f0f] border-[#1e1e1e] text-gray-400 hover:border-brand-500/50 hover:text-gray-200"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subtítulo */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Texto acima do título</label>
            <input type="text" value={promoSubtitle} onChange={e => setPromoSubtitle(e.target.value)}
              placeholder="ex: Confira nossas ofertas de"
              className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600" />
          </div>

          {/* Título grande */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block flex items-center gap-1.5">
              <Tag size={13} /> Título da promoção <span className="text-red-400">*</span>
            </label>
            <input type="text" value={promoTitle} onChange={e => setPromoTitle(e.target.value)}
              placeholder="ex: Volta às Aulas, Black Friday, Liquidação"
              className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600" />
          </div>

          {/* Nome produto */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Nome do produto</label>
            <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
              placeholder="ex: Tênis Running Pro"
              className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600" />
          </div>

          {/* Preço + Parcelamento */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-gray-400 mb-1 block flex items-center gap-1">
                <DollarSign size={13} /> Preço
              </label>
              <div className="flex items-center gap-1.5 bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 focus-within:border-brand-500">
                <span className="text-xs text-gray-500">R$</span>
                <input type="text" value={price} onChange={e => setPrice(e.target.value)}
                  placeholder="180,00"
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-600" />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Parcelamento</label>
              <input type="text" value={installments} onChange={e => setInstallments(e.target.value)}
                placeholder="em até 3x"
                className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600" />
            </div>
          </div>

          {/* Contato */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Contato (opcional)</label>
            <div className="flex items-center gap-2 bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 focus-within:border-brand-500">
              <Globe size={13} className="text-gray-500 shrink-0" />
              <input type="text" value={website} onChange={e => setWebsite(e.target.value)}
                placeholder="www.seusite.com.br"
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-600" />
            </div>
            <div className="flex items-center gap-2 bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 focus-within:border-brand-500">
              <Instagram size={13} className="text-gray-500 shrink-0" />
              <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)}
                placeholder="seuinstagram"
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-600" />
            </div>
            <div className="flex items-center gap-2 bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 focus-within:border-brand-500">
              <Phone size={13} className="text-gray-500 shrink-0" />
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-600" />
            </div>
          </div>

          {/* Botão principal — IA */}
          <button
            onClick={handleGenerateFlyerAI}
            disabled={(!promoTitle.trim() && !productName.trim()) || flyerStatus === "generating"}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {flyerStatus === "generating"
              ? <><Loader2 size={16} className="animate-spin" /> Gerando com IA...</>
              : <><Sparkles size={16} /> Gerar com IA</>}
          </button>

          {flyerStatus === "generating" && (
            <p className="text-center text-[11px] text-gray-500 -mt-2">
              Gemini / Imagen4 gerando... ~20s
            </p>
          )}

          {flyerStatus === "done" && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-xs text-green-400">
              <Sparkles size={13} /> Flyer gerado! Edite os textos no canvas e publique.
            </div>
          )}

          {flyerStatus === "error" && (
            <div className="flex items-start gap-2 bg-red-900/30 border border-red-800/50 rounded-lg p-3 text-xs text-red-300">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {flyerError}
            </div>
          )}

          {/* Gerar 3 variações */}
          <button
            onClick={handleGenerateVariations}
            disabled={(!promoTitle.trim() && !productName.trim()) || variationsStatus === "generating"}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-brand-500/40 bg-brand-500/10 hover:bg-brand-500/20 font-medium text-sm text-brand-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {variationsStatus === "generating"
              ? <><Loader2 size={15} className="animate-spin" /> Gerando 3 versões...</>
              : <><Layers size={15} /> Gerar 3 versões (escolha a melhor)</>}
          </button>

          {variationsStatus === "generating" && (
            <p className="text-center text-[11px] text-gray-500 -mt-2">
              3 paletas diferentes em paralelo... pode levar ~30s
            </p>
          )}

          {/* Grid de variações */}
          {variationsStatus === "done" && flyerVariations.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Escolha uma versão:</p>
              <div className="grid grid-cols-3 gap-2">
                {flyerVariations.map((url, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    {url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Variação ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-[#2a2a2a]" />
                        <button
                          onClick={() => selectVariation(url)}
                          className="py-1 rounded-md bg-brand-600 hover:bg-brand-700 text-[11px] font-medium text-white transition-colors"
                        >
                          Usar esta
                        </button>
                      </>
                    ) : (
                      <div className="w-full aspect-square rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                        <AlertCircle size={16} className="text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setVariationsStatus("idle"); setFlyerVariations([]); }}
                className="mt-2 text-[11px] text-gray-600 hover:text-gray-400 underline w-full text-center"
              >
                Fechar variações
              </button>
            </div>
          )}

          {/* Fallback manual */}
          <button
            onClick={handleGenerateFlyer}
            disabled={!promoTitle.trim() && !productName.trim()}
            className="text-[11px] text-gray-600 hover:text-gray-400 underline text-center transition-colors disabled:opacity-30"
          >
            ou montar sem IA (instantâneo)
          </button>
        </>
      )}

      {/* ═══════════════════ CAROUSEL MODE ═══════════════════ */}
      {mode === "carousel" && (
        <>
          {photoSection}

          <div>
            <label className="text-sm text-gray-400 mb-1 block flex items-center gap-1.5">
              <Tag size={13} /> Nome do produto <span className="text-red-400">*</span>
            </label>
            <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
              placeholder="ex: Tênis Runner Pro, Bolo de Pote, iPhone 15..."
              className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600" />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block flex items-center gap-1.5">
              <DollarSign size={13} /> Preço
            </label>
            <div className="flex items-center gap-2 bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 focus-within:border-brand-500">
              <span className="text-sm text-gray-500">R$</span>
              <input type="text" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="49,90"
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-600" />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block flex items-center gap-1.5">
              <Star size={13} /> Principal diferencial
            </label>
            <input type="text" value={benefit} onChange={e => setBenefit(e.target.value)}
              placeholder="ex: 100% natural, entrega em 24h, exclusivo..."
              className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600" />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Descrição extra (opcional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Detalhes do produto, público-alvo, promoção..."
              rows={2}
              className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600 resize-none" />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Slides: <span className="text-white font-medium">{slideCount}</span>
            </label>
            <input type="range" min={4} max={12} value={slideCount}
              onChange={e => setSlideCount(Number(e.target.value))}
              className="w-full accent-brand-500" />
            <div className="flex justify-between text-xs text-gray-600 mt-1"><span>4</span><span>12</span></div>
          </div>

          {!isPro && (
            <button onClick={goToCheckout}
              className="flex items-center justify-center gap-2 py-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-xs font-medium transition-colors">
              <Zap size={12} /> Pro: IA usa sua foto como referência visual
            </button>
          )}

          <button onClick={handleGenerateCarousel} disabled={!productName.trim() || isLoading}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {status === "generating" && "Criando copy de vendas..."}
            {status === "images" && `Gerando imagens... (${imageProgress}/${slideCount})`}
            {(status === "idle" || status === "done" || status === "error") && "Gerar Carrossel"}
          </button>

          {status === "images" && (
            <div className="w-full bg-[#1e1e1e] rounded-full h-1.5 overflow-hidden">
              <div className="bg-brand-500 h-full transition-all duration-300"
                style={{ width: `${(imageProgress / slideCount) * 100}%` }} />
            </div>
          )}

          {status === "done" && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-xs text-green-400">
              <ShoppingBag size={13} /> Carrossel gerado! Edite os textos e publique.
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start gap-2 bg-red-900/30 border border-red-800/50 rounded-lg p-3 text-sm text-red-300">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />{error}
            </div>
          )}
        </>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
