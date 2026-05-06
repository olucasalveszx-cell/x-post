"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, X, Search, SlidersHorizontal, Film } from "lucide-react";
import { Video, VideoStatus } from "@/types";
import VideoCard from "./VideoCard";
import VideoUpload from "./VideoUpload";
import ScheduleModal from "./ScheduleModal";

const STATUS_FILTERS: { value: VideoStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Rascunho" },
  { value: "scheduled", label: "Agendado" },
  { value: "posted", label: "Postado" },
  { value: "error", label: "Erro" },
];

export default function VideoLibrary() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<Video | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VideoStatus | "all">("all");
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch("/api/videos");
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      const data = await res.json();
      setVideos(data.videos ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  async function handleDelete(id: string) {
    await fetch(`/api/videos/${id}`, { method: "DELETE" });
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }

  const filtered = videos.filter((v) => {
    const matchSearch = v.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const totalSize = videos.reduce((acc, v) => acc + v.file_size, 0);
  const scheduledCount = videos.filter((v) => v.status === "scheduled").length;

  function formatTotalSize(bytes: number) {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total de vídeos", value: videos.length },
          { label: "Armazenamento", value: formatTotalSize(totalSize) },
          { label: "Agendados", value: scheduledCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
          >
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar vídeo..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Upload button */}
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shrink-0"
        >
          <Plus size={16} />
          Novo vídeo
        </button>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-zinc-200">Enviar vídeo</h3>
            <button
              onClick={() => setShowUpload(false)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <VideoUpload
            onUploaded={() => {
              setShowUpload(false);
              fetchVideos();
            }}
          />
        </div>
      )}

      {/* Video grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden animate-pulse"
            >
              <div className="aspect-video bg-zinc-800" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
                <div className="h-8 bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Film size={28} className="text-zinc-600" />
          </div>
          <div>
            <p className="text-zinc-400 font-medium">
              {search || statusFilter !== "all"
                ? "Nenhum vídeo encontrado"
                : "Sua biblioteca está vazia"}
            </p>
            <p className="text-zinc-600 text-sm mt-1">
              {search || statusFilter !== "all"
                ? "Tente ajustar os filtros"
                : "Envie seu primeiro vídeo para começar"}
            </p>
          </div>
          {!search && statusFilter === "all" && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              <Plus size={16} />
              Enviar vídeo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onSchedule={setScheduleTarget}
              onDelete={handleDelete}
              onPreview={setPreviewVideo}
            />
          ))}
        </div>
      )}

      {/* Schedule modal */}
      {scheduleTarget && (
        <ScheduleModal
          video={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          onScheduled={fetchVideos}
        />
      )}

      {/* Video preview modal */}
      {previewVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewVideo(null); }}
        >
          <div className="relative w-full max-w-2xl">
            <button
              onClick={() => setPreviewVideo(null)}
              className="absolute -top-10 right-0 text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
            >
              <X size={16} /> Fechar
            </button>
            <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
              <video
                ref={videoRef}
                src={previewVideo.file_url}
                controls
                autoPlay
                className="w-full max-h-[70vh] object-contain bg-black"
              />
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white text-sm">{previewVideo.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {new Date(previewVideo.created_at).toLocaleDateString("pt-BR", {
                      dateStyle: "long",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPreviewVideo(null);
                    setScheduleTarget(previewVideo);
                  }}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Agendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
