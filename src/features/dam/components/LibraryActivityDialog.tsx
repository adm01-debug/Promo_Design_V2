import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import {
  ArchiveRestore,
  Archive,
  ExternalLink,
  History,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useLibraryActivity,
  type LibraryActivityAction,
  type LibraryActivityEntry,
} from "../hooks/use-library-activity";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function ActionBadge({ entry }: { entry: LibraryActivityEntry }) {
  if (entry.is_restore) {
    return (
      <Badge variant="default" className="text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-600">
        <ArchiveRestore className="w-3 h-3" /> Restaurado
      </Badge>
    );
  }
  if (entry.is_archive_change) {
    return (
      <Badge variant="secondary" className="text-[10px] gap-1">
        <Archive className="w-3 h-3" /> Arquivado
      </Badge>
    );
  }
  if (entry.action === "INSERT") {
    return (
      <Badge variant="default" className="text-[10px] gap-1">
        <Plus className="w-3 h-3" /> Upload
      </Badge>
    );
  }
  if (entry.action === "DELETE") {
    return (
      <Badge variant="destructive" className="text-[10px] gap-1">
        <Trash2 className="w-3 h-3" /> Removido
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px] gap-1">
      <Pencil className="w-3 h-3" /> Atualizado
    </Badge>
  );
}

type Filter = "ALL" | "UPLOAD" | "UPDATE" | "ARCHIVE" | "DELETE";

export function LibraryActivityDialog({ open, onOpenChange, organizationId }: Props) {
  const { data, isLoading } = useLibraryActivity(open ? organizationId : null, 80);
  const [filter, setFilter] = useState<Filter>("ALL");

  const entries = useMemo(() => {
    const list = data ?? [];
    if (filter === "ALL") return list;
    return list.filter((e) => {
      if (filter === "UPLOAD") return e.action === "INSERT";
      if (filter === "DELETE") return e.action === "DELETE";
      if (filter === "ARCHIVE") return e.is_archive_change;
      if (filter === "UPDATE") return e.action === "UPDATE" && !e.is_archive_change;
      return true;
    });
  }, [data, filter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Atividade recente da biblioteca
          </DialogTitle>
          <DialogDescription>
            Uploads, edições, arquivamentos e remoções de assets — quem fez e quando.
          </DialogDescription>
        </DialogHeader>

        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => setFilter((v as Filter) || "ALL")}
          className="justify-start flex-wrap gap-1"
          size="sm"
        >
          <ToggleGroupItem value="ALL" className="h-7 px-2 text-xs">Todos</ToggleGroupItem>
          <ToggleGroupItem value="UPLOAD" className="h-7 px-2 text-xs">Uploads</ToggleGroupItem>
          <ToggleGroupItem value="UPDATE" className="h-7 px-2 text-xs">Edições</ToggleGroupItem>
          <ToggleGroupItem value="ARCHIVE" className="h-7 px-2 text-xs">Arquivar/Restaurar</ToggleGroupItem>
          <ToggleGroupItem value="DELETE" className="h-7 px-2 text-xs">Removidos</ToggleGroupItem>
        </ToggleGroup>

        <ScrollArea className="h-[440px] pr-3 -mr-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center border border-dashed rounded-md">
              Nenhuma atividade registrada ainda
            </div>
          ) : (
            <ul className="space-y-2">
              {entries.map((e) => {
                const date = new Date(e.created_at);
                return (
                  <li
                    key={e.id}
                    className="rounded-md border border-border bg-card/50 p-2.5 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ActionBadge entry={e} />
                        {e.version !== null && (
                          <Badge variant="outline" className="text-[10px]">v{e.version}</Badge>
                        )}
                        <span className="text-sm font-medium truncate max-w-[260px]">
                          {e.asset_name ?? "(sem nome)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span title={format(date, "dd/MM/yyyy HH:mm:ss")}>
                          {formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}
                        </span>
                        <span>·</span>
                        <span className="font-mono">{shortId(e.user_id)}</span>
                      </div>
                    </div>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs shrink-0"
                      title="Abrir evento de auditoria"
                    >
                      <Link to={`/audit/event/${e.id}`}>
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Detalhes
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            Mostrando até 80 eventos mais recentes
          </span>
          <Button asChild variant="outline" size="sm">
            <Link to="/audit?table=assets">
              Ver auditoria completa
              <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}