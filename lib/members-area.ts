import { redisGet, redisSet } from "@/lib/redis";

export interface MemberVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  addedAt: string;
}

export interface MemberTopic {
  id: string;
  emoji: string;
  title: string;
  description: string;
  videos: MemberVideo[];
}

// Tópicos pré-definidos — o admin só precisa subir os vídeos
export const TOPIC_DEFS: Omit<MemberTopic, "videos">[] = [
  { id: "primeiros-passos",  emoji: "🚀", title: "Primeiros Passos",          description: "Como criar sua conta, navegar pelo editor e gerar seu primeiro carrossel." },
  { id: "gerando-ia",        emoji: "🤖", title: "Gerando com IA",             description: "Como usar o gerador de IA por tema, prompt personalizado e configurações avançadas." },
  { id: "editando-slides",   emoji: "✏️",  title: "Editando Slides",            description: "Selecionar, mover, redimensionar e editar textos e imagens no canvas." },
  { id: "layouts-design",    emoji: "🎨", title: "Layouts e Design",           description: "Os 5 layouts disponíveis, como trocar sem regerar e personalizar cores." },
  { id: "imagens-fotos",     emoji: "📸", title: "Imagens e Fotos",            description: "Imagem de referência, foto real vs IA, banco de imagens e biblioteca." },
  { id: "publicando-ig",     emoji: "📱", title: "Publicando no Instagram",    description: "Conectar sua conta, publicar carrosséis e entender os requisitos da API." },
  { id: "auto-post",         emoji: "⏱", title: "Auto-post Agendado",         description: "Criar agendamentos, aprovar previews e publicar automaticamente no horário certo." },
  { id: "nexa-ia",           emoji: "💬", title: "Nexa IA",                   description: "Como usar a assistente para criar conteúdo, reescrever textos e gerar prompts." },
  { id: "planos-creditos",   emoji: "💳", title: "Planos e Créditos",         description: "Diferença entre planos, como comprar créditos e ativar o plano PRO." },
  { id: "dicas-avancadas",   emoji: "⭐", title: "Dicas Avançadas",           description: "Truques de produtividade, atalhos de teclado e fluxos profissionais." },
];

const videosKey = (topicId: string) => `members:videos:${topicId}`;

export async function getTopicVideos(topicId: string): Promise<MemberVideo[]> {
  const raw = await redisGet(videosKey(topicId));
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function setTopicVideos(topicId: string, videos: MemberVideo[]): Promise<void> {
  await redisSet(videosKey(topicId), JSON.stringify(videos));
}

export async function getAllTopics(): Promise<MemberTopic[]> {
  return Promise.all(
    TOPIC_DEFS.map(async (def) => ({
      ...def,
      videos: await getTopicVideos(def.id),
    }))
  );
}
