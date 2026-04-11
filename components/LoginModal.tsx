"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { signIn } from "next-auth/react";
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  callbackUrl?: string;
}

type Tab  = "google" | "email";
type Mode = "login" | "register";

/* ── Google logo SVG ── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function LoginModal({ open, onClose, callbackUrl = "/editor" }: Props) {
  const [tab,  setTab]  = useState<Tab>("google");
  const [mode, setMode] = useState<Mode>("login");

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  if (!open) return null;

  const reset = () => {
    setName(""); setEmail(""); setPassword(""); setConfirm("");
    setError(""); setLoading(false); setShowPw(false);
  };

  const switchMode = (m: Mode) => { setMode(m); reset(); };
  const switchTab  = (t: Tab)  => { setTab(t);  reset(); };

  /* ── Google ── */
  const handleGoogle = () => {
    setLoading(true);
    signIn("google", { callbackUrl });
  };

  /* ── Login com e-mail ── */
  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) { setError("Preencha e-mail e senha."); return; }
    setLoading(true);
    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) { setError("E-mail ou senha incorretos."); return; }
    onClose();
    window.location.href = callbackUrl;
  };

  /* ── Cadastro ── */
  const handleRegister = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) { setError("Preencha todos os campos."); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    if (password.length < 6)  { setError("A senha precisa ter no mínimo 6 caracteres."); return; }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
    });
    const data = await res.json();
    if (!res.ok) { setLoading(false); setError(data.error || "Erro ao criar conta."); return; }

    // Auto-login após registro
    const login = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) { setError("Conta criada! Faça login para continuar."); switchMode("login"); return; }
    onClose();
    window.location.href = callbackUrl;
  };

  const inputClass = `
    w-full bg-[#131313] border border-[#2a2a2a] focus:border-purple-600
    rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600
    outline-none transition-colors
  `;

  const content = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(10px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ background: "linear-gradient(135deg,#1a0533 0%,#0d0d1f 100%)", borderBottom: "1px solid #1e1e1e" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
            >
              <Sparkles size={15} color="white" />
            </div>
            <span className="font-black text-white tracking-tight">XPost Zone</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs Google / E-mail */}
        <div className="flex border-b border-[#1e1e1e]">
          {(["google", "email"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className="flex-1 py-3.5 text-sm font-medium transition-colors"
              style={{
                color: tab === t ? "#a855f7" : "#4b5563",
                borderBottom: tab === t ? "2px solid #a855f7" : "2px solid transparent",
              }}
            >
              {t === "google" ? "Entrar com Google" : "E-mail e senha"}
            </button>
          ))}
        </div>

        <div className="px-6 py-6 space-y-4">

          {/* ─── Google ─── */}
          {tab === "google" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 text-center">
                Faça login com sua conta Google para continuar.
              </p>
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#2a2a2a] bg-white hover:bg-gray-100 text-sm font-medium text-gray-800 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 size={17} className="animate-spin text-gray-500" /> : <GoogleIcon />}
                Continuar com Google
              </button>
              <p className="text-center text-xs text-gray-600 pt-1">
                Prefere usar e-mail?{" "}
                <button onClick={() => switchTab("email")} className="text-purple-400 hover:text-purple-300 underline transition-colors">
                  Clique aqui
                </button>
              </p>
            </div>
          )}

          {/* ─── E-mail ─── */}
          {tab === "email" && (
            <div className="space-y-3">
              {/* Sub-tabs login/registro */}
              <div className="flex bg-[#131313] rounded-xl p-1 gap-1">
                {(["login", "register"] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: mode === m ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "transparent",
                      color: mode === m ? "white" : "#6b7280",
                    }}
                  >
                    {m === "login" ? "Já tenho conta" : "Criar conta"}
                  </button>
                ))}
              </div>

              {/* Campos */}
              {mode === "register" && (
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={inputClass}
                    style={{ paddingLeft: "2.25rem" }}
                  />
                </div>
              )}

              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && mode === "login") handleLogin(); }}
                  className={inputClass}
                  style={{ paddingLeft: "2.25rem" }}
                />
              </div>

              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Senha (mín. 6 caracteres)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && mode === "login") handleLogin(); }}
                  className={inputClass}
                  style={{ paddingLeft: "2.25rem", paddingRight: "2.5rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {mode === "register" && (
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Confirmar senha"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleRegister(); }}
                    className={inputClass}
                    style={{ paddingLeft: "2.25rem" }}
                  />
                </div>
              )}

              {/* Erro */}
              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Botão principal */}
              <button
                onClick={mode === "login" ? handleLogin : handleRegister}
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}
              >
                {loading
                  ? <Loader2 size={16} className="animate-spin" />
                  : mode === "login" ? "Entrar" : "Criar conta grátis"}
              </button>

              {/* Separador */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-[#1e1e1e]" />
                <span className="text-xs text-gray-700">ou</span>
                <div className="flex-1 h-px bg-[#1e1e1e]" />
              </div>

              {/* Google como opção secundária */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-[#2a2a2a] bg-white hover:bg-gray-100 text-xs font-medium text-gray-800 transition-all disabled:opacity-50"
              >
                <GoogleIcon />
                Continuar com Google
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
