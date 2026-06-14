import { v4 as uuid } from "uuid";
import { supabaseAdmin } from "./supabase";

export type NewsCategory =
  | "geral" | "tecnologia" | "inteligencia_artificial" | "negocios"
  | "marketing" | "vendas" | "financas" | "investimentos" | "criptomoedas"
  | "startups" | "esportes" | "futebol" | "musica" | "entretenimento"
  | "saude" | "politica" | "mundo" | "brasil" | "educacao" | "desenvolvimento_pessoal";

export interface NewsItem {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  source: string;
  source_url: string;
  image_url: string | null;
  category: string;
  keywords: string[];
  published_at: string | null;
  created_at: string;
  viral_score: number;
  viral_label: string;
}

export interface TrendingTopic {
  id: string;
  title: string;
  category: string;
  source: string;
  growth_score: number;
  engagement_score: number;
  created_at: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  geral:                   "Geral",
  tecnologia:              "Tecnologia",
  inteligencia_artificial: "Inteligência Artificial",
  negocios:                "Negócios",
  marketing:               "Marketing",
  vendas:                  "Vendas",
  financas:                "Finanças",
  investimentos:           "Investimentos",
  criptomoedas:            "Criptomoedas",
  startups:                "Startups",
  esportes:                "Esportes",
  futebol:                 "Futebol",
  musica:                  "Música",
  entretenimento:          "Entretenimento",
  saude:                   "Saúde",
  politica:                "Política",
  mundo:                   "Mundo",
  brasil:                  "Brasil",
  educacao:                "Educação",
  desenvolvimento_pessoal: "Dev. Pessoal",
};

// Categorias que filtram por país BR
const LOCAL_CATEGORIES = new Set(["brasil", "futebol", "esportes", "politica"]);

// Configuração por categoria — queries mais ricas para maior cobertura
const CATEGORY_CONFIG: Record<string, {
  newsdataCategory?: string;
  gnewsTopic?: string;
  query?: string;
  gnewsQuery?: string; // query alternativa para o GNews
}> = {
  geral:                   { newsdataCategory: "top",           gnewsTopic: "breaking-news" },
  tecnologia:              { newsdataCategory: "technology",    gnewsTopic: "technology" },
  inteligencia_artificial: { newsdataCategory: "technology",    gnewsTopic: "technology",
                             query: "inteligência artificial OR \"artificial intelligence\" OR chatgpt OR gemini OR claude OR OpenAI OR copilot OR llm OR machine learning",
                             gnewsQuery: "inteligência artificial OR chatgpt OR OpenAI OR machine learning" },
  negocios:                { newsdataCategory: "business",      gnewsTopic: "business" },
  marketing:               { newsdataCategory: "business",      gnewsTopic: "business",
                             query: "marketing digital OR social media OR tráfego pago OR conteúdo OR influencer OR branding" },
  vendas:                  { newsdataCategory: "business",      gnewsTopic: "business",
                             query: "vendas OR e-commerce OR varejo OR consumidor OR loja virtual" },
  financas:                { newsdataCategory: "business",      gnewsTopic: "business",
                             query: "finanças pessoais OR economia OR inflação OR taxa de juros OR Selic OR Banco Central" },
  investimentos:           { newsdataCategory: "business",      gnewsTopic: "business",
                             query: "investimentos OR bolsa de valores OR Ibovespa OR ações OR fundos OR tesouro direto OR renda fixa" },
  criptomoedas:            { newsdataCategory: "technology",    gnewsTopic: "technology",
                             query: "bitcoin OR ethereum OR criptomoedas OR crypto OR blockchain OR altcoin OR DeFi OR NFT",
                             gnewsQuery: "bitcoin OR ethereum OR criptomoedas OR crypto" },
  startups:                { newsdataCategory: "business",      gnewsTopic: "business",
                             query: "startup OR unicórnio OR venture capital OR funding OR aceleração OR empreendedorismo OR inovação" },
  esportes:                { newsdataCategory: "sports",        gnewsTopic: "sports" },
  futebol:                 { newsdataCategory: "sports",        gnewsTopic: "sports",
                             query: "futebol OR Brasileirão OR Copa do Brasil OR Libertadores OR Seleção Brasileira OR FIFA" },
  musica:                  { newsdataCategory: "entertainment", gnewsTopic: "entertainment",
                             query: "música OR artista OR álbum OR show OR festival OR lançamento musical OR Billboard" },
  entretenimento:          { newsdataCategory: "entertainment", gnewsTopic: "entertainment" },
  saude:                   { newsdataCategory: "health",        gnewsTopic: "health",
                             query: "saúde OR medicina OR tratamento OR vacina OR pesquisa médica OR bem-estar OR nutrição" },
  politica:                { newsdataCategory: "politics",      gnewsTopic: "nation",
                             query: "política OR governo OR congresso OR STF OR ministério OR eleições" },
  mundo:                   { newsdataCategory: "world",         gnewsTopic: "world" },
  brasil:                  { newsdataCategory: "top",           gnewsTopic: "nation",
                             query: "Brasil OR brasileiro OR Rio de Janeiro OR São Paulo OR Brasília" },
  educacao:                { newsdataCategory: "education",     gnewsTopic: "science",
                             query: "educação OR escola OR universidade OR ENEM OR vestibular OR pesquisa OR ciência" },
  desenvolvimento_pessoal: { newsdataCategory: "lifestyle",     gnewsTopic: "health",
                             query: "desenvolvimento pessoal OR produtividade OR mindset OR liderança OR hábitos OR autoconhecimento OR carreira" },
};

