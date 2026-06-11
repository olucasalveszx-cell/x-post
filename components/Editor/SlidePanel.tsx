"use client";

import { Slide } from "@/types";

interface Props {
  slides: Slide[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export default function SlidePanel({ slides, currentIndex, onSelect }: Props) {
  return (
    <div className="w-32 bg-[#080808] border-l border-[#161616] overflow-y-auto flex flex-col gap-2 p-2">
      {slides.map((slide, i) => (
        <button
          key={slide.id}
          onClick={() => onSelect(i)}
          className={`relative w-full aspect-[9/16] rounded overflow-hidden border-2 transition-all ${
            i === currentIndex
              ? "border-brand-500 shadow-lg shadow-brand-500/20"
              : "border-transparent hover:border-[#444]"
          }`}
          style={{ backgroundColor: slide.backgroundColor }}
          title={`Slide ${i + 1}`}
        >
          {/* Mini preview dos elementos de texto */}
          {slide.elements
            .filter((el) => el.type === "text")
            .slice(0, 2)
            .map((el) => (
              <div
                key={el.id}
                className="absolute text-white overflow-hidden"
                style={{
                  left: `${(el.x / slide.width) * 100}%`,
                  top: `${(el.y / slide.height) * 100}%`,
                  width: `${(el.width / slide.width) * 100}%`,
                  fontSize: 4,
                  lineHeight: 1.3,
                  color: (el.style as any)?.color ?? "#fff",
                }}
              >
                {el.content?.slice(0, 40)}
              </div>
            ))}

          {/* Número do slide */}
          <span className="absolute bottom-1 right-1 text-[9px] text-white/60 bg-black/40 rounded px-1">
            {i + 1}
          </span>
        </button>
      ))}
    </div>
  );
}
