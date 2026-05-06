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
        {/* Intercepts ALL localStorage.setItem calls — runs before any bundle, including cached ones */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){try{
  var _set=localStorage.setItem.bind(localStorage);
  localStorage.setItem=function(k,v){
    // Strip base64 avatars from profile keys before writing
    if((k==='xpz_profile'||k==='xpz_profiles')&&typeof v==='string'&&v.indexOf('data:')!==-1){
      try{
        var p=JSON.parse(v);
        if(Array.isArray(p)){p=p.map(function(x){return Object.assign({},x,{avatarSrc:(x.avatarSrc&&x.avatarSrc.indexOf('http')===0)?x.avatarSrc:undefined});});}
        else if(p&&p.avatarSrc&&p.avatarSrc.indexOf('http')!==0){p.avatarSrc=undefined;}
        v=JSON.stringify(p);
      }catch(e){}
    }
    try{_set(k,v);}catch(e){}
  };
  // Clean existing base64 on load
  ['xpz_profile','xpz_profiles'].forEach(function(k){
    try{
      var val=localStorage.getItem(k);
      if(!val||val.indexOf('data:')===-1)return;
      var p=JSON.parse(val);
      if(Array.isArray(p)){p=p.map(function(x){return Object.assign({},x,{avatarSrc:(x.avatarSrc&&x.avatarSrc.indexOf('http')===0)?x.avatarSrc:undefined});});}
      else if(p&&p.avatarSrc&&p.avatarSrc.indexOf('http')!==0){p.avatarSrc=undefined;}
      localStorage.removeItem(k);
      try{_set(k,JSON.stringify(p));}catch(e){}
    }catch(e){}
  });
}catch(e){}})();
        ` }} />
      </head>
      <body className="antialiased"><Providers>{children}</Providers><RegisterSW /></body>
    </html>
  );
}
