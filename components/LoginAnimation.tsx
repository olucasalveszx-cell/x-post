"use client";

import { useEffect, useState } from "react";

interface Props {
  onComplete: () => void;
}

/*
 * SVG do ícone XPost recriado fielmente a partir da imagem original.
 *
 * viewBox 0 0 100 100 (espaço normalizado do ícone)
 *
 * Chevron ">":
 *   Polígono com braços horizontais à esquerda (y=28..40 topo, y=60..72 base)
 *   e ponta em (52,50). Recesso interno em (39,50).
 *   Gradiente azul vertical #6b99ff → #3b5bdb.
 *
 * P branco:
 *   Haste: x=48–62, y=28–63 (borda esquerda vertical).
 *   Arco D: Q104,42 — máx x≈83 em y=42.
 *   Corte diagonal inferior-esquerdo: (62,72)→(48,63) com mesmo ângulo do
 *   braço inferior do chevron (slope ≈ 0.61 por unidade horizontal).
 *   Buraco interno: M62,35 Q90,42 62,50 Z — parede lateral ~7 unidades.
 *   fill-rule="evenodd" para o furo.
 */
function XPostIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <defs>
        {/* Fundo do ícone: radial escuro com leve iluminação central */}
        <radialGradient id="la-bg" cx="50%" cy="42%" r="62%">
          <stop offset="0%"   stopColor="#191919" />
          <stop offset="100%" stopColor="#0b0b0b" />
        </radialGradient>

        {/* Gradiente do chevron: azul claro topo → azul profundo base */}
        <linearGradient id="la-cg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#6b99ff" />
          <stop offset="100%" stopColor="#3b5bdb" />
        </linearGradient>
      </defs>

      {/* Fundo arredondado */}
      <rect width="100" height="100" rx="22" fill="url(#la-bg)" />

      {/* ── Chevron ">" ─────────────────────────────────────────── */}
      {/* Braço superior: horizontal (16,28)→(36,28) + diagonal →(52,50)   */}
      {/* Braço inferior: diagonal (52,50)→(36,72) + horizontal →(16,72)   */}
      {/* Recesso interno em (39,50)                                        */}
      <polygon
        points="16,28 36,28 52,50 36,72 16,72 16,60 39,50 16,40"
        fill="url(#la-cg)"
        style={{ animation: "la-x-in 0.44s cubic-bezier(0.22,1,0.36,1) 0.46s both" }}
      />

      {/* ── P branco ─────────────────────────────────────────────── */}
      {/* Outer: haste (48,28)→(62,28), arco D Q104,42→(62,56),             */}
      {/*        descida (62,72), corte diagonal →(48,63), close vertical.  */}
      {/* Hole:  (62,35) arco Q90,42 →(62,50), close linha reta.           */}
      <path
        fillRule="evenodd"
        fill="white"
        d="M48,28 L62,28 Q104,42 62,56 L62,72 L48,63 Z
           M62,35 Q90,42 62,50 Z"
        style={{ animation: "la-p-in 0.44s cubic-bezier(0.22,1,0.36,1) 0.62s both" }}
      />
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
        /* ── overlay ── */
        @keyframes la-bg-in  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes la-bg-out { from { opacity: 1 } to { opacity: 0 } }

        /* ── ícone: nasce de um ponto com spring ── */
        @keyframes la-icon-in {
          0%   { transform: scale(0.04); opacity: 0 }
          28%  { opacity: 1 }
          100% { transform: scale(1);    opacity: 1 }
        }
        @keyframes la-icon-out {
          to   { transform: scale(0.88); opacity: 0 }
        }

        /* ── peças internas ── */
        @keyframes la-x-in {
          from { opacity: 0; transform: translateX(-26px) }
          to   { opacity: 1; transform: translateX(0) }
        }
        @keyframes la-p-in {
          from { opacity: 0; transform: translateX(20px) }
          to   { opacity: 1; transform: translateX(0) }
        }

        /* ── glow de fundo ── */
        @keyframes la-glow-breathe {
          0%, 100% { opacity: 0.42; transform: scale(0.92) }
          50%      { opacity: 0.95; transform: scale(1.08) }
        }
      `}</style>

      {/* Overlay escuro */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#060606",
          animation: out
            ? "la-bg-out 0.36s ease-out forwards"
            : "la-bg-in 0.15s ease-out forwards",
        }}
      >
        {/* Glow radial atrás do ícone */}
        <div
          style={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(76,110,245,0.2) 0%, rgba(59,91,219,0.07) 54%, transparent 72%)",
            pointerEvents: "none",
            animation: "la-glow-breathe 3s 1.1s ease-in-out infinite",
          }}
        />

        {/* Ícone — spring de ponto até tamanho real */}
        <div
          style={{
            width: 148,
            height: 148,
            borderRadius: 34,
            overflow: "hidden",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.06), " +
              "0 24px 64px rgba(0,0,0,0.9), " +
              "0 0 100px rgba(76,110,245,0.1)",
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
