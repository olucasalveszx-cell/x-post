"use client";

import { useState, useEffect, useRef } from "react";
import { X, Newspaper, Camera, Wand2, Loader2, ArrowLeft } from "lucide-react";
import { Slide, SlideElement } from "@/types";
import { v4 as uuid } from "uuid";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (slides: Slide[]) => void;
  onBack?: () => void;
}

function buildChoqueiSlide(
  titleContent: string,
  igAccount: any,
  customPicture: string,
  leftImageUrl?: string,
  rightImageUrl?: string,
): Slide {
  const W = 1080, H = 1350;
  const name    = igAccount?.username ?? "Meu Perfil";
  const handle  = igAccount?.username ?? "meuperfil";
  const picture = customPicture || igAccount?.picture || "";

  const elements: SlideElement[] = [
    {
      id: uuid(), type: "profile",
      x: 28, y: 22, width: 640, height: 90,
      profileName: name, profileHandle: handle,
      profileVerified: true,
      profileNameColor: "#ffffff", profileHandleColor: "rgba(255,255,255,0.55)",
      zIndex: 10, ...(picture ? { src: picture } : {}),
    },
    {
      id: uuid(), type: "text",
      x: W - 120, y: 28, width: 92, height: 80,
      content: "𝕏",
      style: { fontSize: 52, fontWeight: "bold", fontFamily: "sans-serif", color: "#ffffff", textAlign: "center", lineHeight: 1 },
      zIndex: 10,
    },
    { id: uuid(), type: "shape", x: 0, y: 122, width: W, height: 2, style: { fill: "rgba(255,255,255,0.12)", stroke: "none", strokeWidth: 0, borderRadius: 0 }, zIndex: 5 },
    {
      id: uuid(), type: "text",
      x: 28, y: 138, width: W - 56, height: 220,
      content: titleContent || "📰 NOTÍCIAS: Escreva o [título] aqui",
      style: { fontSize: 38, fontWeight: "bold", fontFamily: "sans-serif", color: "#ffffff", textAlign: "left", lineHeight: 1.35 },
      zIndex: 10,
    },
    { id: uuid(), type: "shape", x: 0, y: 370, width: W, height: 2, style: { fill: "rgba(255,255,255,0.12)", stroke: "none", strokeWidth: 0, borderRadius: 0 }, zIndex: 5 },
    {
      id: uuid(), type: "frame",
      x: 2, y: 374, width: 534, height: 970,
      frameShape: "rect", frameMediaType: "image",
      ...(leftImageUrl ? { frameImageUrl: leftImageUrl } : {}),
      zIndex: 8,
    },
    { id: uuid(), type: "shape", x: 538, y: 374, width: 4, height: 970, style: { fill: "rgba(0,0,0,1)", stroke: "none", strokeWidth: 0, borderRadius: 0 }, zIndex: 9 },
    {
      id: uuid(), type: "frame",
      x: 544, y: 374, width: 534, height: 970,
      frameShape: "rect", frameMediaType: "image",
      ...(rightImageUrl ? { frameImageUrl: rightImageUrl } : {}),
      zIndex: 8,
    },
  ];

  return { id: uuid(), backgroundColor: "#111111", elements, width: W, height: H };
}

function buildDetailSlide(
  title: string,
  body: string,
  accentColor: string,
  backgroundImageUrl?: string,
): Slide {
  const W = 1080, H = 1350;
  const gradient = "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 35%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.2) 100%)";

  const elements: SlideElement[] = [
    {
      id: uuid(), type: "text",
      x: 60, y: H - 560, width: W - 120, height: 280,
      content: title,
      style: { fontSize: 72, fontWeight: "bold", fontFamily: "sans-serif", color: "#ffffff", textAlign: "left", lineHeight: 1.1 },
      zIndex: 10,
    },
    {
      id: uuid(), type: "text",
      x: 60, y: H - 260, width: W - 120, height: 200,
      content: body,
      style: { fontSize: 30, fontWeight: "normal", fontFamily: "sans-serif", color: "rgba(255,255,255,0.80)", textAlign: "left", lineHeight: 1.5 },
      zIndex: 10,
    },
    {
      id: uuid(), type: "shape",
      x: 60, y: H - 590, width: 80, height: 6,
      style: { fill: accentColor, stroke: "none", strokeWidth: 0, borderRadius: 3 },
      zIndex: 11,
    },
  ];

  return {
    id: uuid(),
    backgroundColor: "#0a0a0a",
    backgroundImageUrl,
    backgroundGradient: gradient,
    elements,
    width: W, height: H,
  };
}

async function proxyImage(url: string): Promise<string | null> {
  try {
    const res = await fetch("/api/image-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, preferQuality: true }), // sem fallback para thumbnail
    });
    const d = await res.json();
    if (!d.base64) return null;
    return `data:${d.mimeType};base64,${d.base64}`;
  } catch { return null; }
}

