import { Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  form: {
    name: string;
    sku: string;
    material: string;
    colors: string;
    imageUrl: string;
    categoryId: string;
  };
  setForm: (f: {
    name: string;
    sku: string;
    material: string;
    colors: string;
    imageUrl: string;
    categoryId: string;
  }) => void;
  categories: { id: string; name: string }[];
  onSave: () => void;
  isSaving: boolean;
}

export const ProductFormDialog = ({
  open,
  onOpenChange,
  editingId,
  form,
  setForm,
  categories,
  onSave,
  isSaving,
}: ProductFormProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Nome *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Caneca Cerâmica 300ml"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>SKU</Label>
            <Input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="ABC-001"
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select
              value={form.categoryId || "none"}
              onValueChange={(v) => setForm({ ...form, categoryId: v === "none" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Material</Label>
          <Input
            value={form.material}
            onChange={(e) => setForm({ ...form, material: e.target.value })}
            placeholder="Ex: Cerâmica, Algodão, Metal"
          />
        </div>
        <div>
          <Label>Cores disponíveis</Label>
          <Input
            value={form.colors}
            onChange={(e) => setForm({ ...form, colors: e.target.value })}
            placeholder="Ex: Branco, Preto, Azul"
          />
        </div>
        <div>
          <Label>URL da imagem</Label>
          <Input
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string; description?: string | null }[];
  newCatName: string;
  setNewCatName: (s: string) => void;
  newCatDesc: string;
  setNewCatDesc: (s: string) => void;
  onAddCategory: () => void;
  onDeleteCategory: (id: string) => void;
  isAdding: boolean;
}

export const CategoryDialog = ({
  open,
  onOpenChange,
  categories,
  newCatName,
  setNewCatName,
  newCatDesc,
  setNewCatDesc,
  onAddCategory,
  onDeleteCategory,
  isAdding,
}: CategoryDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          Categorias
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria criada</p>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg border"
            >
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Produtos dessa categoria ficarão sem categoria.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDeleteCategory(c.id)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
        <div className="border-t pt-3 space-y-2">
          <Input
            placeholder="Nome da categoria"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />
          <Input
            placeholder="Descrição (opcional)"
            value={newCatDesc}
            onChange={(e) => setNewCatDesc(e.target.value)}
          />
          <Button
            size="sm"
            className="w-full gap-1.5"
            onClick={onAddCategory}
            disabled={!newCatName.trim() || isAdding}
          >
            <Plus className="w-4 h-4" />
            Criar categoria
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
