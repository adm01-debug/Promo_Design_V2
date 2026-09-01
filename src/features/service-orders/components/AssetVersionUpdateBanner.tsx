import { useState } from "react";
import { RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLatestAssetVersion, downloadAssetAsFile } from "@/features/dam";

interface Props {
  currentAssetId: string | null;
  onUpdate: (file: File, newAssetId: string) => Promise<void>;
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

const AssetVersionUpdateBanner = ({ currentAssetId, onUpdate }: Props) => {
  const { data } = useLatestAssetVersion(currentAssetId);
  const [loading, setLoading] = useState(false);

  if (!currentAssetId || !data?.hasUpdate || !data.latest) return null;
  const latest = data.latest;

  const handleClick = async () => {
    setLoading(true);
    try {
      const file = await downloadAssetAsFile(latest.file_path, latest.name, latest.mime_type);
      await onUpdate(file, latest.id);
      toast.success(`Arte atualizada para v${latest.version}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar arte");
    } finally {
      setLoading(false);
    }
  };

  const relative = formatDistanceToNow(new Date(latest.created_at), { addSuffix: true, locale: ptBR });

  return (
    <div className="col-span-2 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          Nova versão disponível: <span className="font-mono text-primary">v{latest.version}</span>
        </p>
        <p className="text-[11px] text-muted-foreground">
          Subida {relative} por {shortId(latest.created_by)}
        </p>
      </div>
      <Button size="sm" variant="default" className="gap-1.5" onClick={handleClick} disabled={loading}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        Atualizar arte
      </Button>
    </div>
  );
};

export default AssetVersionUpdateBanner;