import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const shortcuts = [
  { keys: ["⌘", "K"], description: "Abrir busca rápida (Command Palette)" },
  { keys: ["?"], description: "Mostrar atalhos de teclado" },
  { keys: ["⌘", "Z"], description: "Desfazer" },
  { keys: ["⌘", "⇧", "Z"], description: "Refazer" },
  { keys: ["⌘", "S"], description: "Salvar" },
  { keys: ["⌘", "E"], description: "Exportar" },
  { keys: ["Esc"], description: "Fechar modal / Cancelar" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KeyboardShortcutsDialog = ({ open, onOpenChange }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md" aria-describedby="shortcuts-desc">
      <DialogHeader>
        <DialogTitle className="font-display">Atalhos de Teclado</DialogTitle>
        <DialogDescription id="shortcuts-desc">
          Use esses atalhos para navegar mais rápido.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2 mt-2" role="list" aria-label="Lista de atalhos">
        {shortcuts.map((s, i) => (
          <div
            key={i}
            role="listitem"
            className="flex items-center justify-between py-2 px-1 border-b border-border last:border-0"
          >
            <span className="text-sm text-foreground">{s.description}</span>
            <div className="flex items-center gap-1" aria-label={`Teclas: ${s.keys.join(" + ")}`}>
              {s.keys.map((key) => (
                <kbd
                  key={key}
                  className="px-2 py-0.5 text-xs font-mono bg-muted text-muted-foreground rounded border border-border"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

export default KeyboardShortcutsDialog;
