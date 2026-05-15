"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const clearAndReload = () => {
    try { localStorage.clear(); } catch {}
    window.location.href = "/editor";
  };

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "monospace", background: "#0a0a0a", color: "#f0f0f0", padding: 32, margin: 0 }}>
        <h2 style={{ color: "#f87171", marginTop: 0 }}>Algo deu errado</h2>
        <pre style={{ background: "#1a1a1a", padding: 16, borderRadius: 8, overflowX: "auto", fontSize: 13, color: "#fca5a5", whiteSpace: "pre-wrap" }}>
          {error?.message ?? "Erro desconhecido"}
          {"\n\n"}
          {error?.stack ?? ""}
        </pre>
        {error?.digest && (
          <p style={{ color: "#6b7280", fontSize: 12 }}>Digest: {error.digest}</p>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button
            onClick={clearAndReload}
            style={{ padding: "10px 24px", background: "#ef4444", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "monospace", fontSize: 14 }}
          >
            🗑️ Limpar dados e recarregar
          </button>
          <button
            onClick={reset}
            style={{ padding: "10px 24px", background: "#4c6ef5", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "monospace", fontSize: 14 }}
          >
            ↩ Tentar novamente
          </button>
        </div>
        <p style={{ color: "#6b7280", fontSize: 12, marginTop: 16 }}>
          Se o erro persistir após limpar os dados, tente abrir em aba anônima.
        </p>
      </body>
    </html>
  );
}
