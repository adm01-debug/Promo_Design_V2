# ADR 0005: Audit and Traceability Strategy

## Status
Accepted

## Context
Enterprise environments require a clear history of "who changed what and when" for compliance, debugging, and data recovery.

## Decision
We implemented a **Trigger-based Audit Log** combined with session metadata.

1. **Audit Table**: A central `audit_log` table stores the `old_data` and `new_data` as JSONB.
2. **Automatic Capture**: `AFTER INSERT/UPDATE/DELETE` triggers on core tables (like `assets`) automatically log changes.
3. **Context Attribution**: We use `auth.uid()` within database triggers to associate changes with the authenticated Supabase user.
4. **Attribution Column**: Added `last_modified_by` directly to the `assets` table for quick lookup without scanning logs.

## Consequences
- **Accountability**: Every mutation is tracked.
- **Storage**: JSONB logs can grow quickly; a retention policy (e.g., 90 days) may be needed in the future.
- **Performance**: Minimal impact on write latency, but provides high value for observability.
