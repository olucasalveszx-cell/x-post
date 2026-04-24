"use client";

import { useEffect, useState } from "react";

interface Props {
  onComplete: () => void;
}

/*
 * XP icon fiel à spec:
 *
 * X (chevron ">"):
 *   Polígono com braços paralelos, espessura 13u, ângulo interno ~90°.
 *   Ponta em (44, 50). Notch interno em (20, 50).
 *   Gradiente horizontal #2563FF → #8A3FFC mapeado ao comprimento do chevron.
 *
 * P (letra geométrica):
 *   Haste x=47–58, y=21–79.
 *   Bowl: cúbica C(90,21)(90,62)(58,62) — pico em x≈83 y≈42, cantos naturalmente
 *   arredondados pela tangente horizontal.
 *   Furo interno: C(80,33)(80,54)(58,54) — parede ~10u na curva, 12u no topo, 8u na base.
 *   fill-rule="evenodd" para o furo.
 */
function XPostIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={style}>
      <defs>
        <radialGradient id="la-bg" cx="50%" cy="40%" r="68%">
          <stop offset="0%"   stopColor="#1a1a22" />
          <stop offset="100%" stopColor="#0b0b0f" />
        </radialGradient>

        <linearGradient id="la-cg" x1="11" y1="0" x2="44" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#2563FF" />
          <stop offset="100%" stopColor="#8A3FFC" />
        </linearGradient>

        <linearGradient id="la-shadow" x1="0%" y1="0%" x2="0%" y2="42%">
          <stop offset="0%"   stopColor="rgba(0,0,0,0.55)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>

        <radialGradient id="la-glow" cx="48%" cy="50%" r="35%">
          <stop offset="0%"   stopColor="rgba(80,110,255,0.09)" />
          <stop offset="100%" stopColor="rgba(80,110,255,0)" />
        </radialGradient>
      </defs>

      <rect width="100" height="100" rx="20" fill="url(#la-bg)" />

      {/* X — chevron com braços paralelos, gradiente horizontal */}
      <polygon
        points="11,21 28,21 44,50 28,79 11,79 11,66 20,50 11,34"
        fill="url(#la-cg)"
        style={{ animation: "la-x-in 0.44s cubic-bezier(0.22,1,0.36,1) 0.46s both" }}
      />

      {/* P — haste + bowl cúbico + furo interno */}
      <path
        fillRule="evenodd"
        fill="white"
        d="M47,21 L58,21 C90,21 90,62 58,62 L58,79 L47,79 Z
           M58,33 C80,33 80,54 58,54 Z"
        style={{ animation: "la-p-in 0.44s cubic-bezier(0.22,1,0.36,1) 0.62s both" }}
      />

      <rect width="100" height="100" rx="20" fill="url(#la-shadow)" style={{ pointerEvents: "none" }} />
      <rect width="100" height="100" rx="20" fill="url(#la-glow)"   style={{ pointerEvents: "none" }} />
    </svg>
  );
}

export default function LoginAnimation({ onComplete }: Props) {
  const [out, setOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), 1900);
    const t2 = setTimeout(onComplete, 2260);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <>
      <style>{`
        @keyframes la-bg-in  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes la-bg-out { from { opacity: 1 } to { opacity: 0 } }

        @keyframes la-icon-in {
          0%   { transform: scale(0.04); opacity: 0 }
          28%  { opacity: 1 }
          100% { transform: scale(1);    opacity: 1 }
        }
        @keyframes la-icon-out {
          to { transform: scale(0.88); opacity: 0 }
        }

        @keyframes la-x-in {
          from { opacity: 0; transform: translateX(-26px) }
          to   { opacity: 1; transform: translateX(0) }
        }
        @keyframes la-p-in {
          from { opacity: 0; transform: translateX(20px) }
          to   { opacity: 1; transform: translateX(0) }
        }

        @keyframes la-glow-breathe {
          0%, 100% { opacity: 0.42; transform: scale(0.92) }
          50%      { opacity: 0.95; transform: scale(1.08) }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#060608",
          animation: out
            ? "la-bg-out 0.36s ease-out forwards"
            : "la-bg-in 0.15s ease-out forwards",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(37,99,255,0.18) 0%, rgba(138,63,252,0.08) 50%, transparent 72%)",
            pointerEvents: "none",
            animation: "la-glow-breathe 3s 1.1s ease-in-out infinite",
          }}
        />

        <div
          style={{
            width: 148,
            height: 148,
            borderRadius: 34,
            overflow: "hidden",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.05), " +
              "0 24px 64px rgba(0,0,0,0.95), " +
              "0 0 120px rgba(37,99,255,0.12)",
            animation: out
              ? "la-icon-out 0.32s cubic-bezier(0.4,0,1,1) forwards"
              : "la-icon-in 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.08s both",
          }}
        >
          <XPostIcon style={{ width: "100%", height: "100%", display: "block" }} />
        </div>
      </div>
    </>
  );
}
