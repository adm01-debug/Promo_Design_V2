import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssetThumbnail } from "./AssetThumbnail";
import type { Asset } from "../hooks/use-assets";
import type { Client } from "@/features/clients/hooks/use-clients";
import { ScanText, ArchiveRestore, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AssetListViewProps {
  assets: Asset[];
  clients: Client[];
  onSelect: (asset: Asset) => void;
  onRestore?: (asset: Asset) => void;
  /** When true, shows a sortable "Tamanho" column. */
  showSize?: boolean;
  /** Active sort direction for the size column (or null when sorting by something else). */
  sizeSortDir?: "asc" | "desc" | null;
  /** Called when the user clicks the size header to toggle the size sort. */
  onToggleSizeSort?: () => void;
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AssetListView({
  assets,
  clients,
  onSelect,
  onRestore,
  showSize = false,
  sizeSortDir = null,
  onToggleSizeSort,
}: AssetListViewProps) {
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16"></TableHead>
            <TableHead>Nome</TableHead>
            <TableHead className="w-28">Tipo</TableHead>
            <TableHead className="w-40">Cliente</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="w-24">Cores</TableHead>
            {showSize && (
              <TableHead className="w-28">
                {onToggleSizeSort ? (
                  <button
                    type="button"
                    onClick={onToggleSizeSort}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    aria-label="Ordenar por tamanho"
                    title="Ordenar por tamanho"
                  >
                    Tamanho
                    {sizeSortDir === "desc" ? (
                      <ArrowDown className="w-3 h-3" />
                    ) : sizeSortDir === "asc" ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                ) : (
                  "Tamanho"
                )}
              </TableHead>
            )}
            <TableHead className="w-28">Data</TableHead>
            {onRestore && <TableHead className="w-28 text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((a) => (
            <TableRow
              key={a.id}
              data-asset-id={a.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelect(a)}
            >
              <TableCell>
                <div className="w-10 h-10 rounded overflow-hidden bg-muted">
                  <AssetThumbnail asset={a} className="w-full h-full" />
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium text-sm truncate max-w-xs" title={a.name}>{a.name}</div>
                <div className="flex items-center gap-1 mt-1">
                  {a.is_archived && (
                    <Badge variant="outline" className="text-[10px]">Arquivado</Badge>
                  )}
                  {a.ocr_match && (
                    <Badge
                      variant="default"
                      className="text-[10px] gap-1 px-1.5 py-0"
                      title="Encontrado pelo texto interno (OCR)"
                    >
                      <ScanText className="w-3 h-3" /> OCR
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">{a.asset_type}</Badge>
                {a.version > 1 && (
                  <span className="ml-2 text-xs text-muted-foreground">v{a.version}</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground truncate">
                {a.client_id ? clientMap.get(a.client_id) ?? "—" : "Geral"}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {a.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                  ))}
                  {a.tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{a.tags.length - 3}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {a.dominant_colors.slice(0, 4).map((c, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded border border-border"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </TableCell>
              {showSize && (
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {formatBytes(a.file_size)}
                </TableCell>
              )}
              <TableCell className="text-xs text-muted-foreground">{fmt(a.created_at)}</TableCell>
              {onRestore && (
                <TableCell className="text-right">
                  {a.is_archived ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore(a);
                      }}
                      title="Restaurar asset"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5" />
                      Restaurar
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}