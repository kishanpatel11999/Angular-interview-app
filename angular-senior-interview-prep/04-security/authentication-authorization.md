# Authentication and Authorization

> **Phase:** 4 — Security  
> **Related:** [frontend-security.md](./frontend-security.md) | [browser-storage-and-sessions.md](./browser-storage-and-sessions.md) | [routing-and-navigation.md](../02-core-angular/routing-and-navigation.md)

> ⚠️ **Core security principle: Route guards are for user experience. Authorization MUST be enforced server-side.**

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Authentication vs Authorization](#authentication-vs-authorization)
3. [JWT Tokens — Structure and Risks](#jwt-tokens--structure-and-risks)
4. [Token Storage Decisions](#token-storage-decisions)
5. [OAuth2 and OIDC Flows](#oauth2-and-oidc-flows)
6. [Refresh Token Rotation](#refresh-token-rotation)
7. [Session Management in Angular](#session-management-in-angular)
8. [Angular Route Guards for UX](#angular-route-guards-for-ux)
9. [Why Guards Are Not Authorization](#why-guards-are-not-authorization)
10. [Secure Authentication Implementation Checklist](#secure-authentication-implementation-checklist)
11. [Interview Questions with Answers](#interview-questions-with-answers)
12. [Exercises](#exercises)
13. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Explain the difference between authentication and authorization clearly.
- Evaluate the security trade-offs of different token storage strategies.
- Describe the OAuth2 authorization code + PKCE flow.
- Implement Angular authentication services and guards correctly.
- Articulate why server-side authorization cannot be replaced by Angular route guards.

---

## Authentication vs Authorization

| Concept | Question | Example |
|---------|----------|---------|
| **Authentication** | Who are you? | Verify login credentials |
| **Authorization** | What can you do? | Can this user access `/admin`? |

These are distinct and must both be enforced:
- Authentication: "Is this really Alice?"
- Authorization: "Is Alice allowed to delete this resource?"

Frontend authentication = proof of identity delivered to the frontend.
Backend authorization = enforcing access rules on server operations.

---

## JWT Tokens — Structure and Risks

A JWT (JSON Web Token) consists of three base64url-encoded parts:

```
header.payload.signature

eyJhbGciOiJSUzI1NiJ9   ← Header: algorithm and type
.
eyJzdWIiOiJ1c2VyXzEyMyIsInJvbGUiOiJ1c2VyIiwiZXhwIjoxNjAwMDAwMH0=  ← Payload
.
SIGNATURE  ← Cryptographic signature
```

### Payload Structure

```json
{
  "sub": "user_123",          // subject (user ID)
  "iat": 1700000000,          // issued at (Unix timestamp)
  "exp": 1700003600,          // expiry (1 hour later)
  "role": "admin",            // custom claim
  "iss": "auth.example.com"  // issuer
}
```

### Critical Points

1. **JWT payload is NOT encrypted by default** — it is only base64-encoded. Anyone can decode and read it. Never put passwords, private keys, PII, or sensitive business data in a JWT payload.

2. **JWT signature verification happens on the SERVER** — the frontend should never trust JWT contents without server verification. A frontend can decode a JWT to read the user's role for UI purposes (e.g., show/hide admin menu), but the server must verify the JWT signature before acting on any request.

3. **Tokens have an expiry** — expired tokens must be rejected server-side. Do not rely on the frontend to check expiry.

4. **Short expiry + refresh tokens** — access tokens should be short-lived (5–60 minutes). Refresh tokens allow obtaining new access tokens without re-authentication.

---

## Token Storage Decisions

Where you store authentication tokens has significant security implications:

### Option 1: localStorage

```typescript
// UNSAFE for tokens that grant long-lived access
localStorage.setItem('accessToken', token);
const token = localStorage.getItem('accessToken');
```

**Risks:**
- Accessible by any JavaScript on the page.
- XSS attack can steal tokens from localStorage.
- Tokens persist across browser sessions.

**Use for:** Non-sensitive preferences, public data. **Not for** authentication tokens.

### Option 2: sessionStorage

```typescript
// Slightly better than localStorage — cleared when tab closes
sessionStorage.setItem('accessToken', token);
```

**Same XSS risk as localStorage.** Data cleared when the browser tab is closed.

### Option 3: HttpOnly Cookies (Recommended for tokens)

```
Set-Cookie: access_token=eyJ...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600
```

**Advantages:**
- `HttpOnly` prevents JavaScript access — XSS cannot steal the token.
- `Secure` ensures the cookie is only sent over HTTPS.
- `SameSite=Strict` prevents the cookie from being sent in cross-site requests (CSRF protection).

**Trade-offs:**
- Requires cookie management on the server.
- Cross-domain use requires careful CORS and SameSite configuration.
- Not usable in native mobile apps consuming the same API.

### Option 4: In-Memory (per session)

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  // Token lives only in JavaScript memory — cleared on refresh
  private accessToken: string | null = null;

  setToken(token: string): void { this.accessToken = token; }
  getToken(): string | null { return this.accessToken; }
  clearToken(): void { this.accessToken = null; }
}
```

**Advantages:** XSS cannot persist the token (survives only until page refresh).
**Trade-offs:** Users are logged out on page refresh, requiring refresh token mechanism.

### Recommended Strategy

For SPA applications:
- Short-lived access token in **memory** (not localStorage).
- Refresh token in **HttpOnly cookie** (XSS-safe, server-controlled expiry).
- Refresh flow: on 401 response, automatically exchange refresh token for new access token via secure cookie.

---

## OAuth2 and OIDC Flows

### Authorization Code + PKCE (Recommended for SPAs)

PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks. It is mandatory for public clients (SPAs) per RFC 9700.

```
1. User clicks "Login with Google"
2. Frontend generates:
   - code_verifier = random 43-128 char string
   - code_challenge = BASE64URL(SHA256(code_verifier))
3. Redirect to auth server:
   GET /authorize?
     response_type=code&
     client_id=CLIENT_ID&
     redirect_uri=https://app.com/callback&
     scope=openid profile email&
     code_challenge=CHALLENGE&
     code_challenge_method=S256&
     state=RANDOM_STATE
4. User authenticates with auth server
5. Auth server redirects back:
   GET /callback?code=AUTH_CODE&state=RANDOM_STATE
6. Frontend verifies state matches (CSRF protection)
7. Frontend exchanges code:
   POST /token
   { code: AUTH_CODE, code_verifier: CODE_VERIFIER, grant_type: authorization_code }
8. Auth server validates code_verifier vs code_challenge
9. Auth server returns: { access_token, refresh_token, id_token }
```

### Angular PKCE Implementation

```typescript
@Injectable({ providedIn: 'root' })
export class OAuthService {
  private clientId = inject(OAUTH_CLIENT_ID);
  private authUrl = inject(AUTH_SERVER_URL);

  async startLogin(): Promise<void> {
    const verifier = this.generateCodeVerifier();
    const challenge = await this.generateCodeChallenge(verifier);
    const state = this.generateState();

    sessionStorage.setItem('pkce_verifier', verifier);
    sessionStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: `${window.location.origin}/callback`,
      scope: 'openid profile email',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
    });

    window.location.href = `${this.authUrl}/authorize?${params}`;
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private generateState(): string {
    return crypto.randomUUID();
  }
}
```

---

## Refresh Token Rotation

Refresh tokens are long-lived credentials that must be protected:

```typescript
@Injectable({ providedIn: 'root' })
export class TokenService {
  private http = inject(HttpClient);
  private accessToken: string | null = null;
  private refreshInProgress$: Observable<string> | null = null;

  refreshToken(): Observable<string> {
    if (this.refreshInProgress$) {
      return this.refreshInProgress$; // return existing refresh for concurrent 401s
    }

    this.refreshInProgress$ = this.http.post<{ access_token: string }>(
      '/auth/refresh',
      {},
      { withCredentials: true } // refresh token sent as HttpOnly cookie
    ).pipe(
      map(res => res.access_token),
      tap(token => {
        this.accessToken = token;
        this.refreshInProgress$ = null;
      }),
      catchError(err => {
        this.refreshInProgress$ = null;
        this.accessToken = null;
        return throwError(() => err);
      }),
      shareReplay(1)
    );

    return this.refreshInProgress$;
  }
}
```

---

## Session Management in Angular

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private currentUser = signal<User | null>(null);
  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  async login(credentials: LoginDto): Promise<void> {
    const { user } = await firstValueFrom(
      this.http.post<{ user: User }>('/auth/login', credentials, {
        withCredentials: true // sends and accepts cookies
      })
    );
    this.currentUser.set(user);
    await this.router.navigate(['/dashboard']);
  }

  async logout(): Promise<void> {
    await firstValueFrom(
      this.http.post('/auth/logout', {}, { withCredentials: true })
    ).catch(() => {}); // still clear local state even if request fails
    this.currentUser.set(null);
    await this.router.navigate(['/login']);
  }

  async loadCurrentUser(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.http.get<User>('/auth/me', { withCredentials: true })
      );
      this.currentUser.set(user);
    } catch {
      this.currentUser.set(null);
    }
  }
}

// In app initialization — restore session on page refresh
export function initializeAuth(authService: AuthService) {
  return () => authService.loadCurrentUser();
}

providers: [
  { provide: APP_INITIALIZER, useFactory: (auth: AuthService) => () => auth.loadCurrentUser(), deps: [AuthService], multi: true }
]
```

---

## Angular Route Guards for UX

```typescript
// Guards provide UX — they redirect unauthenticated users
// They do NOT provide security
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: inject(Router).url }
  });
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();

  if (user?.role === 'admin') {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
};
```

---

## Why Guards Are Not Authorization

This is one of the most important security concepts for a senior developer to articulate clearly.

**The attack:**

```javascript
// A user opens DevTools and runs:
const router = (window as any).ng.getComponent(document.querySelector('app-root')).router;
router.navigate(['/admin/users']);
// OR they bypass the Angular app entirely:
fetch('/api/admin/users', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
}).then(r => r.json()).then(console.log);
```

**Angular's route guard runs in the browser** — in an environment the user fully controls. Any guard check can be bypassed by:

- Navigating via `router.navigate()` in DevTools.
- Making API requests directly (curl, Postman, browser fetch).
- Patching the guard function in memory.
- Replaying requests with different credentials.

**The correct model:**

```
Angular guard (UX):       Prevents navigation to admin page in normal usage.
Server authorization:     Every API request is authenticated + authorized.
                         GET /api/admin/users → verify JWT → verify role=admin → respond
                         Without server-side checks, a determined attacker can always 
                         access /api/admin/users regardless of what the frontend does.
```

**The rule:** Treat every API request as potentially malicious, regardless of what the Angular application says.

---

## Secure Authentication Implementation Checklist

- [ ] Tokens stored in HttpOnly cookies or in-memory (not localStorage).
- [ ] Access tokens are short-lived (≤ 60 minutes).
- [ ] Refresh tokens use rotation — old token invalidated after use.
- [ ] PKCE used for OAuth2/OIDC flows.
- [ ] `state` parameter verified in OAuth2 callback (prevents CSRF on login).
- [ ] Logout clears tokens on both client and server.
- [ ] Server validates JWT signature, issuer, audience, and expiry on every request.
- [ ] Server enforces authorization on every API endpoint.
- [ ] Passwords are never stored or transmitted in plaintext.
- [ ] Login attempts are rate-limited on the server.
- [ ] Multi-factor authentication available for sensitive operations.

---

## Interview Questions with Answers

**Q: What is the difference between authentication and authorization, and how are they related?**

> Authentication verifies identity — it answers "Who are you?" by validating credentials, tokens, or certificates. Authorization determines permissions — it answers "What are you allowed to do?" by checking policies against the authenticated identity. They are related but distinct: you must authenticate before you can be authorized. In Angular, authentication determines whether a user is logged in (AuthService, route guards). Authorization determines what they can see and do. Critically, authorization must be enforced on the server — Angular's frontend authorization (guards, hiding UI elements) is purely for user experience and can be bypassed.

**Q: Why is storing JWTs in localStorage a security risk?**

> localStorage is accessible by any JavaScript running in the page. A successful XSS attack (injected script, compromised CDN script, browser extension) can read `localStorage.getItem('token')` and exfiltrate the JWT to an attacker's server. The attacker then has a valid token and can impersonate the user for the token's remaining lifetime. HttpOnly cookies are invisible to JavaScript — even a successful XSS attack cannot read them — making them significantly more resistant to token theft.

**Q: What is PKCE and why is it required for SPAs?**

> PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks. Without PKCE, an attacker who intercepts the authorization code (from URL, redirect logs, referrer headers) can exchange it for tokens. PKCE mitigates this by having the client generate a random `code_verifier` and send its SHA-256 hash (`code_challenge`) at the start of the flow. The code can only be exchanged by a client that knows the original `code_verifier`. Since SPAs are public clients (they cannot keep a client secret), PKCE is the mandatory substitute for a secret.

---

## Exercises

1. Implement an `AuthService` with signal-based user state, login, logout, and `APP_INITIALIZER` for session restoration.
2. Write a token refresh interceptor that queues concurrent 401 responses so only one refresh request is made.
3. Review a provided authentication implementation and identify at least five security issues.
4. Design the server-side authorization middleware for an API that must support role-based access control (RBAC).

---

## Revision Checklist

- [ ] Can clearly articulate authentication vs authorization.
- [ ] Know the risks of each token storage option.
- [ ] Can describe the OAuth2 + PKCE flow step by step.
- [ ] Understand refresh token rotation.
- [ ] Can explain why `CanActivate` is not authorization.
- [ ] Know what the `state` parameter in OAuth2 prevents.

---

## Further Reading

- [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP: JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [RFC 9700: OAuth 2.0 for Browser-Based Applications](https://datatracker.ietf.org/doc/html/rfc9700)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
