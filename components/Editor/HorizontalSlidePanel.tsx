"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Slide, Project } from "@/types";
import { v4 as uuid } from "uuid";

const THUMB_W = 62;
const THUMB_H = 78;

interface Props {
  projects: Project[];
  activeProjectId: string;
  activeSlideIndex: number;
  slideWidth: number;
  slideHeight: number;
  onProjectsChange: (projects: Project[]) => void;
  onSelectSlide: (projectId: string, slideIndex: number) => void;
}

export default function HorizontalSlidePanel({
  projects, activeProjectId, activeSlideIndex,
  slideWidth, slideHeight,
  onProjectsChange, onSelectSlide,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const addProject = () => {
    const newProject: Project = {
      id: uuid(),
      name: `Projeto ${projects.length + 1}`,
      slides: [{ id: uuid(), backgroundColor: "#1a0533", elements: [], width: slideWidth, height: slideHeight }],
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

  const addSlide = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const newSlide: Slide = {
      id: uuid(), backgroundColor: "#1a0533", elements: [],
      width: slideWidth, height: slideHeight,
    };
    const newSlides = [...project.slides, newSlide];
    onProjectsChange(projects.map((p) => p.id === projectId ? { ...p, slides: newSlides } : p));
    onSelectSlide(projectId, newSlides.length - 1);
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

  return (
    <div
      className="shrink-0 bg-[#080808] border-t border-[#161616] flex flex-col overflow-hidden"
      style={{ maxHeight: 220 }}
    >
      <div className="flex-1 overflow-y-auto">
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          return (
            <div key={project.id} className="border-b border-[#111] last:border-b-0">
              {/* Row header */}
              <div className="flex items-center gap-2 px-3 pt-2 pb-1">
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
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                    )}
                    <button
                      onClick={() => startRename(project)}
                      className="flex items-center gap-1.5 text-xs font-semibold hover:text-white transition-colors group"
                      style={{ color: isActive ? "#c084fc" : "#6b7280" }}
                    >
                      {project.name}
                      <Edit2 size={9} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                    </button>
                    <span className="text-[10px] text-[#374151] ml-1">
                      {project.slides.length} slides
                    </span>
                    {projects.length > 1 && (
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="ml-auto p-1 text-[#374151] hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Slides row */}
              <div className="flex items-center gap-2 px-3 pb-2.5 overflow-x-auto scrollbar-none">
                {project.slides.map((slide, si) => {
                  const isActiveSlide = isActive && si === activeSlideIndex;
                  return (
                    <button
                      key={slide.id}
                      onClick={() => onSelectSlide(project.id, si)}
                      className="relative shrink-0 rounded-lg overflow-hidden transition-all group"
                      style={{
                        width: THUMB_W,
                        height: THUMB_H,
                        backgroundColor: slide.backgroundColor ?? "#1a0533",
                        border: isActiveSlide ? "2px solid #a855f7" : "2px solid transparent",
                        outline: isActiveSlide ? "1px solid rgba(168,85,247,0.3)" : "none",
                        outlineOffset: 1,
                      }}
                      title={`Slide ${si + 1}`}
                    >
                      {slide.backgroundImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={slide.backgroundImageUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{
                            clipPath: slide.backgroundCrop
                              ? `inset(${slide.backgroundCrop.top}% ${slide.backgroundCrop.right}% ${slide.backgroundCrop.bottom}% ${slide.backgroundCrop.left}%)`
                              : undefined,
                          }}
                        />
                      )}
                      {/* Mini text preview */}
                      {slide.elements.filter((el) => el.type === "text").slice(0, 1).map((el) => (
                        <div
                          key={el.id}
                          className="absolute text-white overflow-hidden leading-tight"
                          style={{
                            left: `${(el.x / slide.width) * 100}%`,
                            top: `${(el.y / slide.height) * 100}%`,
                            width: `${(el.width / slide.width) * 100}%`,
                            fontSize: 4,
                            color: (el.style as any)?.color ?? "#fff",
                          }}
                        >
                          {(el.content ?? "").replace(/<[^>]+>/g, "").slice(0, 30)}
                        </div>
                      ))}
                      {/* Slide number */}
                      <span className="absolute bottom-0.5 right-1 text-[8px] text-white/50 bg-black/40 rounded px-0.5">
                        {si + 1}
                      </span>
                      {/* Delete on hover */}
                      {project.slides.length > 1 && (
                        <button
                          onClick={(e) => deleteSlide(project.id, si, e)}
                          className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={8} />
                        </button>
                      )}
                    </button>
                  );
                })}

                {/* Add slide */}
                <button
                  onClick={() => addSlide(project.id)}
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
      <div className="shrink-0 flex items-center px-3 py-1.5 border-t border-[#111]">
        <button
          onClick={addProject}
          className="flex items-center gap-1.5 text-[11px] text-[#4b5563] hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
        >
          <Plus size={12} /> Novo Projeto
        </button>
      </div>
    </div>
  );
}
