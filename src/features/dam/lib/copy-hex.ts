import { toast } from "sonner";
import { normalizeHex, isValidHex } from "./color-contrast";

/**
 * Copia um valor HEX para o clipboard com normalização (#RRGGBB maiúsculo)
 * e mensagens de toast consistentes em toda a aplicação.
 * Usado por swatches, badges e inputs no Brand Guidelines / Brand Preview.
 */
export async function copyHexToClipboard(rawHex: string): Promise<boolean> {
  const normalized = normalizeHex(rawHex);
  if (!isValidHex(normalized)) {
    toast.error(`HEX inválido: ${rawHex}`);
    return false;
  }
  try {
    await navigator.clipboard.writeText(normalized);
    toast.success(`Copiado ${normalized}`);
    return true;
  } catch {
    toast.error("Falha ao copiar para a área de transferência");
    return false;
  }
}
