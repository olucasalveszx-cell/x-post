import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "XPost — Criador de Carrosséis para Instagram com IA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #060606 0%, #0a0e2a 50%, #060606 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow top-left */}
        <div
          style={{
            position: "absolute",
            top: -150,
            left: -100,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,91,219,0.28) 0%, transparent 65%)",
            display: "flex",
          }}
        />
        {/* Glow bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: -150,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(76,110,245,0.18) 0%, transparent 65%)",
            display: "flex",
          }}
        />

        {/* Slide mockups (decorative) */}
        <div
          style={{
            position: "absolute",
            right: 80,
            top: "50%",
            display: "flex",
            gap: 16,
            transform: "translateY(-50%) rotate(8deg)",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 140,
                height: 175,
                borderRadius: 16,
                background: `rgba(255,255,255,${0.03 + i * 0.03})`,
                border: "1px solid rgba(76,110,245,0.2)",
                display: "flex",
                flexDirection: "column",
                padding: 16,
                gap: 10,
                marginTop: i * 20,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 70,
                  borderRadius: 8,
                  background: `linear-gradient(135deg, rgba(59,91,219,${0.4 + i * 0.15}), rgba(76,110,245,${0.25 + i * 0.1}))`,
                  display: "flex",
                }}
              />
              <div style={{ width: "80%", height: 10, borderRadius: 5, background: "rgba(255,255,255,0.2)", display: "flex" }} />
              <div style={{ width: "60%", height: 8, borderRadius: 5, background: "rgba(255,255,255,0.12)", display: "flex" }} />
              <div style={{ width: "70%", height: 8, borderRadius: 5, background: "rgba(255,255,255,0.12)", display: "flex" }} />
            </div>
          ))}
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 20,
            paddingLeft: 100,
            paddingRight: 420,
            zIndex: 1,
          }}
        >
          {/* Logo box */}
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              background: "linear-gradient(135deg, #3b5bdb, #4c6ef5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 40px rgba(59,91,219,0.55)",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2 L18.2 13 L29 16 L18.2 19 L16 30 L13.8 19 L3 16 L13.8 13 Z" fill="white" />
            </svg>
          </div>

          {/* Title */}
          <div style={{ fontSize: 86, fontWeight: 900, color: "white", letterSpacing: -3, lineHeight: 1, display: "flex" }}>
            XPost
          </div>

          {/* Subtitle */}
          <div style={{ fontSize: 28, color: "rgba(255,255,255,0.6)", fontWeight: 400, lineHeight: 1.4, maxWidth: 500, display: "flex" }}>
            Chega de perder horas criando conteúdo
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {["Instagram", "Twitter / X", "IA Generativa"].map((tag) => (
              <div
                key={tag}
                style={{
                  padding: "10px 22px",
                  borderRadius: 100,
                  background: "rgba(59,91,219,0.2)",
                  border: "1px solid rgba(76,110,245,0.4)",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 20,
                  fontWeight: 500,
                  display: "flex",
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
