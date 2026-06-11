"use client";

import { useState } from "react";
import { X, Instagram, Loader2, CheckCircle, AlertCircle, Key } from "lucide-react";

interface IGAccount {
  token: string;
  accountId: string;
  username: string;
  expiresAt?: number;
}

interface Props {
  onSave: (account: IGAccount) => void;
  onClose: () => void;
}

export default function IGTokenModal({ onSave, onClose }: Props) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resolved, setResolved] = useState<IGAccount | null>(null);

  const handleResolve = async () => {
    if (!token.trim()) return;
    setStatus("loading");
    setMessage("");
    setResolved(null);
    try {
      const res = await fetch("/api/instagram/resolve-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao verificar token");
      setResolved(data);
      setStatus("ok");
      setMessage(`Conta encontrada: @${data.username}`);
    } catch (e: any) {
      setStatus("error");
      setMessage(e.message ?? "Erro ao verificar token");
    }
  };

  const handleSave = () => {
    if (!resolved) return;
    onSave(resolved);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-3)] border border-[var(--border-2)] rounded-2xl w-full max-w-md flex flex-col gap-5 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}>
            <Key size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-[var(--text)] text-base">Configurar token do Instagram</h2>
            <p className="text-xs text-[var(--text-3)] mt-0.5">Cole seu Page Access Token do Meta for Developers</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--text-2)]">Page Access Token</label>
          <textarea
            value={token}
            onChange={(e) => { setToken(e.target.value); setStatus("idle"); setResolved(null); }}
            placeholder="EAAxxxxxx..."
            rows={4}
            className="w-full rounded-xl px-3 py-2.5 text-xs font-mono bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-3)] resize-none focus:outline-none focus:border-brand-500"
          />
        </div>

        {message && (
          <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
            status === "ok"
              ? "bg-green-900/30 border border-green-800/50 text-green-300"
              : "bg-red-900/30 border border-red-800/50 text-red-300"
          }`}>
            {status === "ok"
              ? <CheckCircle size={14} className="mt-0.5 shrink-0" />
              : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
            {message}
          </div>
        )}

        <div className="flex gap-2">
          {status !== "ok" ? (
            <button
              onClick={handleResolve}
              disabled={!token.trim() || status === "loading"}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}>
              {status === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Instagram size={15} />}
              {status === "loading" ? "Verificando..." : "Verificar token"}
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg,#16a34a,#15803d)" }}>
              <CheckCircle size={15} /> Salvar e conectar @{resolved?.username}
            </button>
          )}
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-2)] bg-[var(--bg-2)] border border-[var(--border)] hover:bg-[var(--bg-4)] transition-colors">
            Cancelar
          </button>
        </div>

        <div className="text-[11px] text-[var(--text-3)] leading-relaxed">
          Gere o token em <span className="text-brand-400">developers.facebook.com</span> → Graph API Explorer → selecione seu app → adicione as permissões <code className="bg-[var(--bg-2)] px-1 rounded">instagram_basic</code>, <code className="bg-[var(--bg-2)] px-1 rounded">instagram_content_publish</code>, <code className="bg-[var(--bg-2)] px-1 rounded">pages_show_list</code> → Gerar token.
        </div>
      </div>
    </div>
  );
}
