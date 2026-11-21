import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Folder,
  FolderPlus,
  FolderOpen,
  Loader2,
  Trash2,
  Pencil,
  Images,
  ArrowLeft,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useOrganizations } from "@/hooks/use-organization";
import { supabase } from "@/integrations/supabase/client";
import { useDamCollections } from "../hooks/use-dam-collections";
import { useAssets, type Asset } from "../hooks/use-assets";
import { AssetCard } from "../components/AssetCard";
import { AssetGridSkeleton } from "../components/AssetGridSkeleton";
import { AssetDetailDrawer } from "../components/AssetDetailDrawer";

export default function DamCollectionsPage() {
  const { currentOrgId, can } = useOrganizations();
  const {
    items,
    isLoading,
    isError,
    create,
    rename,
    remove,
    addAsset,
    removeAsset,
    useCollectionAssets,
  } = useDamCollections();

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [renameName, setRenameName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Asset | null>(null);

  const selected = items.find((c) => c.id === selectedId) ?? null;
  const { data: links } = useCollectionAssets(selectedId);
  const assetIds = (links ?? []).map((l) => l.asset_id);

  const collectionAssets = useQuery({
    queryKey: ["dam-collection-asset-details", selectedId, assetIds.join(",")],
    enabled: Boolean(selectedId && assetIds.length > 0),
    queryFn: async (): Promise<Asset[]> => {
      if (!selectedId || assetIds.length === 0) return [];
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .in("id", assetIds)
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Asset[];
    },
  });

  const { assets: allAssets, isLoading: allLoading } = useAssets(currentOrgId || "", {
    includeArchived: false,
    pageSize: 50,
  });

  if (!currentOrgId)
    return (
      <div className="p-6 text-center">
        <Card className="p-8">Selecione uma organizaÃ§Ã£o</Card>
      </div>
    );

  const canManage = can(["owner", "admin", "designer"]);
  const isInSelected = (assetId: string) => assetIds.includes(assetId);

  const handleCreate = async () => {
    try {
      await create.mutateAsync({ name: createName, description: createDesc || null });
      setCreateOpen(false);
      setCreateName("");
      setCreateDesc("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar coleÃ§Ã£o");
    }
  };

  const handleRename = async () => {
    if (!renaming) return;
    try {
      await rename.mutateAsync({ id: renaming.id, name: renameName });
      setRenaming(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao renomear");
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Excluir a coleÃ§Ã£o "${name}"? Os assets nÃ£o serÃ£o apagados.`)) return;
    try {
      await remove.mutateAsync(id);
      if (selectedId === id) setSelectedId(null);
    } catch {
      toast.error("Falha ao excluir coleÃ§Ã£o");
    }
  };

  const handleToggleAsset = async (asset: Asset) => {
    if (!selectedId) return;
    try {
      if (isInSelected(asset.id)) {
        await removeAsset.mutateAsync({ collection_id: selectedId, asset_id: asset.id });
        toast.success(`Removido de "${selected?.name}"`);
      } else {
        await addAsset.mutateAsync({ collection_id: selectedId, asset_id: asset.id });
        toast.success(`Adicionado a "${selected?.name}"`);
      }
    } catch {
      toast.error("Falha ao atualizar coleÃ§Ã£o");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Folder className="w-6 h-6" />
            {selected ? selected.name : "ColeÃ§Ãµes"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {selected
              ? `${assetIds.length} asset(s) na coleÃ§Ã£o`
              : "Organize seus assets em coleÃ§Ãµes"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected ? (
            <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          ) : (
            canManage && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Nova coleÃ§Ã£o
              </Button>
            )
          )}
        </div>
      </header>

      {selected ? (
        <div className="space-y-6">
          {collectionAssets.isLoading ? (
            <AssetGridSkeleton viewMode="grid" count={8} />
          ) : collectionAssets.data && collectionAssets.data.length > 0 ? (
            <>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-muted-foreground" />
                {assetIds.length} asset(s) na coleÃ§Ã£o
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {collectionAssets.data.map((a) => (
                  <div key={a.id} className="relative group">
                    {canManage && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2 z-10 h-7 w-7 bg-background/80 shadow-sm"
                        aria-label={`Remover ${a.name} da coleÃ§Ã£o`}
                        onClick={() => handleToggleAsset(a)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    <AssetCard asset={a} onClick={() => setDetail(a)} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              Esta coleÃ§Ã£o estÃ¡ vazia. Adicione assets abaixo.
            </Card>
          )}

          {canManage && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Images className="w-5 h-5 text-muted-foreground" />
                  Biblioteca para adicionar
                </h2>
                {allLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
              {allLoading ? (
                <Card className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando biblioteca...
                </Card>
              ) : allAssets.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  Nenhum asset disponÃ­vel na biblioteca.
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {allAssets
                    .filter((a) => !isInSelected(a.id))
                    .slice(0, 20)
                    .map((a) => (
                      <div key={a.id} className="relative group">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute top-2 right-2 z-10 h-7 w-7 bg-background/80 shadow-sm"
                          aria-label={`Adicionar ${a.name} Ã  coleÃ§Ã£o`}
                          onClick={() => handleToggleAsset(a)}
                          disabled={addAsset.isPending || removeAsset.isPending}
                        >
                          <FolderPlus className="w-4 h-4" />
                        </Button>
                        <AssetCard asset={a} onClick={() => setDetail(a)} />
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : isLoading ? (
        <AssetGridSkeleton viewMode="grid" count={8} />
      ) : isError ? (
        <Card className="p-12 text-center" role="alert">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm font-medium text-foreground">
            Não foi possível carregar as coleções
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Verifique sua conexão e tente novamente em instantes.
          </p>
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          Nenhuma coleÃ§Ã£o criada ainda. Crie uma para organizar seus assets.
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((c) => (
            <Card
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedId(c.id);
                }
              }}
              className="p-5 cursor-pointer hover:shadow-elegant transition-all flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <FolderOpen className="w-8 h-8 text-muted-foreground" />
                {canManage && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Renomear ${c.name}`}
                      onClick={() => {
                        setRenaming({ id: c.id, name: c.name });
                        setRenameName(c.name);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      aria-label={`Excluir ${c.name}`}
                      onClick={() => handleRemove(c.id, c.name)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <div className="font-medium truncate">{c.name}</div>
                {c.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.description}</p>
                )}
              </div>
              <Badge variant="secondary" className="self-start">
                {c.assetCount} asset(s)
              </Badge>
            </Card>
          ))}
        </div>
      )}

      {detail && (
        <AssetDetailDrawer
          asset={detail}
          onClose={() => setDetail(null)}
          onSelectAsset={(a) => setDetail(a)}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova coleÃ§Ã£o</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="collection-name">Nome</Label>
              <Input
                id="collection-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex.: Campanha de Natal"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-desc">DescriÃ§Ã£o (opcional)</Label>
              <Textarea
                id="collection-desc"
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="O que faz parte desta coleÃ§Ã£o?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!createName.trim() || create.isPending}>
              {create.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear coleÃ§Ã£o</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="rename-name">Nome</Label>
              <Input
                id="rename-name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={!renameName.trim() || rename.isPending}>
              {rename.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
