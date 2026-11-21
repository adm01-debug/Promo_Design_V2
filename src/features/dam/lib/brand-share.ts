/**
 * brand-share (front) — helpers puros do compartilhamento do manual de marca.
 *
 * Monta o payload da edge function e extrai a url publica a partir da resposta.
 * A logica extrai os campos dois a dois para nao acoplar o componente ao fetch.
 */
import type { BrandGuidelines } from "../hooks/use-brand-guidelines";
import { invokeFunction } from "@/lib/functions-client";

export const SHARE_EDGE_FUNCTION = "brand-share";

export function buildSharePayload(
  guideline: Pick<BrandGuidelines, "id">,
  organizationId: string,
  validDays = 30,
): {
  action: "create";
  brand_guideline_id: string;
  organization_id: string;
  valid_days: number;
} {
  return {
    action: "create",
    brand_guideline_id: guideline.id,
    organization_id: organizationId,
    valid_days: validDays,
  };
}

export function extractShareUrl(result: { token: string; url: string } | null): string | null {
  return result?.url ?? null;
}

export interface ShareCreateResult {
  url: string;
  token: string;
}

/**
 * Invoca a edge function brand-share para criar um link publico do manual.
 * Retorna { url, token } ou lanca erro com mensagem amigavel.
 */
export async function createBrandShareLink(
  guideline: Pick<BrandGuidelines, "id">,
  organizationId: string,
): Promise<ShareCreateResult> {
  const { data, error } = await invokeFunction<{ token: string; url: string }>(
    SHARE_EDGE_FUNCTION,
    buildSharePayload(guideline, organizationId),
  );
  if (error) {
    throw new Error(error.message || "Erro ao criar link de compartilhamento");
  }
  const url = extractShareUrl(data);
  if (!data || !url) {
    throw new Error("Resposta inesperada da edge function");
  }
  return { url, token: data.token };
}
