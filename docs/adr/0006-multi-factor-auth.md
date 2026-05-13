# ADR 0006: Multi-Factor Authentication (MFA) Implementation

## Status
Accepted

## Context
High-security assets require more than just password-based authentication to prevent unauthorized access from credential theft.

## Decision
We adopted **Supabase MFA (TOTP)** as our primary secondary factor.

1. **Authentication Level**: We use the `aal` (Authenticator Assurance Level) claim in the JWT to distinguish between single-factor (`aal1`) and multi-factor (`aal2`) sessions.
2. **Database Verification**: A helper function `public.is_mfa_authenticated()` allows RLS policies or application logic to restrict sensitive actions to only users with a verified second factor.
3. **UI Integration**: The application checks the AAL status and prompts the user to enroll or verify their MFA factor when necessary.

## Consequences
- **Security**: Significantly reduces risk of account takeover.
- **Friction**: Adds a step to the login process for users with MFA enabled.
- **Governance**: Allows administrators to enforce MFA for specific roles (e.g., Owners).
