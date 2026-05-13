# ADR 0004: Concurrency Control and Optimistic Locking

## Status
Accepted

## Context
In a multi-user environment, two or more users might attempt to update the same asset metadata simultaneously. Without concurrency control, the last write wins, potentially overwriting previous changes silently.

## Decision
We implemented **Optimistic Locking** using a `lock_version` column in the `assets` table.

1. **Database Enforcement**: A `BEFORE UPDATE` trigger checks if the `lock_version` provided by the client matches the current version in the database.
2. **Version Increment**: The trigger automatically increments the version on successful updates.
3. **Client Handling**: The frontend (via `useAssets` hook) captures the current `lock_version` and includes it in the update payload. If the update fails due to a version mismatch (returning 0 rows or a specific error code), the client is notified of the conflict.

## Consequences
- **Integrity**: Prevents accidental data loss from race conditions.
- **UX**: Requires a conflict resolution strategy (e.g., notifying the user and refreshing the data).
- **Overhead**: Minimal database overhead for version checking and incrementing.
