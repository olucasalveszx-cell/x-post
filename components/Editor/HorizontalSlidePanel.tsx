"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Edit2, Check, X, Sparkles, Loader2, Image as ImageIcon } from "lucide-react";
import { Slide, Project } from "@/types";
import { v4 as uuid } from "uuid";

interface Props {
  projects: Project[];
  activeProjectId: string;
  activeSlideIndex: number;
  slideWidth: number;
  slideHeight: number;
  onProjectsChange: (projects: Project[]) => void;
  onSelectSlide: (projectId: string, slideIndex: number) => void;
  compact?: boolean;
}

function applyAccent(text: string, color: string) {
  return text.replace(/\[([^\]]+)\]/g, `<span style="color:${color}">$1</span>`);
}

function buildAISlide(
  data: { title: string; body: string; accentColor: string; backgroundColor: string },
  imageUrl: string | null,
  w: number,
  h: number,
): Slide {
  const accent = data.accentColor ?? "#4c6ef5";
  const gradient = "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.97) 28%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.1) 72%, rgba(0,0,0,0) 100%)";
  const titleY = h - 510;
  const bodyY  = h - 192;
  return {
    id: uuid(),
    backgroundColor: data.backgroundColor ?? "#0a0a0a",
    backgroundImageUrl: imageUrl ?? undefined,
    backgroundGradient: gradient,
    elements: [
      {
        id: uuid(), type: "text" as const,
        x: 60, y: titleY, width: w - 120, height: 280,
        content: applyAccent(data.title, accent),
        style: { fontSize: 90, fontWeight: "bold" as const, fontFamily: "sans-serif", color: "#ffffff", textAlign: "center" as const, lineHeight: 1.05 },
      },
      {
        id: uuid(), type: "text" as const,
        x: 60, y: bodyY, width: w - 120, height: 110,
        content: data.body,
        style: { fontSize: 28, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.72)", textAlign: "center" as const, lineHeight: 1.45 },
      },
    ],
    width: w,
    height: h,
  };
}

