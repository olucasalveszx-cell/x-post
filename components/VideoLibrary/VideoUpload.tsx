"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Film, X, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  onUploaded: () => void;
}

type UploadState = "idle" | "reading" | "uploading" | "saving" | "done" | "error";

const ACCEPTED = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_MB = 500;

async function getVideoMetadata(
  file: File
): Promise<{ thumbnail: string | null; duration: number | null }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    video.preload = "metadata";

    video.addEventListener("loadedmetadata", () => {
      const w = Math.min(video.videoWidth, 640);
      const h = Math.round((w / video.videoWidth) * video.videoHeight);
      canvas.width = w;
      canvas.height = h;
      video.currentTime = Math.min(1, video.duration * 0.1);
    });

    video.addEventListener("seeked", () => {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve({
          thumbnail: canvas.toDataURL("image/jpeg", 0.85),
          duration: Math.round(video.duration),
        });
      } else {
        resolve({ thumbnail: null, duration: Math.round(video.duration) });
      }
      URL.revokeObjectURL(video.src);
    });

    video.addEventListener("error", () => resolve({ thumbnail: null, duration: null }));
    video.src = URL.createObjectURL(file);
  });
}

export default function VideoUpload({ onUploaded }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED.includes(f.type)) {
      setErrorMsg("Formato inválido. Use MP4, MOV ou WebM.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setErrorMsg(`Arquivo muito grande. Máximo: ${MAX_MB}MB.`);
      return;
    }
    setErrorMsg("");
    setFile(f);
    setTitle(f.name.replace(/\.[^.]+$/, ""));
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const reset = () => {
    setFile(null);
    setTitle("");
    setState("idle");
    setProgress(0);
    setErrorMsg("");
  };

  async function handleUpload() {
    if (!file || !title.trim()) return;
    setState("reading");
    setProgress(0);

    try {
      // 1. Extract metadata client-side
      const { thumbnail, duration } = await getVideoMetadata(file);

      // 2. Get signed upload URL
      const urlRes = await fetch("/api/videos/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error ?? "Erro ao obter URL de upload");

      const { videoId, videoPath, signedUrl } = urlData;

      // 3. Upload video directly to Supabase with progress
      setState("uploading");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload falhou: ${xhr.status}`));
        });
        xhr.addEventListener("error", () => reject(new Error("Erro de rede durante upload")));
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.setRequestHeader("x-upsert", "true");
        xhr.send(file);
      });

      // 4. Create DB record
      setState("saving");
      const saveRes = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          title: title.trim(),
          videoPath,
          thumbnailBase64: thumbnail,
          fileSize: file.size,
          duration,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error ?? "Erro ao salvar vídeo");

      setState("done");
      setTimeout(() => {
        reset();
        onUploaded();
      }, 1500);
    } catch (err: any) {
      setState("error");
      setErrorMsg(err.message ?? "Erro desconhecido");
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (state === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <CheckCircle2 size={40} className="text-green-400" />
        <p className="text-sm text-green-400 font-medium">Vídeo enviado com sucesso!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
            dragOver
              ? "border-indigo-400 bg-indigo-500/10"
              : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40"
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
            <Upload size={24} className="text-zinc-400" />
          </div>
          <div className="text-center">
            <p className="text-sm text-white font-medium">
              Arraste um vídeo ou clique para selecionar
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              MP4, MOV ou WebM · Máximo {MAX_MB}MB
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0">
            <Film size={18} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{file.name}</p>
            <p className="text-xs text-zinc-500">{formatSize(file.size)}</p>
          </div>
          <button
            onClick={reset}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {file && (
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">
            Nome do vídeo
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Apresentação do produto"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {(state === "uploading" || state === "reading" || state === "saving") && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>
              {state === "reading" && "Processando vídeo..."}
              {state === "uploading" && "Enviando..."}
              {state === "saving" && "Salvando..."}
            </span>
            <span>{state === "uploading" ? `${progress}%` : ""}</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{
                width: state === "reading" ? "5%" : state === "saving" ? "98%" : `${progress}%`,
              }}
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">
          <AlertCircle size={14} className="shrink-0" />
          {errorMsg}
        </div>
      )}

      {file && state === "idle" && (
        <button
          onClick={handleUpload}
          disabled={!title.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          Enviar vídeo
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
