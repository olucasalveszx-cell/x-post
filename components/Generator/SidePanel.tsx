"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Languages, CalendarClock, StickyNote, Loader2, Plus, Trash2, ChevronDown, ChevronRight, Check } from "lucide-react";
import { Slide, SlideElement } from "@/types";
import { v4 as uuid } from "uuid";
import GeneratorPanel from "./GeneratorPanel";
import TranslatePanel from "./TranslatePanel";
import PostsPanel from "@/components/Calendar/PostsPanel";

interface Props {
  onGenerate: (slides: Slide[]) => void;
  onLayoutChange?: (slides: Slide[]) => void;
  currentSlides?: Slide[];
  defaultTab?: Tab;
}

type Tab = "generate" | "posts" | "translate" | "notes";

// ── Checklist das Notas ────────────────────────────────────────
interface CheckItem {
  id: string;
  text: string;
  checked: boolean;
  obs: string;
  obsOpen: boolean;
}

function newItem(): CheckItem {
  return { id: uuid(), text: "", checked: false, obs: "", obsOpen: false };
}

function serializeItems(items: CheckItem[]): string {
  return JSON.stringify(items.map(({ id, text, checked, obs }) => ({ id, text, checked, obs })));
}

function parseItems(raw: string): CheckItem[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && "text" in parsed[0]) {
      return parsed.map((i: any) => ({ ...i, obsOpen: false }));
    }
  } catch {}
  // backward compat: plain text → single item
  if (raw.trim()) return [{ id: uuid(), text: raw.trim(), checked: false, obs: "", obsOpen: false }];
  return [newItem()];
}

