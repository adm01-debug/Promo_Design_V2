import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface ResultsPaginationProps {
  /** Current page (1-based). */
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Singular noun used in counter (default: "resultado"). Plural is `${noun}s`. */
  itemNoun?: string;
  /** Optional page-size selector options. When provided with `onPageSizeChange`, renders a select. */
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

function buildPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

/**
 * Reusable pagination footer: shows "X–Y de Z resultados" + numbered page links
 * with ellipses. Disables Previous/Next at limits (visually + `aria-disabled`).
 */
export function ResultsPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  className,
  itemNoun = "resultado",
  pageSizeOptions,
  onPageSizeChange,
}: ResultsPaginationProps) {
  const safePage = Math.max(1, Math.min(page, Math.max(1, totalPages)));
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const isFirst = safePage <= 1;
  const isLast = safePage >= totalPages;

  let counter: React.ReactNode;
  if (total === 0) {
    counter = <span>Nenhum resultado</span>;
  } else if (totalPages <= 1) {
    counter = (
      <span>
        <strong className="font-semibold text-foreground">{total.toLocaleString("pt-BR")}</strong>{" "}
        {total === 1 ? itemNoun : `${itemNoun}s`}
      </span>
    );
  } else {
    counter = (
      <span>
        Mostrando{" "}
        <strong className="font-semibold text-foreground">
          {from.toLocaleString("pt-BR")}–{to.toLocaleString("pt-BR")}
        </strong>{" "}
        de{" "}
        <strong className="font-semibold text-foreground">{total.toLocaleString("pt-BR")}</strong>{" "}
        {total === 1 ? itemNoun : `${itemNoun}s`}
      </span>
    );
  }

  const go = (p: number) => {
    const next = Math.max(1, Math.min(p, totalPages));
    if (next !== safePage) onPageChange(next);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 flex-wrap text-sm text-muted-foreground",
        className,
      )}
    >
      <div>{counter}</div>
      {pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-xs whitespace-nowrap">
            Por página
          </label>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger id="page-size" className="h-8 w-20" aria-label="Resultados por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {totalPages > 1 && (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={isFirst}
                aria-label={`Ir para página anterior${isFirst ? " (desabilitado)" : ""}`}
                tabIndex={isFirst ? -1 : undefined}
                className={cn(isFirst && "pointer-events-none opacity-50")}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isFirst) go(safePage - 1);
                }}
              />
            </PaginationItem>
            {buildPageList(safePage, totalPages).map((p, i) =>
              p === "ellipsis" ? (
                <PaginationItem key={`e-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === safePage}
                    aria-current={p === safePage ? "page" : undefined}
                    aria-label={p === safePage ? `Página ${p}, atual` : `Ir para página ${p}`}
                    onClick={(e) => {
                      e.preventDefault();
                      go(p);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={isLast}
                aria-label={`Ir para próxima página${isLast ? " (desabilitado)" : ""}`}
                tabIndex={isLast ? -1 : undefined}
                className={cn(isLast && "pointer-events-none opacity-50")}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isLast) go(safePage + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      {totalPages > 5 && <GoToPage totalPages={totalPages} currentPage={safePage} onGo={go} />}
    </div>
  );
}

function GoToPage({
  totalPages,
  currentPage,
  onGo,
}: {
  totalPages: number;
  currentPage: number;
  onGo: (p: number) => void;
}) {
  const [value, setValue] = useState<string>(String(currentPage));
  useEffect(() => {
    setValue(String(currentPage));
  }, [currentPage]);

  const submit = () => {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return;
    const clamped = Math.max(1, Math.min(totalPages, n));
    setValue(String(clamped));
    onGo(clamped);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-2"
    >
      <label htmlFor="goto-page" className="text-xs whitespace-nowrap">
        Ir para
      </label>
      <Input
        id="goto-page"
        type="number"
        inputMode="numeric"
        min={1}
        max={totalPages}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={submit}
        className="h-8 w-16 text-center"
        aria-label={`Ir para página (1 a ${totalPages})`}
      />
      <span className="text-xs text-muted-foreground whitespace-nowrap">de {totalPages}</span>
      <Button type="submit" size="sm" variant="outline" className="h-8">
        Ir
      </Button>
    </form>
  );
}