const HOT_CATEGORIES: Record<string, number> = {
  inteligencia_artificial: 25,
  criptomoedas: 25,
  futebol: 25,
  startups: 20,
  tecnologia: 20,
  politica: 20,
  negocios: 15,
  financas: 15,
  investimentos: 15,
  entretenimento: 15,
  brasil: 15,
};

export function calculateViralScore(article: {
  title: string;
  description?: string | null;
  content?: string | null;
  image_url?: string | null;
  published_at?: string | null;
  category: string;
}): { score: number; label: "alta" | "media" | "nichado" } {
  let score = 0;

  // Frescor (0-40 pts)
  const publishedAt = article.published_at ? new Date(article.published_at) : null;
  const hoursAgo = publishedAt ? (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60) : 24;
  if      (hoursAgo < 1)  score += 40;
  else if (hoursAgo < 3)  score += 35;
  else if (hoursAgo < 6)  score += 28;
  else if (hoursAgo < 12) score += 18;
  else if (hoursAgo < 24) score += 10;
  else                    score += 4;

  // Calor da categoria (0-25 pts)
  score += HOT_CATEGORIES[article.category] ?? 10;

  // Tem imagem (0-15 pts)
  if (article.image_url) score += 15;

  // Riqueza de conteúdo (0-20 pts)
  const len = (article.content?.length ?? 0) + (article.description?.length ?? 0);
  if      (len > 500) score += 20;
  else if (len > 200) score += 10;
  else if (len > 50)  score += 5;

  score = Math.min(100, score);
  const label = score >= 70 ? "alta" : score >= 40 ? "media" : "nichado";
  return { score, label };
}

interface RawArticle {
  title: string;
  description?: string | null;
  content?: string | null;
  source: string;
  source_url: string;
  image_url?: string | null;
  category: string;
  keywords?: string[];
  published_at?: string | null;
}

