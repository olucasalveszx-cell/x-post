"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogIn, LogOut, Crown, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import LoginModal from "@/components/LoginModal";

interface Props {
  isPro?: boolean;
}

export default function AuthButton({ isPro }: Props) {
  const { data: session, status } = useSession();
  const [loginOpen, setLoginOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/admin/me").then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => {});
  }, [session]);

  if (status === "loading") return null;

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        {isPro && (
          <span className="flex items-center gap-1 text-[10px] text-yellow-400 font-semibold bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
            <Crown size={9} /> PRO
          </span>
        )}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors font-semibold"
            title="Admin Dashboard"
          >
            <LayoutDashboard size={14} /> <span className="hidden md:inline">Dashboard</span>
          </Link>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {session.user.image && (
          <img src={session.user.image} alt="" className="w-7 h-7 rounded-full border border-white/10" />
        )}
        <span className="text-xs text-gray-400 hidden md:block max-w-[120px] truncate">
          {session.user.name}
        </span>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          title="Sair"
        >
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setLoginOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-colors"
      >
        <LogIn size={13} />
        Entrar
      </button>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
