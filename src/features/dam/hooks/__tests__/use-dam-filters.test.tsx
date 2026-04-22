import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import React from "react";
import { useDamFilters } from "../use-dam-filters";

const ARCHIVED_KEY = "dam-include-archived";

function wrapper(initialEntries: string[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    );
  };
}

function useFiltersWithLocation() {
  const filters = useDamFilters();
  const location = useLocation();
  return { filters, location };
}

describe("useDamFilters — Arquivados toggle persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hydrates includeArchived=true from ?archived=1 on initial mount", () => {
    const { result } = renderHook(() => useDamFilters(), {
      wrapper: wrapper(["/dam/preview?archived=1"]),
    });
    expect(result.current.state.includeArchived).toBe(true);
  });

  it.each([
    ["true", true],
    ["TRUE", true],
    ["yes", true],
    ["on", true],
    ["false", false],
    ["FALSE", false],
    ["no", false],
    ["off", false],
  ])("hydrates includeArchived from ?archived=%s as %s", (value, expected) => {
    if (expected === false) localStorage.setItem(ARCHIVED_KEY, "1"); // ensure URL wins
    const { result } = renderHook(() => useDamFilters(), {
      wrapper: wrapper([`/dam/preview?archived=${value}`]),
    });
    expect(result.current.state.includeArchived).toBe(expected);
  });

  it("ignores invalid ?archived values and falls back to localStorage", () => {
    localStorage.setItem(ARCHIVED_KEY, "1");
    const { result } = renderHook(() => useDamFilters(), {
      wrapper: wrapper(["/dam/preview?archived=banana"]),
    });
    expect(result.current.state.includeArchived).toBe(true);
  });

  it("hydrates includeArchived=false when ?archived=0 even if localStorage has '1'", () => {
    localStorage.setItem(ARCHIVED_KEY, "1");
    const { result } = renderHook(() => useDamFilters(), {
      wrapper: wrapper(["/dam/preview?archived=0"]),
    });
    expect(result.current.state.includeArchived).toBe(false);
  });

  it("falls back to localStorage when ?archived is absent", () => {
    localStorage.setItem(ARCHIVED_KEY, "1");
    const { result } = renderHook(() => useDamFilters(), {
      wrapper: wrapper(["/dam/preview"]),
    });
    expect(result.current.state.includeArchived).toBe(true);
  });

  it("defaults to false when neither URL nor localStorage are set", () => {
    const { result } = renderHook(() => useDamFilters(), {
      wrapper: wrapper(["/dam/preview"]),
    });
    expect(result.current.state.includeArchived).toBe(false);
  });

  it("syncs state -> URL: setting includeArchived=true adds ?archived=1", () => {
    const { result } = renderHook(() => useFiltersWithLocation(), {
      wrapper: wrapper(["/dam/preview"]),
    });
    act(() => result.current.filters.setIncludeArchived(true));
    expect(result.current.location.search).toContain("archived=1");
  });

  it("syncs state -> URL: turning includeArchived off removes ?archived param", () => {
    const { result } = renderHook(() => useFiltersWithLocation(), {
      wrapper: wrapper(["/dam/preview?archived=1"]),
    });
    expect(result.current.filters.state.includeArchived).toBe(true);
    act(() => result.current.filters.setIncludeArchived(false));
    expect(result.current.location.search).not.toContain("archived");
  });

  it("persists includeArchived to localStorage when toggled on, removes when off", () => {
    const { result } = renderHook(() => useDamFilters(), {
      wrapper: wrapper(["/dam/preview"]),
    });
    act(() => result.current.setIncludeArchived(true));
    expect(localStorage.getItem(ARCHIVED_KEY)).toBe("1");
    act(() => result.current.setIncludeArchived(false));
    expect(localStorage.getItem(ARCHIVED_KEY)).toBeNull();
  });

  it("includes archived=1 in queryString helper for shareable links", () => {
    const { result } = renderHook(() => useDamFilters(), {
      wrapper: wrapper(["/dam/preview"]),
    });
    act(() => result.current.setIncludeArchived(true));
    expect(result.current.queryString).toContain("archived=1");
  });

  it("reset() clears includeArchived from state and localStorage", () => {
    localStorage.setItem(ARCHIVED_KEY, "1");
    const { result } = renderHook(() => useDamFilters(), {
      wrapper: wrapper(["/dam/preview?archived=1"]),
    });
    expect(result.current.state.includeArchived).toBe(true);
    act(() => result.current.reset());
    expect(result.current.state.includeArchived).toBe(false);
    expect(localStorage.getItem(ARCHIVED_KEY)).toBeNull();
  });
});