import { Palette, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "@/components/ThemeToggle";

const Settings = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-6 py-4">
        <h1 className="text-lg font-display font-bold text-foreground">Configurações</h1>
        <p className="text-xs text-muted-foreground">Preferências do Promo Design</p>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Aparência</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-foreground">Tema</Label>
              <p className="text-xs text-muted-foreground">Alterne entre tema claro e escuro</p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Sobre</h3>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Promo Design</strong> — Plataforma de criação de mockups e ordens de serviço para produtos promocionais.</p>
            <p className="text-xs">Versão 1.0.0</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
