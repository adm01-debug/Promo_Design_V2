import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Package, Plus, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCatalog, type CatalogProduct } from "@/features/catalog";
import CatalogAnalytics from "@/features/catalog/components/CatalogAnalytics";
import CatalogProductGrid from "@/features/catalog/components/CatalogProductGrid";
import { ProductFormDialog, CategoryDialog } from "@/features/catalog/components/CatalogDialogs";

const emptyForm = { name: "", sku: "", material: "", colors: "", imageUrl: "", categoryId: "" };

const CatalogPage = () => {
  const {
    products,
    categories,
    isLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    deleteCategory,
  } = useCatalog();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products
      .filter((p) => catFilter === "all" || p.categoryId === catFilter)
      .filter(
        (p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)),
      );
  }, [products, search, catFilter]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (p: CatalogProduct) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku || "",
      material: p.material || "",
      colors: p.colors || "",
      imageUrl: p.imageUrl || "",
      categoryId: p.categoryId || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }
    try {
      if (editingId) {
        await updateProduct.mutateAsync({
          id: editingId,
          name: form.name.trim(),
          sku: form.sku,
          material: form.material,
          colors: form.colors,
          imageUrl: form.imageUrl,
          categoryId: form.categoryId || undefined,
        });
        toast.success("Produto atualizado!");
      } else {
        await addProduct.mutateAsync({
          name: form.name.trim(),
          sku: form.sku,
          material: form.material,
          colors: form.colors,
          imageUrl: form.imageUrl,
          categoryId: form.categoryId || undefined,
        });
        toast.success("Produto cadastrado!");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao salvar produto");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct.mutateAsync(id);
      toast.success("Produto excluído");
    } catch {
      toast.error("Erro ao excluir");
    }
  };
  const handleToggleActive = async (p: CatalogProduct) => {
    try {
      await updateProduct.mutateAsync({ ...p, id: p.id, name: p.name, active: !p.active });
      toast.success(p.active ? "Produto desativado" : "Produto ativado");
    } catch {
      toast.error("Erro ao alterar status");
    }
  };
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await addCategory.mutateAsync({ name: newCatName.trim(), description: newCatDesc });
      toast.success("Categoria criada!");
      setNewCatName("");
      setNewCatDesc("");
      setCatDialogOpen(false);
    } catch {
      toast.error("Erro ao criar categoria");
    }
  };
  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory.mutateAsync(id);
      toast.success("Categoria excluída");
    } catch {
      toast.error("Erro ao excluir categoria");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CatalogAnalytics products={products} categories={categories} />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Catálogo de Produtos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {products.length} produto{products.length !== 1 ? "s" : ""} cadastrado
            {products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCatDialogOpen(true)}
            className="gap-1.5"
          >
            <Tag className="w-4 h-4" />
            Categorias
          </Button>
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Novo Produto
          </Button>
        </div>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CatalogProductGrid
        filtered={filtered}
        products={products}
        isLoading={isLoading}
        onOpenNew={openNew}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
      />

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingId={editingId}
        form={form}
        setForm={setForm}
        categories={categories}
        onSave={handleSave}
        isSaving={addProduct.isPending || updateProduct.isPending}
      />
      <CategoryDialog
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
        categories={categories}
        newCatName={newCatName}
        setNewCatName={setNewCatName}
        newCatDesc={newCatDesc}
        setNewCatDesc={setNewCatDesc}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        isAdding={addCategory.isPending}
      />
    </div>
  );
};

export default CatalogPage;
