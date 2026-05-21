import { useEffect, useRef } from "react";
import { AssetThumbnail } from "./AssetThumbnail";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { Asset } from "../hooks/use-assets";

interface Props {
  assets: Asset[];
  activeIndex: number;
  onSelect: (i: number) => void;
  selectionMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}

export function PreviewThumbStrip({
  assets,
  activeIndex,
  onSelect,
  selectionMode = false,
  selectedIds = [],
  onToggleSelect,
}: Props) {
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
      {assets.map((a, i) => {
        const isActive = i === activeIndex;
        const isSelected = selectionMode && selectedIds.includes(a.id);
        const handleClick = () => {
          if (selectionMode && onToggleSelect) {
            onSelect(i);
            onToggleSelect(a.id);
          } else {
            onSelect(i);
          }
        };
        return (
          <button
            key={a.id}
            ref={(el) => (itemRefs.current[i] = el)}
            onClick={handleClick}
            className={cn(
              "relative shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all",
              isSelected
                ? "border-primary ring-2 ring-primary/40"
                : isActive
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-border opacity-70 hover:opacity-100",
            )}
            title={a.name}
            aria-label={a.name}
            aria-current={isActive}
            aria-pressed={selectionMode ? isSelected : undefined}
          >
            <AssetThumbnail asset={a} className="w-full h-full" eager={isActive} />
            {selectionMode && (
              <span
                className={cn(
                  "absolute top-1 right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background/80 border-border",
                )}
                aria-hidden="true"
              >
                {isSelected && <Check className="w-3 h-3" />}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
