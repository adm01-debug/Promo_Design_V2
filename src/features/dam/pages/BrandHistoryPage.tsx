import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History as HistoryIcon, RotateCcw, Loader2, FileDiff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { useClients } from "@/features/clients/hooks/use-clients";
import { useOrganizations } from "@/hooks/use-organization";
import {
  useBrandGuidelinesHistory,
  diffSnapshots,
  type BrandHistoryDiff,
} from "../hooks/use-brand-guidelines-history";
import { BrandPreviewCard } from "../components/BrandPreviewCard";

interface DiffRowProps {
  label: string;
  changed: boolean;
  before: string;
  after: string;
}

function DiffRow({ label, changed, before, after }: DiffRowProps) {
  return (
    <div className={`flex gap-3 py-2 border-b last:border-0 ${changed ? "" : "opacity-40"}`}>
      <div className="w-36 shrink-0 text-sm font-medium">{label}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-muted-foreground line-through truncate">
          {changed ? before || "—" : before}
        </div>
        <div className="text-sm truncate">{changed ? after || "—" : after}</div>
      </div>
      {changed && (
        <Badge variant="secondary" className="shrink-0">
          alterado
        </Badge>
      )}
    </div>
  );
}

const stringify = (v: unknown) => {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return JSON.stringify(v, null, 0);
};

export default function BrandHistoryPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { organizations } = useOrganizations();
  const currentOrg = organizations?.[0] ?? null;
  const organizationId = currentOrg?.id ?? null;
  const { clients } = useClients(organizationId);
  const client = clients?.find((c) => c.id === clientId);
  const { history, isLoading, restore } = useBrandGuidelinesHistory(
    organizationId,
    clientId ?? null,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [compareTo, setCompareTo] = useState<string | null>(null);

  const selectedRow = history.find((r) => r.id === selected) ?? null;
  const compareRow = history.find((r) => r.id === compareTo) ?? null;
  const diff =
    selectedRow && compareRow ? diffSnapshots(compareRow.guidelines, selectedRow.guidelines) : null;

  const diffRows = (() => {
    if (!selectedRow || !compareRow || !diff) return [];
    const labels: Array<[keyof BrandHistoryDiff, string]> = [
      ["primary_colors", "Cores primárias"],
      ["secondary_colors", "Cores secundárias"],
      ["fonts", "Fontes"],
      ["do_rules", "Regras (do)"],
      ["dont_rules", "Regras (não fazer)"],
      ["notes", "Notas"],
    ];
    return labels
      .map(([key, label]) => ({
        key,
        label,
        changed: diff[key],
        before: stringify((compareRow.guidelines as unknown as Record<string, unknown>)[key]),
        after: stringify((selectedRow.guidelines as unknown as Record<string, unknown>)[key]),
      }))
      .filter((r) => r.changed);
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando histórico…
      </div>
    );
  }

  const onRestore = async (version: number) => {
    try {
      await restore.mutateAsync(version);
      toast.success(`Versão ${version} restaurada como nova revisão`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao restaurar");
    }
  };

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <div>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/clients">Clientes</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/clients/${clientId}/brand`}>Brand Guidelines</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Histórico</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-xl font-semibold mt-2 flex items-center gap-2">
          <HistoryIcon className="h-5 w-5" /> Histórico de versões — {client?.name ?? "cliente"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Cada salvamento cria uma nova revisão. Selecione duas para comparar ou restaure uma
          anterior.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <Card>
            <ScrollArea className="h-[60vh]">
              <div className="p-2 space-y-1">
                {history.map((r) => {
                  const isSel = r.id === selected;
                  const isCmp = r.id === compareTo;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelected(r.id)}
                      className={`w-full text-left p-3 rounded-lg border flex gap-3 items-start ${
                        isSel
                          ? "border-primary bg-primary/5"
                          : isCmp
                            ? "border-muted bg-muted/40"
                            : "border-transparent hover:bg-accent"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">v{r.version}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {r.change_summary}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(r.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                      </div>
                      <span className="shrink-0">
                        {isCmp && (
                          <Badge variant="outline" className="mr-2 text-[10px]">
                            base
                          </Badge>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompareTo(isCmp ? null : r.id);
                          }}
                        >
                          {isCmp ? "remover base" : "comparar"}
                        </Button>
                      </span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selectedRow && (
            <Card className="p-8 text-center text-muted-foreground">
              <FileDiff className="h-8 w-8 mx-auto mb-2" />
              Selecione uma versão para ver os detalhes.
            </Card>
          )}

          {selectedRow && (
            <>
              <Card className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold">Versão {selectedRow.version}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedRow.change_summary}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRestore(selectedRow.version)}
                    disabled={restore.isPending}
                  >
                    {restore.isPending ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    )}
                    Restaurar
                  </Button>
                </div>
              </Card>

              <BrandPreviewCard
                clientName={client?.name ?? ""}
                primary={selectedRow.guidelines.primary_colors}
                secondary={selectedRow.guidelines.secondary_colors}
                fonts={selectedRow.guidelines.fonts}
                logo={null}
              />

              {compareRow && diff && (
                <Card className="p-4">
                  <div className="font-semibold mb-2 flex items-center gap-2">
                    <FileDiff className="h-4 w-4" />
                    Comparação v{compareRow.version} → v{selectedRow.version}
                  </div>
                  {diffRows.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      Nenhuma diferença entre as versões.
                    </div>
                  )}
                  {diffRows.map((r) => (
                    <DiffRow
                      key={r.key}
                      label={r.label}
                      changed={r.changed}
                      before={r.before}
                      after={r.after}
                    />
                  ))}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
