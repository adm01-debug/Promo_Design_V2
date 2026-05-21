# ADR 0007: Standardized Logging and Error Handling

## Status

Accepted

## Context

Debugging production issues across multiple layers (Frontend, Edge Functions, Database) is difficult without standardized log formats and correlation.

## Decision

We standardized on **Structured Logging** and **Standardized Error Responses**.

1. **Structured Logs**: All logs must be in JSON format where possible, containing `timestamp`, `level`, `message`, and `context`.
2. **Correlation**: Edge functions and API calls should include a `requestId` to trace calls from the frontend to the backend.
3. **Global Error Boundary**: The React frontend uses a centralized error boundary and toast system (`sonner`) to display user-friendly messages while logging technical details.
4. **Database Errors**: Trigger exceptions are caught and mapped to human-readable strings (e.g., concurrency conflicts).

## Consequences

- **Observability**: Faster incident response and root cause analysis.
- **Consistency**: Unified experience for developers reading logs.
- **Maintainability**: Reduced "surprise" failures without logs.
