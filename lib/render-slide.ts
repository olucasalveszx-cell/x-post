import { Slide, SlideElement } from "@/types";

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

type Run = { text: string; color?: string };

function parseRuns(html: string): Run[] {
  const runs: Run[] = [];
  const parts = html.split(/(<span[^>]*>[\s\S]*?<\/span>)/gi);
  for (const part of parts) {
    const m = part.match(/<span[^>]*style="[^"]*color:\s*([^;"]+)[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    if (m) {
      runs.push({ text: m[2], color: m[1].trim() });
    } else {
      const text = part.replace(/<[^>]+>/g, "");
      if (text) runs.push({ text });
    }
  }
  return runs;
}

function applyGradientOverlay(ctx: CanvasRenderingContext2D, css: string, W: number, H: number) {
  try {
    let x0 = 0, y0 = H, x1 = 0, y1 = 0;
    if (/to bottom/.test(css))    { x0 = 0; y0 = 0; x1 = 0; y1 = H; }
    else if (/to right/.test(css)) { x0 = 0; y0 = 0; x1 = W; y1 = 0; }
    else if (/135deg/.test(css))   { x0 = 0; y0 = 0; x1 = W; y1 = H; }

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    const re = /(rgba?\([^)]+\)|#[\da-f]+)\s+([\d.]+)%/gi;
    let m: RegExpExecArray | null;
    let has = false;
    while ((m = re.exec(css)) !== null) {
      grad.addColorStop(parseFloat(m[2]) / 100, m[1]);
      has = true;
    }
    if (has) { ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H); }
  } catch {}
}

function drawTextEl(ctx: CanvasRenderingContext2D, el: SlideElement) {
  const s = el.style as any;
  const fontSize: number = s?.fontSize ?? 20;
  const fontWeight: string = s?.fontWeight ?? "normal";
  const fontFamily: string = s?.fontFamily ?? "sans-serif";
  const defaultColor: string = s?.color ?? "#ffffff";
  const textAlign: CanvasTextAlign = (s?.textAlign ?? "left") as CanvasTextAlign;
  const lineHeight: number = fontSize * (s?.lineHeight ?? 1.4);
  const pad = 4;
  const maxW = el.width - pad * 2;

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = "top";

  const runs = parseRuns(el.content ?? "");

  type Word = { text: string; color: string };
  const tokens: (Word | "newline")[] = [];
  for (const run of runs) {
    const parts = run.text.split(/(\n)/);
    for (const part of parts) {
      if (part === "\n") { tokens.push("newline"); continue; }
      const words = part.split(/(\s+)/);
      for (const w of words) {
        if (w) tokens.push({ text: w, color: run.color ?? defaultColor });
      }
    }
  }

  type Line = { segs: Word[]; width: number };
  const lines: Line[] = [];
  let segs: Word[] = [];
  let lineW = 0;

  const flush = () => { if (segs.length) { lines.push({ segs: [...segs], width: lineW }); segs = []; lineW = 0; } };

  for (const tok of tokens) {
    if (tok === "newline") { flush(); continue; }
    const isSpace = /^\s+$/.test(tok.text);
    const w = ctx.measureText(tok.text).width;
    if (lineW + w > maxW && lineW > 0 && !isSpace) flush();
    if (!isSpace || lineW > 0) { segs.push(tok); lineW += w; }
  }
  flush();

  let y = el.y + pad;
  for (const line of lines) {
    if (y > el.y + el.height) break;
    let x = el.x + pad;
    if (textAlign === "center") x = el.x + el.width / 2 - line.width / 2;
    if (textAlign === "right")  x = el.x + el.width - pad - line.width;
    for (const seg of line.segs) {
      ctx.fillStyle = seg.color;
      ctx.fillText(seg.text, x, y);
      x += ctx.measureText(seg.text).width;
    }
    y += lineHeight;
  }
}

export async function renderSlide(slide: Slide): Promise<HTMLCanvasElement> {
  const W = slide.width;
  const H = slide.height;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = slide.backgroundColor ?? "#000000";
  ctx.fillRect(0, 0, W, H);

  if (slide.backgroundImageUrl) {
    try {
      const img = await loadImg(slide.backgroundImageUrl);
      const scale = Math.max(W / img.width, H / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      ctx.globalAlpha = slide.backgroundOpacity ?? 1;
      ctx.drawImage(img, (W - sw) / 2, 0, sw, sh);
      ctx.globalAlpha = 1;
    } catch {}
    const gradCss = slide.backgroundGradient
      ?? "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.15) 100%)";
    applyGradientOverlay(ctx, gradCss, W, H);
  }

  for (const el of slide.elements) {
    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1;
    if (el.type === "text") {
      drawTextEl(ctx, el);
    } else if (el.type === "image" && el.src) {
      try {
        const img = await loadImg(el.src);
        const objPosY = (el as any).imageObjectPositionY ?? 50;
        const imgAspect = img.width / img.height;
        const destAspect = el.width / el.height;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgAspect > destAspect) {
          sw = img.height * destAspect;
          sx = (img.width - sw) * 0.5;
        } else {
          sh = img.width / destAspect;
          sy = (img.height - sh) * (objPosY / 100);
        }
        ctx.drawImage(img, sx, sy, sw, sh, el.x, el.y, el.width, el.height);
      } catch {}
    } else if (el.type === "shape") {
      const s = el.style as any;
      ctx.fillStyle = s?.fill ?? "#4c6ef5";
      ctx.fillRect(el.x, el.y, el.width, el.height);
    } else if (el.type === "profile") {
      const avatarD = el.height * 0.72;
      const avatarR = avatarD / 2;
      const gapX = el.height * 0.18;
      const ax = el.x + avatarR;
      const ay = el.y + el.height / 2;

      // Avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax, ay, avatarR, 0, Math.PI * 2);
      ctx.fillStyle = "#333";
      ctx.fill();
      ctx.clip();
      if (el.src) {
        try {
          const img = await loadImg(el.src);
          ctx.drawImage(img, el.x, el.y + (el.height - avatarD) / 2, avatarD, avatarD);
        } catch {}
      }
      ctx.restore();

      // Borda do avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax, ay, avatarR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = el.height * 0.025;
      ctx.stroke();
      ctx.restore();

      // Nome
      const textX = el.x + avatarD + gapX;
      const nameSize = el.height * 0.28;
      const handleSize = el.height * 0.22;
      ctx.save();
      ctx.font = `bold ${nameSize}px sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      const nameY = ay - nameSize * 0.4;
      ctx.fillText(el.profileName ?? "", textX, nameY);

      // Verificado
      if (el.profileVerified) {
        const nameW = ctx.measureText(el.profileName ?? "").width;
        const bSize = nameSize * 0.9;
        const bx = textX + nameW + bSize * 0.3;
        const by = nameY - bSize / 2;
        ctx.beginPath();
        ctx.arc(bx + bSize / 2, by + bSize / 2, bSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = "#1d9bf0";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = bSize * 0.15;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(bx + bSize * 0.25, by + bSize * 0.5);
        ctx.lineTo(bx + bSize * 0.45, by + bSize * 0.7);
        ctx.lineTo(bx + bSize * 0.75, by + bSize * 0.3);
        ctx.stroke();
      }

      // Handle
      ctx.font = `${handleSize}px sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(`@${el.profileHandle ?? ""}`, textX, ay + nameSize * 0.55);
      ctx.restore();
    }
    ctx.restore();
  }

  return canvas;
}
