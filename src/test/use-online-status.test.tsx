import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnlineStatus } from "@/hooks/use-online-status";

function setNavigatorOnline(online: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
}

afterEach(() => {
  setNavigatorOnline(true);
});

describe("useOnlineStatus", () => {
  it("inicia online quando navigator.onLine e true", () => {
    setNavigatorOnline(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.online).toBe(true);
    expect(result.current.offlineSince).toBeNull();
  });

  it("inicia offline e registra o instante da queda quando o boot e offline", () => {
    setNavigatorOnline(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.online).toBe(false);
    expect(result.current.offlineSince).toEqual(expect.any(Number));
  });

  it("reage ao evento offline e volta ao evento online", () => {
    setNavigatorOnline(true);
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.online).toBe(false);
    expect(result.current.offlineSince).toEqual(expect.any(Number));

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.online).toBe(true);
    expect(result.current.offlineSince).toBeNull();
  });

  it("remove os listeners ao desmontar", () => {
    setNavigatorOnline(true);
    const { unmount, result } = renderHook(() => useOnlineStatus());
    unmount();

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    // Estado congelado apos desmontar: nenhum update aconteceu.
    expect(result.current.online).toBe(true);
  });
});
