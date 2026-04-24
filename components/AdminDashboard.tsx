"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Users, Loader2, RefreshCw,
  Activity, TrendingUp, Image, Layers, DollarSign, Crown, ArrowLeft,
  LayoutGrid, ImageOff, Download, ExternalLink, Eye, X, ChevronLeft, ChevronRight,
  Trash2, Plus, RotateCcw, Zap, PlayCircle, Upload, MessageSquare, Lightbulb, Check, Reply, Sparkles, Wand2, Send, Bot, Twitter,
} from "lucide-react";
import AppLogo from "@/components/AppLogo";
import Link from "next/link";
import { v4 as uuid } from "uuid";
import type { AdminDraftMeta } from "@/app/api/admin/carousels/route";
import type { AdminImageEntry } from "@/app/api/admin/images/route";
import type { WritingStyle, Slide, GeneratedContent } from "@/types";

interface Stats {
  totalUsers: number;
  onlineNow: number;
  activeToday: number;
  basicCount: number;
  proCount: number;
  businessCount: number;
  mrr: string;
  carouselsToday: number;
  imagesToday: number;
  weekData: { date: string; count: number }[];
  recentUsers: { name: string; email: string; createdAt: string; plan?: string }[];
}

function KpiCard({
  label, value, icon: Icon, accent, sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-2xl px-5 py-4 flex flex-col gap-3"
      style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</p>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}22` }}
        >
          <Icon size={13} style={{ color: accent }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-black tracking-tight">{value}</p>
        {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function WeekChart({ data }: { data: Stats["weekData"] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
    >
      <p className="text-xs font-bold mb-4 text-gray-300">Carrosséis gerados — últimos 7 dias</p>
      <div className="flex items-end gap-2 h-24">
        {data.map((d, i) => {
          const pct = (d.count / max) * 100;
          const date = new Date(d.date + "T12:00:00Z");
          const dayLabel = dayLabels[date.getUTCDay()];
          const isToday = i === data.length - 1;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-gray-600">{d.count || ""}</span>
              <div className="w-full rounded-t-md relative" style={{ height: "64px" }}>
                <div
                  className="absolute bottom-0 w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${Math.max(pct, d.count > 0 ? 4 : 0)}%`,
                    background: isToday
                      ? "linear-gradient(to top, #4c6ef5, #ec4899)"
                      : "#1e1e1e",
                    border: isToday ? "none" : "1px solid #2a2a2a",
                  }}
                />
              </div>
              <span
                className="text-[9px] font-medium"
                style={{ color: isToday ? "#4c6ef5" : "#4b5563" }}
              >
                {dayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OnlineDot() {
  return (
    <span className="relative inline-flex h-2 w-2 mr-1.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

interface AdminUser {
  name: string;
  email: string;
  createdAt: string;
  plan: string;
  used: number;
  limit: number;
  bonus: number;
  total: number;
}

type Tab = "overview" | "carousels" | "images" | "users" | "tutorial" | "feedbacks" | "xpost" | "gerador";

interface TutorialData {
  url: string;
  title: string;
  description: string;
  uploadedAt: string;
}

interface MemberVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  addedAt: string;
}

interface MemberTopic {
  id: string;
  emoji: string;
  title: string;
  description: string;
  videos: MemberVideo[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  /* ── Carrosséis ── */
  const [drafts, setDrafts] = useState<AdminDraftMeta[]>([]);
  const [draftsTotal, setDraftsTotal] = useState(0);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState("");

  /* ── Imagens ── */
  const [images, setImages] = useState<AdminImageEntry[]>([]);
  const [imagesTotal, setImagesTotal] = useState(0);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState("");

  /* ── Banco de imagens — geração admin ── */
  const [bankPrompt, setBankPrompt] = useState("");
  const [bankStyle, setBankStyle] = useState<"gemini" | "foto_real">("gemini");
  const [bankGenerating, setBankGenerating] = useState(false);
  const [bankError, setBankError] = useState("");
  const [bankMode, setBankMode] = useState<"single" | "batch" | "upload">("single");
  const [bankBatch, setBankBatch] = useState("");
  const [bankProgress, setBankProgress] = useState<{ done: number; total: number } | null>(null);
  const [bankUploadFile, setBankUploadFile] = useState<File | null>(null);
  const [bankUploadPreview, setBankUploadPreview] = useState<string>("");
  const [bankUploadTag, setBankUploadTag] = useState("");
  const bankUploadRef = useRef<HTMLInputElement>(null);

  /* ── Tutorial ── */
  const [tutorial, setTutorial] = useState<TutorialData | null>(null);
  const [tutorialLoading, setTutorialLoading] = useState(false);
  const [tutorialUploading, setTutorialUploading] = useState(false);
  const [tutorialUploadProgress, setTutorialUploadProgress] = useState(0);
  const [tutorialTitle, setTutorialTitle] = useState("");
  const [tutorialDesc, setTutorialDesc] = useState("");
  const tutorialFileRef = useRef<HTMLInputElement>(null);

  /* ── Área de Membros ── */
  const [membersTopics, setMembersTopics] = useState<MemberTopic[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersExpandedTopic, setMembersExpandedTopic] = useState<string | null>(null);
  const [membersVideoTitle, setMembersVideoTitle] = useState<Record<string, string>>({});
  const [membersVideoDesc, setMembersVideoDesc] = useState<Record<string, string>>({});
  const [membersVideoUrl, setMembersVideoUrl] = useState<Record<string, string>>({});
  const [membersSaving, setMembersSaving] = useState<string | null>(null);

  /* ── Preview modal ── */
  const [previewDraft, setPreviewDraft] = useState<AdminDraftMeta | null>(null);
  const [previewSlides, setPreviewSlides] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);

  /* ── Usuários ── */
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* ── Feedbacks ── */
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replySaving, setReplySaving] = useState<string | null>(null);

  // ── XPost Brainstorm ──────────────────────────────────────
  type XMsg = { role: "user" | "assistant"; content: string };
  const [xpostMsgs, setXpostMsgs] = useState<XMsg[]>([
    { role: "assistant", content: "Oi. Sou a Nexa no modo XPost. Estou aqui pra te ajudar a criar conteúdo para os perfis da empresa. Me fala o que você quer comunicar — ou escolhe uma ideia acima pra começar." },
  ]);
  const [xpostInput, setXpostInput] = useState("");
  const [xpostLoading, setXpostLoading] = useState(false);
  const xpostEndRef = useRef<HTMLDivElement>(null);

  // ── Gerador XPost ─────────────────────────────────────────
  const [xgenTopic, setXgenTopic] = useState("");
  const [xgenCount, setXgenCount] = useState(6);
  const [xgenStyle, setXgenStyle] = useState<WritingStyle>("viral");
  const [xgenStatus, setXgenStatus] = useState<"idle" | "gen" | "done" | "opening">("idle");
  const [xgenContent, setXgenContent] = useState<GeneratedContent | null>(null);
  const [xgenError, setXgenError] = useState("");
  const [xgenTwitter, setXgenTwitter] = useState(false);
  // Banco de imagens XPost
  type XPostImg = { id: string; url: string; name: string; uploadedAt: string };
  const [xpostImages, setXpostImages] = useState<XPostImg[]>([]);
  const [xpostImgsLoaded, setXpostImgsLoaded] = useState(false);
  const [xpostImgUploading, setXpostImgUploading] = useState(false);
  const [xpostImgDeleting, setXpostImgDeleting] = useState<string | null>(null);
  const xpostImgInputRef = useRef<HTMLInputElement>(null);

  /* ── Novo carrossel indicator ── */
  const prevDraftsCount = useRef(0);

  const fetchStats = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 401) { router.push("/admin/login"); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar stats");
      setStats(data);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30_000);
    return () => clearInterval(id);
  }, [fetchStats]);

  const fetchCarousels = useCallback(async () => {
    setDraftsLoading(true); setDraftsError("");
    try {
      const res = await fetch("/api/admin/carousels");
      if (res.status === 401) { router.push("/admin/login"); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      setDrafts(data.drafts);
      setDraftsTotal(data.total);
    } catch (e: any) {
      setDraftsError(e.message);
    } finally {
      setDraftsLoading(false);
    }
  }, [router]);

  const fetchImages = useCallback(async () => {
    setImagesLoading(true); setImagesError("");
    try {
      const res = await fetch("/api/admin/images");
      if (res.status === 401) { router.push("/admin/login"); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      setImages(data.images);
      setImagesTotal(data.total);
    } catch (e: any) {
      setImagesError(e.message);
    } finally {
      setImagesLoading(false);
    }
  }, [router]);

  const generateForBank = useCallback(async () => {
    setBankError("");
    if (bankMode === "single") {
      if (!bankPrompt.trim()) return;
      setBankGenerating(true);
      try {
        const res = await fetch("/api/admin/image-bank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: bankPrompt.trim(), style: bankStyle }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao gerar imagem");
        setBankPrompt("");
        await fetchImages();
      } catch (e: any) {
        setBankError(e.message);
      } finally {
        setBankGenerating(false);
      }
    } else {
      const prompts = bankBatch.split("\n").map((p) => p.trim()).filter(Boolean);
      if (!prompts.length) return;
      setBankGenerating(true);
      setBankProgress({ done: 0, total: prompts.length });
      let done = 0;
      for (const prompt of prompts) {
        try {
          await fetch("/api/admin/image-bank", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, style: bankStyle }),
          });
        } catch {}
        done++;
        setBankProgress({ done, total: prompts.length });
      }
      setBankBatch("");
      setBankProgress(null);
      setBankGenerating(false);
      await fetchImages();
    }
  }, [bankMode, bankPrompt, bankStyle, bankBatch, fetchImages]);

  const uploadToBank = useCallback(async () => {
    if (!bankUploadFile) return;
    setBankGenerating(true);
    setBankError("");
    try {
      const reader = new FileReader();
      const b64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(bankUploadFile);
      });
      const res = await fetch("/api/admin/image-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, imageMimeType: bankUploadFile.type, prompt: bankUploadTag.trim() || bankUploadFile.name, style: bankStyle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao fazer upload");
      setBankUploadFile(null);
      setBankUploadPreview("");
      setBankUploadTag("");
      await fetchImages();
    } catch (e: any) {
      setBankError(e.message);
    } finally {
      setBankGenerating(false);
    }
  }, [bankUploadFile, bankUploadTag, bankStyle, fetchImages]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/user-action");
      if (res.status === 401) { router.push("/admin/login"); return; }
      const data = await res.json();
      if (data.users) setAdminUsers(data.users);
    } catch {}
    finally { setUsersLoading(false); }
  }, [router]);

  const userAction = async (action: string, email: string, amount?: number) => {
    const key = `${action}:${email}`;
    setActionLoading(key);
    try {
      await fetch("/api/admin/user-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email, amount }),
      });
      await fetchUsers();
    } catch {}
    finally { setActionLoading(null); }
  };

  const fetchFeedbacks = useCallback(async () => {
    setFeedbacksLoading(true);
    try {
      const res = await fetch("/api/admin/feedback");
      if (res.ok) { const d = await res.json(); setFeedbacks(d.feedbacks ?? []); }
    } finally { setFeedbacksLoading(false); }
  }, []);

  const feedbackAction = async (id: string, action: string, reply?: string, status?: string) => {
    setReplySaving(id);
    try {
      await fetch("/api/admin/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, reply, status }),
      });
      await fetchFeedbacks();
      if (action === "reply") setReplyInputs((p) => ({ ...p, [id]: "" }));
    } finally { setReplySaving(null); }
  };

  const fetchTutorial = useCallback(async () => {
    setTutorialLoading(true);
    try {
      const res = await fetch("/api/admin/tutorial");
      if (res.ok) { const d = await res.json(); setTutorial(d.tutorial ?? null); }
    } finally { setTutorialLoading(false); }
  }, []);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await fetch("/api/admin/members-area");
      if (res.ok) { const d = await res.json(); setMembersTopics(d.topics ?? []); }
    } finally { setMembersLoading(false); }
  }, []);

  const addMemberVideo = async (topicId: string) => {
    const url = membersVideoUrl[topicId]?.trim();
    if (!url) return;
    setMembersSaving(topicId);
    try {
      const res = await fetch("/api/admin/members-area", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          url,
          title: membersVideoTitle[topicId]?.trim() || "Sem título",
          description: membersVideoDesc[topicId]?.trim() || "",
        }),
      });
      if (res.ok) {
        setMembersVideoUrl((p) => ({ ...p, [topicId]: "" }));
        setMembersVideoTitle((p) => ({ ...p, [topicId]: "" }));
        setMembersVideoDesc((p) => ({ ...p, [topicId]: "" }));
        await fetchMembers();
      }
    } finally { setMembersSaving(null); }
  };

  const deleteMemberVideo = async (topicId: string, videoId: string) => {
    if (!confirm("Remover este vídeo?")) return;
    await fetch(`/api/admin/members-area?topicId=${topicId}&videoId=${videoId}`, { method: "DELETE" });
    await fetchMembers();
  };

  const uploadTutorial = async (file: File) => {
    if (!file) return;
    setTutorialUploading(true);
    setTutorialUploadProgress(0);
    try {
      const { upload } = await import("@vercel/blob/client");
      const blob = await upload(`tutorials/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/tutorial/upload",
        onUploadProgress: ({ percentage }) => setTutorialUploadProgress(percentage),
      });
      await fetch("/api/admin/tutorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blob.url, title: tutorialTitle || "Tutorial", description: tutorialDesc }),
      });
      await fetchTutorial();
      setTutorialTitle("");
      setTutorialDesc("");
      if (tutorialFileRef.current) tutorialFileRef.current.value = "";
    } catch (e: any) {
      alert("Erro no upload: " + e.message);
    } finally {
      setTutorialUploading(false);
      setTutorialUploadProgress(0);
    }
  };

  useEffect(() => {
    if (tab === "carousels") {
      fetchCarousels();
      const id = setInterval(fetchCarousels, 30_000);
      return () => clearInterval(id);
    }
    if (tab === "images" && images.length === 0) fetchImages();
    if (tab === "users") fetchUsers();
    if (tab === "tutorial") { fetchTutorial(); fetchMembers(); }
    if (tab === "feedbacks") fetchFeedbacks();
    if (tab === "gerador" && !xpostImgsLoaded) {
      fetch("/api/admin/xpost-images")
        .then(r => r.json())
        .then(d => { if (d.images) setXpostImages(d.images); })
        .catch(() => {})
        .finally(() => setXpostImgsLoaded(true));
    }
  }, [tab, images.length, xpostImgsLoaded, fetchCarousels, fetchImages, fetchUsers, fetchTutorial, fetchMembers, fetchFeedbacks]);

  // detecta novos carrosséis
  useEffect(() => {
    if (draftsTotal > 0 && prevDraftsCount.current > 0 && draftsTotal > prevDraftsCount.current) {
      // novo carrossel chegou — já refletido no badge
    }
    prevDraftsCount.current = draftsTotal;
  }, [draftsTotal]);

  const openPreview = useCallback(async (draft: AdminDraftMeta) => {
    setPreviewDraft(draft);
    setPreviewIdx(0);
    setPreviewSlides([]);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/carousels/detail?email=${encodeURIComponent(draft.email)}&id=${encodeURIComponent(draft.id)}`);
      const data = await res.json();
      if (data.slides) setPreviewSlides(data.slides);
    } catch {}
    finally { setPreviewLoading(false); }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewDraft(null);
    setPreviewSlides([]);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  /* ── Preview modal ── */
  const PreviewModal = () => {
    if (!previewDraft) return null;
    const slide = previewSlides[previewIdx];
    const titleEl = slide?.elements?.find((e: any) => e.type === "text" && (e.style as any)?.fontWeight === "bold") ?? slide?.elements?.find((e: any) => e.type === "text");
    const bodyEl  = slide?.elements?.filter((e: any) => e.type === "text")[1];
    const stripHtml = (s: string) => s?.replace(/<[^>]+>/g, "") ?? "";

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
        onClick={closePreview}>
        <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden" style={{ background: "#0d0d0d", border: "1px solid #2a2a2a" }}
          onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
            <div>
              <p className="font-bold text-sm text-white">{previewDraft.name || "Sem nome"}</p>
              <p className="text-[11px] text-brand-500 mt-0.5">{previewDraft.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{previewIdx + 1} / {previewDraft.slideCount}</span>
              <button onClick={closePreview} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>
          </div>

          {/* Slide preview */}
          <div className="p-5">
            {previewLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 size={28} className="animate-spin text-brand-500" />
              </div>
            ) : slide ? (
              <div className="relative rounded-xl overflow-hidden mx-auto" style={{ maxWidth: 360, aspectRatio: "4/5", background: slide.backgroundColor ?? "#111" }}>
                {slide.backgroundImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.backgroundImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                {slide.backgroundGradient && (
                  <div className="absolute inset-0" style={{ background: slide.backgroundGradient }} />
                )}
                {/* Textos */}
                <div className="absolute inset-0 p-5 flex flex-col justify-end gap-2">
                  {titleEl && (
                    <p className="font-black text-white leading-tight" style={{ fontSize: 16 }}>
                      {stripHtml(titleEl.content ?? "")}
                    </p>
                  )}
                  {bodyEl && (
                    <p className="text-gray-300" style={{ fontSize: 11 }}>
                      {stripHtml(bodyEl.content ?? "")}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-600 text-sm py-16">Sem dados de slides.</p>
            )}
          </div>

          {/* Navegação */}
          {previewSlides.length > 1 && (
            <div className="flex items-center justify-between px-5 pb-5 gap-3">
              <button onClick={() => setPreviewIdx(i => Math.max(0, i - 1))} disabled={previewIdx === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-gray-300 hover:text-white disabled:opacity-30 transition-colors"
                style={{ background: "#1a1a1a" }}>
                <ChevronLeft size={15} /> Anterior
              </button>

              {/* Miniaturas */}
              <div className="flex gap-1.5 overflow-x-auto">
                {previewSlides.map((s, i) => (
                  <button key={i} onClick={() => setPreviewIdx(i)}
                    className="shrink-0 rounded-lg overflow-hidden transition-all"
                    style={{ width: 36, height: 46, border: i === previewIdx ? "2px solid #4c6ef5" : "2px solid transparent", background: s.backgroundColor ?? "#111" }}>
                    {s.backgroundImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.backgroundImageUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>

              <button onClick={() => setPreviewIdx(i => Math.min(previewSlides.length - 1, i + 1))} disabled={previewIdx === previewSlides.length - 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-gray-300 hover:text-white disabled:opacity-30 transition-colors"
                style={{ background: "#1a1a1a" }}>
                Próximo <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#060606" }}>
      {/* Topbar */}
      <header
        className="sticky top-0 z-10 border-b border-white/5 overflow-x-auto scrollbar-none"
        style={{ background: "#0d0d0d" }}
      >
        <div className="flex items-center gap-3 px-4 py-3 min-w-max">
          <AppLogo variant="dark" size={28} textClassName="font-black text-sm tracking-tight text-white" />
          <span className="text-[10px] text-brand-500 whitespace-nowrap">Admin</span>

          <div className="w-4" />

          <span className="text-[10px] text-gray-600 whitespace-nowrap">
            {lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          <button
            onClick={fetchStats}
            disabled={loading}
            title="Atualizar"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <Link
            href="/editor"
            className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-400 transition-colors border border-brand-500/30 hover:border-brand-500/60 px-2.5 py-1.5 rounded-lg whitespace-nowrap"
          >
            <ArrowLeft size={13} /> Editor
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5 whitespace-nowrap"
          >
            <LogOut size={13} /> Sair
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/5 px-6 overflow-x-auto scrollbar-none" style={{ background: "#0d0d0d" }}>
        <div className="flex gap-1 max-w-5xl mx-auto min-w-max">
          {(["overview", "users", "carousels", "images", "tutorial", "feedbacks", "xpost", "gerador"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                tab === t
                  ? (t === "xpost" || t === "gerador") ? "border-violet-500 text-violet-300" : "border-brand-500 text-white"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "overview" ? <Activity size={12} /> : t === "users" ? <Users size={12} /> : t === "carousels" ? <LayoutGrid size={12} /> : t === "images" ? <Image size={12} /> : t === "tutorial" ? <PlayCircle size={12} /> : t === "xpost" ? <Bot size={12} /> : t === "gerador" ? <Sparkles size={12} /> : <MessageSquare size={12} />}
              {t === "overview" ? "Visão geral" : t === "users" ? "Usuários" : t === "carousels" ? "Carrosséis" : t === "images" ? "Imagens" : t === "tutorial" ? "Tutorial" : t === "xpost" ? "XPost AI" : t === "gerador" ? "Gerador XPost" : "Feedbacks"}
              {t === "carousels" && draftsTotal > 0 && (
                <span className="ml-1 bg-brand-500/15 text-brand-400 text-[10px] px-1.5 py-0.5 rounded-full">
                  {draftsTotal}
                </span>
              )}
              {t === "images" && imagesTotal > 0 && (
                <span className="ml-1 bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full">
                  {imagesTotal}
                </span>
              )}
              {t === "feedbacks" && feedbacks.filter(f => f.status === "pending").length > 0 && (
                <span className="ml-1 bg-purple-500/20 text-purple-300 text-[10px] px-1.5 py-0.5 rounded-full">
                  {feedbacks.filter(f => f.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <PreviewModal />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* ═══ ABA OVERVIEW ═══ */}
        {tab === "overview" && (
          <>
            {loading && !stats && (
              <div className="flex justify-center py-20">
                <Loader2 size={28} className="text-brand-500 animate-spin" />
              </div>
            )}
            {error && <p className="text-center text-sm text-red-400 py-10">{error}</p>}

            {stats && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <KpiCard label="Usuários" value={stats.totalUsers} icon={Users} accent="#4c6ef5" sub="total cadastrados" />
                  <KpiCard label="Online agora" value={stats.onlineNow} icon={Activity} accent="#22c55e" sub="últimos 2 min" />
                  <KpiCard label="Ativos hoje" value={stats.activeToday} icon={TrendingUp} accent="#3b82f6" sub="usuários únicos" />
                  <KpiCard label="Básico" value={stats.basicCount} icon={Crown} accent="#60a5fa" sub="plano básico" />
                  <KpiCard label="Pro" value={stats.proCount} icon={Crown} accent="#ec4899" sub="plano pro" />
                  <KpiCard label="Business" value={stats.businessCount} icon={Crown} accent="#f59e0b" sub="plano business" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                  <KpiCard label="MRR estimado" value={`R$ ${parseFloat(stats.mrr).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} icon={DollarSign} accent="#10b981" sub={`${parseInt(stats.basicCount as any) + parseInt(stats.proCount as any) + parseInt(stats.businessCount as any)} assinaturas`} />
                  <KpiCard label="Carrosséis hoje" value={stats.carouselsToday} icon={Layers} accent="#ec4899" sub={`${stats.imagesToday} imagens geradas`} />
                </div>

                {stats.onlineNow > 0 && (
                  <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: "#0d1f0d", border: "1px solid #14532d" }}>
                    <OnlineDot />
                    <span className="text-sm text-green-400 font-semibold">
                      {stats.onlineNow} {stats.onlineNow === 1 ? "usuário" : "usuários"} online agora
                    </span>
                    <span className="text-xs text-green-700 ml-1">— no editor</span>
                  </div>
                )}

                <WeekChart data={stats.weekData} />

                <div className="rounded-2xl overflow-hidden" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
                    <p className="font-bold text-sm">Últimos cadastros</p>
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">{stats.recentUsers.length} de {stats.totalUsers}</span>
                  </div>
                  {stats.recentUsers.length === 0 ? (
                    <p className="text-center text-sm text-gray-600 py-10">Nenhum usuário cadastrado ainda.</p>
                  ) : (
                    <div className="divide-y divide-[#1a1a1a]">
                      <div className="grid grid-cols-12 px-5 py-2 text-[10px] text-gray-600 uppercase tracking-wider">
                        <span className="col-span-4">Nome</span>
                        <span className="col-span-5">E-mail</span>
                        <span className="col-span-3 text-right">Cadastro</span>
                      </div>
                      {stats.recentUsers.map((u, i) => (
                        <div key={i} className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors">
                          <div className="col-span-4 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg,#3b5bdb,#4c6ef5)" }}>
                              {u.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <span className="text-sm text-gray-200 truncate">{u.name || "—"}</span>
                          </div>
                          <div className="col-span-5 text-xs text-gray-500 truncate">{u.email}</div>
                          <div className="col-span-3 text-right text-xs text-gray-600">{u.createdAt ? fmt(u.createdAt) : "—"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ═══ ABA USUÁRIOS ═══ */}
        {tab === "users" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Gerenciar Usuários</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{adminUsers.length} usuários cadastrados</p>
              </div>
              <button onClick={fetchUsers} disabled={usersLoading}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40">
                <RefreshCw size={12} className={usersLoading ? "animate-spin" : ""} /> Atualizar
              </button>
            </div>

            {usersLoading && adminUsers.length === 0 && (
              <div className="flex justify-center py-20">
                <Loader2 size={28} className="text-brand-500 animate-spin" />
              </div>
            )}

            {adminUsers.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
                {(() => {
                  const PLAN_COLOR: Record<string, string> = {
                    god: "#4c6ef5", business: "#f59e0b", pro: "#ec4899", basic: "#60a5fa", free: "#6b7280",
                  };
                  const PLAN_LABEL: Record<string, string> = {
                    god: "God", business: "Business", pro: "Pro", basic: "Básico", free: "Grátis",
                  };
                  return adminUsers.map((u, i) => {
                    const color = PLAN_COLOR[u.plan] ?? "#6b7280";
                    const addKey = `add_credits:${u.email}`;
                    const resetKey = `reset_credits:${u.email}`;
                    const delKey = `delete_user:${u.email}`;
                    return (
                      <div key={u.email} className={`p-4 ${i > 0 ? "border-t border-[#1a1a1a]" : ""}`}>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          {/* Info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                              style={{ background: `${color}20`, color }}>
                              {u.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{u.name || "—"}</p>
                              <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                            </div>
                          </div>

                          {/* Plano + créditos */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${color}18`, color }}>
                              {PLAN_LABEL[u.plan] ?? u.plan}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                              <Zap size={10} className="text-brand-500" />
                              <span className="font-bold text-white">{u.total}</span>
                              <span className="text-gray-600">restantes</span>
                              <span className="text-gray-700 mx-0.5">·</span>
                              <span>{u.used}/{u.limit} usados</span>
                              {u.bonus > 0 && <span className="text-yellow-500 ml-0.5">+{u.bonus} bônus</span>}
                            </div>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {/* Add créditos */}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              placeholder="Qtd"
                              value={creditInputs[u.email] ?? ""}
                              onChange={e => setCreditInputs(prev => ({ ...prev, [u.email]: e.target.value }))}
                              className="w-16 bg-[#111] border border-[#252525] rounded-lg px-2 py-1 text-xs text-white outline-none"
                            />
                            <button
                              onClick={() => {
                                const n = parseInt(creditInputs[u.email] ?? "0");
                                if (n > 0) { userAction("add_credits", u.email, n); setCreditInputs(prev => ({ ...prev, [u.email]: "" })); }
                              }}
                              disabled={actionLoading === addKey || !creditInputs[u.email]}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-green-400 border border-green-500/20 hover:bg-green-500/10 transition-colors disabled:opacity-40"
                            >
                              {actionLoading === addKey ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />} Add créditos
                            </button>
                          </div>

                          {/* Zerar créditos */}
                          <button
                            onClick={() => userAction("reset_credits", u.email)}
                            disabled={actionLoading === resetKey}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/10 transition-colors disabled:opacity-40"
                          >
                            {actionLoading === resetKey ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />} Zerar créditos
                          </button>

                          {/* Remover usuário */}
                          <button
                            onClick={() => {
                              if (confirm(`Remover ${u.email}? Esta ação não pode ser desfeita.`))
                                userAction("delete_user", u.email);
                            }}
                            disabled={actionLoading === delKey}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                          >
                            {actionLoading === delKey ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />} Remover
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </>
        )}

        {/* ═══ ABA IMAGENS ═══ */}
        {tab === "images" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Banco de imagens geradas</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{imagesTotal} imagens salvas (últimas 300)</p>
              </div>
              <button onClick={fetchImages} disabled={imagesLoading}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40">
                <RefreshCw size={12} className={imagesLoading ? "animate-spin" : ""} /> Atualizar
              </button>
            </div>

            {/* ── Geração admin ── */}
            <div className="rounded-2xl border border-[#1e1e1e] p-5 space-y-4" style={{ background: "#0d0d0d" }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Sparkles size={14} className="text-brand-400" /> Gerar imagens para o banco
                </p>
                <div className="flex rounded-lg overflow-hidden border border-[#2a2a2a]">
                  {(["single", "batch", "upload"] as const).map((m) => (
                    <button key={m} onClick={() => setBankMode(m)}
                      className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${bankMode === m ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
                      {m === "single" ? "Única" : m === "batch" ? "Em lote" : "Upload"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {(["gemini", "foto_real"] as const).map((s) => (
                  <button key={s} onClick={() => setBankStyle(s)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${bankStyle === s ? "bg-brand-500/15 border-brand-500/50 text-brand-300" : "border-[#2a2a2a] text-gray-500 hover:text-gray-300"}`}>
                    {s === "gemini" ? "🎨 Artístico" : "📷 Foto Real"}
                  </button>
                ))}
              </div>

              {bankMode === "single" ? (
                <div className="flex gap-2">
                  <input
                    value={bankPrompt}
                    onChange={(e) => setBankPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !bankGenerating && generateForBank()}
                    placeholder="Ex: woman entrepreneur working on laptop, golden hour..."
                    className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-500/50"
                  />
                  <button
                    onClick={generateForBank}
                    disabled={bankGenerating || !bankPrompt.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {bankGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {bankGenerating ? "Gerando..." : "Gerar"}
                  </button>
                </div>
              ) : bankMode === "batch" ? (
                <div className="space-y-3">
                  <textarea
                    value={bankBatch}
                    onChange={(e) => setBankBatch(e.target.value)}
                    placeholder={"Um prompt por linha:\nwoman entrepreneur working on laptop\nbeautiful sunset over the city\nmodern office abstract background"}
                    rows={5}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-500/50 resize-none font-mono"
                  />
                  {bankProgress && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>Gerando em lote...</span>
                        <span>{bankProgress.done} / {bankProgress.total}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                        <div className="h-full rounded-full bg-brand-500 transition-all"
                          style={{ width: `${(bankProgress.done / bankProgress.total) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  <button
                    onClick={generateForBank}
                    disabled={bankGenerating || !bankBatch.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {bankGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {bankGenerating
                      ? `Gerando ${bankProgress?.done ?? 0}/${bankProgress?.total ?? 0}...`
                      : `Gerar ${bankBatch.split("\n").filter((l) => l.trim()).length} imagem(ns)`}
                  </button>
                </div>
              ) : (
                /* ── Modo upload ── */
                <div className="space-y-3">
                  <input
                    ref={bankUploadRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBankUploadFile(file);
                      const reader = new FileReader();
                      reader.onload = () => setBankUploadPreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                  {bankUploadPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-[#2a2a2a]" style={{ maxHeight: 220 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bankUploadPreview} alt="" className="w-full object-contain" style={{ maxHeight: 220 }} />
                      <button
                        onClick={() => { setBankUploadFile(null); setBankUploadPreview(""); if (bankUploadRef.current) bankUploadRef.current.value = ""; }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                      >
                        <X size={13} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => bankUploadRef.current?.click()}
                      className="w-full border-2 border-dashed border-[#2a2a2a] hover:border-brand-500/50 rounded-xl py-10 flex flex-col items-center gap-2 transition-colors text-gray-500 hover:text-gray-300"
                    >
                      <Upload size={24} />
                      <span className="text-[11px]">Clique para selecionar imagem</span>
                      <span className="text-[10px] text-gray-600">JPG, PNG, WEBP até 10 MB</span>
                    </button>
                  )}
                  <input
                    value={bankUploadTag}
                    onChange={(e) => setBankUploadTag(e.target.value)}
                    placeholder="Tag / descrição da imagem (opcional)"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-500/50"
                  />
                  <button
                    onClick={uploadToBank}
                    disabled={bankGenerating || !bankUploadFile}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-full justify-center"
                  >
                    {bankGenerating ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {bankGenerating ? "Enviando..." : "Salvar no banco"}
                  </button>
                </div>
              )}

              {bankError && <p className="text-xs text-red-400">{bankError}</p>}
            </div>

            {imagesLoading && images.length === 0 && (
              <div className="flex justify-center py-20">
                <Loader2 size={28} className="text-brand-500 animate-spin" />
              </div>
            )}

            {imagesError && <p className="text-center text-sm text-red-400 py-10">{imagesError}</p>}

            {!imagesLoading && images.length === 0 && !imagesError && (
              <div className="text-center py-16 text-gray-600 text-sm">
                <Image size={32} className="mx-auto mb-3 opacity-30" />
                Nenhuma imagem salva ainda.<br />
                <span className="text-xs">As imagens são salvas automaticamente ao serem geradas.</span>
              </div>
            )}

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden aspect-[3/4] bg-[#111] border border-[#1e1e1e]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      <a href={img.url} target="_blank" rel="noreferrer"
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <ExternalLink size={13} className="text-white" />
                      </a>
                      <a href={img.url} download target="_blank" rel="noreferrer"
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <Download size={13} className="text-white" />
                      </a>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 p-1.5 text-[8px] text-gray-400 truncate"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)" }}>
                      <span className="text-blue-400">{img.source}</span> · {img.email !== "anon" ? img.email.split("@")[0] : "anon"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ ABA TUTORIAL ═══ */}
        {tab === "tutorial" && (
          <div className="space-y-6">
            <div>
              <p className="font-bold text-sm">Tutorial em vídeo</p>
              <p className="text-[11px] text-gray-600 mt-0.5">Faça upload do vídeo tutorial. Todos os usuários serão notificados.</p>
            </div>

            {/* Vídeo atual */}
            {tutorialLoading ? (
              <div className="flex justify-center py-12"><Loader2 size={24} className="text-brand-500 animate-spin" /></div>
            ) : tutorial ? (
              <div className="rounded-2xl border border-[#1e1e1e] overflow-hidden" style={{ background: "#0d0d0d" }}>
                <video src={tutorial.url} controls className="w-full" style={{ maxHeight: 360 }} />
                <div className="p-4">
                  <p className="font-bold text-white text-sm">{tutorial.title}</p>
                  {tutorial.description && <p className="text-xs text-gray-500 mt-1">{tutorial.description}</p>}
                  <p className="text-[10px] text-gray-700 mt-2">
                    Publicado em {new Date(tutorial.uploadedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#333] flex flex-col items-center justify-center py-14 gap-3">
                <PlayCircle size={32} className="text-gray-700" />
                <p className="text-sm text-gray-600">Nenhum tutorial publicado ainda</p>
              </div>
            )}

            {/* Formulário de upload */}
            <div className="rounded-2xl border border-[#1e1e1e] p-5 space-y-4" style={{ background: "#0d0d0d" }}>
              <p className="text-sm font-semibold text-gray-300">{tutorial ? "Substituir vídeo" : "Publicar tutorial"}</p>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Título</label>
                <input
                  value={tutorialTitle}
                  onChange={e => setTutorialTitle(e.target.value)}
                  placeholder="Ex: Como usar o xPost — Tutorial completo"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-500/50"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Descrição (opcional)</label>
                <textarea
                  value={tutorialDesc}
                  onChange={e => setTutorialDesc(e.target.value)}
                  placeholder="Breve descrição do conteúdo do vídeo..."
                  rows={2}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-500/50 resize-none"
                />
              </div>
              <input
                ref={tutorialFileRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadTutorial(f); }}
              />
              {tutorialUploading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Enviando vídeo...</span>
                    <span>{Math.round(tutorialUploadProgress)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${tutorialUploadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => tutorialFileRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
                >
                  <Upload size={15} /> Selecionar vídeo (.mp4, .webm)
                </button>
              )}
            </div>

            {/* ── Área de Membros ── */}
            <div>
              <p className="font-bold text-sm mb-0.5">Área de Membros</p>
              <p className="text-[11px] text-gray-600 mb-4">Adicione vídeos por tópico. Usuários acessam pela caixa de entrada no perfil.</p>

              {membersLoading ? (
                <div className="flex justify-center py-10"><Loader2 size={22} className="text-brand-500 animate-spin" /></div>
              ) : (
                <div className="flex flex-col gap-3">
                  {membersTopics.map((topic) => (
                    <div key={topic.id} className="rounded-2xl border border-[#1e1e1e] overflow-hidden" style={{ background: "#0d0d0d" }}>
                      <button
                        onClick={() => setMembersExpandedTopic(membersExpandedTopic === topic.id ? null : topic.id)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition-colors text-left"
                      >
                        <span className="text-xl shrink-0">{topic.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{topic.title}</p>
                          <p className="text-[11px] text-gray-600 mt-0.5 truncate">{topic.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${topic.videos.length > 0 ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-600"}`}>
                            {topic.videos.length > 0 ? `${topic.videos.length} vídeo${topic.videos.length > 1 ? "s" : ""}` : "Pendente"}
                          </span>
                          <span className="text-gray-600 text-xs">{membersExpandedTopic === topic.id ? "▲" : "▼"}</span>
                        </div>
                      </button>

                      {membersExpandedTopic === topic.id && (
                        <div className="border-t border-[#1a1a1a] p-5 space-y-4">
                          {/* Vídeos existentes */}
                          {topic.videos.length > 0 && (
                            <div className="flex flex-col gap-2">
                              {topic.videos.map((video) => (
                                <div key={video.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#111] border border-[#1e1e1e]">
                                  <PlayCircle size={15} className="text-brand-400 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-white truncate">{video.title}</p>
                                    {video.description && <p className="text-[10px] text-gray-600 truncate">{video.description}</p>}
                                    <p className="text-[10px] text-gray-700 truncate">{video.url}</p>
                                  </div>
                                  <button
                                    onClick={() => deleteMemberVideo(topic.id, video.id)}
                                    className="shrink-0 text-gray-600 hover:text-red-400 transition-colors p-1"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Formulário de adição */}
                          <div className="space-y-2.5 pt-1">
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Adicionar vídeo</p>
                            <input
                              value={membersVideoTitle[topic.id] ?? ""}
                              onChange={(e) => setMembersVideoTitle((p) => ({ ...p, [topic.id]: e.target.value }))}
                              placeholder="Título do vídeo"
                              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-brand-500/50"
                            />
                            <input
                              value={membersVideoDesc[topic.id] ?? ""}
                              onChange={(e) => setMembersVideoDesc((p) => ({ ...p, [topic.id]: e.target.value }))}
                              placeholder="Descrição (opcional)"
                              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-brand-500/50"
                            />
                            <input
                              value={membersVideoUrl[topic.id] ?? ""}
                              onChange={(e) => setMembersVideoUrl((p) => ({ ...p, [topic.id]: e.target.value }))}
                              placeholder="URL do vídeo (mp4, YouTube embed, etc.)"
                              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-brand-500/50"
                            />
                            <button
                              onClick={() => addMemberVideo(topic.id)}
                              disabled={!membersVideoUrl[topic.id]?.trim() || membersSaving === topic.id}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {membersSaving === topic.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                              Adicionar vídeo
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ ABA CARROSSÉIS ═══ */}
        {tab === "carousels" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Todos os carrosséis salvos</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{draftsTotal} rascunhos no total</p>
              </div>
              <button onClick={fetchCarousels} disabled={draftsLoading}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40">
                <RefreshCw size={12} className={draftsLoading ? "animate-spin" : ""} /> Atualizar
              </button>
            </div>

            {draftsLoading && drafts.length === 0 && (
              <div className="flex justify-center py-20">
                <Loader2 size={28} className="text-brand-500 animate-spin" />
              </div>
            )}

            {draftsError && <p className="text-center text-sm text-red-400 py-10">{draftsError}</p>}

            {!draftsLoading && drafts.length === 0 && !draftsError && (
              <p className="text-center text-sm text-gray-600 py-16">Nenhum carrossel salvo ainda.</p>
            )}

            {drafts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {drafts.map((d) => (
                  <div key={`${d.email}-${d.id}`}
                    className="rounded-xl overflow-hidden border border-[#1e1e1e] hover:border-brand-500/40 transition-colors group cursor-pointer"
                    style={{ background: "#0d0d0d" }}
                    onClick={() => openPreview(d)}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square bg-[#111] flex items-center justify-center overflow-hidden">
                      {d.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.thumbnail} alt={d.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <ImageOff size={24} className="text-gray-700" />
                      )}
                      <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        {d.slideCount} slides
                      </span>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye size={20} className="text-white" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-200 truncate">{d.name || "Sem nome"}</p>
                      <p className="text-[10px] text-brand-500 truncate mt-0.5">{d.email}</p>
                      <p className="text-[10px] text-gray-600 mt-1">{fmt(d.updatedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ ABA FEEDBACKS ═══ */}
        {tab === "feedbacks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Feedbacks e Ideias</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{feedbacks.length} mensagem{feedbacks.length !== 1 ? "s" : ""} recebida{feedbacks.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={fetchFeedbacks} disabled={feedbacksLoading}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40">
                <RefreshCw size={12} className={feedbacksLoading ? "animate-spin" : ""} /> Atualizar
              </button>
            </div>

            {feedbacksLoading && feedbacks.length === 0 && (
              <div className="flex justify-center py-20">
                <Loader2 size={28} className="text-brand-500 animate-spin" />
              </div>
            )}

            {!feedbacksLoading && feedbacks.length === 0 && (
              <div className="text-center py-20">
                <MessageSquare size={32} className="mx-auto mb-3 text-gray-700" />
                <p className="text-sm text-gray-600">Nenhum feedback recebido ainda.</p>
              </div>
            )}

            {feedbacks.map((fb) => {
              const isIdea = fb.type === "update_idea";
              const isPending = fb.status === "pending";
              const accentColor = isIdea ? "#f59e0b" : "#4c6ef5";
              const statusColor = fb.status === "approved" ? "#22c55e" : fb.status === "rejected" ? "#ef4444" : fb.status === "replied" ? "#4c6ef5" : "#6b7280";
              const statusLabel = fb.status === "approved" ? "Aprovada" : fb.status === "rejected" ? "Rejeitada" : fb.status === "replied" ? "Respondido" : "Pendente";
              return (
                <div key={fb.id} className="rounded-2xl border border-[#1e1e1e] overflow-hidden" style={{ background: "#0d0d0d" }}>
                  {/* Header */}
                  <div className="flex items-start gap-3 px-4 py-3 border-b border-[#1a1a1a]">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${accentColor}18` }}>
                      {isIdea ? <Lightbulb size={14} style={{ color: accentColor }} /> : <MessageSquare size={14} style={{ color: accentColor }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold" style={{ color: accentColor }}>
                          {isIdea ? "Dica de Atualização" : "Feedback"}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${statusColor}18`, color: statusColor }}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{fb.userName || fb.userEmail} · {new Date(fb.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>

                  {/* Texto */}
                  <div className="px-4 py-3 flex flex-col gap-2">
                    {fb.rating && (
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map((s: number) => (
                          <span key={s} style={{ color: s <= fb.rating ? "#f59e0b" : "#374151", fontSize: 14 }}>★</span>
                        ))}
                        <span className="text-[10px] text-gray-500 ml-1">{fb.rating}/5</span>
                      </div>
                    )}
                    <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{fb.text}</p>
                  </div>

                  {/* Resposta do admin (se houver) */}
                  {fb.adminReply && (
                    <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(76,110,245,0.07)", border: "1px solid rgba(76,110,245,0.18)" }}>
                      <p className="text-[10px] font-semibold text-brand-400 mb-1 flex items-center gap-1"><Reply size={10} /> Resposta do admin</p>
                      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{fb.adminReply}</p>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="px-4 pb-4 flex flex-col gap-2">
                    {/* Para dicas: aprovar/rejeitar */}
                    {isIdea && isPending && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => feedbackAction(fb.id, "status", undefined, "approved")}
                          disabled={replySaving === fb.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}
                        >
                          <Check size={11} /> Aprovar
                        </button>
                        <button
                          onClick={() => feedbackAction(fb.id, "status", undefined, "rejected")}
                          disabled={replySaving === fb.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                          style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}
                        >
                          <X size={11} /> Rejeitar
                        </button>
                      </div>
                    )}

                    {/* Responder */}
                    <div className="flex gap-2">
                      <input
                        value={replyInputs[fb.id] ?? ""}
                        onChange={(e) => setReplyInputs((p) => ({ ...p, [fb.id]: e.target.value }))}
                        placeholder="Escrever resposta para o usuário..."
                        className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-brand-500/50 transition-colors"
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (replyInputs[fb.id]?.trim()) feedbackAction(fb.id, "reply", replyInputs[fb.id]); } }}
                      />
                      <button
                        onClick={() => feedbackAction(fb.id, "reply", replyInputs[fb.id])}
                        disabled={!replyInputs[fb.id]?.trim() || replySaving === fb.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {replySaving === fb.id ? <Loader2 size={11} className="animate-spin" /> : <Reply size={11} />}
                        Responder
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* ═══ ABA GERADOR XPOST ═══ */}
        {tab === "gerador" && (() => {
          const XPOST_TOPICS = [
            "Como criar carrosséis virais no Instagram em 5 minutos usando IA",
            "Os 5 erros que impedem seus carrosséis de viralizar",
            "Por que seu conteúdo não cresce no Instagram (e como resolver)",
            "Como empreendedores criam presença profissional sem contratar designer",
            "Antes e depois: criando um carrossel manualmente vs com IA",
            "Por que carrosséis são o melhor formato para crescer no Instagram hoje",
            "Como ser consistente no Instagram sem perder horas criando conteúdo",
          ];
          const STYLES: { v: WritingStyle; l: string }[] = [
            { v: "viral", l: "Viral" }, { v: "informativo", l: "Informativo" },
            { v: "educativo", l: "Educativo" }, { v: "motivacional", l: "Motivacional" },
          ];
          function buildAdminSlides(gc: GeneratedContent, imgs: string[], isTwitter: boolean): Slide[] {
            const W = 1080, H = 1350;
            const PAD = Math.round(W * 0.055);

            // ── Perfil salvo (mesmo comportamento do editor) ──
            let profileData: { name?: string; handle?: string; avatarSrc?: string; verified?: boolean } | null = null;
            try { const s = localStorage.getItem("xpz_profile"); if (s) profileData = JSON.parse(s); } catch {}

            const makeProfile = (): any => ({
              id: uuid(), type: "profile" as const,
              x: PAD, y: Math.round(H * 0.03), width: W - PAD * 2, height: Math.round(H * 0.075),
              src: profileData?.avatarSrc || undefined,
              profileName: profileData?.name ?? "", profileHandle: profileData?.handle ?? "",
              profileVerified: profileData?.verified ?? false,
              profileNameColor: "#111111", profileHandleColor: "#666666", zIndex: 10,
            });

            if (isTwitter) {
              const PROFILE_Y = Math.round(H * 0.03);
              const PROFILE_H = Math.round(H * 0.075);
              const IMG_TOP   = PROFILE_Y + PROFILE_H + Math.round(H * 0.025);
              const IMG_H     = Math.round(H * 0.38);
              const TEXT_TOP  = IMG_TOP + IMG_H + Math.round(H * 0.022);
              const TEXT_H    = Math.round(H * 0.17);
              const BODY_TOP  = TEXT_TOP + TEXT_H + Math.round(H * 0.012);
              const BODY_H    = Math.round(H * 0.10);
              const CTOP_TIT  = PROFILE_Y + PROFILE_H + Math.round(H * 0.07);
              const CTOP_BOD  = CTOP_TIT + Math.round(H * 0.22) + Math.round(H * 0.02);

              const twBase = { backgroundColor: "#ffffff" as string, backgroundPattern: "grid-light" as const, backgroundImageUrl: undefined, backgroundGradient: undefined, width: W, height: H };

              const coverImgUrl = imgs.length > 0 ? imgs[0] : undefined;
              const coverImgEl: any = coverImgUrl ? { id: uuid(), type: "image" as const, x: PAD, y: IMG_TOP, width: W - PAD * 2, height: IMG_H, src: coverImgUrl, zIndex: 2, imageObjectPositionY: 30 } : null;
              const [cover, ...rest] = gc.slides;
              const makeTwText = (content: string, i: number, isCover: boolean): any => ({
                id: uuid(), type: "text" as const,
                x: PAD, width: W - PAD * 2, zIndex: 5,
                y: isCover ? (i === 0 ? TEXT_TOP : BODY_TOP) : (i === 0 ? CTOP_TIT : CTOP_BOD),
                height: isCover ? (i === 0 ? TEXT_H : BODY_H) : (i === 0 ? Math.round(H * 0.22) : Math.round(H * 0.38)),
                content,
                style: { color: "#111111", fontFamily: "'Inter', sans-serif", fontSize: isCover ? (i === 0 ? Math.round(H * 0.036) : Math.round(H * 0.019)) : (i === 0 ? Math.round(H * 0.044) : Math.round(H * 0.021)), fontWeight: i === 0 ? "bold" as const : "normal" as const, lineHeight: i === 0 ? 1.15 : 1.5, textAlign: "left" as const },
              });

              const coverTexts = [cover.title, cover.body].filter(Boolean).map((c, i) => makeTwText(c!, i, true));
              const coverSlide: Slide = { id: uuid(), ...twBase, elements: [makeProfile(), ...(coverImgEl ? [coverImgEl] : []), ...coverTexts] };
              const contentSlides: Slide[] = rest.map(gs => ({ id: uuid(), ...twBase, elements: [makeProfile(), ...[gs.title, gs.body].filter(Boolean).map((c, i) => makeTwText(c!, i, false))] }));
              const ctaTw: Slide = { id: uuid(), ...twBase, elements: [makeProfile(), makeTwText("Crie carrosséis que viralizam.", 0, false), makeTwText("Acesse xpostzone.online e comece grátis agora.", 1, false)] };
              return [coverSlide, ...contentSlides, ctaTw];
            }

            // ── Modo escuro (padrão) ──
            function withBg(slide: any, idx: number): any {
              if (imgs.length === 0) return slide;
              return { ...slide, backgroundImageUrl: imgs[idx % imgs.length], backgroundGradient: "linear-gradient(180deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.82) 100%)", backgroundOpacity: 0.48 };
            }
            const contentSlides = gc.slides.map((gs, i) => {
              const isFirst = i === 0;
              const accent = gs.colorScheme?.accent ?? "#4c6ef5";
              const els: any[] = [];
              if (!isFirst) els.push({ id: uuid(), type: "shape" as const, x: 60, y: 80, width: 56, height: 5, content: "", style: { fill: accent, stroke: "transparent", strokeWidth: 0, borderRadius: 3 } });
              const tAlign = isFirst ? "center" as const : "left" as const;
              els.push({ id: uuid(), type: "text" as const, x: 60, y: isFirst ? Math.round(H * 0.32) : 106, width: W - 120, height: isFirst ? 340 : 260, content: gs.title, style: { fontSize: isFirst ? 78 : 62, fontWeight: "bold" as const, fontFamily: "sans-serif", color: "#ffffff", textAlign: tAlign, lineHeight: 1.1 } });
              if (gs.body) els.push({ id: uuid(), type: "text" as const, x: 60, y: isFirst ? Math.round(H * 0.67) : 386, width: W - 120, height: 200, content: gs.body, style: { fontSize: 28, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.68)", textAlign: tAlign, lineHeight: 1.45 } });
              if (gs.callToAction) els.push({ id: uuid(), type: "text" as const, x: 60, y: H - 260, width: W - 120, height: 120, content: gs.callToAction, style: { fontSize: 32, fontWeight: "bold" as const, fontFamily: "sans-serif", color: accent, textAlign: "center" as const, lineHeight: 1.3 } });
              const base: any = { id: uuid(), backgroundColor: isFirst ? "#06071a" : "#0a0a0a", elements: els, width: W, height: H };
              return withBg(base, i);
            });
            const ctaEls: any[] = [
              { id: uuid(), type: "shape" as const, x: W / 2 - 30, y: 380, width: 60, height: 6, content: "", style: { fill: "#7c3aed", stroke: "transparent", strokeWidth: 0, borderRadius: 3 } },
              { id: uuid(), type: "text" as const, x: 60, y: 420, width: W - 120, height: 300, content: "Crie carrosséis\nque viralizam.", style: { fontSize: 96, fontWeight: "bold" as const, fontFamily: "sans-serif", color: "#ffffff", textAlign: "center" as const, lineHeight: 1.05 } },
              { id: uuid(), type: "text" as const, x: 60, y: 740, width: W - 120, height: 130, content: "Acesse xpostzone.online\ne comece grátis agora.", style: { fontSize: 32, fontWeight: "normal" as const, fontFamily: "sans-serif", color: "rgba(255,255,255,0.65)", textAlign: "center" as const, lineHeight: 1.5 } },
              { id: uuid(), type: "shape" as const, x: W / 2 - 220, y: 930, width: 440, height: 88, content: "", style: { fill: "#7c3aed", stroke: "transparent", strokeWidth: 0, borderRadius: 44 } },
              { id: uuid(), type: "text" as const, x: W / 2 - 220, y: 939, width: 440, height: 70, content: "Assinar XPost →", style: { fontSize: 34, fontWeight: "bold" as const, fontFamily: "sans-serif", color: "#ffffff", textAlign: "center" as const, lineHeight: 2.06 } },
            ];
            const ctaBase: any = { id: uuid(), backgroundColor: "#06071a", elements: ctaEls, width: W, height: H };
            return [...contentSlides, withBg(ctaBase, gc.slides.length)];
          }
          const uploadXpostImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            e.target.value = "";
            setXpostImgUploading(true);
            try {
              const b64: string = await new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = () => res((r.result as string).split(",")[1]);
                r.onerror = rej;
                r.readAsDataURL(file);
              });
              const resp = await fetch("/api/admin/xpost-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base64: b64, mimeType: file.type, name: file.name }) });
              const d = await resp.json();
              if (d.image) setXpostImages(prev => [d.image, ...prev]);
            } catch {}
            finally { setXpostImgUploading(false); }
          };
          const deleteXpostImage = async (id: string) => {
            setXpostImgDeleting(id);
            try {
              await fetch("/api/admin/xpost-images", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
              setXpostImages(prev => prev.filter(img => img.id !== id));
            } catch {}
            finally { setXpostImgDeleting(null); }
          };
          const generate = async () => {
            if (!xgenTopic.trim()) return;
            setXgenStatus("gen"); setXgenError(""); setXgenContent(null);
            try {
              const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: xgenTopic, searchResults: [], slideCount: xgenCount, writingStyle: xgenStyle }) });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error ?? "Erro ao gerar");
              setXgenContent(data); setXgenStatus("done");
            } catch (e: any) { setXgenError(e.message); setXgenStatus("idle"); }
          };
          const openInEditor = () => {
            if (!xgenContent) return;
            setXgenStatus("opening");
            sessionStorage.setItem("xpost-admin-slides", JSON.stringify(buildAdminSlides(xgenContent, xpostImages.map(img => img.url), xgenTwitter)));
            router.push("/editor");
          };
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}><Sparkles size={18} className="text-violet-400" /></div>
                <div><h2 className="text-base font-semibold text-white">Gerador XPost</h2><p className="text-xs text-gray-500">Gere carrosséis completos para o perfil da XPost</p></div>
              </div>
              {/* ── Banco de imagens ── */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "#0d0d0d", border: "1px solid rgba(139,92,246,0.1)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-300">Banco de Imagens</p>
                    <p className="text-[10px] text-gray-600">{xpostImages.length} {xpostImages.length === 1 ? "imagem" : "imagens"} · usadas como fundo nos slides</p>
                  </div>
                  <button onClick={() => xpostImgInputRef.current?.click()} disabled={xpostImgUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                    style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd" }}>
                    {xpostImgUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                    {xpostImgUploading ? "Enviando…" : "Upload"}
                  </button>
                  <input ref={xpostImgInputRef} type="file" accept="image/*" className="hidden" onChange={uploadXpostImage} />
                </div>
                {xpostImages.length === 0 && !xpostImgUploading && (
                  <div className="flex flex-col items-center justify-center py-5 gap-1.5">
                    <ImageOff size={18} className="text-gray-700" />
                    <p className="text-[11px] text-gray-600 text-center">Nenhuma imagem. Faça upload para usar<br/>como fundo dos slides gerados.</p>
                  </div>
                )}
                {xpostImages.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {xpostImages.map((img) => (
                      <div key={img.id} className="relative group rounded-lg overflow-hidden" style={{ aspectRatio: "3/4" }}>
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.55)" }}>
                          <button onClick={() => deleteXpostImage(img.id)} disabled={xpostImgDeleting === img.id}
                            className="p-1.5 rounded-lg transition-colors" style={{ background: "rgba(239,68,68,0.85)" }}>
                            {xpostImgDeleting === img.id ? <Loader2 size={12} className="text-white animate-spin" /> : <Trash2 size={12} className="text-white" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* ── Config geração ── */}
              <div className="rounded-2xl p-4 space-y-4" style={{ background: "#0d0d0d", border: "1px solid rgba(139,92,246,0.15)" }}>
                <div>
                  <p className="text-[11px] text-gray-500 mb-2">Tópicos sugeridos</p>
                  <div className="flex flex-wrap gap-2">
                    {XPOST_TOPICS.map((t) => (
                      <button key={t} onClick={() => setXgenTopic(t)} className="px-2.5 py-1 rounded-full text-[11px] transition-all"
                        style={{ background: xgenTopic === t ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.04)", border: xgenTopic === t ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)", color: xgenTopic === t ? "#c4b5fd" : "rgba(255,255,255,0.5)" }}>
                        {t.length > 52 ? t.slice(0, 52) + "…" : t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 mb-1.5">Ou escreva um tópico</p>
                  <input value={xgenTopic} onChange={(e) => setXgenTopic(e.target.value)} placeholder="Ex: como usar IA para criar conteúdo de qualidade..." onKeyDown={(e) => { if (e.key === "Enter") generate(); }}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.15)" }}
                    onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.4)")} onBlur={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.15)")} />
                </div>
                <div className="flex gap-3 flex-wrap">
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1.5">Slides</p>
                    <div className="flex gap-1">
                      {[4, 6, 8, 10].map((n) => (
                        <button key={n} onClick={() => setXgenCount(n)} className="w-10 h-8 rounded-lg text-xs font-medium transition-all"
                          style={{ background: xgenCount === n ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.04)", border: xgenCount === n ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)", color: xgenCount === n ? "#c4b5fd" : "rgba(255,255,255,0.4)" }}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1.5">Estilo</p>
                    <div className="flex gap-1">
                      {STYLES.map(({ v, l }) => (
                        <button key={v} onClick={() => setXgenStyle(v)} className="px-3 h-8 rounded-lg text-xs font-medium transition-all"
                          style={{ background: xgenStyle === v ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.04)", border: xgenStyle === v ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)", color: xgenStyle === v ? "#c4b5fd" : "rgba(255,255,255,0.4)" }}>{l}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => setXgenTwitter(v => !v)}
                  className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={{ background: xgenTwitter ? "rgba(14,165,233,0.12)" : "rgba(255,255,255,0.03)", border: xgenTwitter ? "1px solid rgba(14,165,233,0.4)" : "1px solid rgba(255,255,255,0.08)", color: xgenTwitter ? "#38bdf8" : "rgba(255,255,255,0.4)" }}>
                  <Twitter size={13} />
                  <span>Estilo X / Twitter</span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ background: xgenTwitter ? "rgba(14,165,233,0.2)" : "rgba(255,255,255,0.06)", color: xgenTwitter ? "#38bdf8" : "rgba(255,255,255,0.3)" }}>{xgenTwitter ? "Ativado" : "Desativado"}</span>
                </button>
                <button onClick={generate} disabled={!xgenTopic.trim() || xgenStatus === "gen"}
                  className="w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", color: "#c4b5fd" }}>
                  {xgenStatus === "gen" ? <><Loader2 size={14} className="animate-spin" /> Gerando roteiro...</> : <><Sparkles size={14} /> Gerar Carrossel</>}
                </button>
                {xgenError && <p className="text-xs text-red-400 text-center">{xgenError}</p>}
              </div>
              {xgenContent && (xgenStatus === "done" || xgenStatus === "opening") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">{xgenContent.slides.length + 1} slides (+ CTA XPost)</p>
                    <button onClick={openInEditor} disabled={xgenStatus === "opening"}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                      style={{ background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.5)", color: "#c4b5fd" }}>
                      {xgenStatus === "opening" ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} Abrir no Editor
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {xgenContent.slides.map((s, i) => (
                      <div key={i} className="rounded-xl p-3 space-y-1" style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>{i + 1}</span>
                          <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{s.title}</p>
                        </div>
                        {s.body && <p className="text-[11px] text-gray-500 leading-snug line-clamp-2 pl-6">{s.body}</p>}
                      </div>
                    ))}
                    <div className="rounded-xl p-3 space-y-1" style={{ background: "#0d0d0d", border: "1px solid rgba(124,58,237,0.25)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>{xgenContent.slides.length + 1}</span>
                        <p className="text-xs font-semibold text-violet-300 leading-snug">CTA — Assinar XPost</p>
                      </div>
                      <p className="text-[11px] text-gray-600 leading-snug pl-6">Crie carrosséis que viralizam. · xpostzone.online</p>
                    </div>
                  </div>
                  <button onClick={() => { setXgenContent(null); setXgenStatus("idle"); }}
                    className="w-full h-9 rounded-xl text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1.5"
                    style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                    <RotateCcw size={11} /> Gerar novamente
                  </button>
                </div>
              )}
            </div>
          );
        })()}
        {/* ═══ ABA XPOST AI ═══ */}
        {tab === "xpost" && (() => {
          const CHIPS = [
            "Crie um carrossel mostrando como gerar um carrossel viral com a XPost em 3 minutos",
            "Crie um carrossel com os 5 erros que matam o alcance dos carrosséis no Instagram",
            "Crie um carrossel comparando criar conteúdo manualmente vs usando a XPost",
            "Crie um carrossel com dicas para empreendedores que não têm tempo para criar conteúdo",
            "Crie um carrossel mostrando as funcionalidades da XPost",
            "Crie um carrossel sobre por que carrosséis são o melhor formato do Instagram hoje",
          ];

          const detectCarousel = (text: string) => {
            const hasSlide = /slide\s*\d+\s*[:—\-]/i.test(text);
            const count = (text.match(/slide\s*\d+/gi) ?? []).length;
            if (hasSlide && count >= 3) {
              const lines = text.split("\n");
              const out: string[] = [];
              let cap = false;
              for (const l of lines) {
                if (/slide\s*\d+\s*[:—\-]/i.test(l)) cap = true;
                if (cap && l.trim()) out.push(l.trim());
              }
              return out.length >= 3 ? out.join("\n") : null;
            }
            return null;
          };

          const sendToEditor = (prompt: string) => {
            sessionStorage.setItem("nexa-pending-prompt", prompt);
            window.dispatchEvent(new CustomEvent("nexa-prompt", { detail: { prompt } }));
            router.push("/editor");
          };

          const sendMsg = async (content: string) => {
            if (!content.trim() || xpostLoading) return;
            const userMsg: XMsg = { role: "user", content: content.trim() };
            const next = [...xpostMsgs, userMsg];
            setXpostMsgs(next);
            setXpostInput("");
            setXpostLoading(true);
            setTimeout(() => xpostEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            try {
              const res = await fetch("/api/admin/xpost-assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: next }),
              });
              const data = await res.json();
              setXpostMsgs(prev => [...prev, { role: "assistant", content: data.text || "Erro ao responder." }]);
            } catch {
              setXpostMsgs(prev => [...prev, { role: "assistant", content: "Erro de conexão." }]);
            } finally {
              setXpostLoading(false);
              setTimeout(() => xpostEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            }
          };

          return (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>
                  <Bot size={18} className="text-violet-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Brainstorm XPost</h2>
                  <p className="text-xs text-gray-500">Nexa focada em conteúdo para os perfis da empresa</p>
                </div>
              </div>

              {/* Chips de ideias rápidas */}
              <div className="flex flex-wrap gap-2">
                {CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendMsg(chip)}
                    disabled={xpostLoading}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-40"
                    style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#c4b5fd" }}
                  >
                    {chip.replace("Crie um carrossel ", "").replace("mostrando como gerar um carrossel viral com a XPost em 3 minutos", "Tutorial: XPost em 3 min").replace("com os 5 erros que matam o alcance dos carrosséis no Instagram", "5 erros de carrossel").replace("comparando criar conteúdo manualmente vs usando a XPost", "Manual vs XPost").replace("com dicas para empreendedores que não têm tempo para criar conteúdo", "Empreendedor sem tempo").replace("mostrando as funcionalidades da XPost", "Funcionalidades XPost").replace("sobre por que carrosséis são o melhor formato do Instagram hoje", "Por que carrosseis?")}
                  </button>
                ))}
              </div>

              {/* Chat */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "#0d0d0d", border: "1px solid rgba(139,92,246,0.15)" }}>
                <div className="h-[440px] overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/5">
                  {xpostMsgs.map((m, i) => {
                    const detected = m.role === "assistant" ? detectCarousel(m.content) : null;
                    return (
                      <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        {m.role === "assistant" && (
                          <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: "rgba(139,92,246,0.2)" }}>
                            <Bot size={13} className="text-violet-400" />
                          </div>
                        )}
                        <div className="max-w-[82%] space-y-2">
                          <div
                            className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                            style={m.role === "assistant"
                              ? { background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.12)", color: "rgba(255,255,255,0.88)", borderBottomLeftRadius: 4 }
                              : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", borderBottomRightRadius: 4 }
                            }
                          >
                            {m.content}
                          </div>
                          {detected && (
                            <button
                              onClick={() => sendToEditor(detected)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                              style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.35)", color: "#c4b5fd" }}
                            >
                              <Wand2 size={11} /> Enviar ao Editor
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {xpostLoading && (
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(139,92,246,0.2)" }}>
                        <Bot size={13} className="text-violet-400" />
                      </div>
                      <div className="px-3.5 py-2.5 rounded-2xl text-sm" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.12)" }}>
                        <Loader2 size={14} className="text-violet-400 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={xpostEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t" style={{ borderColor: "rgba(139,92,246,0.12)" }}>
                  <form
                    onSubmit={(e) => { e.preventDefault(); sendMsg(xpostInput); }}
                    className="flex gap-2"
                  >
                    <input
                      value={xpostInput}
                      onChange={(e) => setXpostInput(e.target.value)}
                      placeholder="Peça uma ideia de post, roteiro, hook, CTA..."
                      disabled={xpostLoading}
                      className="flex-1 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-600 outline-none transition-colors disabled:opacity-50"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.15)" }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.4)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.15)")}
                    />
                    <button
                      type="submit"
                      disabled={!xpostInput.trim() || xpostLoading}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                      style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}
                    >
                      {xpostLoading ? <Loader2 size={14} className="text-violet-400 animate-spin" /> : <Send size={14} className="text-violet-400" />}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
