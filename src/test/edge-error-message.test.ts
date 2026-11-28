import { describe, it, expect, vi, afterEach } from "vitest";
import {
  AI_NOT_CONFIGURED_MESSAGE,
  edgeErrorMessage,
  invokeErrorMessage,
  invokeFunction,
} from "@/lib/functions-client";

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

/** Resposta non-2xx como `invokeFunction` (fetch direto) a recebe. */
function stubFetch(status: number, body: string) {
  const fetchMock = vi.fn(
    async () => new Response(body, { status, headers: { "Content-Type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
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

describe("invokeFunction — erro da Edge Function chega tratado ao usuario", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("nao mostra o JSON cru quando a IA nao esta configurada", async () => {
    stubFetch(
      503,
      JSON.stringify({ error: "AI gateway nao configurado", code: "AI_NOT_CONFIGURED" }),
    );
    const { data, error } = await invokeFunction("mockup-approval", {});
    expect(data).toBeNull();
    expect(error?.message).toBe(AI_NOT_CONFIGURED_MESSAGE);
  });

  it("preserva a explicacao que a propria Edge Function devolveu", async () => {
    stubFetch(400, JSON.stringify({ error: "Payload invalido: mockup_id ausente" }));
    const { error } = await invokeFunction("mockup-approval", {});
    expect(error?.message).toBe("Payload invalido: mockup_id ausente");
    expect(error?.status).toBe(400);
  });

  it("nao vaza HTML de gateway para a tela do cliente", async () => {
    stubFetch(502, "<html><body>502 Bad Gateway</body></html>");
    const { error } = await invokeFunction("brand-share", {});
    expect(error?.message).not.toContain("<html>");
    expect(error?.message).not.toContain("Bad Gateway");
    expect(error?.message).toBe(invokeErrorMessage(502, ""));
  });
});

describe("invokeErrorMessage", () => {
  it("traduz o status quando o corpo nao traz motivo legivel", () => {
    const generic = invokeErrorMessage(400, "");
    const byStatus = [403, 404, 429, 500].map((status) => invokeErrorMessage(status, ""));
    expect(new Set([generic, ...byStatus]).size).toBe(5);
    for (const message of [generic, ...byStatus]) {
      expect(message.length).toBeGreaterThan(10);
      expect(message).not.toContain("{");
    }
  });
});
describe("invokeFunction — Authorization", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("manda o access_token da sessao, nao o JSON cru do localStorage", async () => {
    vi.stubEnv("DEV", false);
    const session = JSON.stringify({
      access_token: "jwt-do-usuario",
      refresh_token: "r",
      token_type: "bearer",
    });
    vi.stubGlobal("localStorage", { getItem: () => session });
    vi.stubGlobal("window", { localStorage: { getItem: () => session } });
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}"));
    vi.stubGlobal("fetch", fetchSpy);

    await invokeFunction("mockup-ai", { probe: 1 });

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer jwt-do-usuario");
  });

  it("nao inventa Authorization quando a sessao esta corrompida", async () => {
    vi.stubEnv("DEV", false);
    vi.stubGlobal("window", { localStorage: { getItem: () => "{nao-e-json" } });
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}"));
    vi.stubGlobal("fetch", fetchSpy);

    await invokeFunction("mockup-ai", { probe: 1 });

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
