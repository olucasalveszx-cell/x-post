"use client";

const ROW1 = [
  { id: "1554224155-6726b3ff858f", title: "Como sair do vermelho em 90 dias", body: "método comprovado", tag: "FINANÇAS", accent: "#10b981" },
  { id: "1571019613454-1cb2f99b2d8b", title: "Rotina de treino para iniciantes", body: "sem precisar de academia", tag: "FITNESS", accent: "#f97316" },
  { id: "1614642264762-d0a3b8bf3700", title: "IA vai substituir sua profissão?", body: "a verdade que poucos falam", tag: "TECNOLOGIA", accent: "#a855f7" },
  { id: "1611974789855-9c2a0a7236a3", title: "5 hábitos de quem acorda cedo", body: "e transforma a vida", tag: "PRODUTIVIDADE", accent: "#3b82f6" },
  { id: "1469474968028-56623f02e42e", title: "Os destinos mais baratos de 2025", body: "para viajar esse ano", tag: "VIAGEM", accent: "#06b6d4" },
  { id: "1507003211169-0a1dd7228f2d", title: "Por que você procrastina tanto?", body: "a ciência por trás do hábito", tag: "PSICOLOGIA", accent: "#ec4899" },
  { id: "1518770660439-4636190af475", title: "ChatGPT vs Gemini: qual é melhor?", body: "comparação honesta", tag: "IA", accent: "#8b5cf6" },
  { id: "1579952363873-27f3bade9f55", title: "Copa do Mundo 2026: Brasil tem chance?", body: "dados que surpreendem", tag: "ESPORTES", accent: "#f59e0b" },
  { id: "1489599849927-2ee91cede3ba", title: "3 erros que estão te impedindo de crescer", body: "no Instagram hoje", tag: "MARKETING", accent: "#ef4444" },
  { id: "1532094349884-543290f4b8e0", title: "Descobertas científicas de 2025", body: "que vão mudar sua vida", tag: "CIÊNCIA", accent: "#14b8a6" },
];

const ROW2 = [
  { id: "1593941707882-a5bba14938c7", title: "Tesla ou BYD: quem vai dominar?", body: "guerra dos elétricos", tag: "NEGÓCIOS", accent: "#f97316" },
  { id: "1466611653911-95081537e5b7", title: "Energia solar: vale a pena em 2025?", body: "números reais do mercado", tag: "SUSTENTABILIDADE", accent: "#10b981" },
  { id: "1501386761578-eaa54b8657d8", title: "Os artistas que vão explodir em 2025", body: "descubra antes de todo mundo", tag: "MÚSICA", accent: "#ec4899" },
  { id: "1552820728-8b83bb6b773f", title: "Como monetizar sua conta no Instagram", body: "do zero à renda extra", tag: "REDES SOCIAIS", accent: "#a855f7" },
  { id: "1445205170230-053b83016050", title: "Tendências de moda que chegam forte", body: "o que vestir esse ano", tag: "MODA", accent: "#f472b6" },
  { id: "1677442135703-1787eea5ce01", title: "Alimentação anti-inflamatória", body: "baseado em ciência", tag: "SAÚDE", accent: "#06b6d4" },
  { id: "1529107386315-e1a2ed48a620", title: "Eleições 2025: o que está em jogo", body: "análise sem filtro", tag: "POLÍTICA", accent: "#ef4444" },
  { id: "1554080353-a576cf803bda", title: "Elon Musk: gênio ou perigo?", body: "análise completa", tag: "TECNOLOGIA", accent: "#8b5cf6" },
  { id: "1639762681057-408e52192e55", title: "Bitcoin vai a $200k ainda em 2025?", body: "análise do mercado", tag: "CRIPTO", accent: "#f59e0b" },
  { id: "1559757148-5c350d0d3c56", title: "Saúde mental: sinais que você ignora", body: "e você nem percebe", tag: "SAÚDE MENTAL", accent: "#3b82f6" },
];

function imgUrl(id: string) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=400&h=530&q=85`;
}

function SlideCard({ slide, idx }: { slide: typeof ROW1[0]; idx: number }) {
  const dots = 5;
  const active = idx % dots;

  return (
    <div
      className="shrink-0 rounded-3xl overflow-hidden relative select-none group cursor-default"
      style={{
        width: 215,
        height: 300,
        boxShadow: "0 12px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)",
      }}
    >
      {/* Foto */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgUrl(slide.id)}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
        loading="lazy"
        draggable={false}
      />

      {/* Overlay */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.18) 68%, rgba(0,0,0,0.04) 100%)",
      }} />

      {/* Barra accent no topo */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: slide.accent }} />

      <div className="absolute inset-0 flex flex-col justify-between p-4">
        {/* Tag */}
        <div className="self-start px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase"
          style={{ background: `${slide.accent}28`, color: slide.accent, border: `1px solid ${slide.accent}50` }}>
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
                <div key={i} style={{
                  width: i === active ? 16 : 4,
                  height: 3.5,
                  borderRadius: 9999,
                  background: i === active ? slide.accent : "rgba(255,255,255,0.18)",
                  transition: "width 0.3s",
                }} />
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

function MarqueeRow({ slides, direction, speed }: { slides: typeof ROW1; direction: "left" | "right"; speed: number }) {
  const doubled = [...slides, ...slides];
  return (
    <div className="overflow-hidden w-full"
      style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)", maskImage: "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)" }}>
      <div
        className={direction === "left" ? "marquee-left" : "marquee-right"}
        style={{ animationDuration: `${speed}s`, willChange: "transform" }}
      >
        {doubled.map((slide, i) => (
          <SlideCard key={i} slide={slide} idx={i % slides.length} />
        ))}
      </div>
    </div>
  );
}

export default function MarqueeImages() {
  return (
    <div className="flex flex-col gap-4 w-full select-none py-2">
      <MarqueeRow slides={ROW1} direction="left"  speed={55} />
      <MarqueeRow slides={ROW2} direction="right" speed={68} />
    </div>
  );
}
