import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Image, Sparkles, Video, Film, Palette, Camera, User,
  Settings, History, FolderOpen, ClipboardList, BarChart3,
  BookOpen, Eye, Wand2, Keyboard, Home
} from "lucide-react";

const pages = [
  { label: "Dashboard", path: "/", icon: Home, group: "Navegação" },
  { label: "Configurações", path: "/settings", icon: Settings, group: "Navegação" },
  { label: "Novo Mockup", path: "/mockup/new", icon: Image, group: "Mockup Studio" },
  { label: "Rascunhos", path: "/mockup/drafts", icon: FolderOpen, group: "Mockup Studio" },
  { label: "Ordens de Serviço", path: "/mockup/service-orders", icon: ClipboardList, group: "Mockup Studio" },
  { label: "Dashboard OS", path: "/mockup/service-dashboard", icon: BarChart3, group: "Mockup Studio" },
  { label: "Histórico Mockup", path: "/mockup/history", icon: History, group: "Mockup Studio" },
  { label: "Gerar Imagem IA", path: "/magicup/generate", icon: Wand2, group: "Magic Up" },
  { label: "Banco de Prompts", path: "/magicup/prompts", icon: BookOpen, group: "Magic Up" },
  { label: "Histórico Magic Up", path: "/magicup/history", icon: History, group: "Magic Up" },
  { label: "Novo Vídeo", path: "/video/new", icon: Film, group: "Video Studio" },
  { label: "Cinema Mode", path: "/video/cinema", icon: Eye, group: "Video Studio" },
  { label: "Moodboard", path: "/video/moodboard", icon: Palette, group: "Video Studio" },
  { label: "Photodump", path: "/video/photodump", icon: Camera, group: "Video Studio" },
  { label: "Character Studio", path: "/video/characters", icon: User, group: "Video Studio" },
  { label: "Inspiração", path: "/video/gallery", icon: Eye, group: "Video Studio" },
  { label: "Histórico Vídeo", path: "/video/history", icon: History, group: "Video Studio" },
];

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CommandPalette = ({ open: controlledOpen, onOpenChange }: CommandPaletteProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const navigate = useNavigate();

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const handleSelect = useCallback(
    (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate, setOpen]
  );

  const groups = [...new Set(pages.map((p) => p.group))];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar páginas, ações..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        {groups.map((group, gi) => (
          <div key={group}>
            {gi > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {pages
                .filter((p) => p.group === group)
                .map((page) => (
                  <CommandItem
                    key={page.path}
                    value={`${page.label} ${page.group}`}
                    onSelect={() => handleSelect(page.path)}
                    className="gap-3 cursor-pointer"
                  >
                    <page.icon className="w-4 h-4 text-muted-foreground" />
                    <span>{page.label}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
