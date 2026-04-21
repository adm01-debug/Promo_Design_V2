import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssetThumbnail } from "./AssetThumbnail";
import type { Asset } from "../hooks/use-assets";
import type { Client } from "@/features/clients/hooks/use-clients";

interface AssetListViewProps {
  assets: Asset[];
  clients: Client[];
  onSelect: (asset: Asset) => void;
}

export function AssetListView({ assets, clients, onSelect }: AssetListViewProps) {
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
            <TableHead className="w-28">Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((a) => (
            <TableRow
              key={a.id}
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
                {a.is_archived && (
                  <Badge variant="outline" className="mt-1 text-[10px]">Arquivado</Badge>
                )}
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
              <TableCell className="text-xs text-muted-foreground">{fmt(a.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}