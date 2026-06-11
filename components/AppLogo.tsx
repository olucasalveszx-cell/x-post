import Image from "next/image";

interface AppLogoProps {
  variant?: "dark" | "light";
  size?: number;
  showText?: boolean;
  textClassName?: string;
  className?: string;
}

export default function AppLogo({
  variant = "dark",
  size = 32,
  showText = true,
  textClassName = "text-[18px] font-black tracking-tight text-white leading-none",
  className = "",
}: AppLogoProps) {
  const src = variant === "light" ? "/tema_white.png" : "/tema_black.png";

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <Image
        src={src}
        alt="XPost"
        width={size}
        height={size}
        className="rounded-xl"
        priority
      />
      {showText && (
        <span className={textClassName}>xpost</span>
      )}
    </div>
  );
}
