"use client";

import { useState } from "react";
import { X, Instagram, Loader2, CheckCircle, AlertCircle, LogIn, User, ExternalLink } from "lucide-react";

interface IGAccount {
  token: string;
  accountId: string;
  username: string;
}

interface Props {
  slides: any[];           // slides do editor (para exportar)
  account: IGAccount | null;
  onClose: () => void;
  onLoginClick: () => void;
}

export default function PublishModal({ slides, account, onClose, onLoginClick }: Props) {
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<"idle" | "exporting" | "uploading" | "publishing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);

  const SLIDE_W = 1080;
  const SLIDE_H = 1350;

  const exportSlides = async (): Promise<string[]> => {
    const html2canvas = (await import("html2canvas")).default;
    const urls: string[] = [];

    for (let i = 0; i < slides.length; i++) {
      setProgress(Math.round((i / slides.length) * 50));
      const el = document.getElementById(`slide-render-${slides[i].id}`);
      if (!el) continue;

      // Força exibição temporária para captura
      const wasHidden = el.style.display === "none";
      if (wasHidden) el.style.display = "block";
      await new Promise((r) => setTimeout(r, 150));

      const canvas = await html2canvas(el, {
        width: SLIDE_W,
        height: SLIDE_H,
        scale: 1,
        useCORS: true,
        backgroundColor: slides[i].backgroundColor,
      });

      if (wasHidden) el.style.display = "none";

      // Remove o prefixo "data:image/jpeg;base64," e pega só o base64
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      urls.push(dataUrl);
    }

    return urls;
  };

  const uploadImages = async (dataUrls: string[]): Promise<string[]> => {
    const publicUrls: string[] = [];

    for (let i = 0; i < dataUrls.length; i++) {
      setProgress(50 + Math.round((i / dataUrls.length) * 30));
      const base64 = dataUrls[i].split(",")[1];

      const res = await fetch("/api/instagram/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType: "image/jpeg" }),
      });
      const data = await res.json();
      if (!data.url) throw new Error("Falha ao hospedar imagem " + (i + 1));
      publicUrls.push(data.url);
    }

    return publicUrls;
  };

  const handlePublish = async () => {
    if (!account) return;
    setStatus("exporting");
    setMessage("");
    setProgress(0);

    try {
      // 1. Exporta slides
      const dataUrls = await exportSlides();
      if (dataUrls.length < 2) {
        throw new Error("O carrossel precisa ter pelo menos 2 slides exportados");
      }

      // 2. Hospeda imagens no servidor para o Instagram acessar
      setStatus("uploading");
      const publicUrls = await uploadImages(dataUrls);
      setProgress(80);

      // 3. Publica no Instagram
      setStatus("publishing");
      const res = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls: publicUrls,
          caption,
          igToken: account.token,
          igAccountId: account.accountId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProgress(100);
      setStatus("success");
      setMessage(data.message);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message ?? "Erro ao publicar");
    }
  };

  const isLoading = ["exporting", "uploading", "publishing"].includes(status);

  const statusLabel = {
    exporting: "Exportando slides...",
    uploading: "Enviando imagens...",
    publishing: "Publicando no Instagram...",
  }[status as string] ?? "";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2 font-semibold">
            <Instagram size={20} className="text-brand-500" />
            Publicar no Instagram
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">

          {/* Conta conectada ou botão de login */}
          {account ? (
            <div className="flex items-center gap-3 bg-green-900/20 border border-green-800/40 rounded-xl p-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <User size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">@{account.username}</p>
                <p className="text-xs text-green-400">Conta conectada</p>
              </div>
              <button
                onClick={onLoginClick}
                className="text-xs text-gray-500 hover:text-white underline"
              >
                Trocar
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-400">Conecte sua conta Instagram para publicar:</p>
              <button
                onClick={onLoginClick}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold text-sm transition-all"
              >
                <LogIn size={16} />
                Login com Instagram
              </button>
              <p className="text-[11px] text-gray-600 text-center">
                Requer conta Instagram Business conectada a uma Página do Facebook
              </p>
            </div>
          )}

          {account && (
            <>
              {/* Info slides */}
              <div className="bg-[#111] rounded-lg p-3 text-sm text-gray-400">
                <span className="text-white font-medium">{slides.length} slides</span> prontos para publicação
                {slides.length < 2 && (
                  <p className="text-yellow-500 text-xs mt-1">Mínimo de 2 slides para carrossel</p>
                )}
              </div>

              {/* Legenda */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Legenda</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Digite a legenda, hashtags..."
                  rows={3}
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600 resize-none"
                />
              </div>

              {/* Progress bar */}
              {isLoading && (
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">{statusLabel}</p>
                  <div className="w-full bg-[#333] rounded-full h-1.5">
                    <div
                      className="bg-brand-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Mensagem */}
              {message && (
                <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
                  status === "success"
                    ? "bg-green-900/30 border border-green-800/50 text-green-300"
                    : "bg-red-900/30 border border-red-800/50 text-red-300"
                }`}>
                  {status === "success"
                    ? <CheckCircle size={14} className="mt-0.5 shrink-0" />
                    : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
                  {message}
                </div>
              )}

              {/* Aviso localhost */}
              {status === "idle" && (
                <p className="text-[11px] text-gray-600 flex items-center gap-1">
                  <ExternalLink size={10} />
                  Para publicar, o app precisa estar acessível publicamente (Vercel ou ngrok)
                </p>
              )}

              {/* Botão publicar */}
              <button
                onClick={handlePublish}
                disabled={isLoading || status === "success" || slides.length < 2}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isLoading
                  ? <Loader2 size={16} className="animate-spin" />
                  : status === "success"
                  ? <CheckCircle size={16} />
                  : <Instagram size={16} />}
                {isLoading ? statusLabel : status === "success" ? "Publicado!" : "Publicar Agora"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
