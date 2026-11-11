/**
 * URL state helpers for the Service Order list page.
 *
 * Pure functions extracted from `ServiceOrderList.tsx` so the URL
 * synchronization logic can be exercised without rendering React.
 */
import { format as formatDate } from "date-fns";
import type { OsStatus } from "../hooks/use-service-orders";

export interface ServiceOrderListState {
  search: string;
  statusFilter: OsStatus | "all";
  sortDesc: boolean;
  page: number;
  productQuery: string;
  dateFrom?: Date;
  dateTo?: Date;
}

const VALID_STATUSES: readonly (OsStatus | "all")[] = [
  "all",
  "aberta",
  "aprovada",
  "em_producao",
  "pronta",
  "entregue",
  "concluida",
  "cancelada",
] as const;

/** Build the URLSearchParams string that should represent `state`. */
export function buildServiceOrderListParams(state: ServiceOrderListState): URLSearchParams {
  const next = new URLSearchParams();
  if (state.search.trim()) next.set("q", state.search.trim());
  if (state.statusFilter !== "all") next.set("status", state.statusFilter);
  if (!state.sortDesc) next.set("sort", "asc");
  if (state.page > 1) next.set("page", String(state.page));
  if (state.productQuery.trim()) next.set("product", state.productQuery.trim());
  if (state.dateFrom) next.set("from", formatDate(state.dateFrom, "yyyy-MM-dd"));
  if (state.dateTo) next.set("to", formatDate(state.dateTo, "yyyy-MM-dd"));
  return next;
}

/** Parse URL search params back into a `ServiceOrderListState`. */
export function parseServiceOrderListParams(params: URLSearchParams): ServiceOrderListState {
  const statusRaw = params.get("status");
  const status: OsStatus | "all" =
    statusRaw && VALID_STATUSES.includes(statusRaw as OsStatus | "all")
      ? (statusRaw as OsStatus | "all")
      : "all";

  const pageRaw = Number(params.get("page"));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const fromRaw = params.get("from");
  const toRaw = params.get("to");
  const fromDate = fromRaw ? new Date(fromRaw) : undefined;
  const toDate = toRaw ? new Date(toRaw) : undefined;

  return {
    search: params.get("q") ?? "",
    statusFilter: status,
    sortDesc: params.get("sort") !== "asc",
    page,
    productQuery: params.get("product") ?? "",
    dateFrom: fromDate && !isNaN(fromDate.getTime()) ? fromDate : undefined,
    dateTo: toDate && !isNaN(toDate.getTime()) ? toDate : undefined,
  };
}

/** True whenever any filter (basic or advanced) diverges from the default. */
export function hasActiveFilters(state: ServiceOrderListState): boolean {
  return !!(
    state.search ||
    state.statusFilter !== "all" ||
    !state.sortDesc ||
    state.page > 1 ||
    state.productQuery ||
    state.dateFrom ||
    state.dateTo
  );
}

/**
 * Inclusive day-range ISO bounds for the date range filter, matching what
 * `ServiceOrderList` sends to the query layer.
 */
export function toDateRangeIso(
  dateFrom: Date | undefined,
  dateTo: Date | undefined,
): { dateFromIso?: string; dateToIso?: string } {
  const out: { dateFromIso?: string; dateToIso?: string } = {};
  if (dateFrom) {
    const d = new Date(dateFrom);
    d.setHours(0, 0, 0, 0);
    out.dateFromIso = d.toISOString();
  }
  if (dateTo) {
    const d = new Date(dateTo);
    d.setHours(23, 59, 59, 999);
    out.dateToIso = d.toISOString();
  }
  return out;
}
