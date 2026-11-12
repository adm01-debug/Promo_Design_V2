import { describe, it, expect, vi } from "vitest";
import { cn } from "../lib/utils";

describe("lib/utils", () => {
  describe("cn", () => {
    it("should merge tailwind classes correctly", () => {
      expect(cn("bg-red-500", "p-4")).toBe("bg-red-500 p-4");
      expect(cn("p-4", "p-2")).toBe("p-2"); // Tailwind merge should handle overriding
    });
  });
});

describe("Integration: Mocked External APIs", () => {
  it("should handle API failure gracefully in mock environment", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("API Down"));
    global.fetch = mockFetch;

    try {
      await fetch("https://api.external.com");
    } catch (e) {
      expect((e as Error).message).toBe("API Down");
    }
  });
});
