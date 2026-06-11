import { NextRequest, NextResponse } from "next/server";
import { geminiVision } from "@/lib/gemini-text";

export const maxDuration = 15;

// Returns the recommended backgroundPosition.y (0-100) for a 4:5 slide
// so the main subject stays in the safe zone above the text overlay (top 62% of slide).
export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) return NextResponse.json({ backgroundPositionY: 25 });

    let base64: string;
    let mime: string;

    if (imageUrl.startsWith("data:")) {
      const [header, data] = imageUrl.split(",");
      base64 = data;
      mime = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
    } else {
      const res = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return NextResponse.json({ backgroundPositionY: 25 });
      const buf = await res.arrayBuffer();
      base64 = Buffer.from(buf).toString("base64");
      mime = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
    }

    const raw = await geminiVision(
      `This portrait photo will be used as a background in a vertical 4:5 Instagram slide. The slide has a dark text overlay covering the BOTTOM 40% of the slide. Where is the main subject's face/head center, as a vertical percentage from the top of the image (0=top, 100=bottom)? Return ONLY a single integer between 0 and 100. If no face, return 30.`,
      base64,
      mime,
      { maxTokens: 10, temperature: 0.1 }
    );

    const faceY = Math.max(0, Math.min(100, parseInt(raw.replace(/\D/g, ""), 10) || 30));

    // Compute optimal CSS object-position Y:
    // We want the face to appear at ~35% of the slide height.
    // For same-ratio (4:5) images, the adjustment range is small (~58px at zoom=110%).
    // For landscape images the range is larger and this matters more.
    // Target: faceY% of image → 35% of slide.
    // Heuristic table tuned empirically:
    let backgroundPositionY: number;
    if (faceY <= 25) backgroundPositionY = 10;       // face at top → show top
    else if (faceY <= 40) backgroundPositionY = 20;  // face upper-center
    else if (faceY <= 55) backgroundPositionY = 30;  // face center → slight upper bias
    else if (faceY <= 70) backgroundPositionY = 15;  // face lower-center → show top to rescue
    else backgroundPositionY = 10;                   // face at bottom → show top as best effort

    return NextResponse.json({ backgroundPositionY, faceY });
  } catch {
    return NextResponse.json({ backgroundPositionY: 25 });
  }
}