export default function HorizontalSlidePanel({
  projects, activeProjectId, activeSlideIndex,
  slideWidth, slideHeight,
  onProjectsChange, onSelectSlide, compact = false,
}: Props) {
  const THUMB_W = compact ? 44 : 62;
  const THUMB_H = compact ? 55 : 78;

  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editName, setEditName]       = useState("");

  // AI slide generation state
  const [aiTarget, setAiTarget]       = useState<string | null>(null); // projectId
  const [aiTopic, setAiTopic]         = useState("");
  const [aiImage, setAiImage]         = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError]         = useState("");
  const popupRef = useRef<HTMLDivElement>(null);
  const plusBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [popupPos, setPopupPos]       = useState({ bottom: 0, left: 0 });

  // Close popup on outside click
  useEffect(() => {
    if (!aiTarget) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setAiTarget(null);
        setAiError("");
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [aiTarget]);

  const openAiPopup = (projectId: string) => {
    const btn = plusBtnRefs.current[projectId];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setPopupPos({ bottom: window.innerHeight - rect.top + 8, left: rect.left });
    }
    setAiTarget(projectId);
    setAiTopic("");
    setAiError("");
  };

  /* ── helpers ── */
  const addProject = () => {
    const newProject: Project = {
      id: uuid(),
      name: `Projeto ${projects.length + 1}`,
      slides: [{ id: uuid(), backgroundColor: "#080e40", elements: [], width: slideWidth, height: slideHeight }],
    };
    onProjectsChange([...projects, newProject]);
    onSelectSlide(newProject.id, 0);
  };

  const deleteProject = (projectId: string) => {
    if (projects.length <= 1) return;
    const updated = projects.filter((p) => p.id !== projectId);
    onProjectsChange(updated);
    if (projectId === activeProjectId) onSelectSlide(updated[0].id, 0);
  };

  const startRename = (project: Project) => {
    setEditingId(project.id);
    setEditName(project.name);
  };

  const commitRename = () => {
    if (!editingId) return;
    onProjectsChange(projects.map((p) => p.id === editingId ? { ...p, name: editName.trim() || p.name } : p));
    setEditingId(null);
  };

  const addBlankSlide = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const newSlide: Slide = { id: uuid(), backgroundColor: "#080e40", elements: [], width: slideWidth, height: slideHeight };
    const newSlides = [...project.slides, newSlide];
    onProjectsChange(projects.map((p) => p.id === projectId ? { ...p, slides: newSlides } : p));
    onSelectSlide(projectId, newSlides.length - 1);
    setAiTarget(null);
  };

  const deleteSlide = (projectId: string, slideIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.slides.length <= 1) return;
    const newSlides = project.slides.filter((_, i) => i !== slideIndex);
    onProjectsChange(projects.map((p) => p.id === projectId ? { ...p, slides: newSlides } : p));
    if (projectId === activeProjectId && slideIndex >= newSlides.length) {
      onSelectSlide(projectId, newSlides.length - 1);
    }
  };

  /* ── AI slide generation ── */
  const generateAISlide = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project || !aiTopic.trim()) return;

    // Context: collect text from existing slides
    const context = project.slides
      .flatMap((s) => s.elements)
      .filter((el) => el.type === "text")
      .map((el) => (el.content ?? "").replace(/<[^>]+>/g, "").trim())
      .filter(Boolean)
      .slice(0, 8)
      .join(" · ");

    setAiGenerating(true);
    setAiError("");

    try {
      // 1. Generate text content
      const genRes = await fetch("/api/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic.trim(), context }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error ?? "Erro ao gerar texto");

      // 2. Optionally generate image
      let imageUrl: string | null = null;
      if (aiImage) {
        const imgRes = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: genData.imagePrompt, imageStyle: "gemini" }),
        });
        const imgData = await imgRes.json();
        imageUrl = imgData.imageUrl ?? null;
      }

      // 3. Build and append slide
      const newSlide = buildAISlide(genData, imageUrl, slideWidth, slideHeight);
      const newSlides = [...project.slides, newSlide];
      onProjectsChange(projects.map((p) => p.id === projectId ? { ...p, slides: newSlides } : p));
      onSelectSlide(projectId, newSlides.length - 1);
      setAiTarget(null);
    } catch (err: any) {
      setAiError(err.message ?? "Erro desconhecido");
    }
    setAiGenerating(false);
  };

  return (
    <>
    <div
      className="shrink-0 bg-[#080808] border-t border-[#161616] flex flex-col overflow-hidden"
      style={{ maxHeight: compact ? 140 : 220 }}
    >
      <div className="flex-1 overflow-y-auto">
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          return (
            <div key={project.id} className="border-b border-[#111] last:border-b-0">
              {/* Row header */}
              <div className={`flex items-center gap-2 px-3 ${compact ? "pt-1.5 pb-0.5" : "pt-2 pb-1"}`}>
                {editingId === project.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-md px-2 py-0.5 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                    <button onClick={commitRename} className="text-green-400 hover:text-green-300 p-0.5">
                      <Check size={12} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-300 p-0.5">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
                    <button
                      onClick={() => startRename(project)}
                      className="flex items-center gap-1.5 text-xs font-semibold hover:text-white transition-colors group"
                      style={{ color: isActive ? "##818cf8" : "#6b7280" }}
                    >
                      {project.name}
                      <Edit2 size={9} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                    </button>
                    {!compact && (
                      <span className="text-[10px] text-[#374151] ml-1">{project.slides.length} slides</span>
                    )}
                    {projects.length > 1 && (
                      <button onClick={() => deleteProject(project.id)} className="ml-auto p-1 text-[#374151] hover:text-red-400 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Slides row */}
              <div className={`flex items-center gap-1.5 px-3 ${compact ? "pb-1.5" : "pb-2.5"} overflow-x-auto scrollbar-none`}>
                {project.slides.map((slide, si) => {
                  const isActiveSlide = isActive && si === activeSlideIndex;
                  return (
                    <button
                      key={slide.id}
                      onClick={() => onSelectSlide(project.id, si)}
                      className="relative shrink-0 rounded-lg overflow-hidden transition-all group"
                      style={{
                        width: THUMB_W, height: THUMB_H,
                        backgroundColor: slide.backgroundColor ?? "#080e40",
                        border: isActiveSlide ? "2px solid #4c6ef5" : "2px solid transparent",
                        outline: isActiveSlide ? "1px solid rgba(76,110,245,0.3)" : "none",
                        outlineOffset: 1,
                      }}
                    >
                      {slide.backgroundImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={slide.backgroundImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover"
                          style={{ clipPath: slide.backgroundCrop ? `inset(${slide.backgroundCrop.top}% ${slide.backgroundCrop.right}% ${slide.backgroundCrop.bottom}% ${slide.backgroundCrop.left}%)` : undefined }} />
                      )}
                      {slide.elements.filter((el) => el.type === "text").slice(0, 1).map((el) => (
                        <div key={el.id} className="absolute text-white overflow-hidden leading-tight"
                          style={{ left: `${(el.x / slide.width) * 100}%`, top: `${(el.y / slide.height) * 100}%`, width: `${(el.width / slide.width) * 100}%`, fontSize: 4, color: (el.style as any)?.color ?? "#fff" }}>
                          {(el.content ?? "").replace(/<[^>]+>/g, "").slice(0, 30)}
                        </div>
                      ))}
                      <span className="absolute bottom-0.5 right-1 text-[8px] text-white/50 bg-black/40 rounded px-0.5">{si + 1}</span>
                      {project.slides.length > 1 && (
                        <button onClick={(e) => deleteSlide(project.id, si, e)}
                          className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={8} />
                        </button>
                      )}
                    </button>
                  );
                })}

                {/* Add slide button */}
                <button
                  ref={(el) => { plusBtnRefs.current[project.id] = el; }}
                  onClick={() => openAiPopup(project.id)}
                  className="shrink-0 rounded-lg border-2 border-dashed border-[#222] hover:border-brand-500/50 hover:bg-brand-500/5 text-[#374151] hover:text-brand-400 transition-all flex items-center justify-center"
                  style={{ width: THUMB_W, height: THUMB_H }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer — add project */}
      <div className={`shrink-0 flex items-center px-3 ${compact ? "py-1" : "py-1.5"} border-t border-[#111]`}>
        <button onClick={addProject}
          className="flex items-center gap-1.5 text-[11px] text-[#4b5563] hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
          <Plus size={12} /> Novo Projeto
        </button>
      </div>
    </div>

    {/* AI Slide Popup — rendered as portal to avoid overflow clip */}
    {aiTarget !== null && typeof window !== "undefined" && createPortal(
      <div
        ref={popupRef}
        className="fixed z-[9999] w-72 bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl p-4 flex flex-col gap-3"
        style={{ bottom: popupPos.bottom, left: Math.min(popupPos.left, window.innerWidth - 300) }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-white">Adicionar slide</p>
          <button onClick={() => setAiTarget(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Blank slide */}
        <button
          onClick={() => addBlankSlide(aiTarget)}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#0d0d0d] hover:bg-[#161616] text-left transition-colors"
        >
          <div className="w-7 h-8 rounded bg-[#1a1a1a] border border-[#2a2a2a] shrink-0" />
          <div>
            <p className="text-xs font-medium text-white">Slide em branco</p>
            <p className="text-[10px] text-gray-500">Começa do zero</p>
          </div>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-[#222]" />
          <span className="text-[10px] text-gray-600">ou</span>
          <div className="flex-1 h-px bg-[#222]" />
        </div>

        {/* AI generation */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-brand-500" />
            <p className="text-xs font-semibold text-white">Gerar com IA</p>
          </div>

          <textarea
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && aiTopic.trim()) { e.preventDefault(); generateAISlide(aiTarget); } }}
            placeholder="Tema ou ideia para o slide..."
            rows={2}
            autoFocus
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 resize-none"
          />

          {/* Include image toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setAiImage((v) => !v)}
              className={`w-8 h-4 rounded-full transition-colors relative ${aiImage ? "bg-brand-700" : "bg-[#2a2a2a]"}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${aiImage ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <ImageIcon size={10} /> Gerar imagem de fundo
            </div>
          </label>

          {aiError && (
            <p className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">{aiError}</p>
          )}

          <button
            onClick={() => generateAISlide(aiTarget)}
            disabled={aiGenerating || !aiTopic.trim()}
            className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#3b5bdb,#4c6ef5)", color: "white" }}
          >
            {aiGenerating
              ? <><Loader2 size={13} className="animate-spin" /> {aiImage ? "Gerando texto e imagem..." : "Gerando..."}</>
              : <><Sparkles size={13} /> Gerar slide</>}
          </button>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
