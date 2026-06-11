import { Slide } from "@/types";
import { renderSlide } from "./render-slide";

export type VideoProgress = (pct: number, label: string) => void;

export async function createSlideVideo(
  slides: Slide[],
  audioPreviewUrl: string,
  secondsPerSlide = 4,
  onProgress?: VideoProgress
): Promise<Blob> {
  const W = 1080;
  const H = 1920; // 9:16 para Stories

  onProgress?.(5, "Carregando áudio...");

  // Proxy Deezer (CORS)
  const audioRes = await fetch(`/api/audio-proxy?url=${encodeURIComponent(audioPreviewUrl)}`);
  if (!audioRes.ok) throw new Error("Falha ao carregar áudio");
  const rawAudio = await audioRes.arrayBuffer();

  onProgress?.(15, "Decodificando áudio...");
  const audioCtx = new AudioContext();
  const decoded = await audioCtx.decodeAudioData(rawAudio);

  // Limita a duração: preview tem 30s, mas limita ao total de slides
  const maxDuration = Math.min(decoded.duration, slides.length * secondsPerSlide);
  const realSecsPerSlide = maxDuration / slides.length;

  onProgress?.(20, "Renderizando slides...");
  const rendered = await Promise.all(slides.map((s) => renderSlide(s)));

  onProgress?.(40, "Preparando vídeo...");

  // Canvas do vídeo
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Roteamento de áudio
  const dest = audioCtx.createMediaStreamDestination();
  const source = audioCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(dest);

  // Stream combinado vídeo + áudio
  const videoStream = canvas.captureStream(30);
  const combined = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  // Escolhe mimeType suportado
  const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(
    (m) => MediaRecorder.isTypeSupported(m)
  ) ?? "video/webm";

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 5_000_000 });
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = (e) => reject(new Error("Erro ao gravar vídeo"));

    const totalMs = maxDuration * 1000;
    let startTime: number | null = null;

    const drawFrame = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;

      if (elapsed >= totalMs) {
        recorder.stop();
        source.stop();
        audioCtx.close();
        return;
      }

      const slideIdx = Math.min(Math.floor(elapsed / (realSecsPerSlide * 1000)), slides.length - 1);
      const slideCanvas = rendered[slideIdx];

      // Fundo preto
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);

      // Centraliza o slide mantendo proporção dentro do 9:16
      const scale = Math.min(W / slideCanvas.width, H / slideCanvas.height);
      const sw = slideCanvas.width * scale;
      const sh = slideCanvas.height * scale;
      ctx.drawImage(slideCanvas, (W - sw) / 2, (H - sh) / 2, sw, sh);

      const pct = 40 + Math.round((elapsed / totalMs) * 55);
      onProgress?.(pct, `Gerando vídeo... ${Math.round(elapsed / 1000)}s / ${Math.round(totalMs / 1000)}s`);

      requestAnimationFrame(drawFrame);
    };

    // Inicia
    source.start(0);
    audioCtx.resume();
    recorder.start(100); // chunk a cada 100ms
    requestAnimationFrame(drawFrame);
  });
}
