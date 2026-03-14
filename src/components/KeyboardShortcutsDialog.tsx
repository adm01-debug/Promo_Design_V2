import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display">Atalhos de Teclado</DialogTitle>
      </DialogHeader>
      <div className="space-y-2 mt-2">
        {shortcuts.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 px-1 border-b border-border last:border-0"
          >
            <span className="text-sm text-foreground">{s.description}</span>
            <div className="flex items-center gap-1">
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
