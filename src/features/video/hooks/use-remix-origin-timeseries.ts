import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Um ponto diário da série de remixes, quebrado por origem. */
export interface RemixOriginPoint {
  readonly day: string;
  readonly feed: number;
  readonly clientSuggestion: number;
  readonly deepLink: number;
  readonly total: number;
}

export interface RemixOriginSeries {
  readonly windowDays: number;
  readonly points: RemixOriginPoint[];
  readonly totals: { feed: number; clientSuggestion: number; deepLink: number; total: number };
}

const EMPTY: RemixOriginSeries = {
  windowDays: 30,
  points: [],
  totals: { feed: 0, clientSuggestion: 0, deepLink: 0, total: 0 },
};

/** Coerção defensiva: a RPC devolve jsonb livre. */
const toCount = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
};

function parse(payload: unknown): RemixOriginSeries {
  if (!payload || typeof payload !== "object") return EMPTY;
  const raw = payload as Record<string, unknown>;
  const windowDays = typeof raw.window_days === "number" ? raw.window_days : 30;
  const rawPoints = Array.isArray(raw.points) ? raw.points : [];

  const points: RemixOriginPoint[] = [];
  const totals = { feed: 0, clientSuggestion: 0, deepLink: 0, total: 0 };

  for (const entry of rawPoints) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (typeof row.day !== "string" || row.day.length === 0) continue;
    const point: RemixOriginPoint = {
      day: row.day,
      feed: toCount(row.feed),
      clientSuggestion: toCount(row.client_suggestion),
      deepLink: toCount(row.deep_link),
      total: toCount(row.total),
    };
    points.push(point);
    totals.feed += point.feed;
    totals.clientSuggestion += point.clientSuggestion;
    totals.deepLink += point.deepLink;
    totals.total += point.total;
  }

  return { windowDays, points, totals };
}

/** Série temporal diária de remixes por origem dentro da organização. */
export function useRemixOriginTimeseries(organizationId: string | null, days = 30) {
  return useQuery({
    queryKey: ["remix_origin_timeseries", organizationId, days],
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RemixOriginSeries> => {
      const { data, error } = await supabase.rpc("get_remix_origin_timeseries", {
        _org_id: organizationId!,
        _days: days,
      });
      if (error) throw error;
      return parse(data);
    },
  });
}
