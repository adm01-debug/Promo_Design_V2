import { describe, it, expect } from "vitest";
import { AI_NOT_CONFIGURED_MESSAGE, edgeErrorMessage } from "@/lib/functions-client";

/** Erro no formato do supabase-js: mensagem generica + Response em `context`. */
function httpError(body: unknown | (() => Promise<unknown>), status = 503) {
  return {
    name: "FunctionsHttpError",
    message: "Edge Function returned a non-2xx status code",
    context: {
      status,
      json: typeof body === "function" ? (body as () => Promise<unknown>) : async () => body,
    },
  };
}

describe("edgeErrorMessage", () => {
  it("explica a IA nao configurada em vez do erro generico do supabase-js", async () => {
    const err = httpError({ error: "AI gateway nao configurado", code: "AI_NOT_CONFIGURED" });
    expect(await edgeErrorMessage(err, "Falha ao gerar.")).toBe(AI_NOT_CONFIGURED_MESSAGE);
  });

  it("prefere a mensagem do corpo quando a Edge Function explica o motivo", async () => {
    const err = httpError({ error: "Fila do ERP nao configurada" });
    expect(await edgeErrorMessage(err, "Falha ao gerar.")).toBe("Fila do ERP nao configurada");
  });

  it("usa o fallback quando o corpo nao e legivel", async () => {
    const err = httpError(() => Promise.reject(new Error("body used")));
    expect(await edgeErrorMessage(err, "Falha ao gerar.")).toBe("Falha ao gerar.");
  });

  it("usa o fallback para falha de rede e de relay", async () => {
    const fetchErr = {
      name: "FunctionsFetchError",
      message: "Failed to send a request to the Edge Function",
    };
    expect(await edgeErrorMessage(fetchErr, "Sem conexao.")).toBe("Sem conexao.");
    const relayErr = {
      name: "FunctionsRelayError",
      message: "Relay Error invoking the Edge Function",
    };
    expect(await edgeErrorMessage(relayErr, "Sem conexao.")).toBe("Sem conexao.");
    expect(await edgeErrorMessage(null, "Sem conexao.")).toBe("Sem conexao.");
  });

  it("preserva mensagens reais de erro do app", async () => {
    expect(await edgeErrorMessage(new Error("Nenhuma organizacao selecionada"), "Falha.")).toBe(
      "Nenhuma organizacao selecionada",
    );
  });
});