function NotesPanel() {
  const [items, setItems] = useState<CheckItem[]>([newItem()]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/notes")
      .then(r => r.json())
      .then(d => { if (d.note !== undefined) setItems(parseItems(d.note)); })
      .catch(() => {});
  }, []);

  const save = useCallback(async (its: CheckItem[]) => {
    setSaving(true); setSaved(false);
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: serializeItems(its) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }, []);

  const update = (its: CheckItem[]) => {
    setItems(its);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(its), 1200);
  };

  const addItem = () => {
    const next = [...items, newItem()];
    update(next);
    // foca no novo input
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>("[data-checkinput]");
      inputs[inputs.length - 1]?.focus();
    }, 50);
  };

  const removeItem = (id: string) => update(items.filter(i => i.id !== id));

  const toggleCheck = (id: string) =>
    update(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));

  const setText = (id: string, text: string) =>
    update(items.map(i => i.id === id ? { ...i, text } : i));

  const setObs = (id: string, obs: string) =>
    update(items.map(i => i.id === id ? { ...i, obs } : i));

  const toggleObs = (id: string) =>
    setItems(items.map(i => i.id === id ? { ...i, obsOpen: !i.obsOpen } : i));

  const done = items.filter(i => i.checked).length;
  const total = items.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
            <StickyNote size={15} className="text-yellow-400" /> Minhas Notas
          </h2>
          <p className="text-[10px] text-[var(--text-3)] mt-0.5">
            {done}/{total} concluídos · salvo automaticamente
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          {saving && <Loader2 size={10} className="animate-spin text-[var(--text-3)]" />}
          {saved && <span className="text-green-400 flex items-center gap-0.5"><Check size={10} /> Salvo</span>}
        </div>
      </div>

      {/* Progresso */}
      {total > 0 && (
        <div className="w-full bg-[var(--bg-4)] rounded-full h-1">
          <div
            className="bg-yellow-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }}
          />
        </div>
      )}

      {/* Lista de itens */}
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <div key={item.id} className={`rounded-xl border transition-colors ${item.checked ? "border-[#1a1a1a] bg-[#0a0a0a]/60" : "border-[var(--border-2)] bg-[var(--bg)]"}`}>
            <div className="flex items-center gap-2 px-3 py-2.5">
              {/* Checkbox */}
              <button
                onClick={() => toggleCheck(item.id)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  item.checked ? "bg-yellow-400 border-yellow-400" : "border-[var(--border-2)] hover:border-yellow-400/60"
                }`}
              >
                {item.checked && <Check size={10} className="text-black" strokeWidth={3} />}
              </button>

              {/* Texto */}
              <input
                data-checkinput
                value={item.text}
                onChange={e => setText(item.id, e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); addItem(); }
                  if (e.key === "Backspace" && item.text === "" && items.length > 1) {
                    e.preventDefault(); removeItem(item.id);
                  }
                }}
                placeholder="Nova tarefa ou nota..."
                className={`flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-3)] transition-colors ${
                  item.checked ? "line-through text-[var(--text-3)]" : "text-[var(--text)]"
                }`}
              />

              {/* Botão obs */}
              <button
                onClick={() => toggleObs(item.id)}
                title="Observação"
                className={`text-[var(--text-3)] hover:text-yellow-400 transition-colors ${item.obs ? "text-yellow-400/70" : ""}`}
              >
                {item.obsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>

              {/* Deletar */}
              <button
                onClick={() => removeItem(item.id)}
                className="text-[var(--text-3)] hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Observação expandível */}
            {item.obsOpen && (
              <div className="px-3 pb-2.5 pt-0">
                <textarea
                  value={item.obs}
                  onChange={e => setObs(item.id, e.target.value)}
                  placeholder="Observação, detalhes, links..."
                  rows={2}
                  className="w-full bg-[var(--bg-4)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-xs text-[var(--text-2)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-yellow-500/50 resize-none leading-relaxed"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Adicionar item */}
      <button
        onClick={addItem}
        className="flex items-center gap-2 w-full py-2 px-3 rounded-xl border border-dashed border-[var(--border-2)] hover:border-yellow-500/40 text-[var(--text-3)] hover:text-yellow-400 text-xs transition-colors"
      >
        <Plus size={13} /> Adicionar item
      </button>

      {/* Limpar concluídos */}
      {done > 0 && (
        <button
          onClick={() => update(items.filter(i => !i.checked))}
          className="text-[10px] text-[var(--text-3)] hover:text-red-400 transition-colors text-right"
        >
          Limpar {done} concluído{done > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

// ── Template Estilo Choquei/News ──────────────────────────────
function createChoqueiSlide(name: string, handle: string, picture = "", W = 1080, H = 1350): Slide {
  const elements: SlideElement[] = [
    // Perfil (topo esquerda) — usa conta conectada do usuário
    {
      id: uuid(), type: "profile",
      x: 28, y: 22, width: 640, height: 90,
      profileName: name, profileHandle: handle,
      profileVerified: true,
      profileNameColor: "#ffffff", profileHandleColor: "rgba(255,255,255,0.55)",
      zIndex: 10,
      ...(picture ? { src: picture } : {}),
    },
    // Ícone X (topo direita) — texto estilizado
    {
      id: uuid(), type: "text",
      x: W - 120, y: 28, width: 92, height: 80,
      content: "𝕏",
      style: { fontSize: 52, fontWeight: "bold", fontFamily: "sans-serif", color: "#ffffff", textAlign: "center", lineHeight: 1 },
      zIndex: 10,
    },
    // Linha separadora superior
    {
      id: uuid(), type: "shape",
      x: 0, y: 122, width: W, height: 2,
      style: { fill: "rgba(255,255,255,0.12)", stroke: "none", strokeWidth: 0, borderRadius: 0 },
      zIndex: 5,
    },
    // Texto do tweet
    {
      id: uuid(), type: "text",
      x: 28, y: 138, width: W - 56, height: 220,
      content: "📰 NOTÍCIAS: Escreva o [título da notícia] aqui — máx. 2 linhas",
      style: { fontSize: 38, fontWeight: "bold", fontFamily: "sans-serif", color: "#ffffff", textAlign: "left", lineHeight: 1.35 },
      zIndex: 10,
    },
    // Linha separadora inferior
    {
      id: uuid(), type: "shape",
      x: 0, y: 370, width: W, height: 2,
      style: { fill: "rgba(255,255,255,0.12)", stroke: "none", strokeWidth: 0, borderRadius: 0 },
      zIndex: 5,
    },
    // Frame esquerdo — imagem
    {
      id: uuid(), type: "frame",
      x: 2, y: 374, width: 534, height: 970,
      frameShape: "rect", frameMediaType: "image",
      zIndex: 8,
    },
    // Divisor vertical entre frames
    {
      id: uuid(), type: "shape",
      x: 538, y: 374, width: 4, height: 970,
      style: { fill: "rgba(0,0,0,1)", stroke: "none", strokeWidth: 0, borderRadius: 0 },
      zIndex: 9,
    },
    // Frame direito — vídeo
    {
      id: uuid(), type: "frame",
      x: 544, y: 374, width: 534, height: 970,
      frameShape: "rect", frameMediaType: "video",
      zIndex: 8,
    },
  ];

  return {
    id: uuid(),
    backgroundColor: "#111111",
    elements,
    width: W,
    height: H,
  };
}

export default function SidePanel({ onGenerate, onLayoutChange, currentSlides = [], defaultTab = "generate" }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  const handleChoqueiTemplate = () => {
    const igAccount = typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("ig_account") ?? "null")
      : null;
    const name    = igAccount?.username ?? igAccount?.name ?? "Meu Perfil";
    const handle  = igAccount?.username ?? "meuperfil";
    const picture = igAccount?.picture ?? "";
    onGenerate([createChoqueiSlide(name, handle, picture)]);
  };

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
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {tab === "generate" && (
          <GeneratorPanel onGenerate={onGenerate} onLayoutChange={onLayoutChange} currentSlides={currentSlides} />
        )}
        {tab === "posts"     && <PostsPanel currentSlides={currentSlides} onLoad={onGenerate} />}
        {tab === "translate" && <TranslatePanel onGenerate={onGenerate} />}
        {tab === "notes"     && <NotesPanel />}
      </div>

    </div>
  );
}
