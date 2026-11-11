import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect, useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Router, MemoryRouter } from "react-router-dom";
import { createMemoryHistory, type History } from "@remix-run/router";
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
// charts themselves aren't under test here, so stub them out with explicit
// components (a Proxy that returns a function for every property would make
// every object "thenable" and hang the test runner's shutdown).
vi.mock("recharts", () => {
  // Stub that renders nothing: the charts under test are only shells, and
  // rendering their SVG children would emit invalid-tag warnings. Explicit
  // components replace the old Proxy, which returned a function for every
  // property (making everything "thenable" and hanging the runner).
  const Stub = () => null;
  return {
    XAxis: Stub,
    YAxis: Stub,
    Tooltip: Stub,
    ResponsiveContainer: Stub,
    PieChart: Stub,
    Pie: Stub,
    Cell: Stub,
    AreaChart: Stub,
    Area: Stub,
    CartesianGrid: Stub,
  };
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

/**
 * Renders the page under a real memory history so tests can drive back/forward
 * with `history.go()`. The plain <Router> treats `location` as a prop and is
 * not subscribed to the history, so we do what MemoryRouter does internally:
 * keep the current location in state and refresh it on every history change.
 */
function renderWithHistory(history: History) {
  const MemoryRouterLike = ({ navigator }: { navigator: History }) => {
    const [state, setState] = useState({ action: navigator.action, location: navigator.location });
    useEffect(() => navigator.listen((update) => setState(update)), [navigator]);
    return (
      <Router location={state.location} navigationType={state.action} navigator={navigator}>
        <MagicUpHistory />
      </Router>
    );
  };
  return render(<MemoryRouterLike navigator={history} />);
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

    const favBtn = screen.getByRole("button", { name: /^favoritos$/i });
    expect(favBtn).toHaveAttribute("aria-pressed", "true");

    // Only the favorited item should remain in the grid → "1 de 2"
    expect(getCounter()).toHaveTextContent("1 de 2");
  });

  it("starts with filter off when URL has no params", () => {
    renderAt("/magic-up/history");

    const favBtn = screen.getByRole("button", { name: /^favoritos$/i });
    expect(favBtn).toHaveAttribute("aria-pressed", "false");
    expect(getCounter()).toHaveTextContent("2 de 2");
  });

  it("clears all filters (and URL params) via 'Limpar filtros'", () => {
    renderAt("/magic-up/history?fav=1");

    const favBtn = screen.getByRole("button", { name: /^favoritos$/i });
    expect(favBtn).toHaveAttribute("aria-pressed", "true");

    const clearBtn = screen.getByRole("button", { name: /limpar filtros/i });
    fireEvent.click(clearBtn);

    expect(favBtn).toHaveAttribute("aria-pressed", "false");
    expect(getCounter()).toHaveTextContent("2 de 2");
    expect(window.location.search.replace(/^\?/, "")).toBe("");
  });

  it("re-syncs state when the URL changes externally (back/forward)", () => {
    // Simulate the browser history flow: start filtered, navigate to clean,
    // then "go back" to the filtered URL. We drive a real memory history so
    // the router actually observes the location change — re-rendering a
    // MemoryRouter with new initialEntries would never change its history.
    const history = createMemoryHistory({
      initialEntries: ["/magic-up/history?fav=1", "/magic-up/history"],
      initialIndex: 0,
    });
    renderWithHistory(history);

    const favBtn = screen.getByRole("button", { name: /^favoritos$/i });
    expect(favBtn).toHaveAttribute("aria-pressed", "true");
    expect(getCounter()).toHaveTextContent("1 de 2");

    // "Forward" navigation to the clean URL.
    act(() => {
      history.go(1);
    });
    const favBtn2 = screen.getByRole("button", { name: /^favoritos$/i });
    expect(favBtn2).toHaveAttribute("aria-pressed", "false");
    expect(getCounter()).toHaveTextContent("2 de 2");

    // "Back" navigation to the filtered URL again.
    act(() => {
      history.go(-1);
    });
    const favBtn3 = screen.getByRole("button", { name: /^favoritos$/i });
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
