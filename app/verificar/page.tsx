"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLogo from "@/components/AppLogo";

export default function VerificarPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function handleChange(i: number, val: string) {
    const char = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = char;
    setDigits(next);
    setError("");
    if (char && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = [...digits];
    text.split("").forEach((c, i) => { next[i] = c; });
    setDigits(next);
    inputs.current[Math.min(text.length, 5)]?.focus();
  }

  async function handleVerify() {
    const code = digits.join("");
    if (code.length < 6) { setError("Digite os 6 dígitos do código."); return; }
    setLoading(true);
    setError("");

    const result = await signIn("otp", {
      email,
      otp: code,
      redirect: false,
    });

    setLoading(false);
    if (result?.ok) {
      router.replace("/editor");
    } else {
      setError("Código inválido ou expirado. Tente novamente.");
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setResent(false);
    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setResent(true);
      setResendCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    }
  }

  return (
    <main className="min-h-screen bg-[#060606] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <AppLogo variant="dark" size={36} />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))", border: "1px solid rgba(99,102,241,0.3)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient></defs>
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>

          <h1 className="text-xl font-bold text-white mb-2">Verifique seu e-mail</h1>
          <p className="text-sm text-gray-400 mb-1">
            Enviamos um código de 6 dígitos para
          </p>
          <p className="text-sm font-semibold text-white mb-7 truncate">{email}</p>

          {/* Inputs OTP */}
          <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-11 h-13 text-center text-xl font-bold text-white rounded-xl border outline-none transition-all"
                style={{
                  height: 52,
                  background: "rgba(255,255,255,0.05)",
                  border: d ? "1.5px solid #6366f1" : error ? "1.5px solid #ef4444" : "1.5px solid rgba(255,255,255,0.12)",
                  caretColor: "#6366f1",
                }}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}

          {resent && (
            <p className="text-green-400 text-sm mb-4">Código reenviado com sucesso!</p>
          )}

          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-60 mb-4"
            style={{ background: "linear-gradient(135deg,#3b5bdb,#4c6ef5)" }}>
            {loading ? "Verificando..." : "Confirmar código"}
          </button>

          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-40">
            {resendCooldown > 0
              ? `Reenviar em ${resendCooldown}s`
              : "Não recebeu? Reenviar código"}
          </button>
        </div>
      </div>
    </main>
  );
}
