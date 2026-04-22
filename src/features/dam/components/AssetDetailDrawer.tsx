import { useEffect, useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Copy, Archive, ArchiveRestore, Trash2, GitBranch, ScanText, Loader2, Star } from "lucide-react";
import { getAssetSignedUrl, useAssets, type Asset } from "../hooks/use-assets";
import { toast } from "sonner";
import { useOrganizations } from "@/hooks/use-organization";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AssetVersionHistory } from "./AssetVersionHistory";
import { AssetUploadDialog } from "./AssetUploadDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAssetFavorites } from "../hooks/use-asset-favorites";
import { cn } from "@/lib/utils";
import { RelatedFavorites } from "./RelatedFavorites";

interface Props {
  asset: Asset | null;
  onClose: () => void;
  onSelectAsset?: (a: Asset) => void;
  searchQuery?: string;
}

export function AssetDetailDrawer({ asset, onClose, onSelectAsset, searchQuery }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const { currentOrgId, can } = useOrganizations();
  const { archive, restore, remove } = useAssets(currentOrgId);
  const { isFavorite, toggleFavorite } = useAssetFavorites(currentOrgId);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string>("none");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);

  useEffect(() => {
    if (!asset) return;
    getAssetSignedUrl(asset.file_path, 3600).then(setUrl);
    setOcrText(asset.ocr_text ?? null);
    setOcrStatus(asset.ocr_status ?? "none");
    // Auto-open OCR section when arriving from a search that matched OCR text.
    setOcrOpen(Boolean(asset.ocr_match && (searchQuery ?? "").trim().length >= 2));
  }, [asset]);

  // Poll once if OCR is pending
  useEffect(() => {
    if (!asset || ocrStatus !== "pending") return;
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("assets")
        .select("ocr_text, ocr_status")
        .eq("id", asset.id)
        .maybeSingle();
      if (data) {
        setOcrText((data as { ocr_text: string | null }).ocr_text);
        setOcrStatus((data as { ocr_status: string }).ocr_status);
        if ((data as { ocr_status: string }).ocr_status !== "pending") clearInterval(t);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [asset, ocrStatus]);

  // Keyboard shortcut: F toggles favorite for the open asset.
  // Ignored when typing in inputs/textareas/contentEditable, or with modifier keys.
  useEffect(() => {
    if (!asset) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (target.isContentEditable) return;
      }
      e.preventDefault();
      const nowFav = toggleFavorite(asset.id);
      toast.success(nowFav ? "Adicionado aos favoritos" : "Removido dos favoritos");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [asset, toggleFavorite]);

  if (!asset) return null;

  const isImage = (asset.mime_type ?? "").startsWith("image/");
  const sizeKb = asset.file_size ? (asset.file_size / 1024).toFixed(1) : "—";

  const handleCopy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("URL copiada");
  };

  const runOcr = async () => {
    if (!asset) return;
    setOcrLoading(true);
    setOcrStatus("pending");
    try {
      const { data, error } = await supabase.functions.invoke("asset-ocr", {
        body: { assetId: asset.id, filePath: asset.file_path, mimeType: asset.mime_type ?? "" },
      });
      if (error) throw error;
      const result = data as { ok?: boolean; length?: number; hasText?: boolean; skipped?: boolean; error?: string };
      if (result?.error) throw new Error(result.error);
      // Fetch updated row
      const { data: row } = await supabase
        .from("assets")
        .select("ocr_text, ocr_status")
        .eq("id", asset.id)
        .maybeSingle();
      if (row) {
        setOcrText((row as { ocr_text: string | null }).ocr_text);
        setOcrStatus((row as { ocr_status: string }).ocr_status);
      }
      if (result?.skipped) {
        toast.info("Tipo de arquivo não suporta OCR");
      } else if (result?.hasText) {
        toast.success(`Texto extraído (${result.length} caracteres)`);
        setOcrOpen(true);
      } else {
        toast.info("Nenhum texto detectado na imagem");
      }
    } catch (e) {
      setOcrStatus("failed");
      toast.error(e instanceof Error ? e.message : "Falha ao extrair texto");
    } finally {
      setOcrLoading(false);
    }
  };

  const ocrButtonLabel =
    ocrLoading || ocrStatus === "pending"
      ? "Processando…"
      : ocrStatus === "done" || ocrStatus === "failed"
        ? "Reprocessar OCR"
        : "Extrair texto (OCR)";

  return (
    <Sheet open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="truncate flex items-center gap-2">
            <span className="truncate">{asset.name}</span>
            <Badge variant="secondary" className="shrink-0 text-[10px]">v{asset.version}</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 shrink-0 ml-auto"
              aria-pressed={isFavorite(asset.id)}
              aria-label={isFavorite(asset.id) ? "Desfavoritar (F)" : "Favoritar (F)"}
              title={isFavorite(asset.id) ? "Desfavoritar (F)" : "Favoritar (F)"}
              onClick={() => {
                const nowFav = toggleFavorite(asset.id);
                toast.success(nowFav ? "Adicionado aos favoritos" : "Removido dos favoritos");
              }}
            >
              <Star
                className={cn(
                  "w-4 h-4 transition-colors",
                  isFavorite(asset.id)
                    ? "fill-primary text-primary"
                    : "text-muted-foreground",
                )}
              />
            </Button>
          </SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="versions">Versões</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
          {isImage && url && (
            <div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center max-h-96">
              <img src={url} alt={asset.name} className="max-w-full max-h-96 object-contain" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Tipo</div>
              <Badge variant="secondary" className="capitalize">{asset.asset_type}</Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Versão</div>
              <div>v{asset.version}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Dimensões</div>
              <div>{asset.width && asset.height ? `${asset.width} × ${asset.height}px` : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tamanho</div>
              <div>{sizeKb} KB</div>
            </div>
          </div>

          {asset.tags.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Tags</div>
              <div className="flex flex-wrap gap-1">
                {asset.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
              </div>
            </div>
          )}

          {asset.dominant_colors.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Cores dominantes</div>
              <div className="flex gap-2">
                {asset.dominant_colors.map((c, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded border border-border" style={{ backgroundColor: c }} />
                    <span className="text-[10px] font-mono">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <RelatedFavorites
            asset={asset}
            organizationId={currentOrgId}
            onSelect={(a) => onSelectAsset?.(a)}
          />

          {isImage && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ScanText className="w-4 h-4" />
                  Texto na imagem (OCR)
                  <Badge
                    variant={
                      ocrStatus === "done"
                        ? "default"
                        : ocrStatus === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-[10px] capitalize"
                  >
                    {ocrStatus === "none" ? "não extraído" : ocrStatus}
                  </Badge>
                </div>
                {can(["owner", "admin", "designer"]) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={runOcr}
                    disabled={ocrLoading || ocrStatus === "pending"}
                  >
                    {ocrLoading || ocrStatus === "pending" ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ScanText className="w-4 h-4 mr-2" />
                    )}
                    {ocrButtonLabel}
                  </Button>
                )}
              </div>
              {ocrText && ocrText.trim().length > 0 ? (
                <>
                  {asset.ocr_match && (searchQuery ?? "").trim().length >= 2 && (
                    <OcrSnippet text={ocrText} query={(searchQuery ?? "").trim()} />
                  )}
                  <Collapsible open={ocrOpen} onOpenChange={setOcrOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                      {ocrOpen ? "Ocultar" : "Mostrar"} texto extraído ({ocrText.length} caracteres)
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <HighlightedPre
                      text={ocrText}
                      query={(searchQuery ?? "").trim()}
                    />
                  </CollapsibleContent>
                  </Collapsible>
                </>
              ) : ocrStatus === "done" ? (
                <p className="text-xs text-muted-foreground">Nenhum texto detectado.</p>
              ) : ocrStatus === "skipped" ? (
                <p className="text-xs text-muted-foreground">Tipo de arquivo não suportado.</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Extraia o texto desta imagem para encontrá-la pela busca.
                </p>
              )}
            </div>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2">
            {url && (
              <Button variant="outline" size="sm" asChild>
                <a href={url} download={asset.name}>
                  <Download className="w-4 h-4 mr-2" />Baixar
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!url}>
              <Copy className="w-4 h-4 mr-2" />Copiar URL
            </Button>
            {can(["owner", "admin", "designer"]) && (
              <Button variant="outline" size="sm" onClick={() => setVersionDialogOpen(true)}>
                <GitBranch className="w-4 h-4 mr-2" />Nova versão
              </Button>
            )}
            {can(["owner", "admin", "designer"]) && !asset.is_archived && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await archive.mutateAsync(asset.id);
                  toast.success("Asset arquivado");
                  onClose();
                }}
              >
                <Archive className="w-4 h-4 mr-2" />Arquivar
              </Button>
            )}
            {can(["owner", "admin", "designer"]) && asset.is_archived && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await restore.mutateAsync(asset.id);
                  toast.success("Asset restaurado");
                  onClose();
                }}
                disabled={restore.isPending}
              >
                <ArchiveRestore className="w-4 h-4 mr-2" />Restaurar
              </Button>
            )}
            {can(["owner", "admin"]) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (!confirm("Excluir definitivamente este asset?")) return;
                  await remove.mutateAsync(asset);
                  toast.success("Asset excluído");
                  onClose();
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />Excluir
              </Button>
            )}
          </div>
          </TabsContent>

          <TabsContent value="versions" className="mt-4">
            <AssetVersionHistory
              asset={asset}
              onSelect={(a) => onSelectAsset?.(a)}
            />
          </TabsContent>
        </Tabs>

        {currentOrgId && (
          <AssetUploadDialog
            open={versionDialogOpen}
            onOpenChange={setVersionDialogOpen}
            organizationId={currentOrgId}
            parentAsset={asset}
            onUploaded={(newAsset) => onSelectAsset?.(newAsset)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightTokens(text: string, query: string): React.ReactNode[] {
  const tokens = Array.from(
    new Set(
      query
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2),
    ),
  );
  if (tokens.length === 0) return [text];
  const re = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function OcrSnippet({ text, query }: { text: string; query: string }) {
  const tokens = query
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 2);
  const lower = text.toLowerCase();
  let idx = -1;
  for (const t of tokens) {
    const i = lower.indexOf(t);
    if (i !== -1) {
      idx = i;
      break;
    }
  }
  if (idx === -1) return null;
  const radius = 80;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + radius);
  const snippet =
    (start > 0 ? "… " : "") + text.slice(start, end) + (end < text.length ? " …" : "");
  return (
    <div className="rounded bg-primary/5 border border-primary/20 p-2 text-xs leading-relaxed">
      <div className="text-[10px] uppercase tracking-wide text-primary/80 mb-1">
        Trecho com correspondência
      </div>
      <div className="whitespace-pre-wrap break-words">
        {highlightTokens(snippet, query)}
      </div>
    </div>
  );
}

function HighlightedPre({ text, query }: { text: string; query: string }) {
  const hasQuery = query.split(/\s+/).some((t) => t.trim().length >= 2);
  return (
    <pre className="text-xs whitespace-pre-wrap bg-muted rounded p-2 max-h-40 overflow-y-auto font-mono">
      {hasQuery ? highlightTokens(text, query) : text}
    </pre>
  );
}