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
export async function invokeFunction<T = any>(
  functionName: string,
  body: any,
  options?: { headers?: Record<string, string>; method?: "GET" | "POST" }
): Promise<{ data: T | null; error: any }> {
  try {
    const url = getFunctionsUrl(`/${functionName}`);
    const method = options?.method || "POST";

    // Pega o token de autenticação do Supabase se disponível
    const authHeader = options?.headers?.Authorization ||
      (typeof window !== "undefined" && window.localStorage?.getItem("sb-fygxlswpkjtjpcefjfty-auth-token"));

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      ...options?.headers,
    };

    if (authHeader && !headers.Authorization) {
      headers.Authorization = authHeader;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: method === "GET" ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: { status: response.status, message: errorText } };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error?.message || String(error) } };
  }
}
