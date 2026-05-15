"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "monospace", background: "#0a0a0a", color: "#f0f0f0", padding: 32, margin: 0 }}>
        <h2 style={{ color: "#f87171", marginTop: 0 }}>Erro na aplicação</h2>
        <pre style={{ background: "#1a1a1a", padding: 16, borderRadius: 8, overflowX: "auto", fontSize: 13, color: "#fca5a5", whiteSpace: "pre-wrap" }}>
          {error?.message ?? "Erro desconhecido"}
          {"\n\n"}
          {error?.stack ?? ""}
        </pre>
        {error?.digest && (
          <p style={{ color: "#6b7280", fontSize: 12 }}>Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          style={{ marginTop: 16, padding: "8px 20px", background: "#4c6ef5", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
