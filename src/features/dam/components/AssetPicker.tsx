import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAssets, type Asset, type AssetType } from "../hooks/use-assets";
import { AssetCard } from "./AssetCard";
import { useOrganizations } from "@/hooks/use-organization";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId?: string | null;
  assetType?: AssetType;
  onSelect: (asset: Asset) => void;
}

export function AssetPicker({ open, onOpenChange, clientId, assetType, onSelect }: Props) {
  const { currentOrgId } = useOrganizations();
  const [search, setSearch] = useState("");
  const { assets, isLoading } = useAssets(currentOrgId, {
    clientId: clientId ?? undefined,
    assetType,
    search: search || undefined,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar da biblioteca</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
          {isLoading && <div className="col-span-full text-center text-sm text-muted-foreground py-8">Carregando...</div>}
          {!isLoading && assets.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-8">
              Nenhum asset encontrado
            </div>
          )}
          {assets.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              onClick={() => {
                onSelect(a);
                onOpenChange(false);
              }}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}