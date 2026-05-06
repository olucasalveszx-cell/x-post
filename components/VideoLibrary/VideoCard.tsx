"use client";

import { useState } from "react";
import { Play, Calendar, Trash2, Eye, Clock, Film } from "lucide-react";
import { Video, VideoStatus } from "@/types";

interface Props {
  video: Video;
  onSchedule: (video: Video) => void;
  onDelete: (id: string) => void;
  onPreview: (video: Video) => void;
}

const STATUS_MAP: Record<VideoStatus, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-zinc-500/20 text-zinc-400" },
  scheduled: { label: "Agendado", color: "bg-blue-500/20 text-blue-300" },
  posted: { label: "Postado", color: "bg-green-500/20 text-green-300" },
  error: { label: "Erro", color: "bg-red-500/20 text-red-400" },
};

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function VideoCard({ video, onSchedule, onDelete, onPreview }: Props) {
  const [deleting, setDeleting] = useState(false);
  const status = STATUS_MAP[video.status];

  async function handleDelete() {
    if (!confirm(`Excluir "${video.title}" permanentemente?`)) return;
    setDeleting(true);
    await onDelete(video.id);
    setDeleting(false);
  }

  const duration = formatDuration(video.duration);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-zinc-800 overflow-hidden">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film size={32} className="text-zinc-600" />
          </div>
        )}

        {/* Play overlay */}
        <button
          onClick={() => onPreview(video)}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play size={20} className="text-white ml-0.5" fill="white" />
          </div>
        </button>

        {/* Duration badge */}
        {duration && (
          <span className="absolute bottom-2 right-2 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded font-mono">
            {duration}
          </span>
        )}

        {/* Status badge */}
        <span
          className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}
        >
          {status.label}
        </span>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="font-medium text-sm text-white truncate" title={video.title}>
          {video.title}
        </p>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>{formatSize(video.file_size)}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatDate(video.created_at)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            onClick={() => onPreview(video)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg py-1.5 transition-colors"
          >
            <Eye size={12} />
            Visualizar
          </button>

          <button
            onClick={() => onSchedule(video)}
            disabled={video.status === "posted"}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg py-1.5 transition-colors"
          >
            <Calendar size={12} />
            Agendar
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center justify-center w-8 h-8 text-zinc-600 hover:text-red-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-40"
            title="Excluir"
          >
            {deleting ? (
              <span className="text-xs">...</span>
            ) : (
              <Trash2 size={13} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
