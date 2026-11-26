/**
 * Helper para fazer requisições às Edge Functions do Supabase.
 *
 * Em desenvolvimento, usa o proxy local do Vite para bypassar o CORS.
 * Em produção, usa o URL direto do Supabase.
 */

const SUPABASE_FUNCTIONS_BASE = "https://fygxlswpkjtjpcefjfty.supabase.co/functions/v1";

/**
 * Verifica se estamos em ambiente de desenvolvimento
 */
function isDev(): boolean {
  return import.meta.env.DEV === true;
}

/**
 * Retorna a URL base para invocação de Edge Functions.
 * Em dev: usa o proxy local do Vite (/functions)
 * Em prod: usa o URL direto do Supabase
 */
export function getFunctionsUrl(path: string = ""): string {
  if (isDev()) {
    // Em dev, usa o proxy local do Vite
    return `/functions${path.startsWith("/") ? path : "/" + path}`;
  }
  // Em produção, usa URL direto do Supabase
  return `${SUPABASE_FUNCTIONS_BASE}${path.startsWith("/") ? path : "/" + path}`;
}

/**
 * Faz uma requisição para uma Edge Function com suporte a proxy em dev.
 */
type FunctionsHttpError = { status?: number; message: string; name?: string } | { message: string };

export async function invokeFunction<T = unknown>(
  functionName: string,
  body: unknown,
  options?: { headers?: Record<string, string>; method?: "GET" | "POST" },
): Promise<{ data: T | null; error: FunctionsHttpError | null }> {
  try {
    const url = getFunctionsUrl(`/${functionName}`);
    const method = options?.method || "POST";

    // Pega o token de autenticação do Supabase se disponível
    const authHeader =
      options?.headers?.Authorization ||
      (typeof window !== "undefined" &&
        window.localStorage?.getItem("sb-fygxlswpkjtjpcefjfty-auth-token"));

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      ...options?.headers,
    };

    if (authHeader && !headers.Authorization) {
      headers.Authorization = authHeader;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: method === "GET" ? undefined : JSON.stringify(body), // body é o payload do usuário; stringify aceita unknown
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: { status: response.status, message: errorText } };
    }

    const data = (await response.json()) as T;
    return { data, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { data: null, error: { message } };
  }
}

/** Código devolvido pelas Edge Functions de IA quando falta a chave do provedor. */
export const AI_NOT_CONFIGURED_CODE = "AI_NOT_CONFIGURED";

/** Mesmo texto do corpo da Edge Function, para o caso de o corpo não ser legível. */
export const AI_NOT_CONFIGURED_MESSAGE =
  "A geração por IA ainda não está configurada neste ambiente. " +
  "Peça ao administrador para cadastrar a chave do provedor de IA (OPENROUTER_API_KEY) e tente novamente.";

type EdgeErrorLike = {
  message?: string;
  name?: string;
  context?: { status?: number; json?: () => Promise<unknown> };
};

/**
 * Traduz o erro de `supabase.functions.invoke` em uma mensagem para o usuário.
 *
 * O supabase-js troca QUALQUER resposta non-2xx por um FunctionsHttpError com a
 * mensagem genérica "Edge Function returned a non-2xx status code" — o corpo
 * real (com o motivo) fica em `error.context`. Sem ler esse corpo o usuário vê
 * "sistema quebrado" quando na verdade falta configuração no ambiente.
 */
export async function edgeErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (!error) return fallback;
  const err = error as EdgeErrorLike;
  let body: { error?: unknown; code?: unknown } | null = null;
  if (typeof err.context?.json === "function") {
    try {
      const parsed: unknown = await err.context.json();
      if (parsed && typeof parsed === "object") {
        body = parsed as { error?: unknown; code?: unknown };
      }
    } catch {
      body = null;
    }
  }
  if (body?.code === AI_NOT_CONFIGURED_CODE) return AI_NOT_CONFIGURED_MESSAGE;
  if (typeof body?.error === "string" && body.error.trim()) return body.error;
  const raw = typeof err.message === "string" ? err.message.trim() : "";
  const isGeneric =
    !raw ||
    raw.includes("non-2xx status code") ||
    raw.includes("Failed to send a request") ||
    raw.includes("Relay Error");
  return isGeneric ? fallback : raw;
}
