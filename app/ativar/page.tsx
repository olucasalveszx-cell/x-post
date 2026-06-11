"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Mail, Sparkles } from "lucide-react";

export default function AtivarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleActivate = async () => {
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.valid && data.token) {
        localStorage.setItem("xpz_activation_token", data.token);
        localStorage.setItem("xpz_email", data.email);
        setStatus("ok");
      } else {
        setErrorMsg(data.error ?? "Email não encontrado.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Erro ao conectar. Tente novamente.");
      setStatus("error");
    }
  };

  if (status === "ok") {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle size={40} className="text-green-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">Acesso Pro ativado!</h1>
          <p className="text-gray-400 text-sm">Imagens Gemini IA desbloqueadas para <span className="text-white">{email}</span></p>
        </div>
        <div className="flex flex-col gap-2 bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 text-sm text-brand-300 text-left max-w-xs">
          <span className="flex items-center gap-2"><Sparkles size={14} /> Imagens Gemini IA desbloqueadas</span>
          <span className="flex items-center gap-2"><Sparkles size={14} /> Todos os estilos disponíveis</span>
          <span className="flex items-center gap-2"><Sparkles size={14} /> Publicação direta no Instagram</span>
        </div>
        <button onClick={() => router.replace("/editor")}
          className="px-8 py-3 rounded-full bg-brand-600 hover:bg-brand-700 font-semibold transition-colors">
          Criar meu carrossel Pro
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center">
        <Mail size={32} className="text-brand-400" />
      </div>
      <div>
        <h1 className="text-3xl font-bold mb-2">Ativar acesso Pro</h1>
        <p className="text-gray-400 text-sm max-w-xs">Digite o email que você usou na compra para ativar seu acesso.</p>
      </div>
      <div className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleActivate()}
          placeholder="seu@email.com"
          className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-500 placeholder:text-gray-600"
        />
        {status === "error" && (
          <p className="text-red-400 text-xs text-left">{errorMsg}</p>
        )}
        <button onClick={handleActivate} disabled={!email.trim() || status === "loading"}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-brand-600 hover:bg-brand-700 font-medium transition-colors disabled:opacity-40">
          {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Ativar acesso Pro
        </button>
      </div>
      <p className="text-xs text-gray-600 max-w-xs">
        Comprou pelo Kirvano? Use o mesmo email da compra.{" "}
        <a href="/editor" className="text-brand-400 hover:underline">Voltar ao editor</a>
      </p>
    </div>
  );
}
