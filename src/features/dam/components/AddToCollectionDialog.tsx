import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDamCollections } from "../hooks/use-dam-collections";
import type { Asset } from "../hooks/use-assets";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset;
}

export function AddToCollectionDialog({ open, onOpenChange, asset }: Props) {
  const { items, addAsset, refetch } = useDamCollections();
  const [busyId, setBusyId] = useState<string | null>(null);

  const membership = useQuery({
    queryKey: ["dam-collection-membership", asset.id],
    enabled: open,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("dam_collection_assets")
        .select("collection_id")
        .eq("asset_id", asset.id)
        .limit(500);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.collection_id));
    },
  });

  const memberIds = membership.data ?? new Set<string>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar a uma coleÃ§Ã£o</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 pt-1 max-h-72 overflow-y-auto">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma coleÃ§Ã£o ainda. Crie uma em ColeÃ§Ãµes na barra lateral.
            </p>
          )}
          {items.map((c) => {
            const isMember = memberIds.has(c.id);
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <Badge variant="secondary" className="mt-0.5">
                    {c.assetCount} asset(s)
                  </Badge>
                </div>
                <Button
                  variant={isMember ? "ghost" : "outline"}
                  size="sm"
                  disabled={busyId === c.id || isMember}
                  onClick={async () => {
                    setBusyId(c.id);
                    try {
                      await addAsset.mutateAsync({ collection_id: c.id, asset_id: asset.id });
                      await refetch();
                      toast.success(`Adicionado a "${c.name}"`);
                    } catch {
                      toast.error("Falha ao adicionar Ã  coleÃ§Ã£o");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  {busyId === c.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isMember ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <FolderPlus className="w-4 h-4" />
                  )}
                  {isMember ? "Adicionado" : "Adicionar"}
                </Button>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
