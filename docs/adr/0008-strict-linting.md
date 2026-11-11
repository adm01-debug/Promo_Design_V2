# ADR 0008: Strict Linting and Quality Guardrails

## Status

Accepted

## Context

As the codebase grows, maintaining consistency and preventing common bugs (like missing dependencies in `useEffect`) becomes harder. Technical debt can accumulate quickly if rules are not enforced.

## Decision

We transitioned from "warn" to "error" for critical linting rules:

1. **`no-unused-vars`**: Set to `error`. Prevents dead code from polluting the repository.
2. **`no-explicit-any`**: Set to `error`. Enforces type safety and prevents "type hole" regressions.
3. **`react-hooks/exhaustive-deps`**: Set to `error`. Prevents stale closure bugs and infinite loops in React components.
4. **`no-non-null-assertion`**: Set to `warn`. Discourages the use of `!` unless absolutely necessary, favoring proper null checks.

## Consequences

- **Build Integrity**: Builds will now fail on common code quality issues, ensuring higher production stability.
- **Developer Discipline**: Requires developers to provide proper types and handle React hook dependencies correctly during development.
- **Refactoring**: Existing code using `any` or having missing dependencies must be refactored to comply with the new standards.
