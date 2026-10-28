# Enterprise Angular Secure Coding Checklist

> **Phase:** 4 — Security and Testing  
> **Related:** [frontend-security.md](./frontend-security.md) | [authentication-authorization.md](./authentication-authorization.md) | [secure-api-integration.md](./secure-api-integration.md) | [browser-storage-and-sessions.md](./browser-storage-and-sessions.md)

---

## Purpose & Scope

This checklist serves as the authoritative production security gate for senior Angular engineers, technical leads, and application security reviewers. Every pull request and major architectural release must pass these verification gates.

---

## 1. Templates, Data Binding & XSS Prevention

| Check | Requirement | Verification Method |
|---|---|---|
| 🟩 **Interpolation & Property Bindings** | Always use standard Angular template bindings (`{{ value }}`, `[prop]="value"`). Angular sanitizes values automatically. | Code review, automated ESLint checks |
| 🔴 **`bypassSecurityTrust*` Elimination** | Forbid `DomSanitizer.bypassSecurityTrustHtml`, `bypassSecurityTrustScript`, `bypassSecurityTrustUrl` unless explicitly reviewed by AppSec with written threat modeling. | `npm run lint` with `@angular-eslint/template/no-interpolation-in-raw-style` and custom security AST rules |
| 🔴 **Direct DOM Manipulation Ban** | Forbid `elementRef.nativeElement.innerHTML`, `outerHTML`, `insertAdjacentHTML`, and `document.write`. Always use Angular templates or `Renderer2.setProperty()`. | ESLint rule `no-restricted-syntax` targeting `.nativeElement` writes |
| 🟩 **Safe Link Targets** | All external links `<a target="_blank">` must include `rel="noopener noreferrer"` to prevent tab-nabbing and `window.opener` hijacking. | HTML template linting |
| 🟩 **Trusted Types Enforcement** | Configure Angular with DOM Trusted Types (`trusted-types angular angular#unsafe-bypass; require-trusted-types-for 'script'`) to turn DOM-based XSS into compile/runtime errors. | Browser console inspection, CSP header audit |

---

## 2. Content Security Policy (CSP) & HTTP Security Headers

Every production Angular deployment must serve these HTTP headers via reverse proxy (NGINX, Cloudflare, CloudFront):

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.enterprise.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; require-trusted-types-for 'script';
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### Verification Checklist:
- [ ] No `'unsafe-eval'` in `script-src` (AOT compilation eliminates the need for `eval`).
- [ ] `frame-ancestors 'none'` prevents clickjacking attacks.
- [ ] `X-Content-Type-Options: nosniff` stops MIME-type sniffing exploits.
- [ ] HSTS enabled with minimum 1-year duration (`max-age=31536000`).

---

## 3. Authentication & Session Management

- [ ] **No Tokens in LocalStorage:** Neither JWT access tokens nor refresh tokens are stored in `window.localStorage` or `window.sessionStorage`.
- [ ] **In-Memory Access Tokens:** Access tokens reside only in private singleton service variables or signals, disappearing on tab closure.
- [ ] **HttpOnly Refresh Cookies:** Refresh tokens are stored exclusively in `HttpOnly`, `Secure`, `SameSite=Strict` cookies utilizing the `__Host-` prefix.
- [ ] **Token Expiration:** Access tokens expire within 5–15 minutes; refresh tokens are rotated on each use.
- [ ] **Route Guards Recognized as UX Only:** No business logic relies on Angular route guards for security. Every API endpoint enforces authorization server-side.
- [ ] **Cross-Tab Logout:** Terminating a session in one tab dispatches a `BroadcastChannel` or `storage` event to immediately purge in-memory state across all open tabs.
- [ ] **Inactivity Timeout:** Automated idle tracking triggers session termination after 15 minutes of user inactivity.

---

## 4. API Integration & Network Communication

- [ ] **CSRF Protection:** State-changing requests (`POST`, `PUT`, `DELETE`, `PATCH`) carry an anti-CSRF token via `withXsrfConfiguration()`.
- [ ] **Open Redirect Prevention:** Post-login redirections rigorously validate that target URLs are relative paths starting with `/` (rejecting protocol-relative `//` or external origins).
- [ ] **Runtime Schema Validation:** Payloads from external or microservice endpoints are parsed with runtime schema validators (Zod) before accessing properties.
- [ ] **Safe File Uploads:** Files are validated client-side for MIME type and file size, then uploaded directly to object storage via short-lived, presigned URLs.
- [ ] **Credential Interceptor Boundaries:** HTTP Interceptors only attach `Authorization: Bearer <token>` headers to verified internal API domains (whitelisted base URLs). Never attach auth headers to third-party endpoints!

---

## 5. Server-Side Rendering (SSR) & Secret Exposure

- [ ] **No Client Bundle Secrets:** Zero private keys, database URLs, or privileged admin API keys present in `environment.ts` or client code.
- [ ] **TransferState Audit:** Data serialized into `TransferState` contains only public view models. No user PII, internal error stack traces, or authorization tokens.
- [ ] **No Shared State Across Requests:** Node.js SSR services handling HTTP requests do not store per-user data in static class fields or module-level variables.
- [ ] **Platform Isolation:** Browser-only globals (`window`, `localStorage`, `document`) are wrapped in `isPlatformBrowser()` or deferred to `afterNextRender()`.

---

## 6. Dependency & Supply Chain Security

- [ ] **Lockfile Integrity:** `package-lock.json` is checked into version control and builds use `npm ci` (never `npm install` in CI/CD).
- [ ] **Automated Vulnerability Scanning:** CI pipeline fails on dependencies with `high` or `critical` CVEs (`npm audit --audit-level=high` or Snyk).
- [ ] **Dependency Pinning & Renovate/Dependabot:** Dependencies are tracked with automated vulnerability updates and peer review.
- [ ] **No `--force` or `--legacy-peer-deps`:** Never bypass npm dependency resolution in production build scripts.

---

## 7. Logging, Telemetry & Privacy

- [ ] **PII Scrubbing:** Passwords, Social Security Numbers, credit card details, and auth tokens are masked before logging to console or sending to error monitoring (Sentry, Datadog).
- [ ] **Production Source Maps Restricted:** Source maps are either disabled in production (`"sourceMap": false`) or uploaded securely to error reporting servers without public hosting.
- [ ] **Referrer Control:** `<meta name="referrer" content="strict-origin-when-cross-origin">` ensures query parameter tokens are not leaked in HTTP Referer headers.

---

## Threat Modeling: Quick Review Matrix

```
Threat: Attacker injects malicious script via product review input.
  ├── Defense 1: Angular auto-escapes HTML binding {{ review.comment }}.
  ├── Defense 2: CSP blocks inline script execution ('script-src self').
  └── Defense 3: Trusted Types prevents DOM innerHTML injection.

Threat: Attacker crafts malicious link to bank.com/transfer.
  ├── Defense 1: Authentication cookies use SameSite=Strict; Secure; HttpOnly.
  └── Defense 2: Angular HttpClient requires X-XSRF-TOKEN header.

Threat: User modifies isAdmin in client memory to view Admin page.
  ├── Defense 1: Route guard prevents accidental visual navigation.
  └── Defense 2: Server API responds with 403 Forbidden because JWT lacks admin role claim.
```
