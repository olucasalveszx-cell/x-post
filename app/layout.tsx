import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "XPost Zone — Criador de Carrosséis para Instagram",
  description: "Crie carrosséis para Instagram com IA, baseado em dados reais da web.",
  icons: {
    icon: "/logo.png.png",
    apple: "/logo.png.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased"><Providers>{children}</Providers></body>
    </html>
  );
}
