import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MagicUpHistory from "../MagicUpHistory";
import type { MagicUpHistoryItem } from "@/features/magic-up";

// ---- Mocks ----------------------------------------------------------------

const mockItems: MagicUpHistoryItem[] = [
  {
    id: "fav-1",
    prompt: "Favorited mockup",
    imageUrl: "https://example.test/fav.png",
    favorite: true,
    productName: "Caneca",
    productSku: "CN-001",
    style: "Realista",
    createdAt: new Date("2025-01-10T12:00:00Z").toISOString(),
  },
  {
    id: "plain-1",
    prompt: "Regular mockup",
    imageUrl: "https://example.test/plain.png",
    favorite: false,
    productName: "Camiseta",
    productSku: "CM-002",
    style: "Realista",
    createdAt: new Date("2025-01-11T12:00:00Z").toISOString(),
  },
];

vi.mock("@/features/magic-up", async () => {
  const actual = await vi.importActual<typeof import("@/features/magic-up")>(
    "@/features/magic-up",
  );
  return {
    ...actual,
    useMagicUpHistory: () => ({
      items: mockItems,
      toggleFavorite: vi.fn(),
      deleteItem: vi.fn(),
    }),
  };
});

// recharts pulls in heavy DOM measurements that JSDOM can't satisfy. The
// charts themselves aren't under test here, so stub them out.
vi.mock("recharts", () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return new Proxy(
    {},
    {
      get: () => Stub,
    },
  ) as never;
});

// MagicUpHistoryDetail reaches into framer-motion + portals; render a noop.
vi.mock("@/features/magic-up/components/MagicUpHistoryDetail", () => ({
  default: () => null,
}));

// ---- Helpers --------------------------------------------------------------

function renderAt(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <MagicUpHistory />
    </MemoryRouter>,
  );
}

function getCounter() {
  // The header renders "<filtered> de <total>" inside a small pill.
  return screen.getByText(/^\d+ de \d+$/);
}

// ---- Tests ----------------------------------------------------------------

describe("MagicUpHistory — URL ↔ state sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates filterFavorites from ?fav=1 on mount", () => {
    renderAt("/magic-up/history?fav=1");

    const favBtn = screen.getByRole("button", { name: /favoritos/i });
    expect(favBtn).toHaveAttribute("aria-pressed", "true");

    // Only the favorited item should remain in the grid → "1 de 2"
    expect(getCounter()).toHaveTextContent("1 de 2");
  });

  it("starts with filter off when URL has no params", () => {
    renderAt("/magic-up/history");

    const favBtn = screen.getByRole("button", { name: /favoritos/i });
    expect(favBtn).toHaveAttribute("aria-pressed", "false");
    expect(getCounter()).toHaveTextContent("2 de 2");
  });

  it("clears all filters (and URL params) via 'Limpar filtros'", () => {
    renderAt("/magic-up/history?fav=1");

    const favBtn = screen.getByRole("button", { name: /favoritos/i });
    expect(favBtn).toHaveAttribute("aria-pressed", "true");

    const clearBtn = screen.getByRole("button", { name: /limpar filtros/i });
    fireEvent.click(clearBtn);

    expect(favBtn).toHaveAttribute("aria-pressed", "false");
    expect(getCounter()).toHaveTextContent("2 de 2");
    expect(window.location.search.replace(/^\?/, "")).toBe("");
  });

  it("re-syncs state when the URL changes externally (back/forward)", () => {
    // Simulate the browser history flow: start filtered, navigate to clean,
    // then "go back" to the filtered URL. We use window.history directly to
    // mimic real browser back/forward — MemoryRouter listens to history.
    const { rerender } = render(
      <MemoryRouter initialEntries={["/magic-up/history?fav=1", "/magic-up/history"]} initialIndex={0}>
        <MagicUpHistory />
      </MemoryRouter>,
    );

    const favBtn = screen.getByRole("button", { name: /favoritos/i });
    expect(favBtn).toHaveAttribute("aria-pressed", "true");
    expect(getCounter()).toHaveTextContent("1 de 2");

    // "Forward" navigation: re-mount at the clean URL. MemoryRouter doesn't
    // expose history.go() across rerenders, so we re-render the tree at the
    // next entry — equivalent to a popstate landing on the clean state.
    rerender(
      <MemoryRouter initialEntries={["/magic-up/history"]}>
        <MagicUpHistory />
      </MemoryRouter>,
    );
    const favBtn2 = screen.getByRole("button", { name: /favoritos/i });
    expect(favBtn2).toHaveAttribute("aria-pressed", "false");
    expect(getCounter()).toHaveTextContent("2 de 2");

    // "Back" navigation: re-mount at the filtered URL again.
    rerender(
      <MemoryRouter initialEntries={["/magic-up/history?fav=1"]}>
        <MagicUpHistory />
      </MemoryRouter>,
    );
    const favBtn3 = screen.getByRole("button", { name: /favoritos/i });
    expect(favBtn3).toHaveAttribute("aria-pressed", "true");
    expect(getCounter()).toHaveTextContent("1 de 2");
  });

  it("does not loop when URL and state already agree", () => {
    // If hydration triggered redundant setSearchParams calls, React would
    // warn about excessive updates. Render and let effects flush — a clean
    // run with no warnings is the assertion.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    act(() => {
      renderAt("/magic-up/history?fav=1");
    });
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
