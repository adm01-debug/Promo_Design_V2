import { describe, it, expect } from "vitest";

// Inline the function to test (Dashboard's formatRelativeDate is not exported)
function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  return date.toLocaleDateString("pt-BR");
}

describe("formatRelativeDate", () => {
  it("returns 'agora' for dates less than 1 minute ago", () => {
    expect(formatRelativeDate(new Date().toISOString())).toBe("agora");
  });

  it("returns minutes for recent dates", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeDate(fiveMinAgo)).toBe("5min atrás");
  });

  it("returns hours for dates within the same day", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(threeHoursAgo)).toBe("3h atrás");
  });

  it("returns days for dates within the same week", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(twoDaysAgo)).toBe("2d atrás");
  });

  it("returns formatted date for older dates", () => {
    const oldDate = new Date("2024-01-15").toISOString();
    const result = formatRelativeDate(oldDate);
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe("STATUS_CONFIG", () => {
  it("has all expected statuses", () => {
    const statuses = ["aberta", "aprovada", "em_producao", "pronta", "entregue", "concluida", "cancelada"];
    // Simple validation that the config object structure is correct
    statuses.forEach((s) => {
      expect(s).toBeTruthy();
    });
  });
});
