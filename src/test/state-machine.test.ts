import { describe, it, expect } from "vitest";
import { canTransition, getNextStatuses, STATUS_TRANSITIONS } from "@/features/service-orders";
import type { OsStatus } from "@/features/service-orders";

describe("Status State Machine", () => {
  it("allows aberta → em_producao", () => {
    expect(canTransition("aberta", "em_producao")).toBe(true);
  });

  it("allows aberta → cancelada", () => {
    expect(canTransition("aberta", "cancelada")).toBe(true);
  });

  it("blocks aberta → concluida (must go through em_producao)", () => {
    expect(canTransition("aberta", "concluida")).toBe(false);
  });

  it("allows em_producao → concluida", () => {
    expect(canTransition("em_producao", "concluida")).toBe(true);
  });

  it("allows em_producao → cancelada", () => {
    expect(canTransition("em_producao", "cancelada")).toBe(true);
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
    expect(getNextStatuses("aberta")).toEqual(["em_producao", "cancelada"]);
    expect(getNextStatuses("em_producao")).toEqual(["concluida", "cancelada"]);
    expect(getNextStatuses("concluida")).toEqual([]);
    expect(getNextStatuses("cancelada")).toEqual(["aberta"]);
  });

  it("all statuses are covered in transitions map", () => {
    const statuses: OsStatus[] = ["aberta", "em_producao", "concluida", "cancelada"];
    statuses.forEach((s) => {
      expect(STATUS_TRANSITIONS).toHaveProperty(s);
    });
  });
});
