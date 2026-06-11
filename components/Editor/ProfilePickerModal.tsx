"use client";

import { useState } from "react";
import { X, ChevronRight } from "lucide-react";

export interface UserProfile {
  key: string;
  label: string;
  custom?: string;
}

const PROFILES = [
  { key: "advocacia",    label: "Advocacia",       emoji: "⚖️" },
  { key: "nutricao",     label: "Nutrição",         emoji: "🥗" },
  { key: "odonto",       label: "Odontologia",      emoji: "🦷" },
  { key: "saude",        label: "Saúde em geral",   emoji: "🏥" },
  { key: "noticias",     label: "Notícias",         emoji: "📰" },
  { key: "marketing",    label: "Marketing",        emoji: "📈" },
  { key: "fitness",      label: "Fitness",          emoji: "💪" },
  { key: "educacao",     label: "Educação",         emoji: "📚" },
  { key: "beleza",       label: "Beleza & Estética", emoji: "💄" },
  { key: "gastronomia",  label: "Gastronomia",      emoji: "🍽️" },
  { key: "outro",        label: "Outro",            emoji: "✏️" },
];

export const PROFILE_STORAGE_KEY = "xpz_profile";

export function getStoredProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: UserProfile) {
  try { localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p)); } catch {}
}

interface Props {
  open: boolean;
  onClose: (profile: UserProfile) => void;
}

export default function ProfilePickerModal({ open, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");

  if (!open) return null;

  const canConfirm = selected !== null && (selected !== "outro" || custom.trim().length > 0);

  const handleConfirm = () => {
    if (!selected) return;
    const profile = PROFILES.find((p) => p.key === selected)!;
    const up: UserProfile = {
      key: profile.key,
      label: selected === "outro" ? custom.trim() : profile.label,
      custom: selected === "outro" ? custom.trim() : undefined,
    };
    saveProfile(up);
    onClose(up);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="relative w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: "#0d0d0d", border: "1px solid rgba(76,110,245,0.25)", boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 80px rgba(59,91,219,0.15)" }}>

        {/* Header */}
        <div className="px-7 pt-7 pb-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-black text-white">Qual é o seu nicho?</h2>
          </div>
          <p className="text-sm text-gray-500">
            Escolha seu perfil para personalizar a geração de conteúdo.
          </p>
        </div>

        {/* Grid de perfis */}
        <div className="px-7 pb-2 grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {PROFILES.map((p) => {
            const active = selected === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setSelected(p.key)}
                className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl text-center transition-all hover:scale-[1.03]"
                style={{
                  background: active ? "rgba(59,91,219,0.2)" : "rgba(255,255,255,0.04)",
                  border: active ? "1.5px solid rgba(76,110,245,0.7)" : "1px solid rgba(255,255,255,0.07)",
                  boxShadow: active ? "0 0 16px rgba(59,91,219,0.25)" : "none",
                }}>
                <span style={{ fontSize: 24 }}>{p.emoji}</span>
                <span className="text-[11px] font-semibold leading-tight"
                  style={{ color: active ? "##818cf8" : "#9ca3af" }}>
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Campo custom */}
        {selected === "outro" && (
          <div className="px-7 pt-3">
            <input
              autoFocus
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canConfirm) handleConfirm(); }}
              placeholder="Ex: Imóveis, Seguros, Tecnologia..."
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-purple-500/60 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
        )}

        {/* Footer */}
        <div className="px-7 py-6 flex items-center justify-between">
          <p className="text-xs text-gray-700">Você pode alterar depois no editor</p>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg,#3b5bdb,#4c6ef5)", boxShadow: canConfirm ? "0 4px 20px rgba(59,91,219,0.4)" : "none" }}>
            Confirmar <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
