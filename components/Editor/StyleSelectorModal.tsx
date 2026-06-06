"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Mic2, Sparkles, Twitter } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (style: "layouts" | "twitter" | "comrosto" | "biblioteca" | "choquei" | "transcricao") => void;
}

const STYLES = [
  {
    id: "layouts" as const,
    label: "Gerar Layouts",
    desc: "Imagens por IA em cada slide com gradientes",
    borderActive: "border-indigo-500/60",
    bgActive: "bg-indigo-500/8",
    btnCls: "bg-indigo-600 hover:bg-indigo-500",
    tag: { color: "text-indigo-200 bg-indigo-500/25 border-indigo-400/20", icon: <Sparkles size={7} />, text: "IA" },
    preview: (
      <div className="absolute inset-0" style={{ background: "#07091f" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "9px 9px" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 130% 50% at 50% 0%, rgba(99,102,241,0.3) 0%, transparent 70%)" }} />
        {/* Slide mockup */}
        <div className="absolute" style={{ left:"8%", right:"8%", top:"5%", height:"64%", borderRadius:10, overflow:"hidden", boxShadow:"0 14px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)" }}>
          <div className="absolute inset-0" style={{ background:"linear-gradient(150deg, #0d1b4b 0%, #1e3a8a 45%, #312e81 100%)" }}>
            <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse at 68% 40%, rgba(139,92,246,0.5) 0%, transparent 55%)" }} />
            <div className="absolute inset-0" style={{ background:"linear-gradient(to top, rgba(7,9,31,0.92) 0%, transparent 52%)" }} />
          </div>
          {/* Floating orb */}
          <div className="absolute" style={{ top:"-8%", right:"-8%", width:55, height:55, borderRadius:"50%", background:"radial-gradient(circle, rgba(139,92,246,0.4), transparent 65%)" }} />
          {/* Text */}
          <div className="absolute" style={{ bottom:"24%", left:"10%", right:"10%" }}>
            <div style={{ height:2, width:20, borderRadius:1, background:"#818cf8", marginBottom:8 }} />
            <div style={{ height:11, borderRadius:6, background:"rgba(255,255,255,0.92)", marginBottom:6 }} />
            <div style={{ height:7, width:"68%", borderRadius:4, background:"rgba(255,255,255,0.38)" }} />
          </div>
          {/* IA badge */}
          <div className="absolute" style={{ top:8, left:8, padding:"2px 7px", borderRadius:20, background:"rgba(99,102,241,0.4)", border:"1px solid rgba(165,180,252,0.32)", fontSize:7, fontWeight:700, color:"rgba(199,210,254,0.9)", display:"flex", alignItems:"center", gap:3 }}>
            <Sparkles size={5} style={{ color:"#a5b4fc" }} /> IA
          </div>
        </div>
        {/* Dots */}
        <div className="absolute" style={{ bottom:"7%", left:"50%", transform:"translateX(-50%)", display:"flex", gap:5, alignItems:"center" }}>
          {[1,0,0,0].map((a,i)=><div key={i} style={{ width:a?16:5, height:4, borderRadius:2, background:a?"#6366f1":"rgba(255,255,255,0.1)" }} />)}
        </div>
        <div className="absolute" style={{ bottom:"6%", right:"10%", fontSize:8, color:"rgba(255,255,255,0.2)", fontWeight:600 }}>1/5</div>
      </div>
    ),
  },
  {
    id: "twitter" as const,
    label: "Estilo Twitter / X",
    desc: "Capa com foto + slides brancos com grid + perfil fixo",
    borderActive: "border-sky-500/60",
    bgActive: "bg-sky-500/8",
    btnCls: "bg-sky-600 hover:bg-sky-500",
    tag: { color: "text-sky-600 bg-sky-100 border-sky-200", icon: <Twitter size={7} />, text: "X" },
    preview: (
      <div className="absolute inset-0" style={{ background:"#f4f4f4" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {[16.6,33.3,50,66.6,83.3].map(y=><line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(0,0,0,0.045)" strokeWidth="0.5"/>)}
          {[14.3,28.6,42.9,57.1,71.4,85.7].map(x=><line key={x} x1={x} y1="0" x2={x} y2="100" stroke="rgba(0,0,0,0.045)" strokeWidth="0.5"/>)}
        </svg>
        {/* Cover */}
        <div className="absolute" style={{ left:"6%", right:"6%", top:"3%", height:"29%", borderRadius:8, overflow:"hidden", boxShadow:"0 2px 14px rgba(0,0,0,0.14)" }}>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,#1d9bf0 0%,#0a5fa3 100%)" }}>
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.55),transparent 50%)" }} />
            <div style={{ position:"absolute", bottom:"20%", left:"8%", right:"22%", height:9, borderRadius:5, background:"rgba(255,255,255,0.92)" }} />
            <div style={{ position:"absolute", bottom:"7%", left:"8%", right:"38%", height:6.5, borderRadius:4, background:"rgba(255,255,255,0.5)" }} />
          </div>
        </div>
        {/* Profile */}
        <div className="absolute" style={{ left:"6%", right:"6%", top:"35.5%", display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:20, height:20, borderRadius:"50%", background:"linear-gradient(135deg,#1d9bf0,#0a5fa3)", flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:3 }}>
              <div style={{ width:38, height:6.5, borderRadius:3, background:"#1a1a1a" }} />
              <div style={{ width:9, height:9, borderRadius:"50%", background:"#1d9bf0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ width:5, height:4, borderRadius:1, background:"white" }} />
              </div>
            </div>
            <div style={{ width:26, height:5, borderRadius:3, background:"#aaa", marginTop:2.5 }} />
          </div>
          <div style={{ fontSize:12, fontWeight:900, color:"#222", fontFamily:"Georgia,serif" }}>𝕏</div>
        </div>
        {/* Tweet text */}
        <div className="absolute" style={{ left:"6%", right:"6%", top:"53%" }}>
          {[{w:"92%",op:0.75,h:6.5},{w:"80%",op:0.72,h:6.5},{w:"86%",op:0.38,h:5.5}].map((l,i)=>(
            <div key={i} style={{ height:l.h, width:l.w, borderRadius:3, background:`rgba(20,20,20,${l.op})`, marginBottom:i<2?4:0 }} />
          ))}
        </div>
        {/* Stats */}
        <div className="absolute" style={{ left:"6%", right:"6%", bottom:"5%", display:"flex", gap:10 }}>
          {[{w:12},{w:18},{w:22}].map((s,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:3 }}>
              <div style={{ width:9, height:9, borderRadius:2, background:"rgba(0,0,0,0.1)" }} />
              <div style={{ width:s.w, height:5, borderRadius:3, background:"rgba(0,0,0,0.1)" }} />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "comrosto" as const,
    label: "Com Rosto",
    desc: "Seu rosto preservado em cada imagem",
    borderActive: "border-amber-500/60",
    bgActive: "bg-amber-500/8",
    btnCls: "bg-amber-600 hover:bg-amber-500",
    tag: { color: "text-amber-200 bg-amber-500/25 border-amber-400/20", icon: <span style={{fontSize:7}}>●</span>, text: "Rosto" },
    preview: (
      <div className="absolute inset-0" style={{ background:"linear-gradient(165deg,#130a02 0%,#2d1206 45%,#3d1a08 100%)" }}>
        <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse at 50% 30%, rgba(251,146,60,0.18), transparent 62%)" }} />
        <div className="absolute inset-0" style={{ background:"linear-gradient(to top,rgba(0,0,0,0.82) 0%,transparent 58%)" }} />
        {/* Portrait outer ring */}
        <div className="absolute" style={{ top:"8%", left:"50%", transform:"translateX(-50%)", width:54, height:54, borderRadius:"50%", border:"1.5px solid rgba(251,146,60,0.4)", boxShadow:"0 0 22px rgba(251,146,60,0.18)" }}>
          {/* Inner portrait */}
          <div style={{ position:"absolute", inset:3, borderRadius:"50%", background:"linear-gradient(145deg,#5c2d0a,#8b4513,#cd853f,#d2691e)", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:"18%", left:"20%", right:"20%", height:1.5, borderRadius:1, background:"rgba(255,220,180,0.45)" }} />
            <div style={{ position:"absolute", top:"38%", left:"24%", right:"24%", height:1.5, borderRadius:1, background:"rgba(255,220,180,0.38)" }} />
            <div style={{ position:"absolute", top:"56%", left:"18%", right:"18%", height:1.5, borderRadius:1, background:"rgba(255,220,180,0.32)" }} />
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at 35% 35%, rgba(255,200,120,0.25), transparent 60%)" }} />
          </div>
        </div>
        {/* Handle badge */}
        <div className="absolute" style={{ top:"52%", left:"50%", transform:"translateX(-50%)", padding:"2.5px 10px", borderRadius:20, background:"rgba(251,146,60,0.12)", border:"1px solid rgba(251,146,60,0.28)" }}>
          <div style={{ width:44, height:5, borderRadius:3, background:"rgba(251,146,60,0.5)" }} />
        </div>
        {/* Content */}
        <div className="absolute" style={{ bottom:"22%", left:"10%", right:"10%" }}>
          <div style={{ height:11, borderRadius:6, background:"rgba(255,255,255,0.9)", marginBottom:6 }} />
          <div style={{ height:7, width:"60%", margin:"0 auto", borderRadius:4, background:"rgba(255,255,255,0.38)" }} />
        </div>
        <div className="absolute" style={{ bottom:"16%", left:"34%", right:"34%", height:2.5, borderRadius:1, background:"rgba(251,146,60,0.55)" }} />
      </div>
    ),
  },
  {
    id: "choquei" as const,
    label: "📰 Estilo Choquei",
    desc: "Perfil + título + imagem e vídeo lado a lado",
    borderActive: "border-white/30",
    bgActive: "bg-white/6",
    btnCls: "bg-white/15 hover:bg-white/25",
    tag: { color: "text-gray-300 bg-white/10 border-white/15", icon: <span style={{fontSize:7}}>📰</span>, text: "News" },
    preview: (
      <div className="absolute inset-0" style={{ background:"#080808" }}>
        {/* Header */}
        <div className="absolute" style={{ top:"4%", left:"5%", right:"5%", display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:17, height:17, borderRadius:"50%", background:"linear-gradient(135deg,#383838,#1a1a1a)", border:"1px solid rgba(255,255,255,0.1)", flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ width:34, height:6, borderRadius:3, background:"rgba(255,255,255,0.78)" }} />
            <div style={{ width:22, height:4.5, borderRadius:3, background:"rgba(255,255,255,0.24)", marginTop:2.5 }} />
          </div>
          <div style={{ fontSize:13, fontWeight:900, color:"rgba(255,255,255,0.45)", fontFamily:"Georgia,serif" }}>𝕏</div>
        </div>
        <div className="absolute" style={{ top:"19%", left:0, right:0, height:1, background:"rgba(255,255,255,0.06)" }} />
        {/* Headline */}
        <div className="absolute" style={{ top:"23%", left:"5%", right:"5%" }}>
          <div style={{ height:8.5, borderRadius:4, background:"rgba(255,255,255,0.9)", marginBottom:5 }} />
          <div style={{ height:8.5, borderRadius:4, background:"rgba(255,255,255,0.72)", marginBottom:4, width:"80%" }} />
          <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,0.28)", width:"58%" }} />
        </div>
        <div className="absolute" style={{ top:"47%", left:0, right:0, height:1, background:"rgba(255,255,255,0.06)" }} />
        {/* Media panels */}
        <div className="absolute" style={{ top:"49%", bottom:"3%", left:"2%", right:"2%", display:"flex", gap:"2%" }}>
          <div style={{ flex:1, borderRadius:6, overflow:"hidden", position:"relative", background:"linear-gradient(145deg,#1a1f3a,#0f1628)" }}>
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 40% 60%, rgba(99,102,241,0.22), transparent 60%)" }} />
            <div style={{ position:"absolute", bottom:4, left:4, fontSize:6, color:"rgba(255,255,255,0.3)", fontWeight:700, letterSpacing:1 }}>IMG</div>
          </div>
          <div style={{ flex:1, borderRadius:6, overflow:"hidden", position:"relative", background:"#111" }}>
            <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:15, height:15, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.22)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:0, height:0, borderTop:"4.5px solid transparent", borderBottom:"4.5px solid transparent", borderLeft:"7px solid rgba(255,255,255,0.38)", marginLeft:1.5 }} />
            </div>
            <div style={{ position:"absolute", bottom:4, left:4, fontSize:6, color:"rgba(255,255,255,0.2)", fontWeight:700, letterSpacing:1 }}>VID</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "biblioteca" as const,
    label: "Da Biblioteca",
    desc: "Reutiliza imagens salvas — sem custo de geração",
    borderActive: "border-blue-500/60",
    bgActive: "bg-blue-500/8",
    btnCls: "bg-blue-600 hover:bg-blue-500",
    tag: { color: "text-blue-200 bg-blue-500/25 border-blue-400/20", icon: <span style={{fontSize:7}}>◫</span>, text: "Lib" },
    preview: (
      <div className="absolute inset-0" style={{ background:"linear-gradient(160deg,#060c1a 0%,#0a1528 100%)" }}>
        <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse at 28% 28%, rgba(59,130,246,0.12), transparent 58%)" }} />
        {/* Search bar */}
        <div className="absolute" style={{ top:"4%", left:"7%", right:"7%", height:13, borderRadius:6, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", paddingLeft:7, gap:5 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", border:"1.5px solid rgba(255,255,255,0.2)" }} />
          <div style={{ width:28, height:4, borderRadius:2, background:"rgba(255,255,255,0.1)" }} />
        </div>
        {/* Photo grid */}
        <div className="absolute" style={{ top:"19%", left:"6%", right:"6%", bottom:"14%", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4 }}>
          {[
            "linear-gradient(to bottom,#fb923c 0%,#f59e0b 50%,#b45309 100%)",
            "linear-gradient(165deg,#bfdbfe 0%,#3b82f6 55%,#1e40af 100%)",
            "linear-gradient(to bottom,#bbf7d0 0%,#16a34a 55%,#14532d 100%)",
            "radial-gradient(ellipse at 30% 20%,#4338ca 0%,#1e1b4b 55%,#0a0818 100%)",
            "linear-gradient(145deg,#fde68a 0%,#f59e0b 50%,#92400e 100%)",
            "linear-gradient(135deg,#7c3aed 0%,#db2777 52%,#f97316 100%)",
          ].map((bg,i)=>(
            <div key={i} style={{ borderRadius:5, background:bg, aspectRatio:"1/1", position:"relative",
              border: i===0?"1.5px solid rgba(59,130,246,0.55)":"none",
              boxShadow: i===0?"0 0 9px rgba(59,130,246,0.32)":"none" }}>
              {i===0 && <div style={{ position:"absolute", top:3, right:3, width:6, height:6, borderRadius:"50%", background:"#3b82f6", boxShadow:"0 0 7px rgba(59,130,246,0.9)" }} />}
            </div>
          ))}
        </div>
        {/* Footer bar */}
        <div className="absolute" style={{ bottom:"4%", left:"6%", right:"6%", height:9, borderRadius:4, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", display:"flex", alignItems:"center", paddingLeft:8, gap:6 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:"rgba(59,130,246,0.55)" }} />
          <div style={{ width:28, height:4, borderRadius:2, background:"rgba(255,255,255,0.18)" }} />
        </div>
      </div>
    ),
  },
  {
    id: "transcricao" as const,
    label: "🎙️ Transcrição",
    desc: "Áudio/vídeo → resumo → carrossel gerado por IA",
    borderActive: "border-violet-500/60",
    bgActive: "bg-violet-500/8",
    btnCls: "bg-violet-600 hover:bg-violet-500",
    tag: { color: "text-violet-200 bg-violet-500/25 border-violet-400/20", icon: <Mic2 size={7} />, text: "Áudio" },
    preview: (
      <div className="absolute inset-0" style={{ background:"linear-gradient(160deg,#090012 0%,#110020 50%,#180032 100%)" }}>
        <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse at 50% 15%, rgba(139,92,246,0.24), transparent 60%)" }} />
        {/* Mic icon */}
        <div className="absolute" style={{ top:"6%", left:"50%", transform:"translateX(-50%)", width:30, height:30, borderRadius:"50%", background:"rgba(139,92,246,0.18)", border:"1px solid rgba(167,139,250,0.32)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 18px rgba(139,92,246,0.2)" }}>
          <Mic2 size={13} style={{ color:"rgba(196,181,253,0.9)" }} />
        </div>
        {/* Waveform */}
        <div className="absolute" style={{ top:"30%", left:"7%", right:"7%", height:"24%", display:"flex", alignItems:"center", justifyContent:"center", gap:"1.8%" }}>
          {[0.25,0.55,0.82,1,0.62,0.38,0.88,0.75,0.48,0.72,0.95,0.58,0.33,0.68,0.86,0.42,0.72,0.52,0.28].map((h,i)=>(
            <div key={i} style={{ flex:1, height:`${h*100}%`, borderRadius:99, background:`rgba(${(i>=9&&i<=11)?'216,180,254':'167,139,250'},${0.32+h*0.5})` }} />
          ))}
        </div>
        {/* Progress */}
        <div className="absolute" style={{ top:"58%", left:"10%", right:"10%", height:3, borderRadius:99, background:"rgba(255,255,255,0.06)" }}>
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:"44%", borderRadius:99, background:"linear-gradient(90deg,#7c3aed,#a855f7)" }} />
          <div style={{ position:"absolute", top:"50%", transform:"translateY(-50%)", left:"44%", marginLeft:-4, width:7, height:7, borderRadius:"50%", background:"#c084fc", boxShadow:"0 0 7px rgba(192,132,252,0.65)" }} />
        </div>
        {/* Transcript lines */}
        <div className="absolute" style={{ top:"67%", left:"8%", right:"8%", display:"flex", flexDirection:"column", gap:4.5 }}>
          {[{w:"100%",op:0.62},{w:"83%",op:0.44},{w:"68%",op:0.28}].map((l,i)=>(
            <div key={i} style={{ height:5.5, width:l.w, borderRadius:3, background:`rgba(255,255,255,${l.op})` }} />
          ))}
        </div>
        {/* Chip */}
        <div className="absolute" style={{ bottom:"3.5%", left:"50%", transform:"translateX(-50%)", padding:"2.5px 9px", borderRadius:20, background:"rgba(124,58,237,0.28)", border:"1px solid rgba(167,139,250,0.28)", fontSize:6.5, fontWeight:700, color:"rgba(216,180,254,0.9)", whiteSpace:"nowrap" }}>
          Whisper IA
        </div>
      </div>
    ),
  },
];

