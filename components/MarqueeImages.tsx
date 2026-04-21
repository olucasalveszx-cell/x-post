"use client";

import { useState, useEffect } from "react";

// 20 cards — cada um com topicId único para buscar imagem gerada pelo Gemini
const ROW1 = [
  { topicId: "nutricao",      title: "Plano alimentar para emagrecer",          body: "sem passar fome",                    tag: "NUTRIÇÃO",       accent: "#10b981" },
  { topicId: "fitness",       title: "Treino completo sem academia",             body: "só com o peso do corpo",            tag: "FITNESS",        accent: "#f97316" },
  { topicId: "tecnologia",    title: "IA vai substituir sua profissão?",         body: "a verdade que poucos falam",        tag: "TECNOLOGIA",     accent: "#4c6ef5" },
  { topicId: "produtividade", title: "5 hábitos de quem acorda às 5h",          body: "e transforma a vida",               tag: "PRODUTIVIDADE",  accent: "#3b82f6" },
  { topicId: "viagem",        title: "Os destinos mais baratos do Brasil",       body: "para viajar esse ano",              tag: "VIAGEM",         accent: "#06b6d4" },
  { topicId: "psicologia",    title: "Por que você procrastina tanto?",          body: "a ciência por trás do hábito",      tag: "PSICOLOGIA",     accent: "#ec4899" },
  { topicId: "futebol",       title: "Copa 2026: Brasil vai ser campeão?",       body: "dados que surpreendem",             tag: "FUTEBOL",        accent: "#f59e0b" },
  { topicId: "marketing",     title: "3 erros que te impedem de crescer",        body: "no Instagram hoje",                 tag: "MARKETING",      accent: "#ef4444" },
  { topicId: "ciencia",       title: "Descobertas científicas de 2025",          body: "que vão mudar sua vida",            tag: "CIÊNCIA",        accent: "#14b8a6" },
  { topicId: "negocios",      title: "Como abrir um negócio do zero",            body: "sem precisar de muito capital",     tag: "NEGÓCIOS",       accent: "#8b5cf6" },
];

const ROW2 = [
  { topicId: "sustentabilidade", title: "Energia solar vale a pena em 2025?",   body: "números reais do mercado",          tag: "SUSTENTABILIDADE", accent: "#10b981" },
  { topicId: "musica",           title: "Os artistas que vão explodir em 2025", body: "descubra antes de todo mundo",      tag: "MÚSICA",           accent: "#ec4899" },
  { topicId: "moda",             title: "Tendências de moda que chegam forte",   body: "o que vestir esse ano",             tag: "MODA",             accent: "#f472b6" },
  { topicId: "saude",            title: "Alimentação anti-inflamatória",         body: "baseado em ciência",                tag: "SAÚDE",            accent: "#06b6d4" },
  { topicId: "politica",         title: "Eleições 2025: o que está em jogo",     body: "análise sem filtro",                tag: "POLÍTICA",         accent: "#ef4444" },
  { topicId: "fofoca",           title: "Polêmica dos famosos que chocou",       body: "veja o que aconteceu",              tag: "FOFOCA",           accent: "#f97316" },
  { topicId: "cripto",           title: "Bitcoin vai a $200k em 2025?",          body: "análise completa do mercado",       tag: "CRIPTO",           accent: "#f59e0b" },
  { topicId: "advocacia",        title: "Seus direitos que poucos conhecem",     body: "saiba o que a lei garante",         tag: "ADVOCACIA",        accent: "#4c6ef5" },
  { topicId: "gastronomia",      title: "Receita que virou febre nas redes",     body: "fácil, rápido e delicioso",         tag: "GASTRONOMIA",      accent: "#14b8a6" },
  { topicId: "educacao",         title: "Como estudar e reter tudo",             body: "método comprovado pela ciência",    tag: "EDUCAÇÃO",         accent: "#3b82f6" },
];

