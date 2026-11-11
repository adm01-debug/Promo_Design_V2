# ADR 0001: Polling vs Realtime for Asset Processing

## Status

Accepted

## Context

We need to track the processing status of assets (OCR, AI analysis, etc.). Supabase provides Realtime (via Postgres Replication), but it can be resource-intensive for high-frequency updates and might have connection limits on lower tiers.

## Decision

We chose a **Polling (15s)** strategy for the following reasons:

1. **Reliability**: Polling is stateless and doesn't depend on keeping a persistent WebSocket connection open in volatile network conditions.
2. **Cost**: Avoids the "Realtime Message" quotas of Supabase, focusing on database reads which are well-cached.
3. **Complexity**: Simpler to implement in TanStack Query via `refetchInterval`.

## Consequences

- UI might have a slight delay (up to 15s) in showing the finished state.
- Increased number of SELECT queries (mitigated by optimized indexes).
