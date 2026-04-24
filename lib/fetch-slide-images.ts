import { GeneratedSlide } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SlideImage {
  url: string;
  autor: string;
  fonte: string;
  licenca: string;
}

export interface EnrichedSlide {
  slide: number;
  titulo: string;
  texto: string;
  imagem: SlideImage | null;
}

// ─── Wikimedia Commons ────────────────────────────────────────────────────────

const FREE_LICENSE_PATTERNS = [
  "cc by", "cc0", "public domain", "pd ", "pd-", "attribution",
];

function isFreeWikimediaLicense(license: string): boolean {
  const l = license.toLowerCase();
  return FREE_LICENSE_PATTERNS.some((p) => l.includes(p));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

async function fetchFromWikimedia(
  query: string,
  usedUrls: Set<string>
): Promise<SlideImage | null> {
  try {
    const searchUrl =
      `https://commons.wikimedia.org/w/api.php?` +
      new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: query,
        srnamespace: "6",
        srlimit: "15",
        format: "json",
      });

    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(6000),
    });
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const hits: Array<{ title: string }> = searchData.query?.search ?? [];

    const imageHits = hits.filter((h) =>
      /\.(jpe?g|png|gif|webp)$/i.test(h.title)
    );
    if (imageHits.length === 0) return null;

    const titles = imageHits
      .slice(0, 5)
      .map((h) => h.title)
      .join("|");

    const infoUrl =
      `https://commons.wikimedia.org/w/api.php?` +
      new URLSearchParams({
        action: "query",
        titles,
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        format: "json",
      });

    const infoRes = await fetch(infoUrl, {
      signal: AbortSignal.timeout(6000),
    });
    if (!infoRes.ok) return null;

    const infoData = await infoRes.json();
    const pages: Record<string, any> = infoData.query?.pages ?? {};

    for (const page of Object.values(pages)) {
      const imageinfo = page?.imageinfo?.[0];
      if (!imageinfo?.url) continue;
      if (usedUrls.has(imageinfo.url)) continue;

      const meta = imageinfo.extmetadata ?? {};
      const license =
        meta.LicenseShortName?.value ?? meta.License?.value ?? "";

      if (!isFreeWikimediaLicense(license)) continue;

      const rawArtist = meta.Artist?.value ?? "";
      const autor = rawArtist ? stripHtml(rawArtist) : "Wikimedia Commons";

      return {
        url: imageinfo.url,
        autor: autor || "Wikimedia Commons",
        fonte: "Wikimedia Commons",
        licenca: license || "Licença livre",
      };
    }
  } catch {
    // timeout ou erro de rede — tenta próxima fonte
  }
  return null;
}

// ─── Pexels ───────────────────────────────────────────────────────────────────

async function fetchFromPexels(
  query: string,
  usedUrls: Set<string>
): Promise<SlideImage | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?` +
        new URLSearchParams({
          query,
          per_page: "10",
          orientation: "portrait",
        }),
      {
        headers: { Authorization: key },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const photos: any[] = data.photos ?? [];

    for (const photo of photos) {
      const url =
        photo.src?.large2x ??
        photo.src?.large ??
        photo.src?.medium ??
        photo.src?.original;
      if (!url || usedUrls.has(url)) continue;

      return {
        url,
        autor: photo.photographer ?? "Pexels",
        fonte: "Pexels",
        licenca: "Pexels License (uso gratuito)",
      };
    }
  } catch {
    // timeout ou erro de rede
  }
  return null;
}

// ─── Unsplash ─────────────────────────────────────────────────────────────────

async function fetchFromUnsplash(
  query: string,
  usedUrls: Set<string>
): Promise<SlideImage | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?` +
        new URLSearchParams({
          query,
          per_page: "10",
          orientation: "portrait",
        }),
      {
        headers: { Authorization: `Client-ID ${key}` },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const results: any[] = data.results ?? [];

    for (const img of results) {
      const url = img.urls?.regular ?? img.urls?.full;
      if (!url || usedUrls.has(url)) continue;

      return {
        url,
        autor: img.user?.name ?? "Unsplash",
        fonte: "Unsplash",
        licenca: "Unsplash License (uso gratuito)",
      };
    }
  } catch {
    // timeout ou erro de rede
  }
  return null;
}

// ─── Orquestração ─────────────────────────────────────────────────────────────

/**
 * Busca uma imagem para a query: Wikimedia Commons → Pexels → Unsplash.
 * usedUrls evita retornar a mesma URL duas vezes no mesmo carrossel.
 */
export async function fetchImages(
  query: string,
  usedUrls: Set<string>
): Promise<SlideImage | null> {
  const wikimedia = await fetchFromWikimedia(query, usedUrls);
  if (wikimedia) return wikimedia;

  const pexels = await fetchFromPexels(query, usedUrls);
  if (pexels) return pexels;

  return fetchFromUnsplash(query, usedUrls);
}

/**
 * Enriquece slides gerados pela IA com imagens reais buscadas via API.
 * Buscas rodam em paralelo; URLs duplicadas são removidas no pós-processamento.
 */
export async function enrichSlidesWithImages(
  slides: GeneratedSlide[]
): Promise<EnrichedSlide[]> {
  const results = await Promise.all(
    slides.map(async (slide, i) => {
      const query = slide.searchQuery?.trim() || slide.title;
      const imagem = await fetchImages(query, new Set());
      return {
        slide: i + 1,
        titulo: slide.title,
        texto: slide.body,
        imagem,
      };
    })
  );

  // Remove URLs repetidas entre slides
  const seenUrls = new Set<string>();
  return results.map((r) => {
    if (!r.imagem) return r;
    if (seenUrls.has(r.imagem.url)) return { ...r, imagem: null };
    seenUrls.add(r.imagem.url);
    return r;
  });
}
