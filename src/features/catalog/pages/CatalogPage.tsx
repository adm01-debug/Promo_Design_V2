import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plus, Search, Trash2, Edit3, Tag, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useCatalog, type CatalogProduct } from "@/features/catalog";

const emptyForm = { name: "", sku: "", material: "", colors: "", imageUrl: "", categoryId: "" };

const CatalogPage = () => {
  const {
    products, categories, isLoading,
    addProduct, updateProduct, deleteProduct,
    addCategory, deleteCategory,
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
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q))
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

  const CHART_COLORS = ["hsl(190, 95%, 55%)", "hsl(260, 60%, 60%)", "hsl(330, 80%, 60%)", "hsl(38, 92%, 50%)", "hsl(152, 60%, 45%)", "hsl(210, 65%, 55%)"];

  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.categoryName || "Sem categoria";
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [products]);

  const materialChartData = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.material) map[p.material] = (map[p.material] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));
  }, [products]);

  const activeCount = products.filter((p) => p.active).length;
  const inactiveCount = products.length - activeCount;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Analytics Cards */}
      {products.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-2xl font-bold text-foreground">{products.length}</p>
              <p className="text-xs text-muted-foreground">Total de Produtos</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-2xl font-bold text-foreground">{inactiveCount}</p>
              <p className="text-xs text-muted-foreground">Inativos</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-2xl font-bold text-foreground">{categories.length}</p>
              <p className="text-xs text-muted-foreground">Categorias</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryChartData.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" /> Produtos por Categoria
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={categoryChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                      {categoryChartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {categoryChartData.map((d, i) => (
                    <span key={d.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {d.name} ({d.value})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {materialChartData.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" /> Produtos por Material
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={materialChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" name="Produtos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </motion.div>
      )}
      {/* Header */}
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
            {products.length} produto{products.length !== 1 ? "s" : ""} cadastrado{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCatDialogOpen(true)} className="gap-1.5">
            <Tag className="w-4 h-4" />
            Categorias
          </Button>
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Novo Produto
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
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
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            {products.length === 0 ? "Nenhum produto cadastrado" : "Nenhum resultado"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {products.length === 0
              ? "Clique em \"Novo Produto\" para começar seu catálogo"
              : "Tente ajustar os filtros de busca"}
          </p>
          {products.length === 0 && (
            <Button className="mt-4 gap-1.5" onClick={openNew}>
              <Plus className="w-4 h-4" />
              Cadastrar primeiro produto
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group relative rounded-xl border p-4 transition-shadow hover:shadow-md ${
                  !p.active ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-14 h-14 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                    {p.sku && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.sku}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {p.categoryName && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {p.categoryName}
                        </Badge>
                      )}
                      {!p.active && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {(p.material || p.colors) && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {p.material && <span>📦 {p.material}</span>}
                    {p.colors && <span>🎨 {p.colors}</span>}
                  </div>
                )}

                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleToggleActive(p)}
                    title={p.active ? "Desativar" : "Ativar"}
                  >
                    {p.active ? (
                      <ToggleRight className="w-4 h-4 text-primary" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(p)}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{p.name}" será removido permanentemente do catálogo.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(p.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Product Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
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
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
            <Button
              onClick={handleSave}
              disabled={addProduct.isPending || updateProduct.isPending}
            >
              {addProduct.isPending || updateProduct.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Categories Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Categorias
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma categoria criada
              </p>
            ) : (
              categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border"
                >
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.description && (
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                    )}
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
                        <AlertDialogAction onClick={() => handleDeleteCategory(c.id)}>
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
                onClick={handleAddCategory}
                disabled={!newCatName.trim() || addCategory.isPending}
              >
                <Plus className="w-4 h-4" />
                Criar categoria
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CatalogPage;
