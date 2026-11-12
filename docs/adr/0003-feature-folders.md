# ADR 0003: Feature-based Folder Structure

## Status

Accepted

## Context

As the project grows (~47k LOC), a flat folder structure (`components/`, `hooks/`, `pages/`) becomes difficult to navigate and maintain.

## Decision

We adopted a **Feature-based structure** under `src/features/`. Each domain (e.g., `dam`, `mockup`, `audit`) has its own subdirectory containing:

- `components/`: Domain-specific UI.
- `hooks/`: Domain-specific logic.
- `pages/`: Route entry points.
- `lib/`: Domain-specific constants or utilities.
- `index.ts`: Public API for the feature (barrel export).

Shared components remain in `src/components/ui`.

## Consequences

- High cohesion within features.
- Low coupling between domains.
- Easier for new developers to locate code related to a specific functionality.