export default function ChoqueiModal({ open, onClose, onCreate, onBack }: Props) {
  const [title, setTitle] = useState("");
  const [customPicture, setCustomPicture] = useState("");
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const igAccount = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("ig_account") ?? "null")
    : null;

  const displayPicture = customPicture || igAccount?.picture || "";

  useEffect(() => {
    if (open) {
      setTitle(""); setCustomPicture(""); setError(""); setStep("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  if (!open) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 200; canvas.height = 200;
        const ctx = canvas.getContext("2d")!;
        ctx.beginPath(); ctx.arc(100, 100, 100, 0, Math.PI * 2); ctx.clip();
        const size = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 200, 200);
        setCustomPicture(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Criar sem IA (manual)
  const handleCreateManual = () => {
    const s1 = buildChoqueiSlide(title.trim(), igAccount, customPicture);
    const s2 = buildDetailSlide(title.trim(), "Adicione mais detalhes sobre a notícia aqui.", "#ffffff");
    onCreate([s1, s2]);
    onClose();
  };

  // Criar com IA
  const handleGenerateWithAI = async () => {
    if (!title.trim()) return;
    setGenerating(true); setError("");
    try {
      // 1. Gera copy e prompt de imagem
      setStep("Gerando copy...");
      const genRes = await fetch("/api/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: title.trim() }),
      });
      const gen = await genRes.json();
      if (!genRes.ok) throw new Error(gen.error ?? "Erro ao gerar");

      const generatedTitle = gen.title || title.trim();
      const body    = gen.body || "";
      const accent  = gen.accentColor || "#ffffff";
      const imgPrompt = gen.imagePrompt || title.trim();

      // 2. Busca imagens na web para os dois frames
      setStep("Buscando imagens...");
      const searchRes = await fetch("/api/image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: title.trim() }),
      });
      const searchData = await searchRes.json();
      const imgs = searchData.images ?? [];

      // 3. Faz proxy das imagens em paralelo
      setStep("Carregando imagens...");
      const [leftImg, rightImg] = await Promise.all([
        imgs[0] ? proxyImage(imgs[0].url) : Promise.resolve(null),
        imgs[1] ? proxyImage(imgs[1].url) : Promise.resolve(null),
      ]);

      // 4. Gera imagem de fundo para o slide 2
      setStep("Gerando fundo do slide 2...");
      let bgUrl: string | undefined;
      try {
        const activationToken = localStorage.getItem("xpz_activation_token") ?? undefined;
        const bgRes = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: imgPrompt, imageStyle: "cinematico", activationToken }),
        });
        const bgData = await bgRes.json();
        bgUrl = bgData.imageUrl ?? undefined;
      } catch {}

      // 5. Monta os slides
      const s1 = buildChoqueiSlide(generatedTitle, igAccount, customPicture, leftImg ?? undefined, rightImg ?? undefined);
      const s2 = buildDetailSlide(generatedTitle, body, accent, bgUrl);

      onCreate([s1, s2]);
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Erro desconhecido");
    } finally {
      setGenerating(false); setStep("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={!generating ? onClose : undefined}>
      <div className="bg-[var(--bg-2)] border border-[var(--border-2)] rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {onBack && !generating && (
              <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[var(--bg-3)] text-[var(--text-3)] hover:text-[var(--text)] transition-colors" title="Voltar">
                <ArrowLeft size={16} />
              </button>
            )}
            <Newspaper size={18} className="text-gray-400" />
            <h2 className="text-base font-bold text-[var(--text)]">Estilo Choquei</h2>
          </div>
          {!generating && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-3)] text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Perfil preview */}
        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-[var(--bg-3)] border border-[var(--border)]">
          <button onClick={() => photoRef.current?.click()} className="relative w-10 h-10 rounded-full bg-[var(--bg-4)] overflow-hidden shrink-0 group" title="Trocar foto">
            {displayPicture
              ? <img src={displayPicture} alt="" className="w-full h-full object-cover" />
              : <span className="text-lg text-[var(--text-3)] flex items-center justify-center h-full">👤</span>
            }
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={12} className="text-white" />
            </div>
          </button>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">{igAccount?.username ?? "Meu Perfil"} ✓</p>
            <p className="text-xs text-[var(--text-3)]">@{igAccount?.username ?? "meuperfil"}</p>
          </div>
          <button onClick={() => photoRef.current?.click()} className="text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)] px-2 py-1 rounded-lg hover:bg-[var(--bg-4)] border border-[var(--border)] flex items-center gap-1">
            <Camera size={10} /> Foto
          </button>
          <div className="ml-1 text-lg font-black text-[var(--text-3)]">𝕏</div>
        </div>

        {/* Título */}
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">📰 Título da notícia</label>
          <textarea
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerateWithAI(); }}
            placeholder="Ex: Neymar já está em solo americano para a Copa do Mundo."
            rows={3}
            disabled={generating}
            className="w-full bg-[var(--bg)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-white/30 resize-none leading-relaxed disabled:opacity-50"
          />
        </div>

        {/* Loading */}
        {generating && (
          <div className="flex items-center gap-2 mb-4 text-xs text-brand-400">
            <Loader2 size={13} className="animate-spin" />
            {step || "Gerando..."}
          </div>
        )}

        {/* Erro */}
        {error && <p className="text-xs text-red-400 mb-4">⚠ {error}</p>}

        {/* Botões */}
        <div className="flex gap-2">
          <button
            onClick={handleCreateManual}
            disabled={generating}
            className="flex-1 py-2.5 rounded-xl border border-[var(--border-2)] text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors disabled:opacity-40"
          >
            Criar vazio
          </button>
          <button
            onClick={handleGenerateWithAI}
            disabled={generating || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all disabled:opacity-40"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {generating ? "Gerando..." : "Gerar com IA"}
          </button>
        </div>
        <p className="text-center text-[10px] text-[var(--text-3)] mt-2">Gerar com IA busca imagens + cria copy + 2 slides</p>
      </div>
    </div>
  );
}
