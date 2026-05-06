"use client";

import { useState } from "react";
import { X, Calendar, Instagram, Youtube, Music2, Facebook, AlertCircle, CheckCircle2 } from "lucide-react";
import { Video, VideoPlatform } from "@/types";

interface Props {
  video: Video;
  onClose: () => void;
  onScheduled: () => void;
}

const PLATFORMS: { id: VideoPlatform; label: string; icon: React.ReactNode; color: string }[] = [
  {
    id: "instagram",
    label: "Instagram",
    icon: <Instagram size={16} />,
    color: "from-pink-500 to-purple-600",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: <Music2 size={16} />,
    color: "from-black to-zinc-700",
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: <Youtube size={16} />,
    color: "from-red-600 to-red-700",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: <Facebook size={16} />,
    color: "from-blue-600 to-blue-700",
  },
];

const MIN_MINUTES = 15;

function getMinDateTime() {
  const d = new Date(Date.now() + MIN_MINUTES * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export default function ScheduleModal({ video, onClose, onScheduled }: Props) {
  const [platform, setPlatform] = useState<VideoPlatform>("instagram");
  const [caption, setCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduledAt) { setError("Selecione uma data e horário."); return; }

    const scheduled = new Date(scheduledAt);
    if (scheduled <= new Date()) {
      setError("A data deve ser pelo menos 15 minutos no futuro.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/scheduled-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.id,
          platform,
          caption: caption.trim() || null,
          scheduledAt: scheduled.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao agendar");
      setDone(true);
      setTimeout(() => { onScheduled(); onClose(); }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h2 className="font-semibold text-white">Agendar publicação</h2>
            <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[260px]">{video.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <CheckCircle2 size={44} className="text-green-400" />
            <p className="text-sm text-green-400 font-medium">Publicação agendada!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Video preview */}
            {video.thumbnail_url && (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-800 max-h-36">
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            )}

            {/* Platform selector */}
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Plataforma</label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                      platform === p.id
                        ? "border-indigo-500 bg-indigo-600/20 text-white"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center text-white`}
                    >
                      {p.icon}
                    </div>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Caption */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Legenda <span className="text-zinc-600">(opcional)</span>
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Escreva a legenda do post..."
                rows={3}
                maxLength={2200}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
              <p className="text-right text-xs text-zinc-600 mt-1">{caption.length}/2200</p>
            </div>

            {/* Date/time */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                <Calendar size={11} className="inline mr-1" />
                Data e horário de publicação
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                min={getMinDateTime()}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? "Agendando..." : "Confirmar agendamento"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
