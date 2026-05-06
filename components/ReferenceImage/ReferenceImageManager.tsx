"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Upload, Star, Trash2, CheckCircle2, AlertCircle, UserCircle2, ShieldAlert } from "lucide-react";
import { UserReferenceImage } from "@/types";

interface Props {
  onClose: () => void;
  onDefaultChanged?: (image: UserReferenceImage | null) => void;
}

type UploadState = "idle" | "reading" | "uploading" | "done" | "error";

const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;

async function fileToBase64(file: File): Promise<{ base64: string; mime: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(",");
      const mime = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
      resolve({ base64, mime, preview: dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ReferenceImageManager({ onClose, onDefaultChanged }: Props) {
  const [images, setImages] = useState<UserReferenceImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<{ base64: string; mime: string } | null>(null);
  const [label, setLabel] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch("/api/reference-images");
      const data = await res.json();
      setImages(data.images ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleFile = useCallback(async (file: File) => {
    if (!ACCEPTED_MIME.includes(file.type)) {
      setUploadError("Formato inválido. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`Arquivo muito grande. Máximo: ${MAX_SIZE_MB}MB.`);
      return;
    }
    setUploadError("");
    setSelectedFile(file);
    setLabel(file.name.replace(/\.[^.]+$/, ""));
    setUploadState("reading");
    try {
      const { base64, mime, preview: prev } = await fileToBase64(file);
      setFileData({ base64, mime });
      setPreview(prev);
      setUploadState("idle");
    } catch {
      setUploadError("Erro ao processar imagem.");
      setUploadState("error");
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  async function handleUpload() {
    if (!fileData) return;
    setUploadState("uploading");
    setUploadError("");
    try {
      const res = await fetch("/api/reference-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: fileData.base64,
          imageMime: fileData.mime,
          label: label.trim() || "Meu rosto",
          setAsDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar");
      setUploadState("done");
      await fetchImages();
      if (setAsDefault && onDefaultChanged) onDefaultChanged(data.image);
      // Reset form after short delay
      setTimeout(() => {
        setPreview(null);
        setSelectedFile(null);
        setFileData(null);
        setLabel("");
        setUploadState("idle");
      }, 1200);
    } catch (err: any) {
      setUploadError(err.message);
      setUploadState("error");
    }
  }

  async function handleSetDefault(id: string) {
    await fetch(`/api/reference-images/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_default: true }),
    });
    await fetchImages();
    const updated = images.find(i => i.id === id);
    if (updated && onDefaultChanged) onDefaultChanged({ ...updated, is_default: true });
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta imagem de referência?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/reference-images/${id}`, { method: "DELETE" });
      const wasDefault = images.find(i => i.id === id)?.is_default;
      await fetchImages();
      if (wasDefault && onDefaultChanged) onDefaultChanged(null);
    } finally {
      setDeletingId(null);
    }
  }

  const resetUpload = () => {
    setPreview(null); setSelectedFile(null); setFileData(null);
    setLabel(""); setUploadState("idle"); setUploadError("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
              <UserCircle2 size={16} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">Rosto de referência</h2>
              <p className="text-xs text-zinc-500">Mantém identidade facial nas gerações</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Warning */}
          <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
            <ShieldAlert size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/80 leading-relaxed">
              Use apenas imagens próprias ou com autorização. Ao enviar, você confirma ter os direitos sobre esta imagem.
            </p>
          </div>

          {/* Upload area */}
          {!preview ? (
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">Adicionar novo rosto</p>
              <div
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2.5 cursor-pointer transition-colors ${
                  dragOver ? "border-indigo-400 bg-indigo-500/10" : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Upload size={20} className="text-zinc-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-white font-medium">Arraste ou clique para selecionar</p>
                  <p className="text-xs text-zinc-500 mt-0.5">JPG, PNG ou WebP · Máx {MAX_SIZE_MB}MB</p>
                </div>
              </div>
              {uploadError && (
                <div className="flex items-center gap-2 text-red-400 text-xs mt-2">
                  <AlertCircle size={12} />
                  {uploadError}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Nova referência</p>

              <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-zinc-700 mx-auto">
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
                <button
                  onClick={resetUpload}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                >
                  <X size={10} />
                </button>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Nome / rótulo</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Meu rosto"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setSetAsDefault(!setAsDefault)}
                  className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${setAsDefault ? "bg-indigo-600" : "bg-zinc-700"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${setAsDefault ? "translate-x-4" : "translate-x-0"}`} />
                </div>
                <span className="text-sm text-zinc-300">Usar como padrão nas gerações</span>
              </label>

              {uploadError && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 rounded-lg px-3 py-2">
                  <AlertCircle size={12} />
                  {uploadError}
                </div>
              )}

              {uploadState === "done" ? (
                <div className="flex items-center justify-center gap-2 text-green-400 text-sm py-2">
                  <CheckCircle2 size={16} />
                  Salvo com sucesso!
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={resetUpload}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-lg text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploadState === "uploading" || uploadState === "reading"}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                  >
                    {uploadState === "uploading" ? "Salvando..." : "Salvar referência"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Saved references */}
          {images.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wide">
                Salvas ({images.length})
              </p>
              <div className="space-y-2">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      img.is_default ? "border-indigo-500/50 bg-indigo-600/10" : "border-zinc-800 bg-zinc-800/40"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-zinc-700">
                      <img src={img.image_url} alt={img.label} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-white truncate">{img.label}</p>
                        {img.is_default && (
                          <span className="text-xs bg-indigo-600/30 text-indigo-300 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                            Padrão
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {new Date(img.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!img.is_default && (
                        <button
                          onClick={() => handleSetDefault(img.id)}
                          className="p-1.5 text-zinc-500 hover:text-yellow-400 hover:bg-zinc-700 rounded-lg transition-colors"
                          title="Definir como padrão"
                        >
                          <Star size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(img.id)}
                        disabled={deletingId === img.id}
                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-40"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <p className="text-zinc-500 text-sm text-center py-4">Carregando...</p>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
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
