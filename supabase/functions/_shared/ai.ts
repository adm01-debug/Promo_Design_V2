// Gateway de IA — OpenRouter (substitui o antigo gateway da Lovable, ai.gateway.lovable.dev).
//
// A API do OpenRouter é compatível com o formato OpenAI Chat Completions, então o
// corpo das requisições das functions não muda (messages / tools / modalities).
// O que muda: a URL base, a variável de ambiente da chave e os SLUGS dos modelos —
// vários modelos que a Lovable aceitava não existem no catálogo do OpenRouter.

export const AI_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Chave do provedor. Ausente => a function degrada conforme seu próprio fallback. */
export function getAiApiKey(): string | undefined {
  return Deno.env.get("OPENROUTER_API_KEY");
}

export function aiHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    // Opcionais no OpenRouter, mas ajudam no rate limit e no ranking do app.
    "HTTP-Referer": Deno.env.get("APP_URL") ?? "https://promo-design.app",
    "X-Title": "Promo Design",
  };
}

/**
 * Modelos efetivamente presentes no catálogo do OpenRouter (verificado em
 * /api/v1/models). NÃO trocar por slugs "obvios": `google/gemini-2.0-flash-exp`
 * e `google/gemini-1.5-flash` (usados antes no gateway da Lovable) não existem
 * no OpenRouter e retornariam 404.
 */
export const AI_MODELS = {
  /** Saída de imagem + texto (remoção de fundo, geração de mockup). */
  image: "google/gemini-2.5-flash-image",
  /** Texto/visão barato — OCR, sugestões com tool call. */
  vision: "google/gemini-2.5-flash",
  /** Texto/visão de qualidade — inferência de brand guidelines. */
  visionPlus: "google/gemini-3-flash-preview",
} as const;