async function fetchFromNewsData(category: string, hours?: number): Promise<RawArticle[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) throw new Error("NEWSDATA_API_KEY não configurada");

  const config = CATEGORY_CONFIG[category] ?? {};
  const params = new URLSearchParams({
    apikey:   apiKey,
    language: "pt",
    size:     hours ? "50" : "20", // mais artigos no modo por horas
  });
  if (LOCAL_CATEGORIES.has(category)) params.set("country", "br");
  if (config.newsdataCategory)         params.set("category", config.newsdataCategory);
  if (config.query)                    params.set("q", config.query);
  if (hours)                           params.set("timeframe", String(Math.max(1, Math.min(48, hours))));

  const res = await fetch(`https://newsdata.io/api/1/latest?${params}`, {
    signal: AbortSignal.timeout(12000),
    next:   { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`NewsData HTTP ${res.status}`);

  const data = await res.json();
  if (data.status !== "success" || !Array.isArray(data.results)) {
    throw new Error(`NewsData resposta inválida: ${data.message ?? "unknown"}`);
  }

  return data.results
    .filter((r: any) => (r.title?.length ?? 0) > 10)
    .map((r: any): RawArticle => ({
      title:        r.title,
      description:  r.description  || null,
      content:      r.content      || r.description || null,
      source:       r.source_id    || r.source_name || "NewsData",
      source_url:   r.link         || r.source_url  || "",
      image_url:    r.image_url    || null,
      category,
      keywords:     Array.isArray(r.keywords) ? r.keywords.slice(0, 10) : [],
      published_at: r.pubDate ? new Date(r.pubDate).toISOString() : null,
    }));
}

async function fetchFromGNews(category: string, hours?: number): Promise<RawArticle[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) throw new Error("GNEWS_API_KEY não configurada");

  const config = CATEGORY_CONFIG[category] ?? {};
  const query = config.gnewsQuery ?? config.query;

  const params = new URLSearchParams({
    token: apiKey,
    lang:  "pt",
    max:   "10",
  });
  if (LOCAL_CATEGORIES.has(category)) params.set("country", "br");
  if (config.gnewsTopic) params.set("topic", config.gnewsTopic);
  if (query)             params.set("q", query);
  if (hours) {
    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    params.set("from", fromDate);
  }

  const endpoint = query
    ? `https://gnews.io/api/v4/search?${params}`
    : `https://gnews.io/api/v4/top-headlines?${params}`;

  const res = await fetch(endpoint, {
    signal: AbortSignal.timeout(10000),
    next:   { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`GNews HTTP ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data.articles)) throw new Error("GNews resposta inválida");

  return data.articles
    .filter((a: any) => (a.title?.length ?? 0) > 10)
    .map((a: any): RawArticle => ({
      title:        a.title,
      description:  a.description || null,
      content:      a.content     || a.description || null,
      source:       a.source?.name || "GNews",
      source_url:   a.url         || "",
      image_url:    a.image       || null,
      category,
      keywords:     [],
      published_at: a.publishedAt ? new Date(a.publishedAt).toISOString() : null,
    }));
}

// ── RSS feeds de portais brasileiros ─────────────────────────────────────────

// Extrai texto de uma tag XML, suportando CDATA
function xmlTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, "i");
  const m = xml.match(re);
  return (m?.[1] ?? m?.[2] ?? "").trim();
}

// Tenta extrair URL de imagem de campos comuns do RSS
function extractRssImage(item: string): string | null {
  // <media:content url="..."/>
  const media = item.match(/media:content[^>]+url=["']([^"']+)["']/i);
  if (media) return media[1];
  // <enclosure url="..." type="image/..."/>
  const enc = item.match(/enclosure[^>]+type=["']image[^"']*["'][^>]+url=["']([^"']+)["']/i)
            ?? item.match(/enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image[^"']*["']/i);
  if (enc) return enc[1];
  // <media:thumbnail url="..."/>
  const thumb = item.match(/media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (thumb) return thumb[1];
  // imagem embutida no description <img src="...">
  const img = item.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (img) return img[1];
  return null;
}

interface RssFeed {
  url: string;
  source: string;
  categories: string[]; // quais categorias esse feed alimenta
}

const RSS_FEEDS: RssFeed[] = [
  { url: "https://g1.globo.com/rss/g1/",                              source: "G1",           categories: ["geral", "brasil"] },
  { url: "https://g1.globo.com/rss/g1/politica/",                    source: "G1 Política",  categories: ["politica", "brasil"] },
  { url: "https://g1.globo.com/rss/g1/economia/",                    source: "G1 Economia",  categories: ["financas", "negocios", "investimentos"] },
  { url: "https://g1.globo.com/rss/g1/tecnologia/",                  source: "G1 Tech",      categories: ["tecnologia", "inteligencia_artificial"] },
  { url: "https://g1.globo.com/rss/g1/esportes/",                    source: "G1 Esportes",  categories: ["esportes", "futebol"] },
  { url: "https://g1.globo.com/rss/g1/bem-estar-e-saude/",           source: "G1 Saúde",     categories: ["saude", "desenvolvimento_pessoal"] },
  { url: "https://g1.globo.com/rss/g1/pop-arte/",                    source: "G1 Cultura",   categories: ["entretenimento", "musica"] },
  { url: "https://www.cnnbrasil.com.br/feed/",                        source: "CNN Brasil",   categories: ["geral", "politica", "brasil"] },
  { url: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml", source: "Agência Brasil", categories: ["brasil", "politica", "geral"] },
  { url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml",   source: "Folha",        categories: ["geral", "brasil", "politica"] },
  { url: "https://rss.uol.com.br/feed/noticias.xml",                 source: "UOL",          categories: ["geral", "brasil"] },
  { url: "https://rss.uol.com.br/feed/esportes.xml",                 source: "UOL Esportes", categories: ["esportes", "futebol"] },
  { url: "https://rss.uol.com.br/feed/economia.xml",                 source: "UOL Economia", categories: ["financas", "negocios"] },
  { url: "https://rss.uol.com.br/feed/tecnologia.xml",               source: "UOL Tech",     categories: ["tecnologia"] },
  { url: "https://rss.uol.com.br/feed/entretenimento.xml",           source: "UOL Entret.",  categories: ["entretenimento", "musica"] },
];

async function fetchFromRSS(category: string, hours?: number): Promise<RawArticle[]> {
  const feeds = RSS_FEEDS.filter((f) => f.categories.includes(category));
  if (!feeds.length) return [];

  const cutoff = hours ? Date.now() - hours * 60 * 60 * 1000 : 0;

  const results = await Promise.allSettled(
    feeds.map(async (feed): Promise<RawArticle[]> => {
      const res = await fetch(feed.url, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; XPostBot/1.0)" },
        next: { revalidate: 0 },
      });
      if (!res.ok) return [];
      const xml = await res.text();

      const itemMatches = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
      const articles: RawArticle[] = [];

      for (const item of itemMatches) {
        const title       = xmlTag(item, "title").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
        const link        = xmlTag(item, "link") || xmlTag(item, "guid");
        const description = xmlTag(item, "description").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
        const pubDateStr  = xmlTag(item, "pubDate") || xmlTag(item, "dc:date");
        const published_at = pubDateStr ? new Date(pubDateStr).toISOString() : null;
        const image_url   = extractRssImage(item);

        if (!title || title.length < 10) continue;
        if (cutoff && published_at && new Date(published_at).getTime() < cutoff) continue;

        articles.push({
          title,
          description: description || null,
          content:     description || null,
          source:      feed.source,
          source_url:  link,
          image_url,
          category,
          keywords:    [],
          published_at,
        });
      }
      return articles;
    }),
  );

  const all: RawArticle[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }
  return all;
}

// Busca das duas APIs em paralelo e mescla, priorizando artigos mais recentes
async function fetchFromAllSources(category: string, hours?: number): Promise<RawArticle[]> {
  const [ndResult, gnResult, rssResult] = await Promise.allSettled([
    fetchFromNewsData(category, hours),
    fetchFromGNews(category, hours),
    fetchFromRSS(category, hours),
  ]);

  const ndArticles  = ndResult.status  === "fulfilled" ? ndResult.value  : [];
  const gnArticles  = gnResult.status  === "fulfilled" ? gnResult.value  : [];
  const rssArticles = rssResult.status === "fulfilled" ? rssResult.value : [];

  if (ndResult.status  === "rejected") console.warn("[news] NewsData falhou:", (ndResult.reason  as any)?.message);
  if (gnResult.status  === "rejected") console.warn("[news] GNews falhou:",    (gnResult.reason  as any)?.message);
  if (rssResult.status === "rejected") console.warn("[news] RSS falhou:",      (rssResult.reason as any)?.message);

  // Mescla e deduplica por título (normalizado) — RSS por último para dar preferência às APIs
  const seen = new Set<string>();
  const merged: RawArticle[] = [];
  for (const article of [...ndArticles, ...gnArticles, ...rssArticles]) {
    const key = article.title.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(article);
  }

  // Ordena por recência (mais novo primeiro)
  merged.sort((a, b) => {
    const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
    const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
    return tb - ta;
  });

  return merged;
}

function rawToNewsItem(a: RawArticle): NewsItem {
  const { score, label } = calculateViralScore(a);
  return {
    id:           uuid(),
    title:        a.title,
    description:  a.description  ?? null,
    content:      a.content      ?? null,
    source:       a.source,
    source_url:   a.source_url,
    image_url:    a.image_url    ?? null,
    category:     a.category,
    keywords:     a.keywords     ?? [],
    published_at: a.published_at ?? null,
    created_at:   new Date().toISOString(),
    viral_score:  score,
    viral_label:  label,
  };
}

async function storeArticles(articles: RawArticle[]): Promise<boolean> {
  if (!articles.length) return false;

  const rows = articles.map((a) => {
    const { score, label } = calculateViralScore(a);
    return {
      title:        a.title,
      description:  a.description  ?? null,
      content:      a.content      ?? null,
      source:       a.source,
      source_url:   a.source_url,
      image_url:    a.image_url    ?? null,
      category:     a.category,
      keywords:     a.keywords     ?? [],
      published_at: a.published_at ?? null,
      viral_score:  score,
      viral_label:  label,
    };
  });

  const { error } = await supabaseAdmin
    .from("news_cache")
    .upsert(rows, { onConflict: "title", ignoreDuplicates: true });

  if (error) {
    console.error("[news] Supabase upsert error:", error.message);
    return false;
  }
  return true;
}

// Armazena artigos e retorna do banco com IDs reais (evita UUIDs temporários que quebram getNewsById)
async function storeAndFetch(articles: RawArticle[], limit: number): Promise<NewsItem[]> {
  if (!articles.length) return [];
  await storeArticles(articles);
  const titles = [...new Set(articles.slice(0, limit + 20).map(a => a.title))];
  const { data } = await supabaseAdmin
    .from("news_cache")
    .select("*")
    .in("title", titles)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (data?.length) return data as NewsItem[];
  // Fallback se o banco falhar: IDs temporários (gerar não funcionará, mas exibe as notícias)
  return articles.slice(0, limit).map(rawToNewsItem);
}

// Categorias prioritárias para o modo "todas as recentes"
const HOT_CATS = [
  "geral", "brasil", "politica", "tecnologia", "inteligencia_artificial",
  "esportes", "futebol", "entretenimento", "financas", "musica", "saude", "mundo",
];

// Busca as notícias mais recentes de TODAS as categorias em paralelo
export async function getHotRecentNews(fetchHours: number, limit: number): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    HOT_CATS.map((cat) => fetchFromAllSources(cat, fetchHours)),
  );

  const seen   = new Set<string>();
  const merged: RawArticle[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const a of r.value) {
      const key = a.title.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(a);
    }
  }

  // Ordena por mais recente
  merged.sort((a, b) => {
    const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
    const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
    return tb - ta;
  });

  // Armazena e busca do banco para garantir IDs reais (sem IDs temporários que quebram getNewsById)
  return storeAndFetch(merged, limit);
}

export async function getNews(
  category: string = "geral",
  page: number = 1,
  limit: number = 20,
  forceRefresh = false,
  hours?: number,
): Promise<NewsItem[]> {
  const offset = (page - 1) * limit;

  // Filtro de hora específica: sempre busca das APIs em tempo real
  if (hours) {
    const raw = await fetchFromAllSources(category, hours);
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const filtered = raw.filter(a =>
      a.published_at && new Date(a.published_at).getTime() >= cutoff,
    );
    // Armazena e busca do banco para garantir IDs reais (sem IDs temporários que quebram getNewsById)
    const result = filtered.length > 0 ? filtered : raw;
    return storeAndFetch(result.slice(offset), limit);
  }

  // Cache fresco = artigos inseridos nos últimos 20 minutos
  if (!forceRefresh) {
    const freshSince = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("news_cache")
      .select("id", { count: "exact", head: true })
      .eq("category", category)
      .gte("created_at", freshSince);

    if (count && count >= 5) {
      return queryCache(category, offset, limit);
    }
  }

  // Busca ambas as fontes em paralelo
  const raw = await fetchFromAllSources(category);

  if (!raw.length) {
    console.warn("[news] Todas as APIs falharam para", category, "— usando cache");
    return queryCache(category, offset, limit);
  }

  // Filtra para as mais recentes possíveis:
  // tenta 6h → 12h → 24h → tudo, usando o primeiro que tiver >= 3 artigos
  const now = Date.now();
  const windows = [6, 12, 24];
  let finalRaw = raw;
  for (const h of windows) {
    const cutoff = now - h * 60 * 60 * 1000;
    const recent = raw.filter(a => !a.published_at || new Date(a.published_at).getTime() >= cutoff);
    if (recent.length >= 3) { finalRaw = recent; break; }
  }

  // Armazena no Supabase e em seguida consulta o cache para retornar com IDs estáveis
  const stored = await storeArticles(finalRaw);
  if (stored) {
    const cached = await queryCache(category, offset, limit);
    if (cached.length > 0) return cached;
  }

  // Supabase indisponível — retorna direto da API
  return finalRaw.slice(offset, offset + limit).map(rawToNewsItem);
}

async function queryCache(category: string, offset: number, limit: number): Promise<NewsItem[]> {
  // Tenta publicações das últimas 6 horas primeiro
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabaseAdmin
    .from("news_cache")
    .select("*")
    .eq("category", category)
    .gte("published_at", sixHoursAgo)
    .order("published_at", { ascending: false })
    .order("viral_score",  { ascending: false })
    .range(offset, offset + limit - 1);

  if (recent && recent.length >= 3) return recent as NewsItem[];

  // Fallback: todos os artigos da categoria, mais recentes e mais virais primeiro
  const { data } = await supabaseAdmin
    .from("news_cache")
    .select("*")
    .eq("category", category)
    .order("published_at", { ascending: false })
    .order("viral_score",  { ascending: false })
    .range(offset, offset + limit - 1);

  return (data as NewsItem[]) ?? [];
}

export async function getNewsByIds(ids: string[]): Promise<NewsItem[]> {
  if (!ids.length) return [];
  const { data } = await supabaseAdmin.from("news_cache").select("*").in("id", ids);
  return (data as NewsItem[]) ?? [];
}

export async function getNewsById(id: string): Promise<NewsItem | null> {
  const { data } = await supabaseAdmin.from("news_cache").select("*").eq("id", id).single();
  return data as NewsItem | null;
}

export async function getTrending(): Promise<TrendingTopic[]> {
  const freshSince = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("trending_topics")
    .select("id", { count: "exact", head: true })
    .gte("created_at", freshSince);

  if (count && count > 0) {
    const { data } = await supabaseAdmin
      .from("trending_topics")
      .select("*")
      .order("growth_score", { ascending: false })
      .limit(15);
    return (data as TrendingTopic[]) ?? [];
  }

  return generateTrending();
}

async function generateTrending(): Promise<TrendingTopic[]> {
  // Busca as notícias mais virais das últimas 12 horas
  const { data: recentNews } = await supabaseAdmin
    .from("news_cache")
    .select("title, category, viral_score")
    .gte("created_at", new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
    .order("viral_score", { ascending: false })
    .limit(40);

  if (!recentNews?.length) return defaultTrending();

  try {
    const { geminiText } = await import("./gemini-text");
    const titles = recentNews.map((n: any) => n.title).join("\n");

    const raw = await geminiText(
      `Analise estas manchetes e extraia os 10 principais tópicos em tendência no Brasil agora:\n\n${titles}\n\nRetorne APENAS um array JSON:\n[{"title":"Nome do Tópico","category":"categoria","growth_score":85,"engagement_score":90},...]\n\nCategorias: geral, tecnologia, inteligencia_artificial, negocios, politica, esportes, futebol, entretenimento, saude, financas, criptomoedas, startups, musica, brasil, mundo\n\ngrowth_score e engagement_score: 0-100. Apenas o JSON, sem comentários.`,
      { maxTokens: 800, temperature: 0.5 },
    );

    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("JSON não encontrado");

    const topics: Array<{ title: string; category: string; growth_score: number; engagement_score: number }> = JSON.parse(match[0]);

    const rows = topics.slice(0, 10).map((t) => ({
      title:            t.title,
      category:         t.category || "geral",
      source:           "ai_analysis",
      growth_score:     Math.min(100, Math.max(0, t.growth_score || 50)),
      engagement_score: Math.min(100, Math.max(0, t.engagement_score || 50)),
    }));

    await supabaseAdmin
      .from("trending_topics")
      .delete()
      .lt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    const { data: inserted } = await supabaseAdmin
      .from("trending_topics")
      .insert(rows)
      .select();

    return (inserted as TrendingTopic[]) ?? [];
  } catch (e: any) {
    console.warn("[trending] Falha na geração por IA:", e.message);
    return defaultTrending();
  }
}

function defaultTrending(): TrendingTopic[] {
  const now = new Date().toISOString();
  return [
    { id: "1", title: "Inteligência Artificial",    category: "inteligencia_artificial", source: "default", growth_score: 95, engagement_score: 92, created_at: now },
    { id: "2", title: "Futebol Brasileiro",          category: "futebol",                source: "default", growth_score: 88, engagement_score: 85, created_at: now },
    { id: "3", title: "Bitcoin e Criptomoedas",      category: "criptomoedas",           source: "default", growth_score: 82, engagement_score: 79, created_at: now },
    { id: "4", title: "Mercado Financeiro",          category: "financas",               source: "default", growth_score: 75, engagement_score: 72, created_at: now },
    { id: "5", title: "Startups e Inovação",         category: "startups",               source: "default", growth_score: 70, engagement_score: 68, created_at: now },
    { id: "6", title: "Marketing Digital",           category: "marketing",              source: "default", growth_score: 65, engagement_score: 63, created_at: now },
    { id: "7", title: "Política Brasileira",         category: "politica",               source: "default", growth_score: 60, engagement_score: 58, created_at: now },
    { id: "8", title: "Saúde e Bem-Estar",           category: "saude",                  source: "default", growth_score: 55, engagement_score: 53, created_at: now },
  ];
}

export async function refreshAllCategories(): Promise<{ ok: number; failed: number }> {
  const categories = Object.keys(CATEGORY_CONFIG);
  let ok = 0, failed = 0;

  for (const cat of categories) {
    try {
      const articles = await fetchFromAllSources(cat);
      const stored = await storeArticles(articles);
      if (stored) ok++; else failed++;
    } catch {
      failed++;
    }
    await new Promise(r => setTimeout(r, 200));
  }

  return { ok, failed };
}
