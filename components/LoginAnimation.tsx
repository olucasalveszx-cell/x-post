"use client";

import { useEffect, useRef } from "react";

interface Props {
  onComplete: () => void;
}

export default function LoginAnimation({ onComplete }: Props) {
  const sceneRef   = useRef<HTMLDivElement>(null);
  const glowRef    = useRef<HTMLDivElement>(null);
  const flashRef   = useRef<HTMLDivElement>(null);
  const ringRef    = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cardRef    = useRef<HTMLDivElement>(null);
  const backRef    = useRef<HTMLDivElement>(null);
  const imgRef     = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const FLY     = 1900;
    const launch  = 150;
    const landT   = launch + Math.round(FLY * 0.70);
    const revealT = landT   + 220;
    const floatT  = revealT + 650;
    const outT    = floatT  + 1300;
    const doneT   = outT    + 750;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const t = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    // card launches
    t(launch, () => {
      if (!wrapperRef.current || !cardRef.current) return;
      wrapperRef.current.style.animation = `lca-path ${FLY}ms cubic-bezier(0.12,0.92,0.36,1) forwards`;
      cardRef.current.style.animation    = `lca-spin  ${FLY}ms cubic-bezier(0.12,0.92,0.36,1) forwards`;
    });

    // landing impact
    t(landT, () => {
      if (!ringRef.current || !flashRef.current || !glowRef.current) return;
      ringRef.current.style.animation  = "lca-ring  0.65s ease-out forwards";
      flashRef.current.style.animation = "lca-flash 0.25s ease-out forwards";
      glowRef.current.style.opacity    = "1";
      glowRef.current.style.transform  = "scale(1)";
    });

    // logo reveals
    t(revealT, () => {
      if (!backRef.current || !imgRef.current) return;
      backRef.current.style.transition = "opacity 0.35s ease";
      backRef.current.style.opacity    = "0";
      imgRef.current.style.animation   = "lca-logo-in 0.8s cubic-bezier(0.22,1,0.36,1) forwards";
    });

    // card floats + glow breathes
    t(floatT, () => {
      if (!cardRef.current || !glowRef.current) return;
      cardRef.current.style.animation = "lca-float      3.4s ease-in-out infinite";
      glowRef.current.style.animation = "lca-glow-pulse 3.4s ease-in-out infinite";
    });

    // app opens — card zooms to fill screen
    t(outT, () => {
      if (!wrapperRef.current || !cardRef.current || !glowRef.current) return;
      cardRef.current.style.animation    = "none";
      glowRef.current.style.animation    = "none";
      glowRef.current.style.opacity      = "0";
      wrapperRef.current.style.animation = "lca-open 0.65s cubic-bezier(0.4,0,1,1) forwards";
    });

    t(outT + 420, () => {
      if (!sceneRef.current) return;
      sceneRef.current.style.animation = "lca-fade-out 0.35s ease-out forwards";
    });

    t(doneT, onComplete);

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <>
      <style>{`
        @keyframes lca-fade-in  { from{opacity:0} to{opacity:1} }
        @keyframes lca-fade-out { from{opacity:1} to{opacity:0} }

        @keyframes lca-path {
          0%   { transform: translate(-420px,340px) scale(0.08); opacity:0; }
          4%   { opacity:1; }
          32%  { transform: translate(-100px,-65px) scale(0.50); }
          70%  { transform: translate(0px,0px) scale(1.07); }
          79%  { transform: translate(0px,13px) scale(1.0); }
          90%  { transform: translate(0px,-7px) scale(0.97); }
          96%  { transform: translate(0px,3px) scale(1.0); }
          100% { transform: translate(0px,0px) scale(1.0); opacity:1; }
        }

        @keyframes lca-spin {
          0%   { transform: rotateZ(-270deg) rotateY(70deg); filter: blur(10px) brightness(0.7); }
          28%  { filter: blur(5px) brightness(0.9); }
          60%  { transform: rotateZ(-14deg) rotateY(10deg); filter: blur(1px) brightness(1); }
          72%  { transform: rotateZ(0deg) rotateY(0deg); filter: blur(0) brightness(1); }
          100% { transform: rotateZ(0deg) rotateY(0deg); }
        }

        @keyframes lca-logo-in {
          0%   { opacity:0; transform:scale(0.82); filter:blur(8px); }
          55%  { opacity:1; }
          100% { opacity:1; transform:scale(1);   filter:blur(0); }
        }

        @keyframes lca-float {
          0%,100% { transform:translateY(0px) scale(1); }
          50%     { transform:translateY(-9px) scale(1.02); }
        }

        @keyframes lca-ring  {
          0%   { transform:scale(1);   opacity:0.7; }
          100% { transform:scale(2.6); opacity:0; }
        }
        @keyframes lca-flash { 0%{opacity:0.22} 100%{opacity:0} }

        @keyframes lca-glow-pulse {
          0%,100% { opacity:0.75; transform:scale(0.94); }
          50%     { opacity:1.0;  transform:scale(1.08); }
        }

        @keyframes lca-open {
          0%   { transform:translate(0,0) scale(1);  opacity:1; }
          100% { transform:translate(0,0) scale(20); opacity:0; }
        }
      `}</style>

      <div
        ref={sceneRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#060608",
          overflow: "hidden",
          animation: "lca-fade-in 0.2s ease-out both",
        }}
      >
        {/* ambient glow */}
        <div
          ref={glowRef}
          style={{
            position: "absolute",
            width: 460,
            height: 460,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(37,99,255,0.30) 0%, rgba(138,63,252,0.15) 50%, transparent 70%)",
            opacity: 0,
            transform: "scale(0.4)",
            pointerEvents: "none",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        />

        {/* white flash on impact */}
        <div
          ref={flashRef}
          style={{
            position: "absolute",
            inset: 0,
            background: "#fff",
            opacity: 0,
            pointerEvents: "none",
          }}
        />

        {/* impact ring */}
        <div
          ref={ringRef}
          style={{
            position: "absolute",
            width: 148,
            height: 148,
            borderRadius: "50%",
            border: "1.5px solid rgba(255,255,255,0.6)",
            opacity: 0,
            pointerEvents: "none",
          }}
        />

        {/* card wrapper — handles arc path + scale */}
        <div
          ref={wrapperRef}
          style={{
            position: "absolute",
            width: 148,
            height: 148,
            perspective: "900px",
            transform: "translate(-420px,340px) scale(0.08)",
            opacity: 0,
          }}
        >
          {/* card — handles spin + blur */}
          <div
            ref={cardRef}
            style={{
              position: "relative",
              width: 148,
              height: 148,
              borderRadius: 34,
              overflow: "hidden",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.07), " +
                "0 28px 72px rgba(0,0,0,0.98), " +
                "0 0 110px rgba(37,99,255,0.16)",
            }}
          >
            {/* card back — visible during flight */}
            <div
              ref={backRef}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 34,
                background: "radial-gradient(circle at 50% 40%, #1a1a22, #0b0b0f)",
              }}
            >
              <svg
                width="148"
                height="148"
                style={{ position: "absolute", inset: 0 }}
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern
                    id="lca-pat"
                    x="0" y="0"
                    width="14" height="14"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M7 0 L14 7 L7 14 L0 7 Z"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="0.8"
                    />
                  </pattern>
                </defs>
                <rect width="148" height="148" fill="url(#lca-pat)" />
              </svg>
            </div>

            {/* logo image — revealed after landing */}
            <img
              ref={imgRef}
              src="/animation.png"
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0,
                borderRadius: 34,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