// Todos os topicIds únicos para pré-fetch
const ALL_TOPIC_IDS = [...new Set([...ROW1, ...ROW2].map((c) => c.topicId))];

function SlideCard({
  slide,
  idx,
  imageUrl,
}: {
  slide: typeof ROW1[0];
  idx: number;
  imageUrl?: string;
}) {
  const dots = 5;
  const active = idx % dots;

  return (
    <div
      className="shrink-0 rounded-3xl overflow-hidden relative select-none group cursor-default"
      style={{
        width: 215,
        height: 300,
        boxShadow: "0 12px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)",
        background: `linear-gradient(135deg, ${slide.accent}22 0%, #0a0a0a 100%)`,
      }}
    >
      {/* Foto IA — fade-in suave quando carregada */}
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: 1 }}
          loading="lazy"
          draggable={false}
        />
      )}

      {/* Placeholder animado enquanto carrega */}
      {!imageUrl && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: `linear-gradient(135deg, ${slide.accent}18 0%, #111 100%)` }}
        />
      )}

      {/* Overlay escuro para legibilidade */}
      <div className="absolute inset-0" style={{
        background: imageUrl
          ? "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.72) 40%, rgba(0,0,0,0.22) 68%, rgba(0,0,0,0.08) 100%)"
          : "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.50) 50%, rgba(0,0,0,0.10) 100%)",
      }} />

      {/* Barra accent no topo */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: slide.accent }} />

      <div className="absolute inset-0 flex flex-col justify-between p-4">
        {/* Tag */}
        <div
          className="self-start px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase"
          style={{ background: `${slide.accent}28`, color: slide.accent, border: `1px solid ${slide.accent}50` }}
        >
          {slide.tag}
        </div>

        {/* Texto + dots */}
        <div className="flex flex-col gap-1.5">
          <div style={{ width: 22, height: 2.5, borderRadius: 9999, backgroundColor: slide.accent }} />
          <p className="text-white font-black leading-snug" style={{ fontSize: 13.5 }}>
            {slide.title}
          </p>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.48)", lineHeight: 1.3 }}>
            {slide.body}
          </p>

          {/* Slide indicator + branding */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-[3px]">
              {Array.from({ length: dots }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === active ? 16 : 4,
                    height: 3.5,
                    borderRadius: 9999,
                    background: i === active ? slide.accent : "rgba(255,255,255,0.18)",
                    transition: "width 0.3s",
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 7, color: "rgba(255,255,255,0.22)", letterSpacing: "0.12em", fontWeight: 700, textTransform: "uppercase" }}>
              XPost
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarqueeRow({
  slides,
  direction,
  speed,
  images,
}: {
  slides: typeof ROW1;
  direction: "left" | "right";
  speed: number;
  images: Record<string, string>;
}) {
  const doubled = [...slides, ...slides];
  return (
    <div
      className="overflow-hidden w-full"
      style={{
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)",
        maskImage: "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)",
      }}
    >
      <div
        className={direction === "left" ? "marquee-left" : "marquee-right"}
        style={{ animationDuration: `${speed}s`, willChange: "transform" }}
      >
        {doubled.map((slide, i) => (
          <SlideCard
            key={i}
            slide={slide}
            idx={i % slides.length}
            imageUrl={images[slide.topicId]}
          />
        ))}
      </div>
    </div>
  );
}

export default function MarqueeImages() {
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    // Busca imagens em paralelo, progressivamente (cada uma aparece ao carregar)
    ALL_TOPIC_IDS.forEach(async (id) => {
      try {
        const res = await fetch(`/api/landing-images/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.url) {
          setImages((prev) => ({ ...prev, [id]: data.url }));
        }
      } catch {}
    });
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full select-none py-2">
      <MarqueeRow slides={ROW1} direction="left"  speed={55} images={images} />
      <MarqueeRow slides={ROW2} direction="right" speed={68} images={images} />
    </div>
  );
}
