import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import RegisterSW from "@/components/RegisterSW";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://xpostzone.online";

export const metadata: Metadata = {
  title: "XPost — Criador de Carrosséis para Instagram com IA",
  description:
    "Chega de perder horas criando conteúdo. O XPost gera carrosséis completos com IA — do texto às imagens — em menos de 3 minutos.",
  metadataBase: new URL(APP_URL),
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/tema_black.png" }],
    shortcut: "/favicon.ico",
    apple: "/tema_black.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "XPost",
  },
  openGraph: {
    title: "XPost — Criador de Carrosséis para Instagram com IA",
    description:
      "Chega de perder horas criando conteúdo. O XPost gera carrosséis completos com IA — do texto às imagens — em menos de 3 minutos.",
    url: APP_URL,
    siteName: "XPost",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "https://xpostzone.online/link.png", width: 1200, height: 630, alt: "XPost" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "XPost — Criador de Carrosséis para Instagram com IA",
    description:
      "Chega de perder horas criando conteúdo. O XPost gera carrosséis completos com IA — do texto às imagens — em menos de 3 minutos.",
    images: ["https://xpostzone.online/link.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366f1",
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
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Inline — runs synchronously before any React/webpack bundle, preventing QuotaExceededError */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var _o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){try{_o.call(this,k,v);}catch(e){}};var su=function(s){return typeof s==="string"&&s.indexOf("http")===0&&s.length<500?s:void 0;};["xpz_profile","xpz_profiles"].forEach(function(k){try{var v=localStorage.getItem(k);if(!v)return;var p=JSON.parse(v);var c=Array.isArray(p)?p.map(function(x){return Object.assign({},x,{avatarSrc:su(x.avatarSrc)});}):Object.assign({},p,{avatarSrc:su(p.avatarSrc)});var cs=JSON.stringify(c);if(cs!==v){localStorage.removeItem(k);try{_o.call(localStorage,k,cs);}catch(e){}}}catch(e){try{localStorage.removeItem(k);}catch(e2){}}});}catch(e){}})();` }} />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <RegisterSW />
      </body>
    </html>
  );
}
