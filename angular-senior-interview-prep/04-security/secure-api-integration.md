# Secure API Integration & Frontend-Backend Security Boundaries

> **Phase:** 4 — Security and Testing  
> **Related:** [frontend-security.md](./frontend-security.md) | [authentication-authorization.md](./authentication-authorization.md) | [browser-storage-and-sessions.md](./browser-storage-and-sessions.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Prerequisites](#prerequisites)
3. [The Core Security Principle: The Trust Boundary](#the-core-security-principle-the-trust-boundary)
4. [Broken Access Control: Why Route Guards Are Not Security](#broken-access-control-why-route-guards-are-not-security)
5. [Cross-Site Request Forgery (CSRF/XSRF) Defenses in Angular](#cross-site-request-forgery-csrfxsrf-defenses-in-angular)
6. [CORS: Limitations as a Security Control](#cors-limitations-as-a-security-control)
7. [API Request & Response Validation (Preventing Overfetching & Injection)](#api-request--response-validation-preventing-overfetching--injection)
8. [Secure File Uploads from the Frontend](#secure-file-uploads-from-the-frontend)
9. [Open Redirects & Unsafe URL Handling](#open-redirects--unsafe-url-handling)
10. [Handling Sensitive Data in Logs, Headers, and Telemetry](#handling-sensitive-data-in-logs-headers-and-telemetry)
11. [Vulnerable vs Secure Implementation Examples](#vulnerable-vs-secure-implementation-examples)
12. [Common Misconceptions in Frontend Security](#common-misconceptions-in-frontend-security)
13. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
14. [Hands-On Exercise: Implementing Safe HTTP Interceptor & Schema Validation](#hands-on-exercise-implementing-safe-http-interceptor--schema-validation)
15. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Master the frontend/backend trust boundary and understand why client code can never be trusted for security enforcement.
- Explain why Angular route guards and UI element hiding (`@if (isAdmin)`) do not secure APIs or sensitive data.
- Implement robust CSRF defenses using Angular's `withXsrfConfiguration` and cookie-to-header token exchange.
- Understand what Cross-Origin Resource Sharing (CORS) actually does and why it protects users, not servers.
- Validate incoming API payloads using schema validation (Zod) to prevent malformed or malicious data injection.
- Secure file upload workflows against MIME-spoofing and unauthorized storage access.
- Prevent open redirect vulnerabilities during post-login redirections.

---

## The Core Security Principle: The Trust Boundary

```
[ UNTRUSTED ZONE: Browser Runtime ]
  ├── Angular Application Code
  ├── Route Guards (can be bypassed by DevTools)
  ├── UI Conditional Directives (@if)
  ├── LocalStorage / SessionStorage / JavaScript Memory
  └── Client Network Requests (can be forged via cURL, Postman, Burp Suite)
========================== TRUST BOUNDARY ==========================
[ TRUSTED ZONE: Server Backend ]
  ├── API Gateway / Reverse Proxy
  ├── Server-Side Authentication & Session Validation
  ├── Role-Based Access Control (RBAC) Enforcement
  └── Database & Internal Microservices
```

### The Non-Negotiable Rule
**Every security decision (authentication, authorization, input validation, transaction limits) must be validated and enforced on the server.**
The Angular frontend is merely a presentation layer running in a hostile environment controlled by the user.

---

## Broken Access Control: Why Route Guards Are Not Security

### Realistic Threat Scenario
An e-commerce portal hides the Admin Dashboard using an Angular route guard (`canActivate: [adminGuard]`). An attacker with a regular user account opens Chrome DevTools:
1. Replaces the route guard logic in the browser console or navigates directly via script.
2. The UI renders the Admin page shell.
3. If the backend API `/api/admin/delete-user` blindly trusts the request without verifying the session token's server-side claims, the attacker successfully deletes accounts!

### Vulnerable Example (UNSAFE)
```typescript
// ⚠️ VULNERABLE: Assuming the route guard prevents unauthorized backend access
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  // Route guards only prevent client-side navigation UI transitions!
  return authService.currentUser()?.role === 'ADMIN';
};

// In component:
deleteUser(userId: string) {
  // If backend endpoint does not verify server-side JWT claims/session:
  // ANY authenticated user who crafts this HTTP call can delete users!
  this.http.delete(`/api/admin/users/${userId}`).subscribe();
}
```

### Safe Implementation (SECURE)
```typescript
// SECURE: Frontend guard only manages user experience; backend validates authorization
// Frontend Guard provides UI guidance:
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasRole('ADMIN')) return true;
  return router.parseUrl('/unauthorized');
};

// Backend Node/Express API enforces authorization independently:
// app.delete('/api/admin/users/:id', verifyJwt, requireRole('ADMIN'), (req, res) => {
//   // Server validates cryptographic signature and database role!
//   db.deleteUser(req.params.id);
//   res.status(204).send();
// });
```

---

## Cross-Site Request Forgery (CSRF/XSRF) Defenses in Angular

### Threat Scenario
A user logs into their bank (`bank.com`), which sets an authentication session cookie. The user then visits a malicious site (`attacker.com`). The malicious site embeds:
```html
<form action="https://bank.com/api/transfer" method="POST">
  <input type="hidden" name="amount" value="10000" />
  <input type="hidden" name="toAccount" value="attacker-account" />
</form>
<script>document.forms[0].submit();</script>
```
The browser automatically attaches `bank.com`'s session cookies, and the bank processes the unauthorized transaction!

### Defense 1: SameSite Cookie Attribute (Primary Defense)
Set authentication cookies on the server with:
`SameSite=Lax` or `SameSite=Strict; Secure; HttpOnly`.
This prevents cross-site POST requests from attaching the cookie automatically.

### Defense 2: Angular Anti-XSRF Token Configuration
Angular includes built-in XSRF protection for `HttpClient`. The server sets a non-HttpOnly cookie containing a random token (default name: `XSRF-TOKEN`). Angular's `HttpClient` reads this cookie and sends its value in a custom header (default name: `X-XSRF-TOKEN`) on state-changing requests (`POST`, `PUT`, `DELETE`).
Because malicious third-party origins cannot read cookies from `bank.com` due to the Same-Origin Policy, they cannot forge the custom header!

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withXsrfConfiguration({
        cookieName: 'MY-XSRF-COOKIE', // Custom cookie name if different from XSRF-TOKEN
        headerName: 'X-CSRF-TOKEN'     // Custom header name if different from X-XSRF-TOKEN
      })
    )
  ]
};
```

---

## CORS: Limitations as a Security Control

### Common Misconception
*"Our API is completely protected from hackers because CORS is restricted to https://myapp.com."*

### Why CORS Does NOT Protect Servers from Attackers:
1. **CORS is enforced ONLY by browsers:** An attacker using Postman, cURL, Python, or an automated bot does not respect CORS headers. They can send arbitrary HTTP requests directly to your API.
2. **CORS protects the USER from malicious websites:** CORS prevents `evil.com` running in the user's browser from reading sensitive JSON data returned from `api.bank.com` using the user's cookies.
3. **CORS preflights do not stop simple requests:** Browser requests like simple GETs or `application/x-www-form-urlencoded` POSTs are dispatched before the browser checks CORS headers; the browser only blocks the JavaScript response from being read!

---

## API Request & Response Validation (Preventing Overfetching & Injection)

### The Overfetching / Mass Assignment Risk
If the backend returns an entire database record containing sensitive internal flags (`isAdmin: true`, `passwordHash: "..."`) and the frontend blindly spreads or logs this data, credentials can leak into client memory, error logs, or analytics.

### Runtime Schema Validation with Zod
TypeScript types only exist at compile time; they evaporate at runtime. Use **Zod** to validate that API responses strictly match expected shapes:

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { z } from 'zod';

// Define strict runtime schema
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  role: z.enum(['USER', 'MANAGER', 'ADMIN'])
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);

  getUserProfile(): Observable<UserProfile> {
    return this.http.get('/api/me').pipe(
      map(rawResponse => {
        // Parse and validate at runtime; strips extra fields or throws on schema violation
        const result = UserProfileSchema.safeParse(rawResponse);
        if (!result.success) {
          console.error('[Security] API payload validation failed:', result.error);
          throw new Error('Corrupted or invalid API response format');
        }
        return result.data;
      })
    );
  }
}
```

---

## Secure File Uploads from the Frontend

### Risks:
- Uploading executable files (`.exe`, `.php`, `.svg` with embedded `<script>`).
- Client-side MIME-type spoofing (attacker renames `malicious.exe` to `photo.jpg`).

### Secure Pattern: Presigned Direct-to-Cloud Uploads
Never route multi-megabyte file uploads through your main Angular application server. Use presigned URLs directly to object storage (AWS S3, Google Cloud Storage):

```
1. Angular asks Backend: "I want to upload 'avatar.png' (type image/png, size 1.2MB)"
2. Backend validates authorization, file extension, and generates signed S3 PUT URL with short TTL (60s)
3. Backend returns signed URL to Angular
4. Angular uploads binary file directly to S3 via HTTP PUT
5. S3 scans file with antivirus / malware scanner
6. Angular confirms upload completion to Backend
```

```typescript
// Secure client-side upload handler
async uploadAvatar(file: File): Promise<void> {
  // 1. Client-side sanity checks
  const maxBytes = 5 * 1024 * 1024; // 5 MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, and WebP images are permitted');
  }
  if (file.size > maxBytes) {
    throw new Error('File size exceeds 5MB limit');
  }

  // 2. Request presigned URL from trusted backend
  const { uploadUrl, fileKey } = await firstValueFrom(
    this.http.post<{ uploadUrl: string; fileKey: string }>('/api/uploads/presign', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    })
  );

  // 3. Direct upload to storage bucket
  await firstValueFrom(
    this.http.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type }
    })
  );
}
```

---

## Open Redirects & Unsafe URL Handling

### Threat Scenario
An authentication redirect pattern takes a `returnUrl` query parameter:
`https://myapp.com/login?returnUrl=https://evil-phishing-site.com`
Upon successful login, if Angular executes `window.location.href = returnUrl`, the user is redirected to a malicious spoofed site that looks identical to your app, tricking them into re-entering their password.

### Safe Implementation
```typescript
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RedirectService {
  private router = inject(Router);

  safeRedirect(targetUrl: string | null): void {
    if (!targetUrl) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Reject protocol-relative URLs (//evil.com) or external schemes (http:, javascript:)
    const isRelative = targetUrl.startsWith('/') && !targetUrl.startsWith('//') && !targetUrl.startsWith('/\\');

    if (isRelative) {
      // Safe internal Angular route
      this.router.navigateByUrl(targetUrl);
    } else {
      console.warn('[Security] Blocked potential open redirect to:', targetUrl);
      this.router.navigate(['/dashboard']);
    }
  }
}
```

---

## Handling Sensitive Data in Logs, Headers, and Telemetry

1. **Sanitize Error Logging:** Never send raw HTTP error objects or response bodies directly to client-side telemetry (Datadog, Sentry) without masking passwords, credit cards, or authorization headers.
2. **Prevent Referer Leakage:** If your URL contains sensitive tokens (e.g. `/reset-password?token=XYZ`), external links on that page can send the token in the HTTP `Referer` header. Add `<meta name="referrer" content="strict-origin-when-cross-origin">` to `index.html`.

---

## Senior Interview Questions with Detailed Answers

### Q1: Why is an Angular route guard insufficient for protecting sensitive features and data?
**Answer:**
Angular executes entirely within the user's browser, which is an untrusted runtime. An attacker can inspect source code, modify JavaScript in memory, overwrite router guard functions in DevTools, or simply bypass the browser entirely by sending HTTP requests via tools like cURL or Postman.
Route guards exist solely to provide a clean **User Experience** (preventing unintentional navigation to inaccessible views or redirecting unauthenticated users to a login screen). 
Real security must always be enforced **server-side** at the API layer by cryptographically validating session cookies or JWTs and verifying role-based authorization before returning sensitive data or executing mutations.

---

### Q2: How does Angular's built-in XSRF protection work, and what must the server do to support it?
**Answer:**
Angular uses the **Cookie-to-Header Token pattern**:
1. When a user accesses the site, the backend server sets a cookie named `XSRF-TOKEN` (must be accessible to JavaScript, so `HttpOnly=false`, but `Secure=true` and `SameSite=Strict/Lax`).
2. When Angular's `HttpClient` makes mutating HTTP requests (`POST`, `PUT`, `DELETE`, `PATCH`), an internal interceptor reads the value from the `XSRF-TOKEN` cookie.
3. `HttpClient` copies this value into a custom request header named `X-XSRF-TOKEN`.
4. The server compares the value in the header against the session or cookie value.
5. This works because due to the Same-Origin Policy, an attacker on a third-party website (`evil.com`) cannot read the cookies of your domain, meaning they cannot populate the custom header on a forged request.

---

## Revision Checklist

- [ ] Explain the trust boundary between browser client and server backend.
- [ ] Understand why route guards are purely UX, not security boundaries.
- [ ] Configure `withXsrfConfiguration` and explain the cookie-to-header token exchange.
- [ ] Clarify what CORS does (protects user from evil sites reading responses) and what it doesn't do (protect servers from direct requests).
- [ ] Use runtime schema validation (e.g., Zod) on external API payloads.
- [ ] Implement safe URL validation to prevent Open Redirects.
- [ ] Follow presigned URL patterns for secure direct-to-cloud file uploads.
