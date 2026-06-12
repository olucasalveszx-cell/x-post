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
  geral: "Geral",
  tecnologia: "Tecnologia",
  inteligencia_artificial: "Inteligência Artificial",
  negocios: "Negócios",
  marketing: "Marketing",
  vendas: "Vendas",
  financas: "Finanças",
  investimentos: "Investimentos",
  criptomoedas: "Criptomoedas",
  startups: "Startups",
  esportes: "Esportes",
  futebol: "Futebol",
  musica: "Música",
  entretenimento: "Entretenimento",
  saude: "Saúde",
  politica: "Política",
  mundo: "Mundo",
  brasil: "Brasil",
  educacao: "Educação",
  desenvolvimento_pessoal: "Dev. Pessoal",
};

// Mapeamento de categorias para APIs externas
const CATEGORY_CONFIG: Record<string, { newsdataCategory?: string; gnewsTopic?: string; query?: string }> = {
  geral:                   { gnewsTopic: "world" },
  tecnologia:              { newsdataCategory: "technology",    gnewsTopic: "technology" },
  inteligencia_artificial: { newsdataCategory: "technology",    gnewsTopic: "technology", query: "inteligência artificial IA" },
  negocios:                { newsdataCategory: "business",      gnewsTopic: "business" },
  marketing:               { newsdataCategory: "business",      gnewsTopic: "business", query: "marketing digital" },
  vendas:                  { newsdataCategory: "business",      gnewsTopic: "business", query: "vendas" },
  financas:                { newsdataCategory: "business",      gnewsTopic: "business", query: "finanças" },
  investimentos:           { newsdataCategory: "business",      gnewsTopic: "business", query: "investimentos bolsa" },
  criptomoedas:            { newsdataCategory: "technology",    gnewsTopic: "technology", query: "bitcoin criptomoedas" },
  startups:                { newsdataCategory: "business",      gnewsTopic: "business", query: "startup" },
  esportes:                { newsdataCategory: "sports",        gnewsTopic: "sports" },
  futebol:                 { newsdataCategory: "sports",        gnewsTopic: "sports", query: "futebol" },
  musica:                  { newsdataCategory: "entertainment", gnewsTopic: "entertainment", query: "música" },
  entretenimento:          { newsdataCategory: "entertainment", gnewsTopic: "entertainment" },
  saude:                   { newsdataCategory: "health",        gnewsTopic: "health" },
  politica:                { newsdataCategory: "politics",      gnewsTopic: "nation" },
  mundo:                   { newsdataCategory: "world",         gnewsTopic: "world" },
  brasil:                  { gnewsTopic: "nation", query: "Brasil" },
  educacao:                { newsdataCategory: "science",       gnewsTopic: "science", query: "educação" },
  desenvolvimento_pessoal: { gnewsTopic: "world", query: "desenvolvimento pessoal produtividade" },
};

// Categorias "quentes" recebem pontuação base maior
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
  if (hoursAgo < 2)       score += 40;
  else if (hoursAgo < 6)  score += 30;
  else if (hoursAgo < 12) score += 20;
  else if (hoursAgo < 24) score += 10;
  else                    score += 5;

  // Calor da categoria (0-25 pts)
  score += HOT_CATEGORIES[article.category] ?? 10;

  // Tem imagem (0-15 pts)
  if (article.image_url) score += 15;

  // Riqueza de conteúdo (0-20 pts)
  const len = (article.content?.length ?? 0) + (article.description?.length ?? 0);
  if (len > 500)      score += 20;
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

