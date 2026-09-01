import { Check } from "lucide-react";

interface ViewDef {
  id: string;
  label: string;
  icon: string;
  areaPercent: { x: number; y: number; w: number; h: number };
  bgRotation?: number;
}

interface EditorViewThumbnailsProps {
  views: ViewDef[];
  activeView: string;
  setActiveView: (id: string) => void;
  productImage: string;
  approvedViews: Set<string>;
}

const EditorViewThumbnails = ({ views, activeView, setActiveView, productImage, approvedViews }: EditorViewThumbnailsProps) => (
  <nav className="w-[100px] bg-card border-r border-border flex flex-col gap-1 p-2 overflow-y-auto" aria-label="Seletor de vistas do produto">
    {views.map((view) => (
      <button
        key={view.id}
        onClick={() => setActiveView(view.id)}
        aria-label={`Mudar para vista ${view.label}`}
        aria-pressed={activeView === view.id}
        className={`relative rounded-lg border-2 p-1 transition-all text-center ${
          activeView === view.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
        }`}
      >
        <div className="aspect-square bg-muted rounded flex items-center justify-center relative overflow-hidden">
          <img
            src={productImage} alt="" aria-hidden="true"
            className="w-full h-full object-contain opacity-60"
            style={{ transform: view.bgRotation ? `rotate(${view.bgRotation}deg)` : undefined }}
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
          />
          <div
            className="absolute border border-dashed border-primary/50 bg-primary/10 rounded-sm"
            style={{ left: `${view.areaPercent.x}%`, top: `${view.areaPercent.y}%`, width: `${view.areaPercent.w}%`, height: `${view.areaPercent.h}%` }}
          />
          {approvedViews.has(view.id) && (
            <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
        <span className="text-[9px] font-medium text-foreground mt-1 block">{view.label}</span>
      </button>
    ))}
  </nav>
);

export default EditorViewThumbnails;
