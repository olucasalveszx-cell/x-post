"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";
import AppLogo from "@/components/AppLogo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || "Erro ao autenticar."); return; }
    router.push("/admin");
    router.refresh();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#060606" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
      >
        {/* Header */}
        <div
          className="flex flex-col items-center gap-3 px-6 py-8"
          style={{ background: "linear-gradient(135deg,#080e40 0%,#0d0d1f 100%)", borderBottom: "1px solid #1e1e1e" }}
        >
          <AppLogo variant="dark" size={48} textClassName="font-black text-white text-lg tracking-tight" />
          <p className="text-xs text-brand-500">Painel Administrativo</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="email"
              placeholder="E-mail admin"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#131313] border border-[#2a2a2a] focus:border-purple-600 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors"
            />
          </div>

          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type={showPw ? "text" : "password"}
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-[#131313] border border-[#2a2a2a] focus:border-purple-600 rounded-xl pl-9 pr-10 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#3b5bdb,#4c6ef5)", color: "white" }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
