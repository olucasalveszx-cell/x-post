"use client";

import { useEffect, useState } from "react";

interface Props {
  onComplete: () => void;
}

export default function LoginAnimation({ onComplete }: Props) {
  const [out, setOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), 2100);
    const t2 = setTimeout(() => onComplete(), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <>
      <style>{`
        @keyframes la-bg-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes la-bg-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes la-glow-in {
          from { opacity: 0; transform: scale(0.4); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes la-glow-pulse {
          0%,100% { opacity: 0.55; transform: scale(1); }
          50%     { opacity: 1;    transform: scale(1.08); }
        }
        @keyframes la-container-in {
          from { opacity: 0; transform: scale(0.86); }
          to   { opacity: 1; transform: scale(1.0); }
        }
        @keyframes la-zoom {
          from { transform: scale(1); }
          to   { transform: scale(1.05); }
        }
        @keyframes la-left-in {
          from { opacity: 0; transform: translateX(-22px); filter: blur(5px); }
          to   { opacity: 1; transform: translateX(0);     filter: blur(0); }
        }
        @keyframes la-right-in {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Overlay */}
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
            ? "la-bg-out 0.4s ease-out forwards"
            : "la-bg-in 0.35s ease-out forwards",
        }}
      >
        {/* Glow radial */}
        <div style={{
          position: "absolute",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(76,110,245,0.18) 0%, transparent 68%)",
          animation: "la-glow-in 0.55s 0.15s ease-out both, la-glow-pulse 1.6s 1.3s ease-in-out infinite",
          pointerEvents: "none",
        }} />

        {/* Rounded square container */}
        <div style={{
          position: "relative",
          width: 148,
          height: 148,
          borderRadius: 34,
          background: "linear-gradient(145deg, #141414, #0e0e0e)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 24px 64px rgba(0,0,0,0.9), 0 0 60px rgba(76,110,245,0.07)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "la-container-in 0.5s 0.2s ease-out both, la-zoom 2s 0.7s ease-out both",
        }}>

          {/* Parte esquerda do logo — desliza da esquerda com motion blur */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tema_black.png"
            alt=""
            style={{
              position: "absolute",
              width: "72%",
              height: "72%",
              objectFit: "contain",
              clipPath: "polygon(0 0, 49% 0, 49% 100%, 0 100%)",
              animation: "la-left-in 0.52s 0.55s ease-out both",
            }}
          />

          {/* Parte direita do logo — aparece com scale + fade */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tema_black.png"
            alt=""
            style={{
              position: "absolute",
              width: "72%",
              height: "72%",
              objectFit: "contain",
              clipPath: "polygon(49% 0, 100% 0, 100% 100%, 49% 100%)",
              animation: "la-right-in 0.52s 0.85s ease-out both",
            }}
          />
        </div>
      </div>
    </>
  );
}
