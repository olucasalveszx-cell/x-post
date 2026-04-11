"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, LogOut, Users, Loader2, RefreshCw, Calendar, Mail } from "lucide-react";

interface User {
  name: string;
  email: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const router  = useRouter();
  const [users,    setUsers]    = useState<User[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const fetchUsers = async () => {
    setLoading(true); setError("");
    const res  = await fetch("/api/admin/users");
    if (res.status === 401) { router.push("/admin/login"); return; }
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Erro ao carregar."); setLoading(false); return; }
    setUsers(data.users ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []); // eslint-disable-line

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen text-white" style={{ background: "#060606" }}>

      {/* Topbar */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b border-white/5"
        style={{ background: "#0d0d0d" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
          >
            <Sparkles size={15} color="white" />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight">XPost Zone</p>
            <p className="text-[10px] text-purple-400">Admin</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <LogOut size={13} /> Sair
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className="rounded-2xl px-6 py-5"
            style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)" }}>
                <Users size={15} className="text-purple-400" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Usuários cadastrados</p>
            </div>
            <p className="text-3xl font-black">
              {loading ? "—" : users.length}
            </p>
          </div>
          <div
            className="rounded-2xl px-6 py-5"
            style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)" }}>
                <Calendar size={15} className="text-purple-400" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Último cadastro</p>
            </div>
            <p className="text-sm font-semibold text-gray-300">
              {loading || users.length === 0 ? "—" : fmt(users[0].createdAt)}
            </p>
          </div>
        </div>

        {/* Tabela de usuários */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
            <p className="font-bold text-sm">Usuários</p>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>

          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="text-purple-400 animate-spin" />
            </div>
          )}

          {!loading && error && (
            <p className="text-center text-sm text-red-400 py-10">{error}</p>
          )}

          {!loading && !error && users.length === 0 && (
            <p className="text-center text-sm text-gray-600 py-10">
              Nenhum usuário cadastrado ainda.
            </p>
          )}

          {!loading && !error && users.length > 0 && (
            <div className="divide-y divide-[#1a1a1a]">
              {/* Header da tabela */}
              <div className="grid grid-cols-12 px-5 py-2 text-[10px] text-gray-600 uppercase tracking-wider">
                <span className="col-span-4">Nome</span>
                <span className="col-span-5">E-mail</span>
                <span className="col-span-3 text-right">Cadastro</span>
              </div>
              {/* Linhas */}
              {users.map((u, i) => (
                <div key={i} className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors">
                  <div className="col-span-4 flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                    >
                      {u.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <span className="text-sm text-gray-200 truncate">{u.name || "—"}</span>
                  </div>
                  <div className="col-span-5 flex items-center gap-1.5 text-xs text-gray-500">
                    <Mail size={11} className="flex-shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                  <div className="col-span-3 text-right text-xs text-gray-600">
                    {fmt(u.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
