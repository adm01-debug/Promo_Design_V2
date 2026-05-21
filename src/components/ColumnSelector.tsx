import { useState, useEffect } from "react";
import { Columns3, Grid2x2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "mockstudio-grid-columns";

export type ColumnCount = 3 | 4 | 5;

function GridCustomIcon({ cols, rows = 2 }: { cols: number; rows?: number }) {
  const size = 22;
  const gap = 1.5;
  const cellW = (size - (cols - 1) * gap) / cols;
  const cellH = (size - (rows - 1) * gap) / rows;
  const rects: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push(
        <rect
          key={`${r}-${c}`}
          x={c * (cellW + gap)}
          y={r * (cellH + gap)}
          width={cellW}
          height={cellH}
          rx={0.6}
          fill="currentColor"
        />,
      );
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="h-6 w-6">
      {rects}
    </svg>
  );
}

interface ColumnOption {
  value: ColumnCount;
  label: string;
  icon: React.ReactNode;
  minWidth: number;
}

const columnOptions: ColumnOption[] = [
  { value: 3, label: "3 colunas", icon: <Columns3 className="h-6 w-6" />, minWidth: 0 },
  { value: 4, label: "4 colunas", icon: <Grid2x2 className="h-6 w-6" />, minWidth: 640 },
  { value: 5, label: "5 colunas", icon: <GridCustomIcon cols={3} rows={2} />, minWidth: 1024 },
];

export function getDefaultColumns(): ColumnCount {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10) as ColumnCount;
      if ([3, 4, 5].includes(parsed)) return parsed;
    }
  } catch {}
  return 4;
}

function getAvailableOptions(screenWidth: number): ColumnOption[] {
  return columnOptions.filter((opt) => screenWidth >= opt.minWidth);
}

interface ColumnSelectorProps {
  value: ColumnCount;
  onChange: (cols: ColumnCount) => void;
  className?: string;
}

export function ColumnSelector({ value, onChange, className }: ColumnSelectorProps) {
  const isMobile = useIsMobile();
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const available = getAvailableOptions(screenWidth);

  useEffect(() => {
    const maxAvailable = available[available.length - 1]?.value ?? 3;
    if (value > maxAvailable) {
      onChange(maxAvailable);
    }
  }, [available, value, onChange]);

  if (isMobile || available.length <= 1) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-0 p-0.5 rounded-lg bg-muted/60 border border-border/30",
        className,
      )}
    >
      <AnimatePresence mode="popLayout">
        {available.map((opt) => (
          <Tooltip key={opt.value}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 min-w-0 p-0 relative transition-all duration-200",
                  value === opt.value
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  onChange(opt.value);
                  try {
                    localStorage.setItem(STORAGE_KEY, String(opt.value));
                  } catch {}
                }}
              >
                {value === opt.value && (
                  <motion.div
                    layoutId="column-selector-bg"
                    className="absolute inset-1 rounded-md bg-primary shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{opt.icon}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {opt.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </AnimatePresence>
    </div>
  );
}
