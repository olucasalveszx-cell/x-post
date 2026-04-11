import Link from "next/link";
import { Instagram, Sparkles, Zap, Image, ArrowRight } from "lucide-react";
import MarqueeImages from "@/components/MarqueeImages";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#050505] flex flex-col overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 z-10">
        <div className="flex items-center gap-2">
          <Instagram size={22} className="text-brand-500" />
          <span className="font-bold text-lg tracking-tight">XPost Zone</span>
        </div>
        <Link
          href="/editor"
          className="px-5 py-2 rounded-full bg-brand-600 hover:bg-brand-700 text-sm font-medium transition-colors"
        >
          Abrir editor
        </Link>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-16 pb-10 z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-xs font-medium mb-6">
          <Sparkles size={12} />
          Powered by Claude AI + Gemini + Pexels
        </div>

        <h1 className="text-5xl md:text-7xl font-bold leading-tight max-w-3xl">
          Crie carrosséis{" "}
          <span className="text-brand-500">virais</span>{" "}
          em segundos
        </h1>

        <p className="mt-5 text-gray-400 text-lg max-w-xl">
          IA que pesquisa na web, escreve o texto e gera as imagens.
          Pronto para publicar no Instagram.
        </p>

        <div className="flex items-center gap-3 mt-8">
          <Link
            href="/editor"
            className="flex items-center gap-2 px-7 py-3.5 rounded-full bg-brand-600 hover:bg-brand-700 font-semibold text-base transition-colors"
          >
            Criar meu carrossel
            <ArrowRight size={18} />
          </Link>
          <span className="text-xs text-gray-600">Grátis para começar</span>
        </div>

        {/* Features rápidas */}
        <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-gray-500">
          <span className="flex items-center gap-1.5"><Zap size={14} className="text-yellow-500" /> Pesquisa real na web</span>
          <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-brand-400" /> Texto com IA</span>
          <span className="flex items-center gap-1.5"><Image size={14} className="text-pink-400" /> Imagens geradas por IA</span>
          <span className="flex items-center gap-1.5"><Instagram size={14} className="text-orange-400" /> Publica direto no IG</span>
        </div>
      </section>

      {/* Marquee de slides */}
      <section className="w-full py-12 relative overflow-hidden">
        {/* Título da seção */}
        <div className="text-center mb-8 px-6">
          <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-2">Resultados reais</p>
          <h2 className="text-2xl md:text-3xl font-bold">
            Veja o que você vai conseguir criar{" "}
            <span className="text-brand-500">com XPost Zone</span>
          </h2>
        </div>

        {/* Fade nas bordas */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />

        <MarqueeImages />

        {/* Badge inferior */}
        <div className="flex justify-center mt-8 px-6">
          <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-gray-500">
            <Sparkles size={12} className="text-brand-400" />
            Carrosséis gerados com IA · novos estilos adicionados constantemente
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="flex flex-col items-center text-center py-16 px-6">
        <p className="text-gray-500 text-sm mb-4">Pronto para criar conteúdo viral?</p>
        <Link
          href="/editor"
          className="flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-bold text-lg transition-all hover:scale-105"
        >
          <Sparkles size={20} />
          Começar agora — é grátis
        </Link>
      </section>

    </main>
  );
}
