import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Save, Sparkles, Download, Copy, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
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
import { AssetPicker } from "..";
import { BrandPreviewCard } from "../components/BrandPreviewCard";
import { BrandApplicationPreview } from "../components/BrandApplicationPreview";
import { RuleChips } from "../components/RuleChips";
import { generateBrandKitPdf } from "../lib/brand-kit-pdf";
import { getAssetSignedUrl } from "../lib/asset-urls";
import { wcagBoth, normalizeHex, isValidHex } from "../lib/color-contrast";
import { copyHexToClipboard } from "../lib/copy-hex";
import { cn } from "@/lib/utils";
import { useGoogleFonts } from "../lib/google-fonts-loader";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

function FontLivePreview({ name }: { name: string }) {
  const debounced = useDebounce(name.trim(), 300);
  const { loaded } = useGoogleFonts(debounced ? [debounced] : []);
  if (!debounced) return null;
  const status = loaded[debounced.toLowerCase()];
  const notFound = status === false;
  return (
    <div className="flex items-center gap-2 pl-1">
      <span
        className="text-base text-muted-foreground"
        style={{ fontFamily: `"${debounced}", sans-serif` }}
      >
        Aa Bb Cc 0123 — {debounced}
      </span>
      {notFound && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/30">
          ⚠ Fonte não encontrada no Google Fonts
        </span>
      )}
    </div>
  );
}

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
  const [isExporting, setIsExporting] = useState(false);

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
    const normalizeList = (l: ColorEntry[]) =>
      l
        .map((c) => ({ ...c, hex: normalizeHex(c.hex) }))
        .filter((c) => isValidHex(c.hex));
    const cleanPrimary = normalizeList(primary);
    const cleanSecondary = normalizeList(secondary);
    const dropped =
      primary.length - cleanPrimary.length + (secondary.length - cleanSecondary.length);
    if (dropped > 0) {
      toast.warning(`${dropped} cor(es) com HEX inválido foram ignoradas`);
    }
    setPrimary(cleanPrimary);
    setSecondary(cleanSecondary);
    await upsert.mutateAsync({
      primary_colors: cleanPrimary,
      secondary_colors: cleanSecondary,
      fonts,
      do_rules: doRules.split("\n").map((s) => s.trim()).filter(Boolean),
      dont_rules: dontRules.split("\n").map((s) => s.trim()).filter(Boolean),
      logo_asset_id: logoId,
      notes: notes || null,
    });
    toast.success("Brand guidelines salvas");
  };

  const doList = doRules.split("\n").map((s) => s.trim()).filter(Boolean);
  const dontList = dontRules.split("\n").map((s) => s.trim()).filter(Boolean);

  const removeDo = (idx: number) => {
    setDoRules(doList.filter((_, i) => i !== idx).join("\n"));
  };
  const removeDont = (idx: number) => {
    setDontRules(dontList.filter((_, i) => i !== idx).join("\n"));
  };
  const addDo = (rule: string) => {
    if (doList.some((r) => r.toLowerCase() === rule.toLowerCase())) return;
    setDoRules([...doList, rule].join("\n"));
  };
  const addDont = (rule: string) => {
    if (dontList.some((r) => r.toLowerCase() === rule.toLowerCase())) return;
    setDontRules([...dontList, rule].join("\n"));
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    const tId = toast.loading("Gerando PDF...");
    try {
    let logoDataUrl: string | null = null;
    if (logoAsset) {
      try {
        const url = await getAssetSignedUrl(logoAsset.file_path);
        if (url) {
          const blob = await (await fetch(url)).blob();
          logoDataUrl = await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result as string);
            r.readAsDataURL(blob);
          });
        }
      } catch {
        // ignore
      }
    }
    const pdf = generateBrandKitPdf({
      clientName: client?.name ?? "Cliente",
      primary,
      secondary,
      fonts,
      doRules: doList,
      dontRules: dontList,
      notes,
      logoDataUrl,
    });
    const safe = (client?.name ?? "cliente").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const date = new Date().toISOString().slice(0, 10);
    pdf.save(`brand-kit-${safe}-${date}.pdf`);
    toast.success("Brand kit exportado", { id: tId });
    } catch (err) {
      console.error(err);
      toast.error("Falha ao gerar PDF", { id: tId });
    } finally {
      setIsExporting(false);
    }
  };

  const ColorList = ({
    title,
    list,
    setList,
  }: {
    title: string;
    list: ColorEntry[];
    setList: (l: ColorEntry[]) => void;
  }) => {
    const copyHex = (hex: string) => copyHexToClipboard(hex);
    const updateHex = (i: number, raw: string) => {
      const next = [...list];
      next[i] = { ...list[i], hex: raw };
      setList(next);
    };
    const commitHex = (i: number) => {
      const current = list[i].hex;
      const normalized = normalizeHex(current);
      if (!isValidHex(normalized)) {
        toast.error(`HEX inválido: ${current}`);
        const next = [...list];
        next[i] = { ...list[i], hex: "#000000" };
        setList(next);
        return;
      }
      if (normalized !== current) {
        const next = [...list];
        next[i] = { ...list[i], hex: normalized };
        setList(next);
      }
    };
    return (
    <TooltipProvider delayDuration={150}>
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
        {list.map((c, i) => {
          const valid = isValidHex(c.hex);
          const safeHex = valid ? c.hex : "#000000";
          const w = wcagBoth(safeHex);
          const variant = w.vsWhite === "FAIL" ? "destructive" : w.vsWhite === "AAA" ? "default" : "secondary";
          return (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={safeHex}
                disabled={!editable}
                onChange={(e) => {
                  const next = [...list]; next[i] = { ...c, hex: e.target.value.toUpperCase() }; setList(next);
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
                aria-invalid={!valid}
                className={cn("w-28 font-mono uppercase", !valid && "border-destructive focus-visible:ring-destructive")}
                placeholder="#RRGGBB"
                maxLength={7}
                onChange={(e) => updateHex(i, e.target.value)}
                onBlur={() => commitHex(i)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitHex(i); } }}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant={variant} className="font-mono text-[9px] px-1.5 py-0 cursor-help shrink-0">
                    {valid ? w.vsWhite : "—"}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {valid
                    ? `Contraste vs branco ${w.ratioWhite.toFixed(2)}:1 · vs preto ${w.ratioBlack.toFixed(2)}:1`
                    : "HEX inválido — corrija para ver o contraste"}
                </TooltipContent>
              </Tooltip>
              <Button
                size="icon"
                variant="ghost"
                type="button"
                onClick={() => copyHex(c.hex)}
                title={`Copiar ${c.hex.toUpperCase()}`}
                aria-label={`Copiar HEX ${c.hex.toUpperCase()}${c.name ? ` (${c.name})` : ""}`}
              >
                <Copy className="w-4 h-4" />
              </Button>
              {editable && (
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  onClick={() => setList(list.filter((_, idx) => idx !== i))}
                  aria-label={`Remover cor ${c.name || c.hex.toUpperCase()}`}
                  title="Remover cor"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}
        {list.length === 0 && <div className="text-xs text-muted-foreground">Nenhuma cor adicionada.</div>}
      </div>
    </Card>
    </TooltipProvider>
    );
  };

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
        <div className="flex items-center gap-2">
          {editable && (
            <Button onClick={handleSave} disabled={upsert.isPending || isLoading}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          )}
          <Button variant="outline" onClick={handleExportPdf} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar PDF
          </Button>
        </div>
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
            <div key={i} className="space-y-1.5">
              <div className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-4" placeholder="Nome (ex: Playfair Display)" value={f.name} disabled={!editable}
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
              <FontLivePreview name={f.name} />
            </div>
          ))}
          {fonts.length === 0 && <div className="text-xs text-muted-foreground">Nenhuma fonte adicionada.</div>}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-success font-semibold">✓ Do</Label>
            <span className="text-xs text-muted-foreground">({doList.length})</span>
          </div>
          <RuleChips
            items={doList}
            variant="do"
            editable={editable}
            onRemove={removeDo}
            onAdd={editable ? addDo : undefined}
          />
          {editable && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2 -ml-2 text-muted-foreground">
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Editar em massa (texto)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                <Textarea
                  value={doRules}
                  onChange={(e) => setDoRules(e.target.value)}
                  rows={6}
                  placeholder="Use sempre o logo em fundo branco..."
                />
                <p className="text-[11px] text-muted-foreground">Uma regra por linha. As mudanças são aplicadas automaticamente.</p>
              </CollapsibleContent>
            </Collapsible>
          )}
        </Card>
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-destructive font-semibold">✗ Don't</Label>
            <span className="text-xs text-muted-foreground">({dontList.length})</span>
          </div>
          <RuleChips
            items={dontList}
            variant="dont"
            editable={editable}
            onRemove={removeDont}
            onAdd={editable ? addDont : undefined}
          />
          {editable && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2 -ml-2 text-muted-foreground">
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Editar em massa (texto)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                <Textarea
                  value={dontRules}
                  onChange={(e) => setDontRules(e.target.value)}
                  rows={6}
                  placeholder="Não distorça o logo..."
                />
                <p className="text-[11px] text-muted-foreground">Uma regra por linha. As mudanças são aplicadas automaticamente.</p>
              </CollapsibleContent>
            </Collapsible>
          )}
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
        defaultAssetType="logo"
        lockClient
        onSelect={(a: Asset) => setLogoId(a.id)}
      />

      <div className="pt-4">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Brand Preview
        </h2>
        <Tabs defaultValue="card">
          <TabsList>
            <TabsTrigger value="card">Card de marca</TabsTrigger>
            <TabsTrigger value="application">Aplicação completa</TabsTrigger>
          </TabsList>
          <TabsContent value="card" className="mt-4">
            <BrandPreviewCard
              clientName={client?.name ?? "Cliente"}
              primary={primary}
              secondary={secondary}
              fonts={fonts}
              logo={logoAsset}
            />
          </TabsContent>
          <TabsContent value="application" className="mt-4">
            <BrandApplicationPreview
              clientName={client?.name ?? "Cliente"}
              primary={primary}
              secondary={secondary}
              fonts={fonts}
              logo={logoAsset}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}