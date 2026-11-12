import { Download, Share2, Image as ImageIcon, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  imageUrl: string;
  fileName?: string;
}

/**
 * Baixa a imagem convertida para o formato solicitado.
 * Revoga TODOS os object URLs criados (tanto o do carregamento quanto o do link)
 * — corrige memory leak antigo em sessões longas.
 */
async function downloadAs(url: string, fileName: string, format: "png" | "jpg") {
  let srcObjectUrl: string | null = null;
  let downloadObjectUrl: string | null = null;

  try {
    const res = await fetch(url);
    const blob = await res.blob();

    const canvas = document.createElement("canvas");
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    srcObjectUrl = URL.createObjectURL(blob);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image_load_failed"));
      img.src = srcObjectUrl!;
    });

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_context_unavailable");
    if (format === "jpg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);

    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    await new Promise<void>((resolve) => {
      canvas.toBlob(
        (b) => {
          if (!b) return resolve();
          downloadObjectUrl = URL.createObjectURL(b);
          const a = document.createElement("a");
          a.href = downloadObjectUrl;
          a.download = `${fileName}.${format}`;
          a.click();
          // 1s de folga para o navegador iniciar o download antes de revogar
          setTimeout(() => {
            if (downloadObjectUrl) URL.revokeObjectURL(downloadObjectUrl);
            resolve();
          }, 1000);
        },
        mimeType,
        format === "jpg" ? 0.92 : undefined,
      );
    });
  } catch {
    // Fallback direct download
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.${format}`;
    a.click();
  } finally {
    if (srcObjectUrl) URL.revokeObjectURL(srcObjectUrl);
  }
}

function shareWhatsApp(imageUrl: string, text?: string) {
  const msg = text || "Confira este mockup!";
  const url = `https://wa.me/?text=${encodeURIComponent(msg + "\n" + imageUrl)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

const DownloadMenu = ({ imageUrl, fileName = "mockup" }: Props) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label="Baixar ou compartilhar mockup"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() => downloadAs(imageUrl, fileName, "png")}
          className="gap-2 text-xs"
        >
          <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" /> Baixar PNG
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => downloadAs(imageUrl, fileName, "jpg")}
          className="gap-2 text-xs"
        >
          <FileImage className="w-3.5 h-3.5" aria-hidden="true" /> Baixar JPG
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => shareWhatsApp(imageUrl)} className="gap-2 text-xs">
          <Share2 className="w-3.5 h-3.5" aria-hidden="true" /> Enviar WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DownloadMenu;
