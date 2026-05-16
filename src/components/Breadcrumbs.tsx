import { useLocation, Link, useNavigate } from "react-router-dom";
import { ChevronRight, Home, ArrowLeft } from "lucide-react";
import { BackButton } from "./BackButton";
import { useEffect } from "react";


const LABEL_MAP: Record<string, string> = {
  "": "Dashboard",
  mockup: "Mockup Studio",
  new: "Novo",
  drafts: "Rascunhos",
  history: "Histórico",
  editor: "Editor",
  "service-order": "Ordem de Serviço",
  "service-orders": "Ordens de Serviço",
  "service-dashboard": "Dashboard OS",
  magicup: "Magic Up",
  generate: "Gerar Imagem",
  prompts: "Prompts",
  video: "Video Studio",
  cinema: "Cinema Mode",
  moodboard: "Moodboard",
  photodump: "Photodump",
  gallery: "Inspiração",
  characters: "Character Studio",
  settings: "Configurações",
  templates: "Templates",
};

const Breadcrumbs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const segments = location.pathname.split("/").filter(Boolean);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const target = e.target as HTMLElement;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
        navigate(-1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-3 text-xs text-muted-foreground mb-4 px-1" aria-label="Navegação">
      <BackButton />
      <div className="flex items-center gap-1.5">
        <Link to="/" className="hover:text-foreground transition-colors" aria-label="Ir para o Dashboard">
          <Home className="w-3.5 h-3.5" />
        </Link>

      {segments.map((seg, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/");
        const label = LABEL_MAP[seg] || seg;
        const isLast = i === segments.length - 1;

        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
      </div>
    </nav>

  );
};

export default Breadcrumbs;
