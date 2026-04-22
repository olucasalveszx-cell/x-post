"use client";

import { useState } from "react";
import { Languages, Link, FileText, ImageIcon, Loader2, AlertCircle, Sparkles, X, Upload } from "lucide-react";
import { GeneratedContent, Slide } from "@/types";
import { v4 as uuid } from "uuid";

interface Props {
  onGenerate: (slides: Slide[]) => void;
}

const SLIDE_W = 1080;
const SLIDE_H = 1350;

function applyAccent(text: string, accentColor: string): string {
  return text.replace(/\[([^\]]+)\]/g, `<span style="color:${accentColor}">$1</span>`);
}

type InputMode = "url" | "text" | "image";

export default function TranslatePanel({ onGenerate }: Props) {
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [slideCount, setSlideCount] = useState(7);
  const [imageSource, setImageSource] = useState<"gemini" | "imagen3">("gemini");
  const [status, setStatus] = useState<"idle" | "translating" | "images" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [imageProgress, setImageProgress] = useState(0);
  const [translatedData, setTranslatedData] = useState<GeneratedContent | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const buildSlides = (generated: GeneratedContent): Slide[] => {
    return generated.slides.map((gs, i) => {
      const accent = gs.colorScheme.accent;
      const bg = gs.colorScheme.background;
      const elements = [];

      // Título com palavra colorida
      elements.push({
        id: uuid(), type: "text" as const,
        x: 60, y: SLIDE_H - 500, width: SLIDE_W - 120, height: 320,
        content: applyAccent(gs.title, accent),
        style: { fontSize: 80, fontWeight: "bold" as const, fontFamily: "sans-serif", color: "#ffffff", textAlign: "left" as const, lineHeight: 1.05 },
      });

      // Corpo
      elements.push({
        id: uuid(), type: "text" as const,
        x: 60, y: SLIDE_H - 175, width: SLIDE_W - 120, height: 130,
        content: gs.body,
        style: { fontSize: 28, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.70)", textAlign: "left" as const, lineHeight: 1.45 },
      });


      return {
        id: uuid(),
        backgroundColor: bg,
        backgroundImageUrl: undefined,
        backgroundImageLoading: true,
        elements,
        width: SLIDE_W,
        height: SLIDE_H,
        _imagePrompt: gs.imagePrompt,
      } as Slide & { _imagePrompt: string };
    });
  };

  const generateImages = async (slides: (Slide & { _imagePrompt?: string })[]): Promise<Slide[]> => {
    let done = 0;
    return Promise.all(
      slides.map(async (slide) => {
        const prompt = (slide as any)._imagePrompt ?? "";
        try {
          const res = await fetch("/api/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, source: imageSource }),
          });
          const data = await res.json();
          done++;
          setImageProgress(done);
          const { _imagePrompt, ...clean } = slide as any;
          return { ...clean, backgroundImageUrl: data.imageUrl ?? undefined, backgroundImageLoading: false };
        } catch {
          done++;
          setImageProgress(done);
          const { _imagePrompt, ...clean } = slide as any;
          return { ...clean, backgroundImageLoading: false };
        }
      })
    );
  };

  const handleImageDrop = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    // Comprime a imagem para no máximo 1200px e qualidade 0.8 antes de armazenar
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL("image/jpeg", 0.82);
      setImagePreview(compressed);

      // Converte dataURL comprimida de volta para File
      canvas.toBlob((blob) => {
        if (blob) setImageFile(new File([blob], "image.jpg", { type: "image/jpeg" }));
      }, "image/jpeg", 0.82);

      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  };

  const handleTranslate = async () => {
    const hasInput =
      inputMode === "url" ? url.trim() :
      inputMode === "text" ? text.trim() :
      !!imageFile;
    if (!hasInput) return;

    setError("");
    setImageProgress(0);

    try {
      setStatus("translating");

      let body: any = { slideCount };

      if (inputMode === "url") {
        body.url = url.trim();
      } else if (inputMode === "text") {
        body.text = text.trim();
      } else if (inputMode === "image" && imageFile) {
        // Usa o preview já comprimido (dataURL) para extrair base64
        if (imagePreview) {
          const b64 = imagePreview.split(",")[1];
          body.imageBase64 = b64;
          body.imageMimeType = "image/jpeg";
        } else {
          const reader = new FileReader();
          const b64 = await new Promise<string>((resolve, reject) => {
            reader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
          });
          body.imageBase64 = b64;
          body.imageMimeType = imageFile.type;
        }
      }

      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data: GeneratedContent = await res.json();
      if (!res.ok) throw new Error((data as any).error);

      setTranslatedData(data);
      setShowConfirm(true);
      setStatus("idle");
    } catch (err: any) {
      setError(err.message ?? "Erro desconhecido");
      setStatus("error");
    }
  };

  const confirmGenerate = async () => {
    if (!translatedData) return;
    setShowConfirm(false);
    setStatus("images");
    setImageProgress(0);
    const slidesRaw = buildSlides(translatedData);
    onGenerate(slidesRaw);
    const slidesWithImages = await generateImages(slidesRaw);
    onGenerate(slidesWithImages);
    setStatus("done");
    setTranslatedData(null);
  };

  const isLoading = ["translating", "images"].includes(status);
  const hasInput =
    inputMode === "url" ? url.trim() :
    inputMode === "text" ? text.trim() :
    !!imageFile;

  return (
    <div className="flex flex-col gap-4">

      {/* Modo de entrada */}
      <div>
        <label className="text-sm text-[var(--text-2)] mb-2 block">Fonte do post</label>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { mode: "url",   icon: <Link size={12} />,       label: "URL" },
            { mode: "text",  icon: <FileText size={12} />,   label: "Texto" },
            { mode: "image", icon: <ImageIcon size={12} />,  label: "Imagem" },
          ] as const).map((opt) => (
            <button
              key={opt.mode}
              onClick={() => setInputMode(opt.mode)}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs transition-colors ${
                inputMode === opt.mode
                  ? "border-brand-500 bg-brand-500/10 text-[var(--text)]"
                  : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-2)] hover:border-[var(--border-2)]"
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input URL */}
      {inputMode === "url" && (
        <div>
          <label className="text-sm text-[var(--text-2)] mb-1 block">URL do artigo / post</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://medium.com/article..."
            className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-[var(--text-3)]"
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleTranslate()}
          />
          <p className="text-[10px] text-[var(--text-3)] mt-1">Artigos, blogs, LinkedIn, Medium, etc.</p>
        </div>
      )}

      {/* Input Texto */}
      {inputMode === "text" && (
        <div>
          <label className="text-sm text-[var(--text-2)] mb-1 block">Cole o texto do post</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole aqui o texto em inglês ou outro idioma..."
            rows={5}
            className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-[var(--text-3)] resize-none"
          />
        </div>
      )}

      {/* Input Imagem */}
      {inputMode === "image" && (
        <div>
          <label className="text-sm text-[var(--text-2)] mb-1 block">Screenshot do post</label>
          {imagePreview ? (
            <div className="relative rounded-lg overflow-hidden border border-[var(--border-2)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-1"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleImageDrop(file);
              }}
              onClick={() => document.getElementById("img-upload")?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-brand-500 bg-brand-500/10"
                  : "border-[var(--border-2)] hover:border-[var(--border-2)] bg-[var(--bg)]"
              }`}
            >
              <Upload size={24} className="mx-auto mb-2 text-[var(--text-3)]" />
              <p className="text-sm text-[var(--text-2)]">Arraste a imagem ou clique para selecionar</p>
              <p className="text-[10px] text-[var(--text-3)] mt-1">PNG, JPG, WEBP</p>
              <input
                id="img-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageDrop(f); }}
              />
            </div>
          )}
          <p className="text-[10px] text-[var(--text-3)] mt-1">
            Claude lê o texto da imagem e traduz automaticamente
          </p>
        </div>
      )}

      {/* Slides */}
      <div>
        <label className="text-sm text-[var(--text-2)] mb-1 block">
          Slides: <span className="text-[var(--text)] font-medium">{slideCount}</span>
        </label>
        <input
          type="range" min={1} max={15} value={slideCount}
          onChange={(e) => setSlideCount(Number(e.target.value))}
          className="w-full accent-brand-500"
        />
        <div className="flex justify-between text-xs text-[var(--text-3)] mt-1">
          <span>3</span><span>15</span>
        </div>
      </div>

      {/* Fonte de imagem */}
      <div>
        <label className="text-sm text-[var(--text-2)] mb-2 block">Imagens</label>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { value: "gemini",  label: "Gemini",   sub: "IA Google · padrão",  color: "text-blue-400" },
            { value: "imagen3", label: "Imagen 3", sub: "IA Google · premium", color: "text-brand-500" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setImageSource(opt.value)}
              className={`flex flex-col items-center py-2 rounded-lg border text-center transition-colors ${
                imageSource === opt.value
                  ? "border-brand-500 bg-brand-500/10"
                  : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-2)]"
              }`}
            >
              <span className={`text-xs font-bold ${imageSource === opt.value ? "text-[var(--text)]" : "text-[var(--text-2)]"}`}>{opt.label}</span>
              <span className={`text-[10px] mt-0.5 ${opt.color}`}>{opt.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Botão */}
      <button
        onClick={handleTranslate}
        disabled={!hasInput || isLoading}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
        {status === "translating" && "Traduzindo com IA..."}
        {status === "images" && `Gerando imagens... (${imageProgress}/${slideCount})`}
        {(status === "idle" || status === "done" || status === "error") && "Traduzir"}
      </button>

      {/* Confirmação: gerar slide? */}
      {showConfirm && translatedData && (
        <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-3 flex flex-col gap-2.5">
          <div>
            <p className="text-xs text-[var(--text)] font-semibold">Conteúdo traduzido!</p>
            <p className="text-[10px] text-[var(--text-2)] mt-0.5">{translatedData.slides.length} slides prontos. Deseja gerá-los agora?</p>
          </div>
          <div className="flex gap-2">
            <button onClick={confirmGenerate}
              className="flex-1 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-xs text-white font-medium transition-colors flex items-center justify-center gap-1.5">
              <Sparkles size={11} /> Gerar slides
            </button>
            <button onClick={() => { setShowConfirm(false); setTranslatedData(null); }}
              className="px-3 py-1.5 rounded-lg border border-[var(--border-2)] text-xs text-[var(--text-2)] hover:text-[var(--text)] transition-colors">
              Não
            </button>
          </div>
        </div>
      )}

      {/* Progress bar imagens */}
      {status === "images" && (
        <div className="w-full bg-[var(--bg-4)] rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-brand-500 h-full transition-all duration-300"
            style={{ width: `${(imageProgress / slideCount) * 100}%` }}
          />
        </div>
      )}

      {/* Sucesso */}
      {status === "done" && (
        <div className="flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-lg p-3 text-xs text-brand-400">
          <Sparkles size={13} />
          Slides criados com sucesso!
        </div>
      )}

      {/* Erro */}
      {status === "error" && (
        <div className="flex items-start gap-2 bg-red-900/30 border border-red-800/50 rounded-lg p-3 text-sm text-red-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
