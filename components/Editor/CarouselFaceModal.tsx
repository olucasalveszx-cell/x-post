"use client";

import { useState, useRef } from "react";
import { v4 as uuid } from "uuid";
import { X, Upload, Sparkles, Loader2, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { Slide, GeneratedContent } from "@/types";

export type FaceCarouselMode = "padrao" | "twitter" | "comrosto";

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerate: (slides: Slide[], mode: FaceCarouselMode) => void;
}

type GenStatus = "idle" | "searching" | "generating" | "images" | "error";
type ValidationStatus = "idle" | "validating" | "ok" | "warning" | "invalid";

interface FaceValidation {
  valid: boolean;
  issues: string[];
  warnings: string[];
}

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
    const accent = gs.colorScheme?.accent ?? "#6366f1";
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
      _imagePrompt: gs.imagePrompt || "",
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
  const [faceValidation, setFaceValidation] = useState<FaceValidation | null>(null);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>("idle");
  const [genStatus, setGenStatus] = useState<GenStatus>("idle");
  const [error, setError] = useState("");
  const [imageProgress, setImageProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const isLoading = ["searching", "generating", "images"].includes(genStatus);

  const reset = () => {
    setTopic("");
    setFaceBase64(null);
    setFacePreview(null);
    setFaceValidation(null);
    setValidationStatus("idle");
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

  const validateFace = async (base64: string, mime: string) => {
    setValidationStatus("validating");
    try {
      const res = await fetch("/api/validate-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, imageMime: mime }),
      });
      if (!res.ok) { setValidationStatus("ok"); return; }
      const data: FaceValidation = await res.json();
      setFaceValidation(data);
      if (!data.valid) setValidationStatus("invalid");
      else if (data.warnings.length > 0) setValidationStatus("warning");
      else setValidationStatus("ok");
    } catch {
      setValidationStatus("ok");
    }
  };

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      // Redimensiona para max 768px — face ID não precisa de mais resolução
      const MAX = 768;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const b64 = dataUrl.split(",")[1];
      setFaceMime("image/jpeg");
      setFacePreview(dataUrl);
      setFaceBase64(b64);
      setFaceValidation(null);
      validateFace(b64, "image/jpeg");
    };
    img.src = objectUrl;
  };

  const handleGenerate = async () => {
    if (!topic.trim() || isLoading || !faceBase64) return;
    // Bloquear se foto inválida
    if (validationStatus === "invalid") return;
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
          withFace: true,
        }),
      });
      const genData: GeneratedContent = await genRes.json();
      if (!genRes.ok) throw new Error((genData as any).error ?? "Erro ao gerar");

      setGenStatus("images");
      setImageProgress(0);

      const rawSlides = buildFaceSlides(genData, faceBase64);
      onGenerate(rawSlides, "comrosto");

      let done = 0;
      const withImages = await Promise.all(
        rawSlides.map(async (slide) => {
          const { _imagePrompt, _faceBase64: fb, ...clean } = slide as any;
          try {
            // Prompt construído para face pipeline — SEMPRE envia referência
            // Nunca gera sem referência para manter fidelidade facial
            const faceScenePrompt = `${_imagePrompt}`;

            const body: Record<string, unknown> = {
              prompt: faceScenePrompt,
              imageStyle: "gemini",
              // referência OBRIGATÓRIA — sem ela o pipeline usaria geração textual pura
              referenceImageBase64: fb,
              referenceImageMime: faceMime,
            };

            console.log(`[face-modal] gerando slide com referência ${faceMime} ${Math.round((fb?.length ?? 0) * 0.75 / 1024)}KB`);

            const res = await fetch("/api/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const data = await res.json();
            done++;
            setImageProgress(done);

            if (!res.ok) {
              // Erro 422 = API não suporta fidelidade facial para essa foto
              const errMsg = data.error ?? "Erro ao gerar imagem";
              console.error(`[face-modal] slide ${done} FALHOU:`, errMsg);
              return { ...clean, backgroundImageLoading: false };
            }

            if (!data.imageUrl) return { ...clean, backgroundImageLoading: false };

            // Detecta posição do sujeito para manter rosto acima da área de texto
            let backgroundPositionY = 25;
            try {
              const posRes = await fetch("/api/detect-position", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl: data.imageUrl }),
                signal: AbortSignal.timeout(12000),
              });
              if (posRes.ok) {
                const pos = await posRes.json();
                if (typeof pos.backgroundPositionY === "number") backgroundPositionY = pos.backgroundPositionY;
              }
            } catch { /* mantém padrão */ }

            return {
              ...clean,
              backgroundImageUrl: data.imageUrl,
              backgroundImageLoading: false,
              backgroundPosition: { x: 50, y: backgroundPositionY },
            };
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

  const canGenerate = !!topic.trim() && !!faceBase64 && validationStatus !== "invalid" && validationStatus !== "validating";

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
                {genStatus === "images" && "Gerando imagens preservando seu rosto..."}
              </p>
              {genStatus === "images" && (
                <>
                  <p className="text-xs text-[var(--text-3)] mt-1.5">
                    {imageProgress} / {slideCount} slides — pode levar até 90s cada
                  </p>
                  <p className="text-[11px] text-purple-400/70 mt-1">
                    Face Swap + IA de identidade facial em execução
                  </p>
                </>
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
            {/* Face upload — OBRIGATÓRIO */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider flex items-center gap-1.5">
                Foto de referência
                <span className="text-red-400 normal-case font-normal">(obrigatória)</span>
              </label>

              {/* Dicas de qualidade */}
              <div className="flex items-start gap-1.5 bg-purple-950/30 border border-purple-800/30 rounded-lg px-3 py-2">
                <AlertTriangle size={11} className="text-purple-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-purple-300/80 leading-relaxed">
                  Use foto com <strong>rosto frontal</strong>, <strong>boa iluminação</strong>, sem óculos escuros e somente <strong>uma pessoa</strong>. Fotos de baixa qualidade reduzem a fidelidade.
                </p>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFaceUpload}
              />

              {facePreview ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={facePreview}
                    alt="Rosto"
                    className="w-16 h-16 object-cover rounded-lg border border-[var(--border)] shrink-0"
                  />
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    {/* Status de validação */}
                    {validationStatus === "validating" && (
                      <p className="text-xs text-[var(--text-3)] flex items-center gap-1.5">
                        <Loader2 size={11} className="animate-spin" /> Validando foto...
                      </p>
                    )}
                    {validationStatus === "ok" && (
                      <p className="text-xs text-green-400 font-medium flex items-center gap-1">
                        <CheckCircle size={11} /> Foto válida para geração
                      </p>
                    )}
                    {validationStatus === "warning" && (
                      <div>
                        <p className="text-xs text-yellow-400 font-medium flex items-center gap-1">
                          <AlertTriangle size={11} /> Qualidade reduzida
                        </p>
                        {faceValidation?.warnings.map((w, i) => (
                          <p key={i} className="text-[10px] text-yellow-300/70 mt-0.5">{w}</p>
                        ))}
                      </div>
                    )}
                    {validationStatus === "invalid" && (
                      <div>
                        <p className="text-xs text-red-400 font-medium flex items-center gap-1">
                          <AlertCircle size={11} /> Foto inválida
                        </p>
                        {faceValidation?.issues.map((issue, i) => (
                          <p key={i} className="text-[10px] text-red-300/80 mt-0.5">{issue}</p>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setFacePreview(null);
                        setFaceBase64(null);
                        setFaceValidation(null);
                        setValidationStatus("idle");
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
                  if (e.key === "Enter" && canGenerate) handleGenerate();
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

            {/* Mensagem de bloqueio se sem rosto */}
            {!faceBase64 && (
              <p className="text-center text-[11px] text-[var(--text-3)]">
                Envie uma foto de rosto para continuar
              </p>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-900/20 border border-red-800/40 rounded-xl p-3 text-xs text-red-300">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                boxShadow: canGenerate ? "0 4px 20px rgba(124,58,237,0.35)" : "none",
              }}
            >
              <Sparkles size={15} />
              Gerar com meu rosto
            </button>

            <p className="text-center text-[10px] text-[var(--text-3)]">
              Seu rosto será preservado em todas as imagens via Face Swap + IA
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
