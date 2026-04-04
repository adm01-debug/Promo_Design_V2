import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { WidgetId } from "@/hooks/use-widget-layout";

interface DashboardWidgetWrapperProps {
  id: WidgetId;
  children: React.ReactNode;
  isEditing: boolean;
}

const DashboardWidgetWrapper = ({ id, children, isEditing }: DashboardWidgetWrapperProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {isEditing && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Arrastar para reordenar"
          className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-lg bg-card border border-border shadow-card text-muted-foreground hover:text-foreground hover:border-primary/40 cursor-grab active:cursor-grabbing transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      <div
        className={`transition-all ${
          isEditing
            ? "ring-1 ring-dashed ring-border rounded-xl pl-6 hover:ring-primary/30"
            : ""
        } ${isDragging ? "opacity-50 scale-[0.98]" : ""}`}
      >
        {children}
      </div>
    </div>
  );
};

export default DashboardWidgetWrapper;
