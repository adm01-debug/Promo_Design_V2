import { describe, it, expect } from "vitest";
import { canTransition, getNextStatuses, STATUS_TRANSITIONS } from "@/features/service-orders";
import type { OsStatus } from "@/features/service-orders";

describe("Status State Machine", () => {
  it("allows aberta → aprovada", () => {
    expect(canTransition("aberta", "aprovada")).toBe(true);
  });

  it("allows aberta → cancelada", () => {
    expect(canTransition("aberta", "cancelada")).toBe(true);
  });

  it("blocks aberta → concluida (must go through the pipeline)", () => {
    expect(canTransition("aberta", "concluida")).toBe(false);
  });

  it("allows aprovada → em_producao", () => {
    expect(canTransition("aprovada", "em_producao")).toBe(true);
  });

  it("allows aprovada → cancelada", () => {
    expect(canTransition("aprovada", "cancelada")).toBe(true);
  });

  it("allows em_producao → pronta", () => {
    expect(canTransition("em_producao", "pronta")).toBe(true);
  });

  it("allows em_producao → cancelada", () => {
    expect(canTransition("em_producao", "cancelada")).toBe(true);
  });

  it("allows pronta → entregue", () => {
    expect(canTransition("pronta", "entregue")).toBe(true);
  });

  it("allows entregue → concluida", () => {
    expect(canTransition("entregue", "concluida")).toBe(true);
  });

  it("blocks concluida → any (terminal state)", () => {
    expect(canTransition("concluida", "aberta")).toBe(false);
    expect(canTransition("concluida", "em_producao")).toBe(false);
    expect(canTransition("concluida", "cancelada")).toBe(false);
  });

  it("allows cancelada → aberta (reopen)", () => {
    expect(canTransition("cancelada", "aberta")).toBe(true);
  });

  it("blocks cancelada → em_producao", () => {
    expect(canTransition("cancelada", "em_producao")).toBe(false);
  });

  it("getNextStatuses returns correct options", () => {
    expect(getNextStatuses("aberta")).toEqual(["aprovada", "cancelada"]);
    expect(getNextStatuses("aprovada")).toEqual(["em_producao", "cancelada"]);
    expect(getNextStatuses("em_producao")).toEqual(["pronta", "cancelada"]);
    expect(getNextStatuses("pronta")).toEqual(["entregue"]);
    expect(getNextStatuses("entregue")).toEqual(["concluida"]);
    expect(getNextStatuses("concluida")).toEqual([]);
    expect(getNextStatuses("cancelada")).toEqual(["aberta"]);
  });

  it("all statuses are covered in transitions map", () => {
    const statuses: OsStatus[] = ["aberta", "aprovada", "em_producao", "pronta", "entregue", "concluida", "cancelada"];
    statuses.forEach((s) => {
      expect(STATUS_TRANSITIONS).toHaveProperty(s);
    });
  });
});
