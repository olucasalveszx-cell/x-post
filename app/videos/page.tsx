import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import VideoLibrary from "@/components/VideoLibrary/VideoLibrary";

export const metadata = {
  title: "Biblioteca de Vídeos · Netpost",
};

export default function VideosPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="border-b border-zinc-900 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/editor"
            className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors w-fit"
          >
            <ArrowLeft size={16} />
            Voltar ao editor
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Biblioteca de Vídeos</h1>
          <p className="text-zinc-400 mt-2 text-sm">
            Faça upload de vídeos, gerencie e agende publicações nas redes sociais.
          </p>
        </div>

        <VideoLibrary />
      </div>
    </main>
  );
}
