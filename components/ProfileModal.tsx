"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import { X, Download, Loader2, ImageIcon, Layers, RefreshCw, LogOut, LayoutDashboard, Zap, Crown, ArrowRight, Instagram, Trash2 } from "lucide-react";
import Link from "next/link";

interface HistoryEntry {
  id: string;
  title: string;
  coverUrl: string;
  slideCount: number;
  createdAt: string;
}

interface ImageEntry {
  id: string;
  url: string;
  savedAt: string;
}

interface CreditsInfo {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  bonus: number;
  total: number;
}

const PLAN_LABEL: Record<string, string> = {
  free: "Free", basic: "Basic", pro: "Pro", business: "Business",
};
const PLAN_COLOR: Record<string, string> = {
  free: "#9ca3af", basic: "#60a5fa", pro: "#4c6ef5", business: "#f59e0b",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ProfileModal({ open, onClose }: Props) {
  const { data: session } = useSession();
  const [tab, setTab]         = useState<"history" | "images" | "instagram">("history");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [images,  setImages]  = useState<ImageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [credits, setCredits] = useState<CreditsInfo | null>(null);

  /* ── Instagram ── */
  const [igAccount, setIgAccount] = useState<{ username: string; accountId: string; token: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.history ?? []);
      setImages(data.images ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInstagram = useCallback(() => {
    try {
      const saved = localStorage.getItem("ig_account");
      if (saved) setIgAccount(JSON.parse(saved));
      else setIgAccount(null);
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    load();
    fetch("/api/admin/me").then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => {});
    fetch("/api/credits").then(r => r.ok ? r.json() : null).then(d => { if (d) setCredits(d); }).catch(() => {});
    loadInstagram();
  }, [open, load, loadInstagram]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl bg-[#0e0e0e] border-t sm:border border-[#222] rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1e1e1e] shrink-0">
          {session?.user?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="w-8 h-8 rounded-full border border-white/10 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white truncate">{session?.user?.name ?? "Meu Perfil"}</p>
            <p className="text-[10px] text-gray-500 truncate">{session?.user?.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Credits card */}
        {credits && (
          <div className="mx-4 mt-3 mb-1 rounded-xl border border-[#1e1e1e] overflow-hidden shrink-0" style={{ background: "#0a0a0a" }}>
            <div className="flex items-center justify-between px-4 py-3">
              {/* Plan + total */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${PLAN_COLOR[credits.plan] ?? "#9ca3af"}18` }}>
                  <Crown size={13} style={{ color: PLAN_COLOR[credits.plan] ?? "#9ca3af" }} />
                </div>
                <div>
                  <p className="text-[11px] font-bold" style={{ color: PLAN_COLOR[credits.plan] ?? "#9ca3af" }}>
                    {PLAN_LABEL[credits.plan] ?? credits.plan}
                  </p>
                  <p className="text-[10px] text-gray-600">{credits.used}/{credits.limit} mensais usados</p>
                </div>
              </div>

              {/* Total badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{
                  background: credits.total > 5 ? "rgba(76,110,245,0.12)" : credits.total > 0 ? "rgba(251,191,36,0.12)" : "rgba(239,68,68,0.12)",
                  color: credits.total > 5 ? "##818cf8" : credits.total > 0 ? "#fbbf24" : "#f87171",
                }}>
                <Zap size={11} />
                <span className="text-xs font-black">{credits.total}</span>
                <span className="text-[10px] opacity-70">créditos</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-4 pb-1">
              <div className="h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (credits.used / credits.limit) * 100)}%`,
                    background: credits.used / credits.limit > 0.85 ? "#ef4444" : credits.used / credits.limit > 0.6 ? "#f59e0b" : "#4c6ef5",
                  }} />
              </div>
            </div>

            {/* Bonus + actions */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#111] mt-1">
              <p className="text-[10px] text-gray-600">
                {credits.bonus > 0
                  ? <span className="text-yellow-600">+{credits.bonus} créditos extras</span>
                  : "Sem créditos extras"}
              </p>
              <div className="flex items-center gap-2">
                <Link href="/credits" onClick={onClose}
                  className="text-[11px] font-semibold text-brand-500 hover:text-brand-400 transition-colors flex items-center gap-0.5">
                  Comprar mais <ArrowRight size={10} />
                </Link>
                <span className="text-gray-700">·</span>
                <Link href="/#pricing" onClick={onClose}
                  className="text-[11px] font-semibold text-yellow-500 hover:text-yellow-400 transition-colors flex items-center gap-0.5">
                  Upgrade <Crown size={10} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#1e1e1e] shrink-0 mt-2">
          {(["history", "images", "instagram"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                tab === t ? "text-white border-b-2 border-brand-500" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "history" ? <><Layers size={13} /> Histórico</> : t === "images" ? <><ImageIcon size={13} /> Biblioteca</> : <><Instagram size={13} /> Instagram</>}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="text-brand-500 animate-spin" />
            </div>
          )}

          {!loading && tab === "history" && (
            <>
              {history.length === 0 ? (
                <div className="text-center py-16 text-gray-600 text-sm">
                  <Layers size={32} className="mx-auto mb-3 opacity-30" />
                  Nenhum carrossel salvo ainda.<br />
                  <span className="text-xs">Exporte um carrossel para salvar no histórico.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl overflow-hidden border border-[#1e1e1e] bg-[#141414] flex flex-col"
                    >
                      <div className="relative aspect-[4/5] bg-[#111]">
                        {item.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Layers size={24} className="text-gray-700" />
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 px-2 py-1 text-[10px] text-gray-400"
                          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
                          {item.slideCount} slide{item.slideCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="px-2.5 py-2 flex flex-col gap-1">
                        <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                        <p className="text-[10px] text-gray-600">{fmt(item.createdAt)}</p>
                        <a
                          href={item.coverUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium text-brand-500 border border-brand-500/30 hover:bg-brand-500/8 transition-colors"
                        >
                          <Download size={11} /> Baixar capa
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "instagram" && (
            <div className="flex flex-col items-center gap-5 max-w-sm mx-auto w-full py-6">
              {igAccount ? (
                <>
                  {/* Conectado */}
                  <div className="flex flex-col items-center gap-3 w-full">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
                      <Instagram size={28} color="white" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-white text-sm">@{igAccount.username}</p>
                      <p className="text-[11px] text-green-400 mt-0.5 flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                        Conta conectada
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      localStorage.removeItem("ig_account");
                      setIgAccount(null);
                      window.dispatchEvent(new CustomEvent("ig-disconnected"));
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} /> Desconectar Instagram
                  </button>
                </>
              ) : (
                <>
                  {/* Desconectado */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#1a1a1a] border border-[#2a2a2a]">
                    <Instagram size={28} className="text-gray-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-white text-sm">Nenhuma conta conectada</p>
                    <p className="text-[11px] text-gray-500 mt-1">Conecte seu Instagram para publicar diretamente.</p>
                  </div>

                  <a
                    href="/api/instagram/auth"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
                  >
                    <Instagram size={15} /> Conectar com Instagram
                  </a>

                  <p className="text-[10px] text-gray-700 text-center leading-relaxed">
                    Você será redirecionado para o Facebook para autorizar o acesso.
                  </p>
                </>
              )}
            </div>
          )}

          {!loading && tab === "images" && (
            <>
              {images.length === 0 ? (
                <div className="text-center py-16 text-gray-600 text-sm">
                  <ImageIcon size={32} className="mx-auto mb-3 opacity-30" />
                  Nenhuma imagem salva ainda.<br />
                  <span className="text-xs">As imagens exportadas aparecem aqui.</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {images.map((img) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-[3/4] bg-[#111]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a
                          href={img.url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                          <Download size={14} className="text-white" />
                        </a>
                      </div>
                      <div className="absolute bottom-1 left-1 right-1 text-[9px] text-gray-400 truncate">
                        {fmt(img.savedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1e1e1e] shrink-0 flex items-center gap-3">
          <p className="text-[10px] text-gray-600 flex-1">
            {tab === "history" ? `${history.length}/30 carrosséis` : `${images.length}/100 imagens`}
          </p>
          <button onClick={load} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <RefreshCw size={12} />
          </button>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-400 font-semibold transition-colors border border-brand-500/30 hover:border-brand-500/60 px-2.5 py-1.5 rounded-lg"
            >
              <LayoutDashboard size={13} /> Dashboard
            </Link>
          )}
          <button
            onClick={() => {
              localStorage.removeItem("ig_account");
              signOut();
            }}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors border border-red-500/20 hover:border-red-500/40 px-2.5 py-1.5 rounded-lg"
          >
            <LogOut size={13} /> Sair
          </button>
        </div>
      </div>
    </div>
  );
}
