// Shared CORS helper for edge functions.
// Uses an allow-list so admin/maintenance endpoints do not expose a wildcard origin.

const ALLOWED_ORIGINS = [
  "https://id-preview--5da5ba25-dbc3-474e-b521-f7c17b3151a4.lovable.app",
  "https://lovable.app",
];

const ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".lovable.app") ||
    origin.endsWith(".lovable.dev");
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Vary": "Origin",
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export function corsPreflight(req: Request): Response {
  return new Response("ok", { headers: getCorsHeaders(req) });
}
