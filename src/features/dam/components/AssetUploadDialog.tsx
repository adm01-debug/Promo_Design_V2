import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAssetUpload } from "../hooks/use-asset-upload";
import type { AssetType } from "../hooks/use-assets";
import { useClients } from "@/features/clients/hooks/use-clients";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  defaultClientId?: string | null;
  defaultAssetType?: AssetType;
}

export function AssetUploadDialog({
  open,
  onOpenChange,
  organizationId,
  defaultClientId = null,
  defaultAssetType = "art",
}: Props) {
  const { uploadFile, isUploading, progress } = useAssetUpload(organizationId);
  const { clients } = useClients(organizationId);
  const [files, setFiles] = useState<File[]>([]);
  const [clientId, setClientId] = useState<string | null>(defaultClientId);
  const [assetType, setAssetType] = useState<AssetType>(defaultAssetType);
  const [tagsRaw, setTagsRaw] = useState("");

  const reset = () => {
    setFiles([]);
    setTagsRaw("");
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
    try {
      for (const f of files) {
        await uploadFile(f, { organizationId, clientId, assetType, tags });
      }
      toast.success(`${files.length} asset(s) enviado(s)`);
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error("Falha no upload: " + (e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo asset</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label
            htmlFor="asset-files"
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <div className="text-sm text-center">
              {files.length > 0
                ? `${files.length} arquivo(s) selecionado(s)`
                : "Clique para selecionar arquivos"}
            </div>
            <Input
              id="asset-files"
              type="file"
              multiple
              accept="image/*,application/pdf,.svg,.ai,.psd"
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logo">Logo</SelectItem>
                  <SelectItem value="art">Arte</SelectItem>
                  <SelectItem value="photo">Foto</SelectItem>
                  <SelectItem value="mockup">Mockup</SelectItem>
                  <SelectItem value="document">Documento</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cliente (opcional)</Label>
              <Select value={clientId ?? "none"} onValueChange={(v) => setClientId(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Geral da organização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geral da organização</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <Input
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="ex: verão, azul, logo-principal"
            />
          </div>

          {isUploading && <Progress value={progress} />}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading || files.length === 0}>
            {isUploading ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}