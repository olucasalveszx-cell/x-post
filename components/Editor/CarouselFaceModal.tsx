"use client";

import { useState, useRef } from "react";
import { v4 as uuid } from "uuid";
import { X, Upload, Sparkles, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Slide, GeneratedContent } from "@/types";

export type FaceCarouselMode = "padrao" | "twitter" | "comrosto";

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerate: (slides: Slide[], mode: FaceCarouselMode) => void;
}

type GenStatus = "idle" | "searching" | "generating" | "images" | "error";

function applyAccent(text: string, accentColor: string): string {
  return text.replace(/\[([^\]]+)\]/g, `<span style="color:${accentColor};font-style:normal">$1</span>`);
}

function adaptTitleSize(title: string, base: number): number {
  const plain = title.replace(/<[^>]+>/g, "").replace(/\[|\]/g, "");
  const words = plain.trim().split(/\s+/).length;
  if (words <= 5) return base;
  if (words <= 7) return Math.round(base * 0.88);
  return Math.round(base * 0.76);
}

function buildFaceSlides(
  generated: GeneratedContent,
  faceBase64: string | null
): (Slide & { _imagePrompt: string; _faceBase64: string | null })[] {
  const W = 1080, H = 1350, N = generated.slides.length;
  const gradient =
    "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.97) 28%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.1) 72%, rgba(0,0,0,0) 100%)";

  return generated.slides.map((gs, i) => {
    const accent = gs.colorScheme.accent;
    const isLast = i === N - 1;
    const elements: any[] = [];
    const titleY = H - 510;
    const bodyY = H - 200;
    const FY = H - 82;

    elements.push({
      id: uuid(), type: "text" as const,
      x: 60, y: titleY, width: W - 120, height: 280,
      content: applyAccent(gs.title, accent),
      style: {
        fontSize: adaptTitleSize(gs.title, 88),
        fontWeight: "bold" as const,
        fontFamily: "sans-serif",
        color: "#ffffff",
        textAlign: "center" as const,
        lineHeight: 1.05,
      },
    });
    elements.push({
      id: uuid(), type: "text" as const,
      x: 60, y: bodyY, width: W - 120, height: 120,
      content: isLast && gs.callToAction ? gs.callToAction : gs.body,
      style: {
        fontSize: 28,
        fontWeight: "normal" as const,
        fontFamily: "sans-serif",
        color: "rgba(255,255,255,0.72)",
        textAlign: "center" as const,
        lineHeight: 1.45,
      },
    });

    const dots = Array.from({ length: N }, (_, di) =>
      di === i
        ? `<span style="color:rgba(255,255,255,0.9)">●</span>`
        : `<span style="color:rgba(255,255,255,0.18)">●</span>`
    ).join(" ");
    elements.push({
      id: uuid(), type: "text" as const,
      x: W * 0.28, y: FY + 8, width: W * 0.44, height: 56, content: dots,
      style: { fontSize: 20, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.25)", textAlign: "center" as const, lineHeight: 1 },
    });
    elements.push({
      id: uuid(), type: "text" as const,
      x: W * 0.6, y: FY, width: W * 0.35, height: 70,
      content: isLast ? "salva ❤️" : "arrasta →",
      style: { fontSize: 25, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.4)", textAlign: "right" as const, lineHeight: 1 },
    });

    // Para face mode: usa o imagePrompt do Gemini direto — PuLID/InstantID
    // injetam o rosto automaticamente. Prompt complexo conflita com face fidelity.
    const rawPrompt = gs.imagePrompt || "";
    const imagePrompt = rawPrompt;

    return {
      id: uuid(),
      backgroundColor: gs.colorScheme.background,
      backgroundImageUrl: undefined,
      backgroundImageLoading: true,
      backgroundGradient: gradient,
      backgroundPosition: { x: 50, y: 25 },
      backgroundZoom: 110,
      elements,
      width: W,
      height: H,
      _imagePrompt: imagePrompt,
      _faceBase64: faceBase64,
    };
  });
}

