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
          background: "linear-gradient(135deg, #0f0f1a 0%, #1a1033 50%, #0f1a2e 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow top-right */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 700,
            height: 700,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 65%)",
            display: "flex",
          }}
        />
        {/* Glow bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: -150,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 65%)",
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
                background: `rgba(255,255,255,${0.04 + i * 0.04})`,
                border: "1px solid rgba(255,255,255,0.12)",
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
                  background: `linear-gradient(135deg, rgba(124,58,237,${0.3 + i * 0.15}), rgba(236,72,153,${0.2 + i * 0.1}))`,
                  display: "flex",
                }}
              />
              <div
                style={{
                  width: "80%",
                  height: 10,
                  borderRadius: 5,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                }}
              />
              <div
                style={{
                  width: "60%",
                  height: 8,
                  borderRadius: 5,
                  background: "rgba(255,255,255,0.12)",
                  display: "flex",
                }}
              />
              <div
                style={{
                  width: "70%",
                  height: 8,
                  borderRadius: 5,
                  background: "rgba(255,255,255,0.12)",
                  display: "flex",
                }}
              />
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
            paddingRight: 400,
            zIndex: 1,
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              background: "linear-gradient(135deg, #7c3aed, #ec4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 40px rgba(124,58,237,0.6)",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 2 L18.2 13 L29 16 L18.2 19 L16 30 L13.8 19 L3 16 L13.8 13 Z"
                fill="white"
              />
            </svg>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 86,
              fontWeight: 900,
              color: "white",
              letterSpacing: -3,
              lineHeight: 1,
              display: "flex",
            }}
          >
            XPost
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 30,
              color: "rgba(255,255,255,0.65)",
              fontWeight: 400,
              lineHeight: 1.4,
              maxWidth: 520,
              display: "flex",
            }}
          >
            Criador de Carrosséis para Instagram com Inteligência Artificial
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {["Instagram", "Twitter / X", "IA Generativa"].map((tag) => (
              <div
                key={tag}
                style={{
                  padding: "10px 22px",
                  borderRadius: 100,
                  background: "rgba(124,58,237,0.2)",
                  border: "1px solid rgba(124,58,237,0.45)",
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
