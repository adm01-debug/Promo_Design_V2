import { Settings2, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ColumnSelector, type ColumnCount } from "@/components/ColumnSelector";
import { cn } from "@/lib/utils";

interface LayoutPopoverProps {
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  gridColumns: ColumnCount;
  setGridColumns: (cols: ColumnCount) => void;
}

export function LayoutPopover({ viewMode, setViewMode, gridColumns, setGridColumns }: LayoutPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">Layout</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3" sideOffset={8}>
        <div className="space-y-3">
          {/* View Mode */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Visualização</p>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 h-8 gap-1.5 text-xs",
                  viewMode === "grid" && "bg-card shadow-sm"
                )}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 h-8 gap-1.5 text-xs",
                  viewMode === "list" && "bg-card shadow-sm"
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="h-3.5 w-3.5" />
                Lista
              </Button>
            </div>
          </div>

          {/* Column Selector - only in grid mode */}
          {viewMode === "grid" && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Colunas</p>
                <ColumnSelector value={gridColumns} onChange={setGridColumns} />
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
