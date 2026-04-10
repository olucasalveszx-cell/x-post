"use client";

// Imagens curadas do Pexels (portraits + tech + lifestyle)
const ROW1_IDS = [1181686, 3861969, 2379004, 1181424, 3861958, 1587009, 3184360, 2182970, 1462630, 3861972];
const ROW2_IDS = [3184339, 1181695, 2102416, 3184292, 1181671, 3862132, 2182981, 1587014, 3861994, 2379005];

function imgUrl(id: number) {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=300&h=400&fit=crop`;
}

interface RowProps {
  ids: number[];
  direction: "left" | "right";
  speed?: number;
}

function MarqueeRow({ ids, direction, speed = 35 }: RowProps) {
  // Duplica para loop infinito
  const doubled = [...ids, ...ids];

  return (
    <div className="overflow-hidden w-full">
      <div
        className={direction === "left" ? "marquee-left" : "marquee-right"}
        style={{ animationDuration: `${speed}s` }}
      >
        {doubled.map((id, i) => (
          <div
            key={i}
            className="shrink-0 rounded-xl overflow-hidden"
            style={{ width: 180, height: 240 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl(id)}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MarqueeImages() {
  return (
    <div className="flex flex-col gap-3 w-full select-none">
      <MarqueeRow ids={ROW1_IDS} direction="left" speed={40} />
      <MarqueeRow ids={ROW2_IDS} direction="right" speed={50} />
    </div>
  );
}
