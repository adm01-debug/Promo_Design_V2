import { describe, it, expect } from "vitest";
import {
  ERR_ORDER_EDIT,
  OrderEditError,
  assertOrderEditable,
  checkOrderEdit,
  isOrderEditError,
  isOrderEditable,
} from "../order-edit-guard";

describe("order edit guard (ERR_ORDER_EDIT)", () => {
  it("permite edição em OS aberta", () => {
    expect(isOrderEditable("aberta")).toBe(true);
    expect(checkOrderEdit("aberta", { quantity: "10" })).toBeNull();
  });

  it("permite edição em OS em produção", () => {
    expect(checkOrderEdit("em_producao", { observations: "x" })).toBeNull();
  });

  it("bloqueia edição de conteúdo em OS concluída", () => {
    const v = checkOrderEdit("concluida", { quantity: "5" });
    expect(v).toEqual({ code: ERR_ORDER_EDIT, status: "concluida", fields: ["quantity"] });
  });

  it("bloqueia edição de conteúdo em OS cancelada", () => {
    expect(checkOrderEdit("cancelada", { clientName: "A" })?.code).toBe(ERR_ORDER_EDIT);
  });

  it("permite transição pura de status mesmo em estado travado", () => {
    expect(checkOrderEdit("cancelada", { status: "aberta" })).toBeNull();
    expect(checkOrderEdit("concluida", { status: "aberta" })).toBeNull();
  });

  it("ignora campos undefined", () => {
    expect(checkOrderEdit("concluida", { quantity: undefined })).toBeNull();
  });

  it("bloqueia quando status vem junto de campos de conteúdo", () => {
    const v = checkOrderEdit("concluida", { status: "aberta", quantity: "2" });
    expect(v?.fields).toEqual(["quantity"]);
  });

  it("assertOrderEditable lança OrderEditError tipado", () => {
    try {
      assertOrderEditable("concluida", { technique: "laser" });
      throw new Error("deveria ter lançado");
    } catch (e) {
      expect(isOrderEditError(e)).toBe(true);
      expect((e as OrderEditError).code).toBe(ERR_ORDER_EDIT);
      expect((e as OrderEditError).fields).toEqual(["technique"]);
    }
  });

  it("assertOrderEditable não lança em OS aberta", () => {
    expect(() => assertOrderEditable("aberta", { technique: "laser" })).not.toThrow();
  });

  it("isOrderEditError reconhece erros com code serializado", () => {
    expect(isOrderEditError({ code: ERR_ORDER_EDIT })).toBe(true);
    expect(isOrderEditError(new Error("outro"))).toBe(false);
  });
});
