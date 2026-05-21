# Institutional Deployment Profiles & Security Posture

This document defines the operational requirements and security configurations for the Octaix Risk Engine across different environment profiles.

## 1. Environment Matrix

| Feature | Development | Staging | Production |
| :--- | :--- | :--- | :--- |
| **NODE_ENV** | `development` | `staging` | `production` |
| **Session TTL (JWT)** | `24h` | `4h` | `1h` |
| **HSTS** | Disabled | Enabled | Enabled (Strict) |
| **CSP** | Permissive | Enforced | Enforced (Strict) |
| **Error Detail** | Verbose | Masked | Fully Masked |
| **Swagger UI** | Enabled | Enabled | Disabled |
| **Logging Level** | `debug` | `info` | `warn`/`error` |

## 2. Configuration Governance (Joi)

The application uses a strict validation schema at startup. Missing or malformed institutional variables will cause a **fail-fast** termination.

### Mandatory Production Variables
- `DATABASE_URL`: Institutional Postgres Cluster.
- `JWT_SECRET`: Minimum 32-character high-entropy secret.
- `FRONTEND_URL`: White-listed origin for CORS and OIDC callbacks.

## 3. Identity Federation Readiness

The backend is pre-wired for **OIDC/SAML Federation**:
- **User Model**: Supports `externalId` and `AuthProvider` mapping.
- **SSO Toggles**: `SSO_FEDERATION_READY` flag controls the visibility of external login hooks.
- **Role Mapping**: Prepared for IdP group-to-role assertion mapping (e.g., AD Group `Risk_Managers` -> `Role.MANAGER`).

## 4. Operational Throttling Policy

Institutional rate limits are enforced at the infrastructure level but managed via configuration:
- **Short-burst**: 100 req/min (General API).
- **Scoring**: 20 req/min (Heavy ML inference).
- **Auth**: 10 req/min (Brute-force protection).

## 5. Security Header Audit

- **X-Content-Type-Options**: `nosniff`
- **X-Frame-Options**: `DENY`
- **Strict-Transport-Security**: `max-age=31536000; includeSubDomains` (Production only)
- **Content-Security-Policy**: Managed via Helmet based on profile.
