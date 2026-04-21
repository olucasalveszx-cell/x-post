import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://xpost.app";

export const metadata: Metadata = {
  title: "XPost — Criador de Carrosséis para Instagram com IA",
  description:
    "Crie carrosséis incríveis para Instagram e posts para Twitter/X com Inteligência Artificial em segundos.",
  metadataBase: new URL(APP_URL),
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "XPost — Criador de Carrosséis para Instagram com IA",
    description:
      "Crie carrosséis incríveis para Instagram e posts para Twitter/X com Inteligência Artificial em segundos.",
    url: APP_URL,
    siteName: "XPost",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "XPost — Criador de Carrosséis para Instagram com IA",
    description:
      "Crie carrosséis incríveis para Instagram e posts para Twitter/X com Inteligência Artificial em segundos.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased"><Providers>{children}</Providers></body>
    </html>
  );
}
