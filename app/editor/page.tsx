"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { Download, ArrowLeft, User, LogIn, Sparkles, X, MessageCircle, RotateCcw, Zap, UserCircle, Instagram, Check } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";

import { Slide, Project } from "@/types";
import { renderSlide } from "@/lib/render-slide";
import SidePanel from "@/components/Generator/SidePanel";
import AuthButton from "@/components/AuthButton";
import SlideCanvas from "@/components/Editor/SlideCanvas";
import Toolbar from "@/components/Editor/Toolbar";
import HorizontalSlidePanel from "@/components/Editor/HorizontalSlidePanel";
import OnboardingModal from "@/components/Editor/OnboardingModal";
import PublishModal from "@/components/Actions/PublishModal";
import AIAssistant from "@/components/AIAssistant";
import SubscriptionGate from "@/components/SubscriptionGate";
import ProfilePickerModal, { UserProfile, getStoredProfile, saveProfile, PROFILE_STORAGE_KEY } from "@/components/Editor/ProfilePickerModal";
import { autosaveWrite, autosaveRead, autosaveClear } from "@/lib/autosave-db";
import ProfileModal from "@/components/ProfileModal";
import StyleSelectorModal from "@/components/Editor/StyleSelectorModal";
import AppLogo from "@/components/AppLogo";

interface IGAccount { token: string; accountId: string; username: string; }

const FORMATS = [
  { label: "1:1",  width: 1080, height: 1080 },
  { label: "4:5",  width: 1080, height: 1350 },
  { label: "9:16", width: 1080, height: 1920 },
  { label: "16:9", width: 1920, height: 1080 },
] as const;
type Format = typeof FORMATS[number];


