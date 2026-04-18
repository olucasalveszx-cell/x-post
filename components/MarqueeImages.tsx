"use client";

const SLIDES = [
  { id: "1614642264762-d0a3b8bf3700", num: "01", title: "Artemis II: os astronautas que vão à Lua", body: "a missão que muda tudo", tag: "ESPAÇO" },
  { id: "1611974789855-9c2a0a7236a3", num: "02", title: "Como a guerra impacta sua carteira", body: "o que ninguém te explica", tag: "ECONOMIA" },
  { id: "1626814026160-2237a95fc5a0", num: "03", title: "As 5 séries que todo mundo vai assistir", body: "em 2025", tag: "SÉRIES" },
  { id: "1677442135703-1787eea5ce01", num: "04", title: "IA vai substituir sua profissão?", body: "a verdade que poucos falam", tag: "INTELIGÊNCIA ARTIFICIAL" },
  { id: "1639762681057-408e52192e55", num: "05", title: "Bitcoin vai a $200k ainda em 2025?", body: "análise completa", tag: "CRIPTO" },
  { id: "1579952363873-27f3bade9f55", num: "06", title: "Copa do Mundo 2026: o Brasil tem chance?", body: "dados que surpreendem", tag: "ESPORTES" },
  { id: "1518770660439-4636190af475", num: "07", title: "ChatGPT vs Gemini: qual é melhor?", body: "comparação honesta", tag: "TECNOLOGIA" },
  { id: "1559757148-5c350d0d3c56", num: "08", title: "Hábitos que destroem sua saúde mental", body: "e você nem percebe", tag: "SAÚDE" },
  { id: "1466611653911-95081537e5b7", num: "09", title: "O futuro da energia solar no Brasil", body: "números que impressionam", tag: "SUSTENTABILIDADE" },
  { id: "1469474968028-56623f02e42e", num: "10", title: "Os destinos mais baratos de 2025", body: "para conhecer ainda esse ano", tag: "VIAGEM" },
  { id: "1507003211169-0a1dd7228f2d", num: "11", title: "Por que você procrastina tanto?", body: "a ciência por trás do hábito", tag: "PSICOLOGIA" },
  { id: "1593941707882-a5bba14938c7", num: "12", title: "Tesla ou BYD: quem vai dominar?", body: "guerra dos carros elétricos", tag: "AUTOMÓVEIS" },
  { id: "1552820728-8b83bb6b773f", num: "13", title: "Os games que definem uma geração", body: "e o mercado bilionário por trás", tag: "GAMES" },
  { id: "1554224155-6726b3ff858f", num: "14", title: "Como sair do vermelho em 90 dias", body: "método comprovado", tag: "FINANÇAS" },
  { id: "1489599849927-2ee91cede3ba", num: "15", title: "Oscar 2025: os filmes favoritos", body: "quem vai levar a estatueta", tag: "CINEMA" },
  { id: "1501386761578-eaa54b8657d8", num: "16", title: "Os artistas que vão explodir em 2025", body: "descubra antes de todo mundo", tag: "MÚSICA" },
  { id: "1445205170230-053b83016050", num: "17", title: "Tendências de moda que chegam forte", body: "o que vestir esse ano", tag: "MODA" },
  { id: "1532094349884-543290f4b8e0", num: "18", title: "Descobertas científicas que mudam tudo", body: "em 2025", tag: "CIÊNCIA" },
  { id: "1529107386315-e1a2ed48a620", num: "19", title: "Eleições ao redor do mundo em 2025", body: "o que está em jogo", tag: "POLÍTICA" },
  { id: "1554080353-a576cf803bda", num: "20", title: "Elon Musk: gênio ou perigo?", body: "análise sem filtro", tag: "NEGÓCIOS" },
  { id: "1614642264762-d0a3b8bf3700", num: "21", title: "5 hábitos de quem acorda cedo", body: "e muda de vida", tag: "PRODUTIVIDADE" },
  { id: "1611974789855-9c2a0a7236a3", num: "22", title: "O que os ricos fazem diferente", body: "segredos que ninguém conta", tag: "FINANÇAS" },
  { id: "1626814026160-2237a95fc5a0", num: "23", title: "Alimentação que acelera o metabolismo", body: "baseado em ciência", tag: "SAÚDE" },
  { id: "1677442135703-1787eea5ce01", num: "24", title: "Marketing digital em 2025", body: "o que mudou e o que ficou", tag: "MARKETING" },
];

const ROW1 = SLIDES.slice(0, 8);
const ROW2 = SLIDES.slice(8, 16);
const ROW3 = SLIDES.slice(16, 24);

const ACCENTS = ["#a855f7", "#ec4899", "#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#f97316"];

function imgUrl(id: string) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=400&h=530&q=80`;
}

function SlideCard({ slide, index }: { slide: typeof SLIDES[0]; index: number }) {
  const accent = ACCENTS[index % ACCENTS.length];
  const dots = 5;
  const active = index % dots;

  return (
    <div
      className="shrink-0 rounded-3xl overflow-hidden relative select-none group"
      style={{
        width: 220,
        height: 310,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgUrl(slide.id)}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
        draggable={false}
      />

      {/* Overlay gradiente */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.82) 38%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0.08) 100%)",
      }} />

      {/* Barra de cor no topo */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accent }} />

      {/* Conteúdo */}
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        {/* Tag + número */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black tracking-[0.18em] uppercase px-2 py-0.5 rounded-full"
            style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}>
            {slide.tag}
          </span>
          <span className="text-[10px] font-black" style={{ color: "rgba(255,255,255,0.2)" }}>
            {slide.num}
          </span>
        </div>

        {/* Texto */}
        <div className="flex flex-col gap-1.5">
          <div style={{ width: 20, height: 2.5, borderRadius: 9999, backgroundColor: accent }} />

          <p className="text-white font-black leading-tight" style={{ fontSize: 14, lineHeight: 1.2 }}>
            {slide.title}
          </p>

          <p className="font-medium" style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.35 }}>
            {slide.body}
          </p>

          {/* Indicador de slides + marca */}
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1">
              {Array.from({ length: dots }).map((_, i) => (
                <div key={i} style={{
                  width: i === active ? 14 : 4,
                  height: 4,
                  borderRadius: 9999,
                  background: i === active ? accent : "rgba(255,255,255,0.2)",
                  transition: "width 0.3s",
                }} />
              ))}
            </div>
            <span style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", fontWeight: 700, textTransform: "uppercase" }}>
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
  speed = 45,
}: {
  slides: typeof SLIDES;
  direction: "left" | "right";
  speed?: number;
}) {
  const doubled = [...slides, ...slides];
  return (
    <div className="overflow-hidden w-full" style={{ maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)" }}>
      <div
        className={direction === "left" ? "marquee-left" : "marquee-right"}
        style={{ animationDuration: `${speed}s`, willChange: "transform" }}
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
    <div className="flex flex-col gap-4 w-full select-none py-2">
      <MarqueeRow slides={ROW1} direction="left"  speed={52} />
      <MarqueeRow slides={ROW2} direction="right" speed={65} />
      <MarqueeRow slides={ROW3} direction="left"  speed={44} />
    </div>
  );
}
