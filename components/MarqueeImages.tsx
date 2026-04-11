"use client";

const SLIDES = [
  { id: 1181686, num: "01", title: "Como dobrar seu engajamento em 7 dias", tag: "Marketing" },
  { id: 3861969, num: "02", title: "3 estratégias que ninguém te contou", tag: "Growth" },
  { id: 2379004, num: "03", title: "O erro que 90% dos criadores cometem", tag: "Conteúdo" },
  { id: 1181424, num: "04", title: "Segredo dos perfis com 100k seguidores", tag: "Instagram" },
  { id: 3861958, num: "05", title: "Por que seu carrossel não viraliza", tag: "Estratégia" },
  { id: 1587009, num: "06", title: "IA que gera conteúdo em segundos", tag: "Tecnologia" },
  { id: 3184360, num: "07", title: "Como criar autoridade no seu nicho", tag: "Branding" },
  { id: 2182970, num: "08", title: "5 gatilhos mentais que vendem mais", tag: "Vendas" },
  { id: 1462630, num: "09", title: "Roteiro completo para posts virais", tag: "Viral" },
  { id: 3861972, num: "10", title: "Monetize seu Instagram do zero", tag: "Renda" },
  { id: 3184339, num: "11", title: "A fórmula dos carrosséis que param o scroll", tag: "Conteúdo" },
  { id: 1181695, num: "12", title: "Como usar IA para criar em escala", tag: "IA" },
  { id: 2102416, num: "13", title: "Checklist: antes de publicar seu post", tag: "Produção" },
  { id: 3184292, num: "14", title: "Copywriting para redes sociais", tag: "Copy" },
  { id: 1181671, num: "15", title: "Do zero aos primeiros 10k em 90 dias", tag: "Crescimento" },
  { id: 3862132, num: "16", title: "Tendências de conteúdo para 2025", tag: "Tendências" },
  { id: 2182981, num: "17", title: "Como escrever títulos irresistíveis", tag: "Copy" },
  { id: 1587014, num: "18", title: "Métricas que realmente importam", tag: "Dados" },
  { id: 3861994, num: "19", title: "Agenda de postagem que funciona", tag: "Planejamento" },
  { id: 2379005, num: "20", title: "Design de slides que convertem", tag: "Design" },
];

const ROW1 = SLIDES.slice(0, 10);
const ROW2 = SLIDES.slice(10, 20);

const ACCENTS = ["#a855f7", "#ec4899", "#3b82f6", "#f59e0b", "#10b981", "#ef4444"];

function imgUrl(id: number) {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400&h=530&fit=crop`;
}

function SlideCard({ slide, index }: { slide: typeof SLIDES[0]; index: number }) {
  const accent = ACCENTS[index % ACCENTS.length];
  return (
    <div
      className="shrink-0 rounded-2xl overflow-hidden relative select-none"
      style={{ width: 200, height: 266 }}
    >
      {/* Imagem de fundo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgUrl(slide.id)}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Overlay gradiente */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

      {/* Conteúdo */}
      <div className="absolute inset-0 flex flex-col justify-between p-3.5">
        {/* Topo: número + tag */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black tracking-widest" style={{ color: accent }}>
            {slide.num}
          </span>
          <span
            className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${accent}25`, color: accent, border: `1px solid ${accent}50` }}
          >
            {slide.tag}
          </span>
        </div>

        {/* Base: título + linha accent */}
        <div className="flex flex-col gap-2">
          <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: accent }} />
          <p className="text-white text-[12px] font-bold leading-tight line-clamp-3">
            {slide.title}
          </p>
          <span className="text-[9px] text-white/40 font-medium tracking-wider uppercase">
            XPost Zone
          </span>
        </div>
      </div>
    </div>
  );
}

function MarqueeRow({ slides, direction, speed = 40 }: { slides: typeof SLIDES; direction: "left" | "right"; speed?: number }) {
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
      <MarqueeRow slides={ROW1} direction="left" speed={45} />
      <MarqueeRow slides={ROW2} direction="right" speed={55} />
    </div>
  );
}
