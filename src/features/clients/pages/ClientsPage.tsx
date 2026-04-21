import { useMemo, useState } from "react";
import { useOrganizations } from "@/hooks/use-organization";
import { useClients, type Client, type ClientInput } from "../hooks/use-clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Users, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const empty: ClientInput = { name: "", company: "", email: "", phone: "", notes: "" };

const ClientsPage = () => {
  const { currentOrgId, can } = useOrganizations();
  const { clients, addClient, updateClient, deleteClient, isLoading } = useClients(currentOrgId);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientInput>(empty);

  const canEdit = can(["owner", "admin", "designer"]);
  const canDelete = can(["owner", "admin"]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter((c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  }, [clients, search]);

  const openNew = () => { setEditingId(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Client) => {
    setEditingId(c.id);
    setForm({ name: c.name, company: c.company ?? "", email: c.email ?? "", phone: c.phone ?? "", notes: c.notes ?? "" });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    try {
      if (editingId) await updateClient.mutateAsync({ id: editingId, patch: form });
      else await addClient.mutateAsync(form);
      toast({ title: editingId ? "Cliente atualizado" : "Cliente criado" });
      setOpen(false);
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este cliente?")) return;
    try {
      await deleteClient.mutateAsync(id);
      toast({ title: "Cliente excluído" });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  };

  if (!currentOrgId) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="p-6">
          <p className="text-muted-foreground">Selecione ou crie uma organização em <a href="/organization" className="text-primary underline">Organizações</a> para gerenciar clientes.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Users className="h-8 w-8" /> Clientes</h1>
          <p className="text-muted-foreground">CRM compartilhado da organização.</p>
        </div>
        {canEdit && (
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo cliente</Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, empresa ou e-mail…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader><CardTitle>{filtered.length} cliente(s)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">Nenhum cliente cadastrado.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((c) => (
                <div key={c.id} className="p-4 border rounded-md space-y-2 bg-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      {c.company && <p className="text-sm text-muted-foreground">{c.company}</p>}
                    </div>
                    {!c.is_active && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                  {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                  {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                  <div className="flex gap-2 pt-2">
                    {canEdit && <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-3 w-3 mr-1" /> Editar</Button>}
                    {canDelete && <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="h-3 w-3 mr-1" /> Excluir</Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Empresa</Label><Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>E-mail</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Observações</Label><Textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={addClient.isPending || updateClient.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPage;
