"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2, Sparkles } from "lucide-react";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) { router.replace("/editor"); return; }

    fetch(`/api/stripe/verify?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.active && data.customerId) {
          localStorage.setItem("xpz_customer_id", data.customerId);
          localStorage.setItem("xpz_email", data.email ?? "");
          setEmail(data.email ?? "");
          setStatus("ok");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [searchParams, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-red-400">Não foi possível confirmar o pagamento. Tente novamente.</p>
        <button onClick={() => router.replace("/editor")} className="px-6 py-2 rounded-lg bg-brand-600 text-sm">
          Voltar ao editor
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6 text-center px-6">
      <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
        <CheckCircle size={40} className="text-green-400" />
      </div>
      <div>
        <h1 className="text-3xl font-bold mb-2">Bem-vindo ao XPost Zone Pro!</h1>
        <p className="text-gray-400 text-sm">
          Assinatura ativa para <span className="text-white">{email}</span>
        </p>
      </div>
      <div className="flex flex-col gap-2 bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 text-sm text-brand-300 text-left max-w-xs">
        <span className="flex items-center gap-2"><Sparkles size={14} /> Imagens Gemini IA desbloqueadas</span>
        <span className="flex items-center gap-2"><Sparkles size={14} /> Todos os estilos disponíveis</span>
        <span className="flex items-center gap-2"><Sparkles size={14} /> Publicação direta no Instagram</span>
      </div>
      <button
        onClick={() => router.replace("/editor")}
        className="px-8 py-3 rounded-full bg-brand-600 hover:bg-brand-700 font-semibold transition-colors"
      >
        Criar meu primeiro carrossel Pro
      </button>
    </div>
  );
}
