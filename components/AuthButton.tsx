"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { LogIn } from "lucide-react";
import LoginModal from "@/components/LoginModal";

interface Props {
  isPro?: boolean;
}

export default function AuthButton({ isPro }: Props) {
  const { data: session, status } = useSession();
  const [loginOpen, setLoginOpen] = useState(false);

  if (status === "loading") return null;

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        {isPro && (
          <span className="flex items-center gap-1 text-[10px] text-yellow-400 font-semibold bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
            PRO
          </span>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {session.user.image && (
          <img src={session.user.image} alt="" className="w-7 h-7 rounded-full border border-white/10" />
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setLoginOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-2)] bg-[var(--bg-3)] hover:bg-[var(--bg-4)] text-xs text-[var(--text-2)] transition-colors"
      >
        <LogIn size={13} />
        Entrar
      </button>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
