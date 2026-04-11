"use client";

const SLIDES = [
  { id: 1181686, num: "01", title: "Como dobrar seu engajamento", body: "em apenas 7 dias", tag: "MARKETING" },
  { id: 3861969, num: "02", title: "3 estratégias que ninguém te contou", body: "sobre crescimento no IG", tag: "GROWTH" },
  { id: 2379004, num: "03", title: "O erro que 90% dos criadores cometem", body: "e como evitar agora", tag: "CONTEÚDO" },
  { id: 1181424, num: "04", title: "Segredo dos perfis com 100k", body: "o que eles fazem diferente", tag: "INSTAGRAM" },
  { id: 3861958, num: "05", title: "Por que seu carrossel não viraliza", body: "o diagnóstico completo", tag: "ESTRATÉGIA" },
  { id: 1587009, num: "06", title: "IA que gera conteúdo em segundos", body: "sem contratar ninguém", tag: "TECNOLOGIA" },
  { id: 3184360, num: "07", title: "Como criar autoridade no nicho", body: "do zero ao especialista", tag: "BRANDING" },
  { id: 2182970, num: "08", title: "5 gatilhos mentais que vendem", body: "aplicados ao Instagram", tag: "VENDAS" },
  { id: 1462630, num: "09", title: "Roteiro completo para posts virais", body: "copie e adapte agora", tag: "VIRAL" },
  { id: 3861972, num: "10", title: "Monetize seu Instagram do zero", body: "mesmo sem produto próprio", tag: "RENDA" },
  { id: 3184339, num: "11", title: "A fórmula do carrossel que para o scroll", body: "testada com 1M de views", tag: "CONTEÚDO" },
  { id: 1181695, num: "12", title: "Como usar IA para criar em escala", body: "10x mais conteúdo por semana", tag: "IA" },
  { id: 2102416, num: "13", title: "Checklist antes de publicar", body: "nunca mais poste errado", tag: "PRODUÇÃO" },
  { id: 3184292, num: "14", title: "Copywriting para redes sociais", body: "palavras que vendem", tag: "COPY" },
  { id: 1181671, num: "15", title: "Do zero aos primeiros 10k", body: "em 90 dias de consistência", tag: "CRESCIMENTO" },
  { id: 3862132, num: "16", title: "Tendências de conteúdo 2025", body: "o que vai dominar o feed", tag: "TENDÊNCIAS" },
  { id: 2182981, num: "17", title: "Como escrever títulos irresistíveis", body: "que ninguém consegue ignorar", tag: "COPY" },
  { id: 1587014, num: "18", title: "Métricas que realmente importam", body: "pare de olhar curtidas", tag: "DADOS" },
  { id: 3861994, num: "19", title: "Agenda de postagem que funciona", body: "horários e frequência certa", tag: "PLANEJAMENTO" },
  { id: 2379005, num: "20", title: "Design de slides que convertem", body: "sem ser designer", tag: "DESIGN" },
];

const ROW1 = SLIDES.slice(0, 10);
const ROW2 = SLIDES.slice(10, 20);

const ACCENTS = ["#a855f7", "#ec4899", "#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#f97316"];

function imgUrl(id: number) {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=360&h=480&fit=crop`;
}

function SlideCard({ slide, index }: { slide: typeof SLIDES[0]; index: number }) {
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <div
      className="shrink-0 rounded-2xl overflow-hidden relative select-none"
      style={{ width: 195, height: 280 }}
    >
      {/* Imagem */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgUrl(slide.id)}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        draggable={false}
      />

      {/* Gradiente dramático — escuro embaixo, quase transparente em cima */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.80) 45%, rgba(0,0,0,0.20) 75%, rgba(0,0,0,0.05) 100%)",
        }}
      />

      {/* Conteúdo */}
      <div className="absolute inset-0 flex flex-col justify-between p-4">

        {/* Topo: número do slide */}
        <div
          className="text-[10px] font-black tracking-[0.2em] uppercase"
          style={{ color: accent }}
        >
          {slide.tag} · {slide.num}
        </div>

        {/* Base: linha acento + título + subtítulo */}
        <div className="flex flex-col gap-1.5">
          {/* Linha colorida */}
          <div style={{ width: 24, height: 2, borderRadius: 9999, backgroundColor: accent }} />

          {/* Título grande */}
          <p
            className="text-white font-black leading-tight"
            style={{ fontSize: 15, lineHeight: 1.15 }}
          >
            {slide.title}
          </p>

          {/* Subtítulo */}
          <p
            className="font-medium"
            style={{ fontSize: 10, color: "rgba(255,255,255,0.50)", lineHeight: 1.4 }}
          >
            {slide.body}
          </p>

          {/* Branding */}
          <div className="flex items-center gap-1 mt-0.5">
            <div style={{ width: 4, height: 4, borderRadius: 9999, backgroundColor: accent }} />
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.30)", letterSpacing: "0.15em", fontWeight: 600, textTransform: "uppercase" }}>
              XPost Zone
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
  speed = 40,
}: {
  slides: typeof SLIDES;
  direction: "left" | "right";
  speed?: number;
}) {
  const doubled = [...slides, ...slides];
  return (
    <div className="overflow-hidden w-full">
      <div
        className={direction === "left" ? "marquee-left" : "marquee-right"}
        style={{ animationDuration: `${speed}s` }}
      >
        {doubled.map((slide, i) => (
          <SlideCard key={i} slide={slide} index={i % slides.length} />
        ))}
      </div>
    </div>
  );
}

export default function MarqueeImages() {
  return (
    <div className="flex flex-col gap-3 w-full select-none">
      <MarqueeRow slides={ROW1} direction="left" speed={50} />
      <MarqueeRow slides={ROW2} direction="right" speed={62} />
    </div>
  );
}
