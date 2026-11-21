/**
 * mockup-approval — lógica pura testável.
 *
 * Schemas zod + helpers para o fluxo de aprovação do cliente. O index.ts
 * apenas encaixa HTTP/Deno; aqui fica o que dá para testar sem rede.
 */
import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const TOKEN_RE = /^[0-9a-f]{48}$/;

export const CreateSchema = z.object({
  action: z.literal("create"),
  mockup_id: z.string().uuid(),
  client_name: z.string().max(200).optional(),
  valid_days: z.number().int().min(1).max(90).optional(),
});

export const DecideSchema = z.object({
  token: z.string().regex(TOKEN_RE),
  status: z.enum(["approved", "rejected"]),
  note: z.string().max(1000).optional(),
});

export function isValidToken(token: string): boolean {
  return TOKEN_RE.test(token);
}

export function parseJwtSub(jwt: string): string | null {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1] ?? ""));
    if (payload?.sub && typeof payload.sub === "string") return payload.sub;
    return null;
  } catch {
    return null;
  }
}

export function makeClient(serviceRole: string) {
  return createClient("https://fygxlswpkjtjpcefjfty.supabase.co", serviceRole, {
    auth: { persistSession: false },
  });
}

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";