const SLOT = 162;

export default function StyleSelectorModal({ open, onClose, onSelect }: Props) {
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(() => setActive(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setActive(i => Math.min(STYLES.length - 1, i + 1)), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Enter") onSelect(STYLES[active].id);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, active, prev, next, onSelect, onClose]);

  useEffect(() => { if (open) setActive(0); }, [open]);

  if (!open) return null;

  const current = STYLES[active];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-2)] border border-[var(--border-2)] rounded-2xl p-5 w-full max-w-[92vw] md:max-w-[520px] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-[var(--text)]">Como quer criar?</h2>
            <p className="text-xs text-[var(--text-3)] mt-0.5">Use ← → ou deslize para navegar</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-3)] text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* 3D Carousel */}
        <div
          className="relative select-none"
          style={{ height: 230, overflow: "hidden" }}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (dx < -40) next();
            else if (dx > 40) prev();
            touchStartX.current = null;
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {STYLES.map((s, i) => {
              const dist = i - active;
              const absDist = Math.abs(dist);
              if (absDist > 2) return null;
              const scale   = [1, 0.72, 0.52][absDist];
              const opacity = [1, 0.58, 0.22][absDist];
              const ry      = -dist * [0, 42, 60][absDist];
              const tx      = dist * SLOT;
              const isActive = dist === 0;
              return (
                <div
                  key={s.id}
                  onClick={() => isActive ? onSelect(s.id) : setActive(i)}
                  style={{
                    position: "absolute",
                    width: 148,
                    transform: `perspective(600px) translateX(${tx}px) rotateY(${ry}deg) scale(${scale})`,
                    opacity,
                    zIndex: 10 - absDist,
                    transition: "transform 0.38s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.38s ease",
                    transformOrigin: "center center",
                    cursor: "pointer",
                  }}
                >
                  <div
                    className="relative w-full rounded-2xl overflow-hidden"
                    style={{
                      aspectRatio: "4/5",
                      boxShadow: isActive
                        ? "0 20px 60px rgba(0,0,0,0.75), 0 0 0 1.5px rgba(255,255,255,0.07)"
                        : "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                  >
                    {s.preview}
                    <div className={`absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-bold border ${s.tag.color}`}>
                      {s.tag.icon} {s.tag.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active card info */}
        <div className="text-center mt-3 min-h-[38px]">
          <p className="font-bold text-[var(--text)] text-sm leading-tight">{current.label}</p>
          <p className="text-[11px] text-[var(--text-3)] mt-0.5">{current.desc}</p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-3 gap-3">
          <button onClick={prev} disabled={active === 0}
            className="p-2 rounded-xl border border-[var(--border-2)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-3)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5">
            {STYLES.map((_, i) => (
              <button key={i} onClick={() => setActive(i)}
                className={`rounded-full transition-all duration-300 ${i === active ? "w-5 h-1.5 bg-brand-500" : "w-1.5 h-1.5 bg-[var(--border-2)] hover:bg-[var(--text-3)]"}`}
              />
            ))}
          </div>
          <button onClick={next} disabled={active === STYLES.length - 1}
            className="p-2 rounded-xl border border-[var(--border-2)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-3)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <button
          onClick={() => onSelect(current.id)}
          className={`w-full mt-3 py-3 rounded-xl font-semibold text-sm text-white transition-all shadow-lg ${current.btnCls}`}
        >
          Usar — {current.label}
        </button>

        <p className="text-center text-[10px] text-[var(--text-3)] mt-2.5">
          Você pode mudar o estilo a qualquer momento após gerar
        </p>
      </div>
    </div>
  );
}
