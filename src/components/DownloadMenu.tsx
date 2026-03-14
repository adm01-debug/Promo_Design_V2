import { useState } from "react";
import { Download, Share2, Image, FileImage } from "lucide-react";
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

async function downloadAs(url: string, fileName: string, format: "png" | "jpg") {
  try {
    const res = await fetch(url);
    const blob = await res.blob();

    const canvas = document.createElement("canvas");
    const img = new window.Image();
    img.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    if (format === "jpg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);

    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    canvas.toBlob(
      (b) => {
        if (!b) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `${fileName}.${format}`;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      mimeType,
      format === "jpg" ? 0.92 : undefined
    );
  } catch {
    // Fallback direct download
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.${format}`;
    a.click();
  }
}

function shareWhatsApp(imageUrl: string, text?: string) {
  const msg = text || "Confira este mockup!";
  const url = `https://wa.me/?text=${encodeURIComponent(msg + "\n" + imageUrl)}`;
  window.open(url, "_blank");
}

const DownloadMenu = ({ imageUrl, fileName = "mockup" }: Props) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Download className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => downloadAs(imageUrl, fileName, "png")} className="gap-2 text-xs">
          <Image className="w-3.5 h-3.5" /> Baixar PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadAs(imageUrl, fileName, "jpg")} className="gap-2 text-xs">
          <FileImage className="w-3.5 h-3.5" /> Baixar JPG
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => shareWhatsApp(imageUrl)} className="gap-2 text-xs">
          <Share2 className="w-3.5 h-3.5" /> Enviar WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DownloadMenu;
