import { supabaseAdmin } from "./supabase";
import { generateEmbedding } from "./embeddings";

export interface ChunkResult {
  id: string;
  source_id: string;
  chunk_text: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface UserAIProfile {
  brand_voice?: string;
  writing_style?: string;
  preferred_structure?: string;
  forbidden_terms?: string[];
  target_audience?: string;
  main_topics?: string[];
}

export async function searchSimilarChunks(
  userEmail: string,
  query: string,
  count = 6,
  threshold = 0.35
): Promise<ChunkResult[]> {
  const embedding = await generateEmbedding(query);

  const { data, error } = await supabaseAdmin.rpc("match_training_chunks", {
    query_embedding: JSON.stringify(embedding),
    match_user_email: userEmail,
    match_count: count,
    match_threshold: threshold,
  });

  if (error) {
    // pgvector not set up yet — fail silently
    console.warn("[rag] match_training_chunks error:", error.message);
    return [];
  }
  return (data ?? []) as ChunkResult[];
}

export async function getUserAIProfile(userEmail: string): Promise<UserAIProfile | null> {
  const { data } = await supabaseAdmin
    .from("user_ai_profile")
    .select("brand_voice,writing_style,preferred_structure,forbidden_terms,target_audience,main_topics")
    .eq("user_email", userEmail)
    .single();

  return data ?? null;
}

export function buildRAGContext(chunks: ChunkResult[], profile: UserAIProfile | null): string {
  if (chunks.length === 0 && !profile) return "";

  let ctx = "";

  if (chunks.length > 0) {
    ctx += `\n\n══════════════════════════════════════
BASE DE CONHECIMENTO DO USUÁRIO (PRIORIDADE MÁXIMA)
══════════════════════════════════════
Use os trechos abaixo como contexto PRINCIPAL. Priorize estas informações sobre qualquer conhecimento genérico. Não invente se houver informação treinada disponível.

${chunks.map((c, i) => `[Trecho ${i + 1} — similaridade ${(c.similarity * 100).toFixed(0)}%]:\n${c.chunk_text}`).join("\n\n")}`;
  }

  if (profile) {
    const lines: string[] = [];
    if (profile.brand_voice)         lines.push(`Tom de voz: ${profile.brand_voice}`);
    if (profile.writing_style)       lines.push(`Estilo de escrita: ${profile.writing_style}`);
    if (profile.target_audience)     lines.push(`Público-alvo: ${profile.target_audience}`);
    if (profile.preferred_structure) lines.push(`Estrutura preferida: ${profile.preferred_structure}`);
    if (profile.forbidden_terms?.length) lines.push(`Termos proibidos: ${profile.forbidden_terms.join(", ")}`);
    if (profile.main_topics?.length) lines.push(`Temas principais: ${profile.main_topics.join(", ")}`);

    if (lines.length > 0) {
      ctx += `\n\n══════════════════════════════════════
PERFIL DA IA DO USUÁRIO
══════════════════════════════════════
Aplique este perfil em todo o conteúdo gerado:
${lines.join("\n")}`;
    }
  }

  if (ctx) {
    ctx += "\n\nIMPORTANTE: Gere conteúdo 100% alinhado com a base de conhecimento e perfil acima. Mantenha o tom, estilo e público definidos.";
  }

  return ctx;
}
