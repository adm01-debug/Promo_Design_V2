import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { ResultsPagination } from "@/components/ResultsPagination";

function renderPagination(overrides: Partial<React.ComponentProps<typeof ResultsPagination>> = {}) {
  const props: React.ComponentProps<typeof ResultsPagination> = {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    onPageChange: vi.fn(),
    ...overrides,
  };
  const utils = render(<ResultsPagination {...props} />);
  return { ...utils, props };
}

describe("ResultsPagination — counter", () => {
  it("shows 'Nenhum resultado' when total is zero", () => {
    renderPagination({ total: 0, totalPages: 1 });
    expect(screen.getByText("Nenhum resultado")).toBeInTheDocument();
  });

  it("shows total only (singular) when there is a single page", () => {
    renderPagination({ total: 1, totalPages: 1, pageSize: 10 });
    expect(screen.getByText(/resultado$/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows total only (plural) when single page with several items", () => {
    renderPagination({ total: 7, totalPages: 1, pageSize: 10 });
    expect(screen.getByText(/resultados$/)).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders 'X–Y de Z resultados' on first page", () => {
    renderPagination({ page: 1, pageSize: 10, total: 25, totalPages: 3 });
    expect(screen.getByText(/Mostrando/)).toBeInTheDocument();
    expect(screen.getByText("1–10")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("computes 'to' correctly on the last partial page", () => {
    // page 3 of 3, pageSize 10, total 25 → from=21, to=25
    renderPagination({ page: 3, pageSize: 10, total: 25, totalPages: 3 });
    expect(screen.getByText("21–25")).toBeInTheDocument();
  });

  it("uses provided itemNoun (singular/plural)", () => {
    renderPagination({ page: 1, pageSize: 10, total: 5, totalPages: 1, itemNoun: "evento" });
    expect(screen.getByText(/eventos$/)).toBeInTheDocument();
  });

  it("clamps an out-of-range page when computing range", () => {
    // page 99 with totalPages 2 → clamped to 2 → from=11, to=15
    renderPagination({ page: 99, pageSize: 10, total: 15, totalPages: 2 });
    expect(screen.getByText("11–15")).toBeInTheDocument();
  });
});

describe("ResultsPagination — Previous/Next disabled at limits", () => {
  it("disables Previous on first page and enables Next", () => {
    const onPageChange = vi.fn();
    renderPagination({ page: 1, pageSize: 10, total: 50, totalPages: 5, onPageChange });
    const prev = screen.getByLabelText(/Ir para página anterior/i);
    const next = screen.getByLabelText(/Ir para próxima página/i);
    expect(prev).toHaveAttribute("aria-disabled", "true");
    expect(prev.className).toMatch(/pointer-events-none/);
    expect(next).toHaveAttribute("aria-disabled", "false");

    fireEvent.click(prev);
    expect(onPageChange).not.toHaveBeenCalled();

    fireEvent.click(next);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables Next on last page and enables Previous", () => {
    const onPageChange = vi.fn();
    renderPagination({ page: 5, pageSize: 10, total: 50, totalPages: 5, onPageChange });
    const prev = screen.getByLabelText(/Ir para página anterior/i);
    const next = screen.getByLabelText(/Ir para próxima página/i);
    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(next.className).toMatch(/pointer-events-none/);
    expect(prev).toHaveAttribute("aria-disabled", "false");

    fireEvent.click(next);
    expect(onPageChange).not.toHaveBeenCalled();

    fireEvent.click(prev);
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("disables both Previous and Next when there is a single page", () => {
    // totalPages=1 → the <Pagination> nav is not rendered at all
    const { container } = renderPagination({ page: 1, pageSize: 10, total: 5, totalPages: 1 });
    expect(container.querySelector("nav")).toBeNull();
  });

  it("clicking a numbered page calls onPageChange with that page", () => {
    const onPageChange = vi.fn();
    renderPagination({ page: 1, pageSize: 10, total: 50, totalPages: 5, onPageChange });
    const nav = screen.getByRole("navigation");
    const link3 = within(nav).getByLabelText("Ir para página 3");
    fireEvent.click(link3);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("does not call onPageChange when clicking the active page", () => {
    const onPageChange = vi.fn();
    renderPagination({ page: 2, pageSize: 10, total: 50, totalPages: 5, onPageChange });
    const nav = screen.getByRole("navigation");
    const active = within(nav).getByLabelText(/Página 2, atual/i);
    fireEvent.click(active);
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
