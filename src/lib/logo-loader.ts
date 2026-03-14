import logoUrl from "@/assets/logo-promo-brindes.png";

let cachedLogoDataUrl: string | null = null;

export async function getLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject("Canvas not supported"); return; }
      ctx.drawImage(img, 0, 0);
      cachedLogoDataUrl = canvas.toDataURL("image/png");
      resolve(cachedLogoDataUrl);
    };
    img.onerror = () => reject("Failed to load logo");
    img.src = logoUrl;
  });
}
