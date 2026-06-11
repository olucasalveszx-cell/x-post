"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Trash2 } from "lucide-react";
import { AutoPostItem, AutoPostStatus } from "@/types";

const STATUS_LABEL: Record<AutoPostStatus, string> = {
  generating: "Gerando...",
  pending_approval: "Aguardando aprovação",
  approved: "Aprovado",
  cancelled: "Cancelado",
  published: "Publicado",
  failed: "Falhou",
};

const STATUS_COLOR: Record<AutoPostStatus, string> = {
  generating: "bg-yellow-500/20 text-yellow-300",
  pending_approval: "bg-blue-500/20 text-blue-300",
  approved: "bg-green-500/20 text-green-300",
  cancelled: "bg-zinc-500/20 text-zinc-400",
  published: "bg-purple-500/20 text-purple-300",
  failed: "bg-red-500/20 text-red-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

export default function QueuePage() {
  const [items, setItems] = useState<AutoPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [slideCount, setSlideCount] = useState(5);
  const [writingStyle, setWritingStyle] = useState("viral");
  const [imageSource, setImageSource] = useState<"ai" | "real">("ai");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchItems() {
    try {
      const res = await fetch("/api/auto-post");
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
    // Polling para atualizar status de itens "generating"
    const interval = setInterval(fetchItems, 8000);
    return () => clearInterval(interval);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/auto-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, scheduledAt, slideCount, writingStyle, imageSource }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar");
      setTopic("");
      setScheduledAt("");
      await fetchItems();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleCancel(id: string) {
    await fetch(`/api/auto-post/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    await fetchItems();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este agendamento permanentemente?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/auto-post/${id}`, { method: "DELETE" });
      await fetchItems();
    } finally {
      setDeletingId(null);
    }
  }

  // Data mínima: 15 min no futuro
  const minDate = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <Link href="/editor" className="text-zinc-500 text-sm hover:text-white transition-colors">
            ← Voltar ao editor
          </Link>
          <Link href="/editor" className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800">
            <X size={20} />
          </Link>
        </div>
        <h1 className="text-2xl font-bold mt-4 mb-1">Auto-post</h1>
        <p className="text-zinc-400 text-sm">
          Crie carrosséis com IA, revise o preview e agende direto no Instagram.
        </p>
      </div>

      {/* Formulário de criação */}
      <form
        onSubmit={handleCreate}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 space-y-4"
      >
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
          Novo agendamento
        </h2>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Tema do carrossel</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex: A carreira de Neymar Jr"
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Horário de publicação</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              min={minDate}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Slides</label>
            <select
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {[3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n} slides</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Estilo</label>
          <select
            value={writingStyle}
            onChange={(e) => setWritingStyle(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="viral">Viral</option>
            <option value="informativo">Informativo</option>
            <option value="educativo">Educativo</option>
            <option value="motivacional">Motivacional</option>
            <option value="noticias">Notícias</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-2">Imagens</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setImageSource("ai")}
              className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${
                imageSource === "ai"
                  ? "bg-indigo-600/20 border-indigo-500 text-white"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              <span className="text-base">✨</span>
              <span className="text-xs font-semibold">IA (Gemini)</span>
              <span className="text-[10px] opacity-60">Imagens geradas por IA</span>
            </button>
            <button
              type="button"
              onClick={() => setImageSource("real")}
              className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${
                imageSource === "real"
                  ? "bg-indigo-600/20 border-indigo-500 text-white"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              <span className="text-base">📷</span>
              <span className="text-xs font-semibold">Fotos reais</span>
              <span className="text-[10px] opacity-60">Wikimedia · Pexels</span>
            </button>
          </div>
        </div>

        {createError && (
          <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{createError}</p>
        )}

        <button
          type="submit"
          disabled={creating}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          {creating ? "Gerando conteúdo..." : "Criar e gerar conteúdo"}
        </button>
      </form>

      {/* Lista de itens */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
          Agendamentos
        </h2>

        {loading && (
          <p className="text-zinc-500 text-sm text-center py-8">Carregando...</p>
        )}

        {!loading && items.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-8">
            Nenhum agendamento criado ainda.
          </p>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{item.topic}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Publicação: {formatDate(item.scheduledAt)}
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
                Criado em {formatDate(item.createdAt)} · {item.slideCount} slides · {item.writingStyle}
              </p>
              {item.error && (
                <p className="text-xs text-red-400 mt-1">{item.error}</p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.status]}`}>
                {STATUS_LABEL[item.status]}
              </span>

              <div className="flex gap-2">
                {item.status === "pending_approval" && (
                  <Link
                    href={`/queue/${item.id}`}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg transition-colors"
                  >
                    Ver preview
                  </Link>
                )}
                {(item.status === "pending_approval" || item.status === "generating") && (
                  <button
                    onClick={() => handleCancel(item.id)}
                    className="text-xs text-zinc-400 hover:text-yellow-400 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                {item.status !== "generating" && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="text-xs text-zinc-600 hover:text-red-400 disabled:opacity-40 transition-colors flex items-center gap-1"
                    title="Excluir permanentemente"
                  >
                    <Trash2 size={12} />
                    {deletingId === item.id ? "..." : "Excluir"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
