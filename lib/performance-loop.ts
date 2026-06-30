import { supabaseAdmin } from "./supabase";
import { getConnectedAccount, IG_GRAPH } from "./instagram-server";

export interface ContentPerformance {
  id: string;
  user_email: string;
  ig_media_id: string;
  content_type: string;
  category: string | null;
  news_id: string | null;
  hook: string | null;
  likes: number;
  comments: number;
  saves: number;
  reach: number;
  engagement_rate: number;
  synced_at: string | null;
  created_at: string;
}

export interface TopPerformer {
  content_type: string;
  category: string | null;
  hook: string | null;
  engagement_rate: number;
  likes: number;
  saves: number;
}

// Salva o metadata de um post recém-publicado para rastreamento futuro
export async function trackPublishedPost(params: {
  userEmail: string;
  igMediaId: string;
  contentType: string;
  category?: string;
  newsId?: string;
  hook?: string;
}): Promise<void> {
  await supabaseAdmin.from("content_performance").upsert(
    {
      user_email:   params.userEmail,
      ig_media_id:  params.igMediaId,
      content_type: params.contentType,
      category:     params.category ?? null,
      news_id:      params.newsId ?? null,
      hook:         params.hook ?? null,
    },
    { onConflict: "user_email,ig_media_id", ignoreDuplicates: true },
  );
}

// Busca métricas do Instagram e atualiza a tabela de performance
export async function syncPerformanceMetrics(userEmail: string): Promise<{ updated: number; errors: number }> {
  const account = await getConnectedAccount(userEmail);
  if (!account) return { updated: 0, errors: 0 };

  // Pega posts rastreados sem sync ou com sync há mais de 6h
  const stale = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await supabaseAdmin
    .from("content_performance")
    .select("id, ig_media_id")
    .eq("user_email", userEmail)
    .or(`synced_at.is.null,synced_at.lt.${stale}`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!posts?.length) return { updated: 0, errors: 0 };

  let updated = 0;
  let errors  = 0;

  for (const post of posts) {
    try {
      // Busca métricas básicas (disponíveis sem instagram_manage_insights)
      const res = await fetch(
        `${IG_GRAPH}/${post.ig_media_id}?fields=like_count,comments_count,timestamp&access_token=${account.access_token}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) { errors++; continue; }

      const data = await res.json();
      if (data.error) { errors++; continue; }

      const likes    = data.like_count    ?? 0;
      const comments = data.comments_count ?? 0;

      // Tenta buscar insights (requer instagram_manage_insights — opcional)
      let saves = 0;
      let reach = 0;
      try {
        const insightsRes = await fetch(
          `${IG_GRAPH}/${post.ig_media_id}/insights?metric=saved,reach&access_token=${account.access_token}`,
          { signal: AbortSignal.timeout(6000) },
        );
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          for (const metric of insightsData.data ?? []) {
            if (metric.name === "saved") saves = metric.values?.[0]?.value ?? 0;
            if (metric.name === "reach")  reach = metric.values?.[0]?.value ?? 0;
          }
        }
      } catch {}

      const engagement_rate = reach > 0
        ? parseFloat(((likes + comments + saves) / reach * 100).toFixed(2))
        : 0;

      await supabaseAdmin
        .from("content_performance")
        .update({ likes, comments, saves, reach, engagement_rate, synced_at: new Date().toISOString() })
        .eq("id", post.id);

      updated++;
    } catch {
      errors++;
    }
  }

  return { updated, errors };
}

// Retorna os top performers do usuário para personalizar a geração
export async function getTopPerformers(userEmail: string, limit = 5): Promise<TopPerformer[]> {
  const { data } = await supabaseAdmin
    .from("content_performance")
    .select("content_type, category, hook, engagement_rate, likes, saves")
    .eq("user_email", userEmail)
    .gt("engagement_rate", 0)
    .order("engagement_rate", { ascending: false })
    .limit(limit);

  return (data as TopPerformer[]) ?? [];
}

// Retorna um resumo textual dos top performers para injetar no prompt de IA
export async function getPerformanceSummary(userEmail: string): Promise<string | null> {
  const tops = await getTopPerformers(userEmail, 5);
  if (!tops.length) return null;

  const lines = tops
    .filter((t) => t.hook || t.category)
    .map((t, i) =>
      `${i + 1}. ${t.content_type} | categoria: ${t.category ?? "geral"} | engajamento: ${t.engagement_rate}%${t.hook ? ` | hook: "${t.hook}"` : ""}`,
    );

  if (!lines.length) return null;

  return `HISTÓRICO DO CRIADOR (posts que mais engajaram):
${lines.join("\n")}

Use esses padrões para adaptar o estilo e abordagem ao que já funcionou para este criador.`;
}
