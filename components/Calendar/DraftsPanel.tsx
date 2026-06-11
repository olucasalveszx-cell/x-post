"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { FileText, Loader2, Trash2, FolderOpen, Clock, Save } from "lucide-react";
import { Slide } from "@/types";
import { v4 as uuid } from "uuid";

interface DraftMeta {
  id: string;
  name: string;
  slideCount: number;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  currentSlides: Slide[];
  onLoad: (slides: Slide[]) => void;
}

export default function DraftsPanel({ currentSlides, onLoad }: Props) {
  const { data: session } = useSession();
  const [drafts, setDrafts] = useState<DraftMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user?.email) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/drafts");
      const data = await res.json();
      setDrafts(data.drafts ?? []);
    } catch {}
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const saveDraft = async () => {
    if (!session?.user?.email) return;
    const hasContent = currentSlides.some(s => s.elements.length > 0 || s.backgroundImageUrl);
    if (!hasContent) return;

    setSaving(true);
    try {
      const id = uuid();
      const name = draftName.trim() || `Rascunho ${new Date().toLocaleDateString("pt-BR")}`;
      await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, slides: currentSlides }),
      });
      setDraftName("");
      setShowNameInput(false);
      await load();
    } catch {}
    setSaving(false);
  };

  const loadDraft = async (draft: DraftMeta) => {
    setLoadingId(draft.id);
    try {
      const res = await fetch(`/api/drafts/${draft.id}`);
      const data = await res.json();
      if (data.slides) onLoad(data.slides);
    } catch {}
    setLoadingId(null);
  };

  const deleteDraft = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch("/api/drafts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setDrafts(prev => prev.filter(d => d.id !== id));
    } catch {}
    setDeletingId(null);
  };

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
        <FileText size={32} className="text-gray-600" />
        <p className="text-sm text-gray-400">Entre para salvar rascunhos</p>
      </div>
    );
  }

  const hasContent = currentSlides.some(s => s.elements.length > 0 || s.backgroundImageUrl);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold mb-0.5 flex items-center gap-2">
          <FileText size={18} className="text-brand-500" />
          Rascunhos
        </h2>
        <p className="text-xs text-gray-500">Salve e recupere carrosséis em qualquer dispositivo.</p>
      </div>

      {/* Salvar atual */}
      {hasContent && (
        <div className="flex flex-col gap-2">
          {showNameInput ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Nome do rascunho..."
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && saveDraft()}
                className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600"
              />
              <button onClick={saveDraft} disabled={saving}
                className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium disabled:opacity-40 flex items-center gap-1.5 transition-colors">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Salvar
              </button>
            </div>
          ) : (
            <button onClick={() => setShowNameInput(true)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-brand-500/40 hover:border-brand-500/70 bg-brand-500/5 hover:bg-brand-500/10 text-brand-400 text-sm font-medium transition-all">
              <Save size={14} /> Salvar carrossel atual como rascunho
            </button>
          )}
        </div>
      )}

      {/* Lista de rascunhos */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={18} className="animate-spin text-gray-500" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <FolderOpen size={28} className="text-gray-700" />
          <p className="text-sm text-gray-500">Nenhum rascunho salvo</p>
          <p className="text-xs text-gray-600">Gere um carrossel e salve aqui para acessar depois</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {drafts.map(draft => (
            <div key={draft.id} className="flex gap-2.5 p-3 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] group">
              {/* Thumbnail */}
              <div className="w-12 h-14 rounded-lg overflow-hidden shrink-0 bg-[#1a1a1a] flex items-center justify-center">
                {draft.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FileText size={16} className="text-gray-600" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{draft.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{draft.slideCount} slide{draft.slideCount > 1 ? "s" : ""}</p>
                <p className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                  <Clock size={9} />
                  {new Date(draft.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => loadDraft(draft)} disabled={loadingId === draft.id}
                  className="px-2.5 py-1.5 rounded-lg bg-brand-600/20 hover:bg-brand-600 text-brand-400 hover:text-white text-[11px] font-medium transition-colors flex items-center gap-1 disabled:opacity-40">
                  {loadingId === draft.id ? <Loader2 size={10} className="animate-spin" /> : <FolderOpen size={10} />}
                  Abrir
                </button>
                <button onClick={() => deleteDraft(draft.id)} disabled={deletingId === draft.id}
                  className="px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 text-[11px] transition-colors flex items-center gap-1">
                  {deletingId === draft.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                  Apagar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
