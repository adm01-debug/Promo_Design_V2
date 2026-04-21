import { useEffect, useRef } from "react";
import { AssetThumbnail } from "./AssetThumbnail";
import { cn } from "@/lib/utils";
import type { Asset } from "../hooks/use-assets";

interface Props {
  assets: Asset[];
  activeIndex: number;
  onSelect: (i: number) => void;
}

export function PreviewThumbStrip({ assets, activeIndex, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeIndex]);

  if (assets.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="border-t border-border bg-card/40 flex gap-2 overflow-x-auto p-2"
    >
      {assets.map((a, i) => (
        <button
          key={a.id}
          ref={(el) => (itemRefs.current[i] = el)}
          onClick={() => onSelect(i)}
          className={cn(
            "shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all",
            i === activeIndex
              ? "border-primary ring-2 ring-primary/20"
              : "border-transparent hover:border-border opacity-70 hover:opacity-100",
          )}
          title={a.name}
          aria-label={a.name}
          aria-current={i === activeIndex}
        >
          <AssetThumbnail asset={a} className="w-full h-full" eager={i === activeIndex} />
        </button>
      ))}
    </div>
  );
}