export default function EditorPage() {
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const [format, setFormat] = useState<Format>(FORMATS[1]);
  const SLIDE_W = format.width;
  const SLIDE_H = format.height;

  // ── Estado central: projetos ──────────────────────────────────
  const [{ projects, activeProjectId }, setCore] = useState(() => {
    const pid = uuid();
    return {
      projects: [{
        id: pid, name: "Projeto 1",
        slides: [{ id: uuid(), backgroundColor: "#080e40", elements: [], width: 1080, height: 1350 }],
      }] as Project[],
      activeProjectId: pid,
    };
  });

  const setProjects = useCallback((updater: Project[] | ((p: Project[]) => Project[])) => {
    setCore((prev) => ({
      ...prev,
      projects: typeof updater === "function" ? updater(prev.projects) : updater,
    }));
  }, []);

  const setActiveProjectId = useCallback((id: string) => {
    setCore((prev) => ({ ...prev, activeProjectId: id }));
  }, []);

  // Projeto e slides ativos
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const slides = activeProject?.slides ?? [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const safeIndex = Math.min(currentIndex, Math.max(0, slides.length - 1));
  const currentSlide = slides[safeIndex] ?? slides[0];

  // ── Refs para callbacks estáveis ──────────────────────────────
  const activeProjectIdRef = useRef(activeProjectId);
  useEffect(() => { activeProjectIdRef.current = activeProjectId; }, [activeProjectId]);
  const slidesRef = useRef<Slide[]>(slides);
  useEffect(() => { slidesRef.current = slides; }, [slides]);

  // ── UI state ──────────────────────────────────────────────────
  const [showPublish, setShowPublish] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [igAccount, setIgAccount] = useState<IGAccount | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [credits, setCredits] = useState<{ remaining: number; limit: number; unlimited: boolean } | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"side" | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [displayScale, setDisplayScale] = useState(560 / 1350);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const twitterStyleRef = useRef(false);
  const pendingTopicRef = useRef<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // ── Histórico (por projeto) ───────────────────────────────────
  const historyRef = useRef<Slide[][]>([slides]);
  const historyIndexRef = useRef(0);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushHistory = useCallback((s: Slide[]) => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(s);
    if (historyRef.current.length > 50) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const restored = historyRef.current[historyIndexRef.current];
    const pid = activeProjectIdRef.current;
    setProjects((prev) => prev.map((p) => p.id === pid ? { ...p, slides: restored } : p));
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
  }, [setProjects]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const restored = historyRef.current[historyIndexRef.current];
    const pid = activeProjectIdRef.current;
    setProjects((prev) => prev.map((p) => p.id === pid ? { ...p, slides: restored } : p));
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [setProjects]);

  // Reset histórico ao trocar de projeto
  const prevActiveIdRef = useRef(activeProjectId);
  useEffect(() => {
    if (prevActiveIdRef.current === activeProjectId) return;
    prevActiveIdRef.current = activeProjectId;
    historyRef.current = [slides];
    historyIndexRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
  }); // sem deps: roda sempre, mas só age quando troca

  // Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // ── Profile picker ───────────────────────────────────────────
  useEffect(() => {
    const stored = getStoredProfile();
    if (stored) { setUserProfile(stored); }
    else { setTimeout(() => setShowProfilePicker(true), 800); }
  }, []);

  // ── Auto-save (IndexedDB — sem limite de tamanho, preserva imagens) ──
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const hasContent = projects.some((p) => p.slides.some((s) => s.elements.length > 0 || s.backgroundImageUrl));
    if (!hasContent) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      autosaveWrite(projects).catch(() => {});
    }, 1500);
  }, [projects]);

  useEffect(() => {
    autosaveRead().then((saved) => {
      if (!saved) return;
      const parsed = saved as Project[];
      if (parsed.some((p) => p.slides.some((s) => s.elements.length > 0 || s.backgroundImageUrl))) {
        setShowRestoreBanner(true);
      }
    }).catch(() => {});
  }, []);

  const restoreAutosave = () => {
    autosaveRead().then((saved) => {
      if (!saved) return;
      const parsed = saved as Project[];
      setProjects(parsed);
      setActiveProjectId(parsed[0].id);
      setCurrentIndex(0);
    }).catch(() => {});
    setShowRestoreBanner(false);
  };

  const dismissAutosave = () => {
    autosaveClear().catch(() => {});
    setShowRestoreBanner(false);
  };

  // ── Heartbeat (presença em tempo real) ───────────────────────
  useEffect(() => {
    const ping = () => fetch("/api/heartbeat", { method: "POST" }).catch(() => {});
    ping();
    const id = setInterval(ping, 45_000);
    return () => clearInterval(id);
  }, []);

  // ── Instagram — vinculado ao e-mail do usuário ───────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("ig_success");
    const error = params.get("ig_error");
    const currentEmail = session?.user?.email ?? null;

    if (success === "1") {
      const account: IGAccount = {
        token: params.get("ig_token") ?? "",
        accountId: params.get("ig_account") ?? "",
        username: params.get("ig_username") ?? "",
      };
      setIgAccount(account);
      // Salva junto com o email do dono para não vazar entre sessões
      localStorage.setItem("ig_account", JSON.stringify({ ...account, _owner: currentEmail }));
      window.history.replaceState({}, "", "/editor");
    } else if (error) {
      if (error === "no_business_account") {
        const pages = params.get("pages") ?? "nenhuma";
        alert(`Conta Instagram Business não encontrada.\nPáginas do Facebook: ${pages}`);
      }
      window.history.replaceState({}, "", "/editor");
    }

    if (!success) {
      try {
        const raw = localStorage.getItem("ig_account");
        if (raw) {
          const saved = JSON.parse(raw);
          // Só carrega se pertencer ao usuário atual (ou não tiver dono registrado)
          if (!saved._owner || saved._owner === currentEmail) {
            const { _owner, ...account } = saved;
            setIgAccount(account);
          } else {
            // Pertence a outro usuário — limpa
            localStorage.removeItem("ig_account");
          }
        }
      } catch {}
    }
  }, [session?.user?.email]);

  const handleIGLogin = () => { window.location.href = "/api/instagram/auth"; };

  const handleStyleSelect = useCallback((style: "layouts" | "twitter") => {
    setShowStyleSelector(false);
    twitterStyleRef.current = style === "twitter";
    const topic = pendingTopicRef.current;
    pendingTopicRef.current = null;
    const isTwitter = style === "twitter";
    window.dispatchEvent(new CustomEvent("open-generator-wizard", { detail: { topic: topic ?? undefined, isTwitter } }));
  }, []);

  // ── Operações de slide ────────────────────────────────────────
  const updateSlide = useCallback((updated: Slide) => {
    const pid = activeProjectIdRef.current;
    setProjects((prev) => {
      const next = prev.map((p) =>
        p.id !== pid ? p : { ...p, slides: p.slides.map((s) => s.id === updated.id ? updated : s) }
      );
      slidesRef.current = next.find((p) => p.id === pid)?.slides ?? slidesRef.current;
      return next;
    });
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => { pushHistory(slidesRef.current); }, 500);
  }, [setProjects, pushHistory]);

  const addSlide = useCallback(() => {
    const pid = activeProjectIdRef.current;
    const newSlide: Slide = { id: uuid(), backgroundColor: "#080e40", elements: [], width: SLIDE_W, height: SLIDE_H };
    setProjects((prev) => {
      const next = prev.map((p) => p.id !== pid ? p : { ...p, slides: [...p.slides, newSlide] });
      const newLen = next.find((p) => p.id === pid)?.slides.length ?? 1;
      setCurrentIndex(newLen - 1);
      return next;
    });
  }, [SLIDE_W, SLIDE_H, setProjects]);

  const deleteSlide = useCallback(() => {
    const pid = activeProjectIdRef.current;
    setProjects((prev) => {
      const project = prev.find((p) => p.id === pid);
      if (!project || project.slides.length <= 1) return prev;
      const newSlides = project.slides.filter((_, i) => i !== safeIndex);
      setCurrentIndex((c) => Math.min(c, newSlides.length - 1));
      return prev.map((p) => p.id !== pid ? p : { ...p, slides: newSlides });
    });
  }, [safeIndex, setProjects]);

  const applyTwitterStyle = useCallback(async (slides: Slide[]): Promise<Slide[]> => {
    if (slides.length <= 1) return slides;
    const W = slides[0].width;
    const H = slides[0].height;
    const { v4: uuidv4 } = await import("uuid");

    let profileData: { name?: string; handle?: string; avatarSrc?: string; verified?: boolean } | null = null;
    try {
      const saved = localStorage.getItem("xpz_profile");
      if (saved) profileData = JSON.parse(saved);
    } catch {}

    const PAD  = Math.round(W * 0.055);

    const PROFILE_H = Math.round(H * 0.075);
    const PROFILE_Y = Math.round(H * 0.03);

    const makeProfile = (): import("@/types").SlideElement => ({
      id: uuidv4(),
      type: "profile" as const,
      x: PAD,
      y: PROFILE_Y,
      width: W - PAD * 2,
      height: PROFILE_H,
      src: profileData?.avatarSrc || undefined,
      profileName: profileData?.name ?? "",
      profileHandle: profileData?.handle ?? "",
      profileVerified: profileData?.verified ?? false,
      profileNameColor: "#111111",
      profileHandleColor: "#666666",
      zIndex: 10,
    });

    // ── Slide 1 (capa) ──────────────────────────────────────────────
    const [coverSlide, ...rest] = slides;

    // Imagem pode estar em backgroundImageUrl OU em elemento com src
    const coverImgUrl =
      coverSlide.backgroundImageUrl ??
      (coverSlide.elements.find((el) => el.type === "image" && (el as any).src) as any)?.src ?? null;

    const IMG_TOP  = PROFILE_Y + PROFILE_H + Math.round(H * 0.025);
    const IMG_H    = Math.round(H * 0.38);
    const TEXT_TOP = IMG_TOP + IMG_H + Math.round(H * 0.022);
    const TEXT_H   = Math.round(H * 0.17);
    const BODY_TOP = TEXT_TOP + TEXT_H + Math.round(H * 0.012);
    const BODY_H   = Math.round(H * 0.10);

    const pickTitleBody = (els: import("@/types").SlideElement[]) => {
      const texts = els.filter(e => e.type === "text");
      const sorted = [...texts].sort((a, b) => ((b.style as any)?.fontSize ?? 0) - ((a.style as any)?.fontSize ?? 0));
      const strip = (c: string) => c.replace(/<[^>]+>/g, "").trim();
      const titleEl = sorted.find(e => strip(e.content ?? "").length > 3 && !/^\d{1,2}$/.test(strip(e.content ?? "")));
      const bodyEl  = sorted.find(e => e !== titleEl && ((e.style as any)?.fontSize ?? 0) >= 20 && strip(e.content ?? "").length > 3);
      return [titleEl, bodyEl].filter(Boolean) as import("@/types").SlideElement[];
    };

    const coverTexts = pickTitleBody(coverSlide.elements)
      .map((el, i) => ({
        ...el,
        x: PAD,
        y: i === 0 ? TEXT_TOP : BODY_TOP,
        width: W - PAD * 2,
        height: i === 0 ? TEXT_H : BODY_H,
        style: {
          ...(el.style as any),
          color: "#111111",
          fontFamily: "'Inter', sans-serif",
          fontSize: i === 0 ? Math.round(H * 0.036) : Math.round(H * 0.019),
          fontWeight: i === 0 ? "bold" : "normal",
        },
      }));

    const coverImgEl: import("@/types").SlideElement | null = coverImgUrl
      ? {
          id: uuidv4(),
          type: "image" as const,
          x: PAD,
          y: IMG_TOP,
          width: W - PAD * 2,
          height: IMG_H,
          src: coverImgUrl,
          zIndex: 2,
          imageObjectPositionY: 30,
        }
      : null;

    const coverSlideOut: Slide = {
      ...coverSlide,
      backgroundColor: "#ffffff",
      backgroundGradient: undefined,
      backgroundPattern: "grid-light",
      backgroundImageUrl: undefined,
      backgroundCrop: undefined,
      elements: [makeProfile(), ...(coverImgEl ? [coverImgEl] : []), ...coverTexts],
    };

    // ── Slides 2+ (conteúdo) ──
    const CTOP_TITLE  = PROFILE_Y + PROFILE_H + Math.round(H * 0.07);
    const CTOP_BODY   = CTOP_TITLE + Math.round(H * 0.22) + Math.round(H * 0.02);

    const contentSlides = rest.map((slide) => {
      const texts = pickTitleBody(slide.elements)
        .map((el, i) => ({
          ...el,
          x: PAD,
          y: i === 0 ? CTOP_TITLE : CTOP_BODY,
          width: W - PAD * 2,
          height: i === 0 ? Math.round(H * 0.22) : Math.round(H * 0.38),
          style: {
            ...(el.style as any),
            color: "#111111",
            fontFamily: "'Inter', sans-serif",
            fontSize: i === 0 ? Math.round(H * 0.044) : Math.round(H * 0.021),
            fontWeight: i === 0 ? "bold" : "normal",
            lineHeight: i === 0 ? 1.15 : 1.5,
          },
          zIndex: 5,
        }));

      return {
        ...slide,
        backgroundColor: "#ffffff",
        backgroundGradient: undefined,
        backgroundPattern: "grid-light" as const,
        backgroundImageUrl: undefined,
        backgroundCrop: undefined,
        backgroundPosition: undefined,
        backgroundZoom: 100,
        elements: [makeProfile(), ...texts],
      };
    });

    return [coverSlideOut, ...contentSlides];
  }, []);

  const handleGenerate = useCallback(async (generated: Slide[]) => {
    const pid = activeProjectIdRef.current;
    const isTwitter = twitterStyleRef.current;
    // não reseta o ref aqui pois onGenerate é chamado 2x (rawSlides + withImages)
    // o ref é resetado em handleStyleSelect na próxima geração

    const final = isTwitter ? await applyTwitterStyle(generated) : generated;

    setProjects((prev) => prev.map((p) => p.id !== pid ? p : { ...p, slides: final }));
    slidesRef.current = final;
    setCurrentIndex(0);
    pushHistory(final);
    if (final[0]) {
      const matched = FORMATS.find(f => f.width === final[0].width && f.height === final[0].height);
      if (matched) setFormat(matched);
    }
  }, [setProjects, pushHistory, applyTwitterStyle]);

  const applyThemeToAll = useCallback((bg: string, textColor: string) => {
    const pid = activeProjectIdRef.current;
    setProjects((prev) => prev.map((p) => {
      if (p.id !== pid) return p;
      const newSlides = p.slides.map((s) => ({
        ...s,
        backgroundColor: bg,
        backgroundImageUrl: undefined,
        backgroundGradient: undefined,
        elements: s.elements.map((el) =>
          el.type === "text"
            ? { ...el, style: { ...(el.style as any), color: textColor } }
            : el
        ),
      }));
      pushHistory(newSlides);
      return { ...p, slides: newSlides };
    }));
  }, [setProjects, pushHistory]);

  const handleFormatChange = (f: Format) => {
    setFormat(f);
    setProjects((prev) => prev.map((p) => ({
      ...p, slides: p.slides.map((s) => ({ ...s, width: f.width, height: f.height })),
    })));
  };

  const handleSelectSlide = (projectId: string, slideIndex: number) => {
    setActiveProjectId(projectId);
    setCurrentIndex(slideIndex);
    setSelectedElementId(null);
  };

  // ── Exportar ─────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const canvases: HTMLCanvasElement[] = [];
      for (let i = 0; i < slides.length; i++) {
        const canvas = await renderSlide(slides[i]);
        canvases.push(canvas);
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/jpeg", 0.95);
        a.download = `slide-${String(i + 1).padStart(2, "0")}.jpg`;
        a.click();
        await new Promise((r) => setTimeout(r, 150));
      }

      // Salva no histórico e biblioteca em background (não bloqueia)
      saveToProfile(canvases).catch(() => {});
    } catch { alert("Erro ao exportar."); }
    finally { setExporting(false); }
  };

  const saveToProfile = async (canvases: HTMLCanvasElement[]) => {
    const activeProject = projects.find((p) => p.id === activeProjectId);
    const title = activeProject?.name ?? "Carrossel";

    // Upload de cada slide para Vercel Blob
    const uploadSlide = async (canvas: HTMLCanvasElement) => {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.split(",")[1];
      const res = await fetch("/api/blob-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg", filename: `xpost-${Date.now()}.jpg` }),
      });
      if (!res.ok) return null;
      const { url } = await res.json();
      return url as string;
    };

    // Upload de todos os slides em paralelo
    const urls = await Promise.all(canvases.map(uploadSlide));
    const validUrls = urls.filter(Boolean) as string[];
    if (!validUrls.length) return;

    // Salva carrossel no histórico (capa = primeiro slide)
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "history",
        entry: { id: crypto.randomUUID(), title, coverUrl: validUrls[0], slideCount: canvases.length },
      }),
    });

    // Salva cada slide na biblioteca de imagens
    await Promise.all(validUrls.map((url) =>
      fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "image", entry: { id: crypto.randomUUID(), url } }),
      })
    ));
  };

  // ── Créditos + responsividade ─────────────────────────────────
  useEffect(() => {
    fetch("/api/credits").then((r) => r.ok ? r.json() : null).then((d) => { if (d) setCredits(d); }).catch(() => {});
    const handler = (e: Event) => { const d = (e as CustomEvent).detail; if (d) setCredits(d); };
    window.addEventListener("credits-updated", handler);
    return () => window.removeEventListener("credits-updated", handler);
  }, []);

  useEffect(() => {
    const update = () => {
      const mob = window.innerWidth < 768;
      setIsMobile(mob);
      if (!canvasContainerRef.current) return;
      const { width, height } = canvasContainerRef.current.getBoundingClientRect();
      const pad = mob ? 16 : 32;
      // No mobile: cabe na largura da tela com 8px de margem em cada lado
      const mobileCap = mob ? (window.innerWidth - 16) / SLIDE_W : Infinity;
      const s = Math.min((width - pad) / SLIDE_W, (height - pad) / SLIDE_H, 560 / SLIDE_H, mobileCap);
      setDisplayScale(s);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [SLIDE_W, SLIDE_H]);

  const DISPLAY_W = SLIDE_W * displayScale;
  const DISPLAY_H = SLIDE_H * displayScale;
  const selectedElement = selectedElementId
    ? currentSlide?.elements.find((el) => el.id === selectedElementId) ?? null
    : null;
  const isEmpty = slides.length === 1 && slides[0].elements.length === 0 && !slides[0].backgroundImageUrl;

  return (
    <SubscriptionGate>
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg)]">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-3 md:px-5 py-2 md:py-3 bg-[var(--bg-2)] border-b border-[var(--border)] z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-1.5 rounded-lg hover:bg-[var(--bg-3)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <AppLogo variant={isDark ? "dark" : "light"} size={28} textClassName="hidden sm:block text-[18px] font-black tracking-tight text-[var(--text)] leading-none" />
        </div>

        <div className="flex items-center gap-1.5">
          {credits && (
            <Link href="/credits"
              className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-semibold transition-opacity hover:opacity-80"
              style={{
                background: (credits as any).total > 10 ? "rgba(76,110,245,0.1)" : (credits as any).total > 0 ? "rgba(251,191,36,0.1)" : "rgba(239,68,68,0.1)",
                borderColor: (credits as any).total > 10 ? "rgba(76,110,245,0.3)" : (credits as any).total > 0 ? "rgba(251,191,36,0.3)" : "rgba(239,68,68,0.3)",
                color: (credits as any).total > 10 ? "##818cf8" : (credits as any).total > 0 ? "#fbbf24" : "#f87171",
              }}>
              <Zap size={11} />
              {`${(credits as any).total ?? credits.remaining}/${credits.limit}`}
            </Link>
          )}
          {/* Badge de perfil */}
          {userProfile && (
            <button
              onClick={() => setShowProfilePicker(true)}
              title="Alterar perfil"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
              style={{ background: "rgba(59,91,219,0.15)", border: "1px solid rgba(76,110,245,0.3)", color: "##818cf8" }}>
              <span style={{ fontSize: 13 }}>
                {["advocacia","nutricao","odonto","saude","noticias","marketing","fitness","educacao","beleza","gastronomia"].includes(userProfile.key)
                  ? ["⚖️","🥗","🦷","🏥","📰","📈","💪","📚","💄","🍽️"][["advocacia","nutricao","odonto","saude","noticias","marketing","fitness","educacao","beleza","gastronomia"].indexOf(userProfile.key)]
                  : "✏️"}
              </span>
              {userProfile.label}
            </button>
          )}
          <AuthButton />
          <button onClick={() => setShowAI(true)}
            className="flex items-center gap-1.5 px-2 md:px-3 py-2 rounded-lg text-sm transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg,rgba(67,56,202,0.25),rgba(109,40,217,0.2))", border: "1px solid rgba(99,102,241,0.35)", color: "#a78bfa", boxShadow: "0 0 14px rgba(99,102,241,0.15)" }}>
            {/* Mini orb pulsante */}
            <span className="relative flex items-center justify-center" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(99,102,241,0.35)", animationDuration: "2s" }} />
              <span className="relative w-3 h-3 rounded-full" style={{ background: "linear-gradient(135deg,#818cf8,#a855f7)", boxShadow: "0 0 6px rgba(99,102,241,0.7)" }} />
            </span>
            <span className="hidden md:inline font-semibold">Zora IA</span>
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-2 md:px-4 py-2 rounded-lg bg-[var(--bg-3)] hover:bg-[var(--bg-4)] text-[var(--text)] text-sm border border-[var(--border)] disabled:opacity-40 transition-colors">
            <Download size={15} />
            <span className="hidden md:inline">{exporting ? "Exportando..." : "Exportar"}</span>
          </button>
          <button onClick={() => setShowProfile(true)}
            className="hidden md:flex items-center gap-1.5 px-2 md:px-3 py-2 rounded-lg text-sm border border-[var(--border)] bg-[var(--bg-3)] hover:bg-[var(--bg-4)] transition-colors text-[var(--text-2)]">
            <UserCircle size={15} />
            <span className="hidden md:inline">Perfil</span>
          </button>
          <div className="hidden md:block">
            {igAccount ? (
              <button onClick={() => setShowPublish(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm font-medium">
                <User size={14} /> @{igAccount.username}
              </button>
            ) : (
              <button onClick={handleIGLogin}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm font-medium">
                <LogIn size={14} /> Login Instagram
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Banner de restauração ──────────────────────────────── */}
      {showRestoreBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-brand-600/20 border-b border-brand-500/30 text-sm text-brand-300 shrink-0">
          <div className="flex items-center gap-2">
            <RotateCcw size={14} className="shrink-0" />
            <span>Você tem projetos salvos. Deseja restaurar?</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={restoreAutosave} className="px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors">Restaurar</button>
            <button onClick={dismissAutosave} className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-colors">Descartar</button>
          </div>
        </div>
      )}

      {/* ── Corpo ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Overlay mobile */}
        {isMobile && mobilePanel && (
          <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm" onClick={() => setMobilePanel(null)} />
        )}

        {/* Painel esquerdo — Gerar */}
        {isMobile ? (
          <div className="fixed inset-y-0 left-0 z-40 flex flex-col bg-[var(--bg-2)] border-r border-[var(--border)]"
            style={{ width: "85vw", maxWidth: 360, transform: mobilePanel === "side" ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)] shrink-0">
              <span className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                <Sparkles size={14} className="text-brand-400" /> Gerar Carrossel
              </span>
              <button onClick={() => setMobilePanel(null)} className="p-1.5 rounded-lg bg-[var(--bg-3)] text-[var(--text-2)]"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidePanel onGenerate={(s) => { handleGenerate(s); setMobilePanel(null); }} currentSlides={slides} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col overflow-hidden shrink-0" style={{ width: 300, background: "var(--bg-2)", borderRight: "1px solid var(--border)" }}>
            <SidePanel onGenerate={handleGenerate} currentSlides={slides} />
          </div>
        )}

        {/* ── Área central ──────────────────────────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">

          {/* Toolbar */}
          {currentSlide && (
            <Toolbar
              slide={currentSlide}
              onUpdate={updateSlide}
              onAddSlide={addSlide}
              onDeleteSlide={deleteSlide}
              slideIndex={safeIndex}
              totalSlides={slides.length}
              onPrev={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              onNext={() => setCurrentIndex((i) => Math.min(slides.length - 1, i + 1))}
              selectedElement={selectedElement}
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              format={format.label}
              onFormatChange={(label) => {
                const f = FORMATS.find((f) => f.label === label);
                if (f) handleFormatChange(f);
              }}
              onApplyThemeToAll={applyThemeToAll}
            />
          )}


          {/* Canvas */}
          <div ref={canvasContainerRef} className="flex-1 overflow-auto flex items-center justify-center bg-[var(--bg)] relative"
            style={{ padding: isMobile ? "12px" : "16px" }}>
            {isEmpty && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                <div className="flex flex-col items-center gap-5 pointer-events-auto px-6 text-center">
                  <div className="p-5 rounded-3xl bg-brand-500/10 border border-brand-500/20">
                    <Sparkles size={isMobile ? 28 : 36} className="text-brand-400" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-[var(--text)] mb-2">Pronto para criar?</h2>
                    <p className="text-sm text-gray-500">Gere um carrossel incrível com IA em segundos</p>
                  </div>
                  <button
                    onClick={() => setShowStyleSelector(true)}
                    className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-base transition-all shadow-2xl shadow-brand-500/30"
                    style={{ minWidth: 200, touchAction: "manipulation" }}>
                    <Sparkles size={20} /> Gerar Ideias
                  </button>
                </div>
              </div>
            )}
            <div ref={canvasRef}
              style={{ width: DISPLAY_W, height: DISPLAY_H, position: "relative", opacity: isEmpty ? 0.1 : 1, transition: "opacity 0.4s" }}
              className="shadow-2xl rounded overflow-hidden">
              {slides.map((slide, i) => (
                <div key={slide.id} id={`slide-render-${slide.id}`} style={{ display: i === safeIndex ? "block" : "none", width: SLIDE_W, height: SLIDE_H }}>
                  <SlideCanvas slide={slide} onUpdate={updateSlide} scale={displayScale} onSelectElement={(el) => setSelectedElementId(el?.id ?? null)} isActive={i === safeIndex} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Painel horizontal de slides / projetos ─────────── */}
          <HorizontalSlidePanel
            projects={projects}
            activeProjectId={activeProjectId}
            activeSlideIndex={safeIndex}
            slideWidth={SLIDE_W}
            slideHeight={SLIDE_H}
            onProjectsChange={setProjects}
            onSelectSlide={handleSelectSlide}
            compact={isMobile}
          />
        </div>
      </div>

      {/* ── Barra inferior mobile ─────────────────────────────── */}
      {isMobile && (
        <div className="shrink-0 bg-[var(--bg-2)] border-t border-[var(--border)]"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", zIndex: 20 }}>
          {[
            {
              id: "side",
              icon: <Sparkles size={20} />,
              label: "IA",
              action: () => setMobilePanel(mobilePanel === "side" ? null : "side"),
              active: mobilePanel === "side",
            },
            {
              id: "zora",
              icon: <MessageCircle size={20} />,
              label: "Zora",
              action: () => setShowAI(true),
              active: false,
            },
            {
              id: "pub",
              icon: (
                <div className="relative">
                  <Instagram size={20} />
                  <div className="absolute -bottom-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center border border-[var(--bg-2)]">
                    <Check size={7} strokeWidth={3} className="text-white" />
                  </div>
                </div>
              ),
              label: "Publicar",
              action: () => setShowPublish(true),
              active: false,
            },
            {
              id: "profile",
              icon: <UserCircle size={20} />,
              label: "Perfil",
              action: () => setShowProfile(true),
              active: false,
            },
          ].map((tab) => (
            <button key={tab.id} onClick={tab.action}
              className="flex flex-col items-center justify-center gap-1 py-3.5 transition-colors"
              style={{ color: tab.active ? "#4c6ef5" : "#6b7280", background: tab.active ? "rgba(76,110,245,0.08)" : "transparent", fontSize: 11, touchAction: "manipulation" }}>
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {showPublish && <PublishModal slides={slides} account={igAccount} onClose={() => setShowPublish(false)} onLoginClick={handleIGLogin} />}
      <AIAssistant open={showAI} onClose={() => setShowAI(false)} />
      <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} />
      <StyleSelectorModal
        open={showStyleSelector}
        onClose={() => setShowStyleSelector(false)}
        onSelect={handleStyleSelect}
      />
      <OnboardingModal
        onConfirm={(topic) => {
          pendingTopicRef.current = topic;
          setShowStyleSelector(true);
        }}
      />
      <ProfilePickerModal
        open={showProfilePicker}
        onClose={(profile) => { setUserProfile(profile); setShowProfilePicker(false); }}
      />
    </div>
    </SubscriptionGate>
  );
}
