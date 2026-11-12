# ADR 0002: Multi-tenant Security via RLS

## Status

Accepted

## Context

The application serves multiple organizations. We must strictly isolate data so that users can only see and modify data belonging to organizations they are members of.

## Decision

We implemented **Supabase Row Level Security (RLS)** with the following patterns:

1. **Helper Functions**: Created `has_role`, `has_any_role`, and `is_member_of` SQL functions with `SECURITY DEFINER` and fixed `search_path` to verify membership.
2. **Policy Structure**: Every table has 4 standard policies (SELECT, INSERT, UPDATE, DELETE) using the helper functions.
3. **Triggered Validation**: Critical business rules (like `org_id` consistency) are enforced via `BEFORE INSERT OR UPDATE` triggers.

## Consequences

- No "middleware" data isolation is needed; the database handles it natively.
- Slightly higher database CPU usage due to policy evaluation on every query.
- Developers must always be mindful of RLS when creating new tables.
