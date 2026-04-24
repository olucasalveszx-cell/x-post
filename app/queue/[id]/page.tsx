"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AutoPostItem, GeneratedSlide } from "@/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

function SlideCard({
  slide,
  index,
  imageUrl,
}: {
  slide: GeneratedSlide;
  index: number;
  imageUrl?: string | null;
}) {
  const bg = slide.colorScheme?.background ?? "#0a0a0a";
  const accent = slide.colorScheme?.accent ?? "#6366f1";
  const text = slide.colorScheme?.text ?? "#ffffff";
  const titleParts = slide.title.split(/(\[[^\]]+\])/g);

  return (
    <div
      className="rounded-2xl overflow-hidden flex-shrink-0 w-[220px] shadow-xl border border-white/10"
      style={{ background: bg, minHeight: 360 }}
    >
      {/* Imagem */}
      <div className="h-[160px] relative overflow-hidden" style={{ background: `${accent}22` }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`Slide ${index + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span style={{ color: accent, opacity: 0.4, fontSize: 40 }}>✦</span>
          </div>
        )}
        <div
          className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full font-mono"
          style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
        >
          {index + 1}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-2">
        <p className="text-xs font-bold leading-tight" style={{ color: text }}>
          {titleParts.map((part, i) =>
            part.startsWith("[") && part.endsWith("]") ? (
              <span key={i} style={{ color: accent }}>
                {part.slice(1, -1)}
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
        <p className="text-[11px] leading-relaxed" style={{ color: `${text}99` }}>
          {slide.body}
        </p>
        {slide.callToAction && (
          <p
            className="text-[10px] font-semibold mt-2 pt-2 border-t"
            style={{ color: accent, borderColor: `${accent}33` }}
          >
            {slide.callToAction}
          </p>
        )}
      </div>
    </div>
  );
}

export default function QueuePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<AutoPostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [igAccountId, setIgAccountId] = useState("");
  const [igToken, setIgToken] = useState("");
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [approved, setApproved] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Lê credenciais do IG salvas no localStorage (mesmo padrão do PostsPanel)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ig_account");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.accountId) setIgAccountId(parsed.accountId);
        if (parsed.token) setIgToken(parsed.token);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetch(`/api/auto-post/${id}`)
      .then((r) => r.json())
      .then((d) => setItem(d.item ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApprove() {
    if (!igAccountId || !igToken) {
      setApproveError(
        "Credenciais do Instagram não encontradas. Conecte sua conta no editor principal antes de aprovar."
      );
      return;
    }
    setApproving(true);
    setApproveError("");
    try {
      const res = await fetch(`/api/auto-post/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ igAccountId, igToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao aprovar");
      setApproved(true);
    } catch (err: any) {
      setApproveError(err.message);
    } finally {
      setApproving(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    await fetch(`/api/auto-post/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    router.push("/queue");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Carregando preview...</p>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400">Agendamento não encontrado.</p>
        <Link href="/queue" className="text-indigo-400 text-sm hover:underline">
          ← Voltar
        </Link>
      </main>
    );
  }

  if (approved) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-5xl">✓</div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-green-400">Post aprovado e agendado!</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Publicação em {formatDate(item.scheduledAt)}
          </p>
        </div>
        <Link
          href="/queue"
          className="text-indigo-400 text-sm hover:underline"
        >
          ← Ver todos os agendamentos
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-12">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Link href="/queue" className="text-zinc-500 text-sm hover:text-white transition-colors">
          ← Agendamentos
        </Link>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              item.status === "pending_approval"
                ? "bg-blue-500/20 text-blue-300"
                : "bg-zinc-500/20 text-zinc-400"
            }`}
          >
            {item.status === "pending_approval" ? "Aguardando aprovação" : item.status}
          </span>
          <Link
            href="/queue"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-lg leading-none"
            title="Fechar"
          >
            ✕
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-8 space-y-8">
        {/* Info */}
        <div>
          <h1 className="text-xl font-bold">{item.topic}</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Publicação agendada para{" "}
            <span className="text-white">{formatDate(item.scheduledAt)}</span>
          </p>
          <p className="text-xs text-zinc-600 mt-0.5">
            {item.slideCount} slides · estilo {item.writingStyle}
          </p>
        </div>

        {/* Preview dos slides */}
        {item.slides && item.slides.length > 0 ? (
          <div>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-4">
              Preview dos slides
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
              {item.slides.map((slide, i) => (
                <SlideCard
                  key={i}
                  slide={slide}
                  index={i}
                  imageUrl={item.slideImageUrls?.[i]}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <p className="text-zinc-500 text-sm">Conteúdo ainda sendo gerado...</p>
          </div>
        )}

        {/* Legenda */}
        {item.caption && (
          <div>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
              Legenda gerada
            </h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {item.caption}
              </p>
            </div>
          </div>
        )}

        {/* Ações */}
        {item.status === "pending_approval" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold">Aprovar e agendar</h2>

            {!igAccountId && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-yellow-300 text-xs">
                  Conta do Instagram não detectada. Conecte sua conta no{" "}
                  <Link href="/editor" className="underline">
                    editor principal
                  </Link>{" "}
                  antes de aprovar.
                </p>
              </div>
            )}

            {approveError && (
              <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">
                {approveError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={approving || !igAccountId}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                {approving ? "Enviando para o Instagram..." : "Aprovar e agendar no Instagram"}
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-3 text-sm text-zinc-400 hover:text-red-400 border border-zinc-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>

            <p className="text-xs text-zinc-600">
              Ao aprovar, o sistema fará upload das imagens e agendará o carrossel no Instagram
              automaticamente no horário definido.
            </p>
          </div>
        )}

        {item.status === "approved" && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <p className="text-green-400 font-semibold text-sm">
              Post aprovado e agendado para {formatDate(item.scheduledAt)}
            </p>
          </div>
        )}

        {item.status === "cancelled" && (
          <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
            <p className="text-zinc-500 text-sm">Este agendamento foi cancelado.</p>
          </div>
        )}
      </div>
    </main>
  );
}
