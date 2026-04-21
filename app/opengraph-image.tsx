import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const alt = "XPost — Criador de Carrosséis para Instagram com IA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Logo como base64
  const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public/tema_black.png"));
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  // Bebas Neue via Google Fonts
  let bebasFont: ArrayBuffer | null = null;
  try {
    const cssResp = await fetch(
      "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }
    );
    const css = await cssResp.text();
    const fontUrl = css.match(/url\(([^)]+)\)/)?.[1];
    if (fontUrl) {
      bebasFont = await fetch(fontUrl).then((r) => r.arrayBuffer());
    }
  } catch {
    // fallback: usa fonte padrão
  }

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

        {/* Slide mockups (decorativo) */}
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

        {/* Conteúdo principal */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 24,
            paddingLeft: 100,
            paddingRight: 420,
            zIndex: 1,
          }}
        >
          {/* Logo + nome lado a lado */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Logo image */}
            <img
              src={logoSrc}
              width={96}
              height={96}
              style={{ borderRadius: 22, display: "flex" }}
            />
            {/* Nome XPost em Bebas Neue */}
            <div
              style={{
                fontSize: 100,
                fontWeight: 400,
                color: "white",
                letterSpacing: 2,
                lineHeight: 1,
                display: "flex",
                fontFamily: bebasFont ? "Bebas Neue" : "sans-serif",
              }}
            >
              XPost
            </div>
          </div>

          {/* Subtítulo */}
          <div
            style={{
              fontSize: 30,
              color: "rgba(255,255,255,0.6)",
              fontWeight: 400,
              lineHeight: 1.4,
              maxWidth: 520,
              display: "flex",
            }}
          >
            Chega de perder horas criando conteúdo
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: 12 }}>
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
    {
      ...size,
      fonts: bebasFont
        ? [{ name: "Bebas Neue", data: bebasFont, style: "normal", weight: 400 }]
        : [],
    }
  );
}
