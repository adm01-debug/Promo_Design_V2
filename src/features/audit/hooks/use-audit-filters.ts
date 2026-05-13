import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { AuditAction, AuditFilterState } from "../hooks/use-audit-log";

const PAGE_SIZE_KEY = "audit-page-size";
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 50;
const LS_KEY = "audit-filters-v1";

function parseActions(s: string | null): AuditAction[] {
  if (!s) return [];
  return s.split(",").filter((x): x is AuditAction => x === "INSERT" || x === "UPDATE" || x === "DELETE");
}

function parseDate(s: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

interface PersistedFilters {
  from?: string;
  to?: string;
  action?: string;
  table?: string;
  user?: string;
  q?: string;
  vk?: string;
  vq?: string;
  ip?: string;
  ua?: string;
}

function readPersisted(): PersistedFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as PersistedFilters) : null;
  } catch {
    return null;
  }
}

function writePersisted(p: PersistedFilters) {
  if (typeof window === "undefined") return;
  try {
    const hasAny = Object.values(p).some((v) => v && v.length > 0);
    if (hasAny) window.localStorage.setItem(LS_KEY, JSON.stringify(p));
    else window.localStorage.removeItem(LS_KEY);
  } catch { /* noop */ }
}

export function useAuditFilters() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
    const stored = Number(localStorage.getItem(PAGE_SIZE_KEY));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  });

  useEffect(() => {
    try { localStorage.setItem(PAGE_SIZE_KEY, String(pageSize)); } catch { /* ignore */ }
    setPage(0);
  }, [pageSize]);

  // Initial hydrate from localStorage if URL is empty
  useEffect(() => {
    const hasAnyParam = Array.from(params.keys()).length > 0;
    if (hasAnyParam) return;
    const persisted = readPersisted();
    if (!persisted) return;
    const next = new URLSearchParams();
    if (persisted.from) next.set("from", persisted.from);
    if (persisted.to) next.set("to", persisted.to);
    if (persisted.action) next.set("action", persisted.action);
    if (persisted.table) next.set("table", persisted.table);
    if (persisted.user) next.set("user", persisted.user);
    if (persisted.q) next.set("q", persisted.q);
    if (persisted.vk) next.set("vk", persisted.vk);
    if (persisted.vq) next.set("vq", persisted.vq);
    if (persisted.ip) next.set("ip", persisted.ip);
    if (persisted.ua) next.set("ua", persisted.ua);
    if (Array.from(next.keys()).length > 0) setParams(next, { replace: true });
  }, [params, setParams]);

  const filterState: AuditFilterState = useMemo(
    () => ({
      from: parseDate(params.get("from")),
      to: parseDate(params.get("to")),
      actions: parseActions(params.get("action")),
      tableName: params.get("table") ?? undefined,
      userId: params.get("user") ?? undefined,
      recordIdQuery: params.get("q") ?? "",
      valueKey: params.get("vk") ?? "",
      valueQuery: params.get("vq") ?? "",
      ipQuery: params.get("ip") ?? "",
      userAgentQuery: params.get("ua") ?? "",
    }),
    [params],
  );

  const setFilters = (s: AuditFilterState) => {
    const next = new URLSearchParams();
    if (s.from) next.set("from", s.from.toISOString());
    if (s.to) next.set("to", s.to.toISOString());
    if (s.actions.length) next.set("action", s.actions.join(","));
    if (s.tableName) next.set("table", s.tableName);
    if (s.userId) next.set("user", s.userId);
    if (s.recordIdQuery) next.set("q", s.recordIdQuery);
    if (s.valueKey) next.set("vk", s.valueKey);
    if (s.valueQuery) next.set("vq", s.valueQuery);
    if (s.ipQuery) next.set("ip", s.ipQuery);
    if (s.userAgentQuery) next.set("ua", s.userAgentQuery);
    setParams(next, { replace: true });
    setPage(0);
  };

  useEffect(() => {
    writePersisted({
      from: filterState.from?.toISOString(),
      to: filterState.to?.toISOString(),
      action: filterState.actions.length ? filterState.actions.join(",") : undefined,
      table: filterState.tableName,
      user: filterState.userId,
      q: filterState.recordIdQuery || undefined,
      vk: filterState.valueKey || undefined,
      vq: filterState.valueQuery || undefined,
      ip: filterState.ipQuery || undefined,
      ua: filterState.userAgentQuery || undefined,
    });
  }, [filterState]);

  const hasAnyFilter = useMemo(
    () =>
      !!filterState.from ||
      !!filterState.to ||
      filterState.actions.length > 0 ||
      !!filterState.tableName ||
      !!filterState.userId ||
      filterState.recordIdQuery.length > 0 ||
      filterState.valueKey.length > 0 ||
      filterState.valueQuery.length > 0 ||
      filterState.ipQuery.length > 0 ||
      filterState.userAgentQuery.length > 0,
    [filterState],
  );

  return {
    filterState,
    setFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    hasAnyFilter,
    pageSizeOptions: PAGE_SIZE_OPTIONS
  };
}
