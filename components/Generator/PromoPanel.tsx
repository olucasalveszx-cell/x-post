"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  ShoppingBag, Upload, Camera, Loader2, AlertCircle, Sparkles,
  Crown, Zap, LogIn, X, DollarSign, Tag, Star,
} from "lucide-react";
import LoginModal from "@/components/LoginModal";
import { GeneratedContent, Slide } from "@/types";
import { v4 as uuid } from "uuid";

interface Props {
  onGenerate: (slides: Slide[]) => void;
}

const SLIDE_W = 1080;
const SLIDE_H = 1350;

function applyAccent(text: string, accentColor: string): string {
  return text.replace(/\[([^\]]+)\]/g, `<span style="color:${accentColor};font-style:normal">$1</span>`);
}

export default function PromoPanel({ onGenerate }: Props) {
  const { data: session } = useSession();
  const [isPro, setIsPro] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [activationToken, setActivationToken] = useState<string | null>(null);

  // Form fields
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [benefit, setBenefit] = useState("");
  const [slideCount, setSlideCount] = useState(7);

  // Product photo
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState("image/jpeg");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Status
  const [status, setStatus] = useState<"idle" | "generating" | "images" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [imageProgress, setImageProgress] = useState(0);

  useEffect(() => {
    if (session?.user?.email) {
      fetch(`/api/stripe/verify?email=${encodeURIComponent(session.user.email)}`)
        .then((r) => r.json())
        .then((d) => setIsPro(d.active ?? false))
        .catch(() => {});
      return;
    }
    const token = localStorage.getItem("xpz_activation_token");
    if (token) { setActivationToken(token); setIsPro(true); return; }
    const cid = localStorage.getItem("xpz_customer_id");
    if (!cid) return;
    setCustomerId(cid);
    fetch(`/api/stripe/verify?customer_id=${cid}`)
      .then((r) => r.json())
      .then((d) => setIsPro(d.active ?? false))
      .catch(() => {});
  }, [session]);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPhotoPreview(dataUrl);
      // Extract base64 and mime
      const [header, b64] = dataUrl.split(",");
      const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      setPhotoBase64(b64);
      setPhotoMime(mime);
    };
    reader.readAsDataURL(file);
  };

  const buildSlides = (generated: GeneratedContent): Slide[] => {
    return generated.slides.map((gs, i) => {
      const bg = gs.colorScheme.background;
      const accent = gs.colorScheme.accent;
      const isLast = i === generated.slides.length - 1;
      const elements = [];

      // Badge "OFERTA" no último slide
      if (isLast) {
        elements.push({
          id: uuid(), type: "shape" as const,
          x: 64, y: 64, width: 140, height: 40,
          style: { fill: accent, stroke: "transparent", strokeWidth: 0, borderRadius: 8 },
        });
        elements.push({
          id: uuid(), type: "text" as const,
          x: 64, y: 64, width: 140, height: 40,
          content: "OFERTA ESPECIAL",
          style: { fontSize: 14, fontWeight: "bold" as const, fontFamily: "sans-serif", color: "#000000", textAlign: "center" as const, lineHeight: 1 },
        });
      }

      // Título
      elements.push({
        id: uuid(), type: "text" as const,
        x: 64, y: SLIDE_H - 520, width: SLIDE_W - 128, height: 340,
        content: applyAccent(gs.title, accent),
        style: { fontSize: 92, fontWeight: "bold" as const, fontFamily: "sans-serif", color: "#ffffff", textAlign: "left" as const, lineHeight: 1.0 },
      });

      // Corpo
      elements.push({
        id: uuid(), type: "text" as const,
        x: 64, y: SLIDE_H - 172, width: SLIDE_W - 128, height: 108,
        content: gs.body,
        style: { fontSize: 26, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.65)", textAlign: "left" as const, lineHeight: 1.45 },
      });

      // CTA no último slide
      if (isLast && gs.callToAction) {
        elements.push({
          id: uuid(), type: "text" as const,
          x: 64, y: SLIDE_H - 64, width: SLIDE_W - 128, height: 48,
          content: `<span style="color:${accent}">${gs.callToAction}</span>`,
          style: { fontSize: 24, fontWeight: "bold" as const, fontFamily: "sans-serif", color: accent, textAlign: "left" as const, lineHeight: 1 },
        });
      }

      const imagePrompt = gs.imagePrompt || productName;
      const searchQuery = gs.searchQuery || productName;
      return {
        id: uuid(),
        backgroundColor: bg,
        backgroundImageUrl: undefined,
        backgroundImageLoading: true,
        backgroundGradient: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.80) 40%, rgba(0,0,0,0.30) 70%, rgba(0,0,0,0.10) 100%)",
        elements,
        width: SLIDE_W,
        height: SLIDE_H,
        _imagePrompt: imagePrompt,
        _searchQuery: searchQuery,
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
          // Se tem foto do produto e é Pro, usa como referência
          if (isPro && photoBase64) {
            body.referenceImageBase64 = photoBase64;
            body.referenceImageMime = photoMime;
          } else if (!isPro) {
            // Free: usa searchQuery para busca real
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

  const handleGenerate = async () => {
    if (!productName.trim()) return;
    setError("");
    setImageProgress(0);

    if (!session?.user) {
      setLoginOpen(true);
      return;
    }

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

  const goToCheckout = async () => {
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e: any) {
      alert("Erro: " + e.message);
    }
  };

  const isLoading = status === "generating" || status === "images";
  const canGenerate = !!productName.trim() && !isLoading;

  return (
    <div className="flex flex-col gap-4">
      {/* Badge */}
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
          <ShoppingBag size={18} className="text-brand-500" />
          Post Promocional
        </h2>
        <p className="text-xs text-gray-500">Copy de vendas gerado por IA para o seu produto.</p>
      </div>

      {/* Foto do produto */}
      <div>
        <label className="text-sm text-gray-400 mb-2 block flex items-center gap-1.5">
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
            >
              <X size={12} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
              <p className="text-[10px] text-white/70">
                {isPro ? "A IA recriará o visual baseado nesta foto" : "Foto carregada (upgrade Pro para usar como referência)"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border border-dashed border-[#2a2a2a] hover:border-brand-500/50 hover:bg-brand-500/5 text-gray-500 hover:text-gray-300 transition-all"
            >
              <Upload size={16} />
              <span className="text-xs">Enviar foto</span>
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border border-dashed border-[#2a2a2a] hover:border-brand-500/50 hover:bg-brand-500/5 text-gray-500 hover:text-gray-300 transition-all"
            >
              <Camera size={16} />
              <span className="text-xs">Tirar foto</span>
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }} />
      </div>

      {/* Nome do produto */}
      <div>
        <label className="text-sm text-gray-400 mb-1 block flex items-center gap-1.5">
          <Tag size={13} /> Nome do produto <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="ex: Tênis Runner Pro, Bolo de Pote, iPhone 15..."
          className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600"
        />
      </div>

      {/* Preço */}
      <div>
        <label className="text-sm text-gray-400 mb-1 block flex items-center gap-1.5">
          <DollarSign size={13} /> Preço
        </label>
        <div className="flex items-center gap-2 bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 focus-within:border-brand-500">
          <span className="text-sm text-gray-500">R$</span>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="49,90"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-600"
          />
        </div>
      </div>

      {/* Benefício principal */}
      <div>
        <label className="text-sm text-gray-400 mb-1 block flex items-center gap-1.5">
          <Star size={13} /> Principal diferencial
        </label>
        <input
          type="text"
          value={benefit}
          onChange={(e) => setBenefit(e.target.value)}
          placeholder="ex: 100% natural, entrega em 24h, exclusivo..."
          className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600"
        />
      </div>

      {/* Descrição extra */}
      <div>
        <label className="text-sm text-gray-400 mb-1 block">Descrição extra (opcional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes do produto, público-alvo, promoção..."
          rows={2}
          className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600 resize-none"
        />
      </div>

      {/* Quantidade de slides */}
      <div>
        <label className="text-sm text-gray-400 mb-1 block">
          Slides: <span className="text-white font-medium">{slideCount}</span>
        </label>
        <input type="range" min={4} max={12} value={slideCount}
          onChange={(e) => setSlideCount(Number(e.target.value))}
          className="w-full accent-brand-500" />
        <div className="flex justify-between text-xs text-gray-600 mt-1"><span>4</span><span>12</span></div>
      </div>

      {/* Pro CTA */}
      {!isPro && (
        <button onClick={goToCheckout}
          className="flex items-center justify-center gap-2 py-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-xs font-medium transition-colors">
          <Zap size={12} /> Pro: IA usa sua foto como referência visual
        </button>
      )}

      {/* Botão gerar */}
      <button onClick={handleGenerate} disabled={!canGenerate}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {status === "generating" && "Criando copy de vendas..."}
        {status === "images" && `Gerando imagens... (${imageProgress}/${slideCount})`}
        {(status === "idle" || status === "done" || status === "error") && "Gerar Post Promocional"}
      </button>

      {/* Progresso */}
      {status === "images" && (
        <div className="w-full bg-[#1e1e1e] rounded-full h-1.5 overflow-hidden">
          <div className="bg-brand-500 h-full transition-all duration-300"
            style={{ width: `${(imageProgress / slideCount) * 100}%` }} />
        </div>
      )}

      {status === "done" && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-xs text-green-400">
          <ShoppingBag size={13} />
          Post promocional gerado! Edite os textos e publique.
        </div>
      )}

      {status === "error" && (
        <div className="flex items-start gap-2 bg-red-900/30 border border-red-800/50 rounded-lg p-3 text-sm text-red-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
