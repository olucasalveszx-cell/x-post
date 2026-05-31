"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Languages, ShoppingBag, CalendarClock, StickyNote, Save, Loader2 } from "lucide-react";
import { Slide } from "@/types";
import GeneratorPanel from "./GeneratorPanel";
import TranslatePanel from "./TranslatePanel";
import PromoPanel from "./PromoPanel";
import PostsPanel from "@/components/Calendar/PostsPanel";

interface Props {
  onGenerate: (slides: Slide[]) => void;
  onLayoutChange?: (slides: Slide[]) => void;
  currentSlides?: Slide[];
}

type Tab = "generate" | "promo" | "posts" | "translate" | "notes";

function NotesPanel() {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/notes").then(r => r.json()).then(d => setNote(d.note ?? "")).catch(() => {});
  }, []);

  const save = useCallback(async (text: string) => {
    setSaving(true); setSaved(false);
    try {
      await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: text }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }, []);

  const handleChange = (val: string) => {
    setNote(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(val), 1500);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
            <StickyNote size={15} className="text-yellow-400" /> Minhas Notas
          </h2>
          <p className="text-[10px] text-[var(--text-3)] mt-0.5">Anotações salvas automaticamente</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          {saving && <><Loader2 size={10} className="animate-spin text-[var(--text-3)]" /><span className="text-[var(--text-3)]">Salvando...</span></>}
          {saved && <span className="text-green-400">✓ Salvo</span>}
        </div>
      </div>

      <textarea
        value={note}
        onChange={e => handleChange(e.target.value)}
        placeholder={"💡 Ideias de conteúdo...\n📅 Posts para essa semana...\n🎯 Metas e estratégias...\n✅ Tarefas pendentes..."}
        className="w-full min-h-[320px] bg-[var(--bg)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-yellow-500/50 resize-none leading-relaxed"
      />

      <button
        onClick={() => save(note)}
        disabled={saving}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/25 text-yellow-400 text-sm font-medium transition-colors disabled:opacity-40"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Salvar notas
      </button>
    </div>
  );
}

export default function SidePanel({ onGenerate, onLayoutChange, currentSlides = [] }: Props) {
  const [tab, setTab] = useState<Tab>("generate");

  return (
    <div className="w-80 bg-[var(--bg-2)] border-r border-[var(--border)] flex flex-col overflow-hidden">

      {/* Aba Posts em destaque no topo */}
      <button
        onClick={() => setTab("posts")}
        className={`flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border-b transition-colors shrink-0 ${
          tab === "posts"
            ? "bg-brand-600/20 border-brand-500/40 text-brand-400"
            : "bg-[var(--bg-3)] border-[var(--border)] text-[var(--text-2)] hover:text-brand-400 hover:bg-brand-600/10"
        }`}
      >
        <CalendarClock size={13} />
        📅 Agendar & Posts
      </button>

      {/* Abas secundárias */}
      <div className="flex border-b border-[var(--border)] shrink-0">
        {([
          { id: "generate",  label: "Gerar",    icon: <Sparkles size={11} /> },
          { id: "promo",     label: "Produto",  icon: <ShoppingBag size={11} /> },
          { id: "translate", label: "Traduzir", icon: <Languages size={11} /> },
          { id: "notes",     label: "Notas",    icon: <StickyNote size={11} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              tab === t.id
                ? "text-[var(--text)] border-b-2 border-brand-500"
                : "text-[var(--text-3)] hover:text-[var(--text-2)]"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "generate"  && <GeneratorPanel onGenerate={onGenerate} onLayoutChange={onLayoutChange} currentSlides={currentSlides} />}
        {tab === "promo"     && <PromoPanel onGenerate={onGenerate} />}
        {tab === "posts"     && <PostsPanel currentSlides={currentSlides} onLoad={onGenerate} />}
        {tab === "translate" && <TranslatePanel onGenerate={onGenerate} />}
        {tab === "notes"     && <NotesPanel />}
      </div>

    </div>
  );
}