export default function CarouselFaceModal({ open, onClose, onGenerate }: Props) {
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState(7);
  const [faceBase64, setFaceBase64] = useState<string | null>(null);
  const [faceMime, setFaceMime] = useState("image/jpeg");
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<GenStatus>("idle");
  const [error, setError] = useState("");
  const [imageProgress, setImageProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const isLoading = ["searching", "generating", "images"].includes(genStatus);

  const reset = () => {
    setTopic("");
    setFaceBase64(null);
    setFacePreview(null);
    setGenStatus("idle");
    setError("");
    setImageProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    if (isLoading) return;
    onClose();
    setTimeout(reset, 200);
  };

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Redimensiona para max 768px — face ID não precisa de mais que isso,
    // e foto de celular (3-5MB) em base64 estoura o timeout dos modelos
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 768;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setFaceMime("image/jpeg");
      setFacePreview(dataUrl);
      setFaceBase64(dataUrl.split(",")[1]);
    };
    img.src = objectUrl;
  };

  const handleGenerate = async () => {
    if (!topic.trim() || isLoading) return;
    setError("");

    try {
      setGenStatus("searching");
      const searchRes = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const searchData = await searchRes.json();
      if (!searchRes.ok) throw new Error(searchData.error ?? "Erro na busca");

      setGenStatus("generating");
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          searchResults: searchData.results,
          slideCount,
          writingStyle: "viral",
          imageStyle: "gemini",
          withFace: !!faceBase64,
        }),
      });
      const genData: GeneratedContent = await genRes.json();
      if (!genRes.ok) throw new Error((genData as any).error ?? "Erro ao gerar");

      setGenStatus("images");
      setImageProgress(0);

      const rawSlides = buildFaceSlides(genData, faceBase64);
      // Preview immediately with loading state
      onGenerate(rawSlides, "comrosto");

      let done = 0;
      const withImages = await Promise.all(
        rawSlides.map(async (slide) => {
          const { _imagePrompt, _faceBase64: fb, ...clean } = slide as any;
          try {
            const finalPrompt = fb
              ? `Create a realistic image of a person in the following scenario: ${_imagePrompt}.`
              : _imagePrompt;

            const body: Record<string, unknown> = {
              prompt: finalPrompt,
              imageStyle: "gemini",
            };
            if (fb) {
              body.referenceImageBase64 = fb;
              body.referenceImageMime = faceMime;
            }
            const res = await fetch("/api/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const data = await res.json();
            done++;
            setImageProgress(done);
            return data.imageUrl
              ? { ...clean, backgroundImageUrl: data.imageUrl, backgroundImageLoading: false }
              : { ...clean, backgroundImageLoading: false };
          } catch {
            done++;
            setImageProgress(done);
            return { ...clean, backgroundImageLoading: false };
          }
        })
      );

      onGenerate(withImages, "comrosto");
      onClose();
      setTimeout(reset, 200);
    } catch (err: any) {
      setError(err.message ?? "Erro desconhecido");
      setGenStatus("error");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md bg-[var(--bg-2)] border border-[var(--border-2)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
            <span className="text-base">🧑‍🤳</span>
            Gerar Carrossel com Rosto
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-3)] text-[var(--text-3)] hover:text-[var(--text)] disabled:opacity-40 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="p-10 flex flex-col items-center gap-5">
            <div className="relative flex items-center justify-center">
              <div className="p-5 rounded-full bg-purple-500/10 border border-purple-500/20">
                <Loader2 size={30} className="animate-spin text-purple-400" />
              </div>
              <div className="absolute inset-0 rounded-full bg-purple-500/5 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--text)]">
                {genStatus === "searching" && "Pesquisando na web..."}
                {genStatus === "generating" && "Gerando conteúdo com IA..."}
                {genStatus === "images" && faceBase64 && "Gerando imagens com seu rosto..."}
                {genStatus === "images" && !faceBase64 && "Gerando imagens com IA..."}
              </p>
              {genStatus === "images" && (
                <p className="text-xs text-[var(--text-3)] mt-1.5">
                  {imageProgress} / {slideCount} slides
                </p>
              )}
            </div>
            {genStatus === "images" && (
              <div className="w-52 bg-[var(--bg-4)] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${(imageProgress / slideCount) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Form */}
        {!isLoading && (
          <div className="p-5 flex flex-col gap-4">
            {/* Face upload */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">
                Foto de referência <span className="text-[var(--text-3)] normal-case font-normal">(opcional)</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFaceUpload}
              />
              {facePreview ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                  <img
                    src={facePreview}
                    alt="Rosto"
                    className="w-14 h-14 object-cover rounded-lg border border-[var(--border)] shrink-0"
                  />
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <p className="text-xs text-green-400 font-medium flex items-center gap-1">
                      <span>✓</span> Foto carregada
                    </p>
                    <p className="text-[11px] text-[var(--text-3)]">
                      Seu rosto será preservado em todas as imagens
                    </p>
                    <button
                      onClick={() => {
                        setFacePreview(null);
                        setFaceBase64(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="text-[11px] text-[var(--text-3)] hover:text-red-400 transition-colors w-fit"
                    >
                      Trocar foto
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2.5 h-[88px] rounded-xl border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 bg-purple-500/5 hover:bg-purple-500/10 transition-all"
                >
                  <Upload size={18} className="text-purple-400" />
                  <span className="text-xs text-[var(--text-3)]">Clique para enviar foto do rosto</span>
                </button>
              )}
            </div>

            {/* Topic */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">
                Assunto do carrossel
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && topic.trim() && !isLoading) handleGenerate();
                }}
                placeholder="Ex: 10 dicas de marketing pessoal..."
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {/* Slide count */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">
                Número de slides
              </label>
              <div className="flex gap-2">
                {[5, 7, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSlideCount(n)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      slideCount === n
                        ? "border-purple-500 bg-purple-500/15 text-purple-300"
                        : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-2)] hover:border-purple-500/30"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-900/20 border border-red-800/40 rounded-xl p-3 text-xs text-red-300">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!topic.trim()}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
              }}
            >
              <Sparkles size={15} />
              {faceBase64 ? "Gerar com meu rosto" : "Gerar carrossel"}
            </button>

            <p className="text-center text-[10px] text-[var(--text-3)]">
              {faceBase64
                ? "Seu rosto será inserido em cada imagem gerada"
                : "Adicione uma foto para maior fidelidade facial"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
