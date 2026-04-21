import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Save, Sparkles } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useOrganizations } from "@/hooks/use-organization";
import { useClients } from "@/features/clients/hooks/use-clients";
import { useBrandGuidelines, type ColorEntry, type FontEntry } from "../hooks/use-brand-guidelines";
import { useAssets, type Asset } from "../hooks/use-assets";
import { AssetThumbnail } from "../components/AssetThumbnail";
import { AssetPicker } from "../components/AssetPicker";
import { BrandPreviewCard } from "../components/BrandPreviewCard";
import { toast } from "sonner";

export default function BrandGuidelinesPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { currentOrgId, can } = useOrganizations();
  const { clients } = useClients(currentOrgId);
  const { guidelines, isLoading, upsert } = useBrandGuidelines(currentOrgId, clientId ?? null);
  const { assets } = useAssets(currentOrgId, { clientId, assetType: "logo" });

  const client = clients.find((c) => c.id === clientId) ?? null;

  const [primary, setPrimary] = useState<ColorEntry[]>([]);
  const [secondary, setSecondary] = useState<ColorEntry[]>([]);
  const [fonts, setFonts] = useState<FontEntry[]>([]);
  const [doRules, setDoRules] = useState<string>("");
  const [dontRules, setDontRules] = useState<string>("");
  const [logoId, setLogoId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!guidelines) return;
    setPrimary(guidelines.primary_colors);
    setSecondary(guidelines.secondary_colors);
    setFonts(guidelines.fonts);
    setDoRules(guidelines.do_rules.join("\n"));
    setDontRules(guidelines.dont_rules.join("\n"));
    setLogoId(guidelines.logo_asset_id);
    setNotes(guidelines.notes ?? "");
  }, [guidelines]);

  const editable = can(["owner", "admin", "designer"]);
  const logoAsset = assets.find((a) => a.id === logoId) ?? null;

  const handleSave = async () => {
    await upsert.mutateAsync({
      primary_colors: primary,
      secondary_colors: secondary,
      fonts,
      do_rules: doRules.split("\n").map((s) => s.trim()).filter(Boolean),
      dont_rules: dontRules.split("\n").map((s) => s.trim()).filter(Boolean),
      logo_asset_id: logoId,
      notes: notes || null,
    });
    toast.success("Brand guidelines salvas");
  };

  const ColorList = ({
    title,
    list,
    setList,
  }: {
    title: string;
    list: ColorEntry[];
    setList: (l: ColorEntry[]) => void;
  }) => (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {editable && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setList([...list, { name: "", hex: "#000000" }])}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {list.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              value={c.hex}
              disabled={!editable}
              onChange={(e) => {
                const next = [...list]; next[i] = { ...c, hex: e.target.value }; setList(next);
              }}
              className="w-10 h-10 rounded border border-border cursor-pointer"
            />
            <Input
              value={c.name}
              disabled={!editable}
              placeholder="Nome (ex: Marca primária)"
              onChange={(e) => { const next = [...list]; next[i] = { ...c, name: e.target.value }; setList(next); }}
            />
            <Input
              value={c.hex}
              disabled={!editable}
              className="w-28 font-mono"
              onChange={(e) => { const next = [...list]; next[i] = { ...c, hex: e.target.value }; setList(next); }}
            />
            {editable && (
              <Button size="icon" variant="ghost" onClick={() => setList(list.filter((_, idx) => idx !== i))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        {list.length === 0 && <div className="text-xs text-muted-foreground">Nenhuma cor adicionada.</div>}
      </div>
    </Card>
  );

  if (!currentOrgId || !clientId) {
    return <div className="p-6 text-sm text-muted-foreground">Cliente/organização não definido.</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/clients">Clientes</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{client?.name ?? "Cliente"}</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Brand Guidelines</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link to="/clients"><ArrowLeft className="w-4 h-4 mr-1" /> Clientes</Link>
          </Button>
          <h1 className="text-2xl font-bold">Brand Guidelines</h1>
          <p className="text-sm text-muted-foreground">
            Identidade visual {client?.name ? `de ${client.name}` : "do cliente"}
          </p>
        </div>
        {editable && (
          <Button onClick={handleSave} disabled={upsert.isPending || isLoading}>
            <Save className="w-4 h-4 mr-2" /> Salvar
          </Button>
        )}
      </div>

      {!isLoading && !guidelines && (
        <Card className="p-6 border-dashed text-center text-muted-foreground">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-primary" />
          <p className="text-sm">
            Nenhuma brand guideline salva ainda. Preencha os campos abaixo e clique em
            <span className="font-semibold"> Salvar</span> para criar.
          </p>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Logo principal</h3>
        {logoAsset ? (
          <div className="flex items-center gap-4">
            <AssetThumbnail asset={logoAsset} className="w-24 h-24 rounded border border-border" />
            <div className="flex-1">
              <div className="font-medium">{logoAsset.name}</div>
              <div className="text-xs text-muted-foreground">v{logoAsset.version}</div>
            </div>
            {editable && (
              <>
                <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>Trocar</Button>
                <Button variant="ghost" size="sm" onClick={() => setLogoId(null)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        ) : (
          editable && (
            <Button variant="outline" onClick={() => setPickerOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Selecionar logo da biblioteca
            </Button>
          )
        )}
      </Card>

      <ColorList title="Cores primárias" list={primary} setList={setPrimary} />
      <ColorList title="Cores secundárias" list={secondary} setList={setSecondary} />

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Fontes</h3>
          {editable && (
            <Button size="sm" variant="ghost" onClick={() => setFonts([...fonts, { name: "", usage: "", source: "" }])}>
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {fonts.map((f, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Input className="col-span-4" placeholder="Nome" value={f.name} disabled={!editable}
                onChange={(e) => { const next = [...fonts]; next[i] = { ...f, name: e.target.value }; setFonts(next); }} />
              <Input className="col-span-3" placeholder="Uso (ex: Títulos)" value={f.usage ?? ""} disabled={!editable}
                onChange={(e) => { const next = [...fonts]; next[i] = { ...f, usage: e.target.value }; setFonts(next); }} />
              <Input className="col-span-4" placeholder="Fonte/link" value={f.source ?? ""} disabled={!editable}
                onChange={(e) => { const next = [...fonts]; next[i] = { ...f, source: e.target.value }; setFonts(next); }} />
              {editable && (
                <Button className="col-span-1" size="icon" variant="ghost"
                  onClick={() => setFonts(fonts.filter((_, idx) => idx !== i))}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          {fonts.length === 0 && <div className="text-xs text-muted-foreground">Nenhuma fonte adicionada.</div>}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <Label className="text-success font-semibold">✓ Do (uma regra por linha)</Label>
          <Textarea
            value={doRules}
            disabled={!editable}
            onChange={(e) => setDoRules(e.target.value)}
            rows={6}
            placeholder="Use sempre o logo em fundo branco..."
            className="mt-2"
          />
        </Card>
        <Card className="p-4">
          <Label className="text-destructive font-semibold">✗ Don't (uma regra por linha)</Label>
          <Textarea
            value={dontRules}
            disabled={!editable}
            onChange={(e) => setDontRules(e.target.value)}
            rows={6}
            placeholder="Não distorça o logo..."
            className="mt-2"
          />
        </Card>
      </div>

      <Card className="p-4">
        <Label>Notas adicionais</Label>
        <Textarea
          value={notes}
          disabled={!editable}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-2"
        />
      </Card>

      <AssetPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        clientId={clientId}
        assetType="logo"
        onSelect={(a: Asset) => setLogoId(a.id)}
      />

      <div className="pt-4">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Brand Preview
        </h2>
        <BrandPreviewCard
          clientName={client?.name ?? "Cliente"}
          primary={primary}
          secondary={secondary}
          fonts={fonts}
          logo={logoAsset}
        />
      </div>
    </div>
  );
}