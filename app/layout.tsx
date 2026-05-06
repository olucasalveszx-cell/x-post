import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import RegisterSW from "@/components/RegisterSW";
import Script from "next/script";

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
      </head>
      <body className="antialiased">
        {/* Runs before ANY bundle — overrides Storage.prototype.setItem to never throw */}
        <Script id="ls-guard" strategy="beforeInteractive">{`
(function(){try{
  var orig=Storage.prototype.setItem;
  function clean(k,v){
    if(typeof v!=='string'||v.indexOf('data:')===-1)return v;
    try{
      var p=JSON.parse(v);
      if(Array.isArray(p)){p=p.map(function(x){return Object.assign({},x,{avatarSrc:(x.avatarSrc&&x.avatarSrc.indexOf('http')===0)?x.avatarSrc:undefined});});}
      else if(p&&p.avatarSrc&&p.avatarSrc.indexOf('http')!==0){p.avatarSrc=undefined;}
      return JSON.stringify(p);
    }catch(e){return v;}
  }
  Storage.prototype.setItem=function(k,v){
    if(k==='xpz_profile'||k==='xpz_profiles')v=clean(k,v);
    try{orig.call(this,k,v);}catch(e){}
  };
  ['xpz_profile','xpz_profiles'].forEach(function(k){
    try{
      var val=localStorage.getItem(k);
      if(!val||val.indexOf('data:')===-1)return;
      var cleaned=clean(k,val);
      localStorage.removeItem(k);
      try{orig.call(localStorage,k,cleaned);}catch(e){}
    }catch(e){}
  });
}catch(e){}})();
        `}</Script>
        <Providers>{children}</Providers>
        <RegisterSW />
      </body>
    </html>
  );
}