async function fetchFromNewsData(category: string): Promise<RawArticle[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) throw new Error("NEWSDATA_API_KEY não configurada");

  const config = CATEGORY_CONFIG[category] ?? {};
  const params = new URLSearchParams({
    apikey: apiKey,
    language: "pt",
    country: "br",
    size: "10",
  });
  if (config.newsdataCategory) params.set("category", config.newsdataCategory);
  if (config.query)            params.set("q", config.query);

  const res = await fetch(`https://newsdata.io/api/1/latest?${params}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`NewsData HTTP ${res.status}`);

  const data = await res.json();
  if (data.status !== "success" || !Array.isArray(data.results)) {
    throw new Error(`NewsData resposta inválida: ${data.message ?? "unknown"}`);
  }

  return data.results
    .filter((r: any) => r.title?.length > 10)
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

async function fetchFromGNews(category: string): Promise<RawArticle[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) throw new Error("GNEWS_API_KEY não configurada");

  const config = CATEGORY_CONFIG[category] ?? {};
  const params = new URLSearchParams({
    token: apiKey,
    lang:  "pt",
    country: "br",
    max:   "10",
  });
  if (config.gnewsTopic) params.set("topic", config.gnewsTopic);
  if (config.query)      params.set("q", config.query);

  const endpoint = config.query
    ? `https://gnews.io/api/v4/search?${params}`
    : `https://gnews.io/api/v4/top-headlines?${params}`;

  const res = await fetch(endpoint, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`GNews HTTP ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data.articles)) throw new Error("GNews resposta inválida");

  return data.articles
    .filter((a: any) => a.title?.length > 10)
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

async function storeArticles(articles: RawArticle[]): Promise<void> {
  if (!articles.length) return;

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

  await supabaseAdmin
    .from("news_cache")
    .upsert(rows, { onConflict: "title", ignoreDuplicates: true });
}

export async function getNews(
  category: string = "geral",
  page: number = 1,
  limit: number = 20,
  forceRefresh = false,
): Promise<NewsItem[]> {
  const offset = (page - 1) * limit;

  if (!forceRefresh) {
    const freshSince = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("news_cache")
      .select("id", { count: "exact", head: true })
      .eq("category", category)
      .gte("created_at", freshSince);

    if (count && count > 0) {
      return queryCache(category, offset, limit);
    }
  }

  // Tenta NewsData.io → GNews → cache antigo
  let fetched = false;
  try {
    const articles = await fetchFromNewsData(category);
    await storeArticles(articles);
    fetched = true;
  } catch (e1: any) {
    console.warn("[news] NewsData falhou:", e1.message);
    try {
      const articles = await fetchFromGNews(category);
      await storeArticles(articles);
      fetched = true;
    } catch (e2: any) {
      console.warn("[news] GNews falhou:", e2.message);
    }
  }

  if (!fetched) console.warn("[news] Ambas APIs falharam — retornando cache antigo");
  return queryCache(category, offset, limit);
}

async function queryCache(category: string, offset: number, limit: number): Promise<NewsItem[]> {
  const { data } = await supabaseAdmin
    .from("news_cache")
    .select("*")
    .eq("category", category)
    .order("viral_score", { ascending: false })
    .order("created_at",  { ascending: false })
    .range(offset, offset + limit - 1);
  return (data as NewsItem[]) ?? [];
}

export async function getNewsByIds(ids: string[]): Promise<NewsItem[]> {
  if (!ids.length) return [];
  const { data } = await supabaseAdmin
    .from("news_cache")
    .select("*")
    .in("id", ids);
  return (data as NewsItem[]) ?? [];
}

export async function getNewsById(id: string): Promise<NewsItem | null> {
  const { data } = await supabaseAdmin
    .from("news_cache")
    .select("*")
    .eq("id", id)
    .single();
  return data as NewsItem | null;
}

export async function getTrending(): Promise<TrendingTopic[]> {
  const freshSince = new Date(Date.now() - 15 * 60 * 1000).toISOString();
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
  // Busca as notícias mais virais das últimas 6 horas
  const { data: recentNews } = await supabaseAdmin
    .from("news_cache")
    .select("title, category, viral_score")
    .gte("created_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
    .order("viral_score", { ascending: false })
    .limit(30);

  if (!recentNews?.length) return defaultTrending();

  try {
    const { geminiText } = await import("./gemini-text");
    const titles = recentNews.map((n: any) => n.title).join("\n");

    const raw = await geminiText(
      `Analise estas manchetes e extraia os 10 principais tópicos em tendência no Brasil agora:\n\n${titles}\n\nRetorne APENAS um array JSON:\n[{"title":"Nome do Tópico","category":"categoria","growth_score":85,"engagement_score":90},...]\n\nCategorias: geral, tecnologia, inteligencia_artificial, negocios, politica, esportes, futebol, entretenimento, saude, financas, criptomoedas, startups\n\ngrowth_score e engagement_score: 0-100. Apenas o JSON, sem comentários.`,
      { maxTokens: 600, temperature: 0.6 },
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

    // Remove tendências antigas e insere novas
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
    { id: "1", title: "Inteligência Artificial",   category: "inteligencia_artificial", source: "default", growth_score: 95, engagement_score: 92, created_at: now },
    { id: "2", title: "Futebol Brasileiro",         category: "futebol",                source: "default", growth_score: 88, engagement_score: 85, created_at: now },
    { id: "3", title: "Bitcoin e Criptomoedas",     category: "criptomoedas",           source: "default", growth_score: 82, engagement_score: 79, created_at: now },
    { id: "4", title: "Mercado Financeiro",         category: "financas",               source: "default", growth_score: 75, engagement_score: 72, created_at: now },
    { id: "5", title: "Startups e Inovação",        category: "startups",               source: "default", growth_score: 70, engagement_score: 68, created_at: now },
    { id: "6", title: "Marketing Digital",          category: "marketing",              source: "default", growth_score: 65, engagement_score: 63, created_at: now },
  ];
}

export async function refreshAllCategories(): Promise<{ ok: number; failed: number }> {
  const categories = Object.keys(CATEGORY_CONFIG);
  let ok = 0, failed = 0;

  for (const cat of categories) {
    try {
      const articles = await fetchFromNewsData(cat).catch(async () => fetchFromGNews(cat));
      await storeArticles(articles);
      ok++;
    } catch {
      failed++;
    }
    await new Promise(r => setTimeout(r, 300)); // evita rate limit
  }

  return { ok, failed };
}
