"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Sparkles } from "lucide-react";

function SuccessContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6 text-center px-6">
      <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
        <CheckCircle size={40} className="text-green-400" />
      </div>
      <div>
        <h1 className="text-3xl font-bold mb-2">Pagamento confirmado!</h1>
        <p className="text-gray-400 text-sm">
          Seu plano será ativado automaticamente em até 1 minuto.
        </p>
      </div>
      <div className="flex flex-col gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-sm text-purple-300 text-left max-w-xs">
        <span className="flex items-center gap-2"><Sparkles size={14} /> Imagens por IA desbloqueadas</span>
        <span className="flex items-center gap-2"><Sparkles size={14} /> Todos os estilos disponíveis</span>
        <span className="flex items-center gap-2"><Sparkles size={14} /> Créditos mensais adicionados</span>
      </div>
      <button
        onClick={() => router.replace("/editor")}
        className="px-8 py-3 rounded-full font-semibold transition-colors text-white"
        style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
      >
        Ir para o editor
      </button>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-500" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
