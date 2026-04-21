import { useMemo, useState } from "react";
import { useOrganizations } from "@/hooks/use-organization";
import { useClients, type Client, type ClientInput } from "../hooks/use-clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Plus, Search, Pencil, Trash2, Palette, FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  generateClientSummaryPdf, getLogoDataUrl, clientSlug,
  type OsStatus,
} from "@/features/service-orders";
import PdfProgressOverlay, { type PdfProgress } from "@/components/PdfProgressOverlay";

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

  const [summaryClient, setSummaryClient] = useState<Client | null>(null);
  const [summaryPeriod, setSummaryPeriod] = useState<30 | 90 | 365>(90);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState<PdfProgress | null>(null);
  const [summaryTitle, setSummaryTitle] = useState<string>("");

  const handleGenerateSummary = async () => {
    if (!summaryClient) return;
    const clientName = summaryClient.name;
    setGeneratingSummary(true);
    setSummaryTitle(`Gerando resumo — ${clientName}`);
    setSummaryProgress({ stage: "Buscando OSs", current: 0, total: 0, percent: 0 });
    // Fechar o diálogo de seleção de período — overlay assume o controle visual
    setSummaryClient(null);
    try {
      const since = new Date();
      since.setDate(since.getDate() - summaryPeriod);
      const { data, error } = await supabase
        .from("service_orders")
        .select("*")
        .ilike("client_name", clientName)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "Sem dados", description: "Cliente não tem OSs no período selecionado.", variant: "destructive" });
        return;
      }
      setSummaryProgress({
        stage: "Preparando dados",
        current: data.length,
        total: data.length,
        percent: 3,
      });
      const orders = data.map((row) => ({
        id: row.id,
        osNumber: row.os_number,
        status: row.status as OsStatus,
        date: row.date,
        deliveryDate: row.delivery_date ?? "",
        clientName: row.client_name,
        clientCompany: row.client_company ?? "",
        clientPhone: row.client_phone ?? "",
        clientEmail: row.client_email ?? "",
        productName: row.product_name,
        productSku: row.product_sku ?? "",
        productMaterial: row.product_material ?? "",
        productColors: row.product_colors ?? "",
        technique: row.technique,
        areaName: row.area_name ?? "",
        areaWidth: row.area_width ?? "",
        areaHeight: row.area_height ?? "",
        areaShape: row.area_shape ?? "",
        artColors: row.art_colors ?? "",
        artDpi: row.art_dpi ?? "",
        artFile: row.art_file ?? "",
        artFileDataUrl: row.art_file_data_url ?? "",
        quantity: String(row.quantity),
        observations: row.observations ?? "",
        mockupImageUrl: row.mockup_image_url ?? "",
        identificacaoCaixa: row.identificacao_caixa ?? "",
        materialEvento: row.material_evento ?? false,
        aprovarPrimeiraPeca: row.aprovar_primeira_peca ?? false,
        qtdCompra: row.qtd_compra ?? "",
        qtdLiberada: row.qtd_liberada ?? "",
        fazParteKit: row.faz_parte_kit ?? false,
        gravacaoDetalhe: row.gravacao_detalhe ?? "",
        artAssetId: row.art_asset_id ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      const logo = await getLogoDataUrl().catch(() => undefined);
      const doc = await generateClientSummaryPdf(
        { name: clientName, company: summaryClient?.company ?? null, email: summaryClient?.email ?? null, phone: summaryClient?.phone ?? null },
        orders,
        summaryPeriod,
        logo,
        (p) => setSummaryProgress(p),
      );
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      doc.save(`resumo-${clientSlug(clientName)}-${today}.pdf`);
      toast({ title: "Resumo gerado", description: `${orders.length} OS(s) incluídas.` });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGeneratingSummary(false);
      setSummaryProgress(null);
    }
  };

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
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/clients/${c.id}/brand`}><Palette className="h-3 w-3 mr-1" /> Brand</Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setSummaryClient(c); setSummaryPeriod(90); }}>
                      <FileDown className="h-3 w-3 mr-1" /> Resumo PDF
                    </Button>
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

      <Dialog open={!!summaryClient} onOpenChange={(o) => !o && setSummaryClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resumo do Projeto — {summaryClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Período</Label>
            <div className="flex gap-2">
              {([30, 90, 365] as const).map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={summaryPeriod === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSummaryPeriod(d)}
                >
                  {d === 365 ? "Último ano" : `Últimos ${d} dias`}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Inclui KPIs, OSs por status, top técnicas, histórico cronológico e galeria de mockups.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSummaryClient(null)} disabled={generatingSummary}>Cancelar</Button>
            <Button onClick={handleGenerateSummary} disabled={generatingSummary}>
              {generatingSummary ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PdfProgressOverlay
        open={!!summaryProgress}
        title={summaryTitle}
        progress={summaryProgress}
      />
    </div>
  );
};

export default ClientsPage;
