# HttpClient and Interceptors

> **Phase:** 2 — Core Angular  
> **Related:** [routing-and-navigation.md](./routing-and-navigation.md) | [frontend-security.md](../04-security/frontend-security.md) | [secure-api-integration.md](../04-security/secure-api-integration.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [HttpClient Setup](#httpclient-setup)
3. [Making HTTP Requests](#making-http-requests)
4. [Response Typing and Transformation](#response-typing-and-transformation)
5. [Error Handling](#error-handling)
6. [Functional Interceptors](#functional-interceptors)
7. [Request Cancellation](#request-cancellation)
8. [Retry Strategies](#retry-strategies)
9. [HttpClientTestingModule](#httpclienttestingmodule)
10. [Security Considerations](#security-considerations)
11. [Interview Questions with Answers](#interview-questions-with-answers)
12. [Exercises](#exercises)
13. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Set up `HttpClient` in standalone and NgModule applications.
- Write typed HTTP requests with proper error handling.
- Implement functional interceptors for auth, logging, and error handling.
- Cancel HTTP requests when components are destroyed.
- Test HTTP interactions with `HttpClientTestingModule`.

---

## HttpClient Setup

### Standalone (Angular 15+)

```typescript
// main.ts
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, loggingInterceptor, errorInterceptor]),
      withFetch(), // Use fetch API instead of XHR (Angular 17.3+)
    ),
    // CSRF support
    // withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })
  ]
});
```

### NgModule-based (legacy)

```typescript
@NgModule({
  imports: [HttpClientModule, HttpClientXsrfModule.withOptions({
    cookieName: 'XSRF-TOKEN',
    headerName: 'X-XSRF-TOKEN',
  })],
})
export class AppModule {}
```

---

## Making HTTP Requests

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = '/api/users';

  // GET — simple typed request
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl);
  }

  // GET with params
  searchUsers(query: string, page: number = 1): Observable<PaginatedResponse<User>> {
    const params = new HttpParams()
      .set('q', query)
      .set('page', page.toString())
      .set('limit', '20');

    return this.http.get<PaginatedResponse<User>>(this.baseUrl, { params });
  }

  // GET — full response (for headers, status codes)
  getUserWithMeta(id: number): Observable<HttpResponse<User>> {
    return this.http.get<User>(`${this.baseUrl}/${id}`, { observe: 'response' });
  }

  // POST
  createUser(data: CreateUserDto): Observable<User> {
    return this.http.post<User>(this.baseUrl, data);
  }

  // PUT
  updateUser(id: number, data: UpdateUserDto): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/${id}`, data);
  }

  // PATCH
  patchUser(id: number, data: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/${id}`, data);
  }

  // DELETE
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // File upload with progress
  uploadAvatar(userId: number, file: File): Observable<HttpEvent<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<{ url: string }>(
      `${this.baseUrl}/${userId}/avatar`,
      formData,
      { reportProgress: true, observe: 'events' }
    );
  }
}
```

---

## Response Typing and Transformation

```typescript
// Map response to domain model
getUser(id: number): Observable<User> {
  return this.http.get<ApiUser>(`/api/users/${id}`).pipe(
    map(apiUser => this.mapToUser(apiUser))
  );
}

// Extract nested data
getProductNames(): Observable<string[]> {
  return this.http.get<{ data: Product[] }>('/api/products').pipe(
    map(response => response.data.map(p => p.name))
  );
}

// IMPORTANT: The generic type parameter does NOT validate at runtime
// Type assertions should be validated or use a runtime schema library (Zod, class-transformer)
interface ApiResponse<T> {
  data: T;
  meta: { total: number; page: number };
}

getProducts(): Observable<ApiResponse<Product[]>> {
  return this.http.get<ApiResponse<Product[]>>('/api/products');
  // Runtime check: angular does not validate that the response matches Product[]
}
```

---

## Error Handling

```typescript
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getUser(id: number): Observable<User | null> {
    return this.http.get<User>(`/api/users/${id}`).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of(null); // user not found — return null instead of throwing
        }
        if (error.status === 0) {
          // Network error — no connection
          return throwError(() => new Error('Network error. Please check your connection.'));
        }
        if (error.status === 401) {
          // Will be handled by auth interceptor
          return throwError(() => error);
        }
        return throwError(() => new Error(`Server error: ${error.status}`));
      })
    );
  }
}

// Component-level error handling
@Component({ ... })
class UserDetailComponent {
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);

  userId = toSignal(this.route.paramMap.pipe(map(p => Number(p.get('id')))));

  userState = toSignal(
    toObservable(this.userId).pipe(
      switchMap(id => id ? this.userService.getUser(id) : of(null)),
      map(user => ({ status: 'success' as const, data: user })),
      catchError(err => of({ status: 'error' as const, message: err.message })),
      startWith({ status: 'loading' as const })
    )
  );
}
```

---

## Functional Interceptors

Functional interceptors (Angular 15+) are plain functions — no class, no `@Injectable`.

### Authentication Interceptor

```typescript
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  if (!token) {
    return next(req); // proceed without token
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });

  return next(authReq);
};
```

### Token Refresh Interceptor

```typescript
export const tokenRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/refresh')) {
        return authService.refreshToken().pipe(
          switchMap(newToken => {
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` }
            });
            return next(retried);
          }),
          catchError(() => {
            authService.logout();
            router.navigate(['/login']);
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
```

### Error Notification Interceptor

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Don't show notification for auth endpoints — handled separately
      if (!req.url.includes('/auth/')) {
        const message = error.error?.message ?? `HTTP ${error.status}: ${error.statusText}`;
        notificationService.showError(message);
      }
      return throwError(() => error);
    })
  );
};
```

### Logging Interceptor

```typescript
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const start = Date.now();

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          const duration = Date.now() - start;
          console.debug(`[HTTP] ${req.method} ${req.url} → ${event.status} (${duration}ms)`);
        }
      },
      error: (error: HttpErrorResponse) => {
        const duration = Date.now() - start;
        console.error(`[HTTP] ${req.method} ${req.url} → ${error.status} (${duration}ms)`);
      }
    })
  );
};
```

### Class-Based Interceptors (Legacy)

```typescript
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;
    return next.handle(authReq);
  }
}

// Register in NgModule
providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }]
```

---

## Request Cancellation

```typescript
@Component({ ... })
export class SearchComponent {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  private searchTerm = signal('');

  // switchMap automatically cancels previous request when a new term arrives
  results = toSignal(
    toObservable(this.searchTerm).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(term => term.length >= 2),
      switchMap(term =>
        this.http.get<SearchResult[]>(`/api/search?q=${term}`)
      ),
      takeUntilDestroyed(this.destroyRef)
    ),
    { initialValue: [] as SearchResult[] }
  );

  // Manual cancellation using takeUntil
  private cancel$ = new Subject<void>();

  startLongOperation(): void {
    this.http.post('/api/report', { type: 'full' }).pipe(
      takeUntil(this.cancel$)
    ).subscribe(result => this.handleResult(result));
  }

  cancelOperation(): void {
    this.cancel$.next();
  }
}
```

---

## Retry Strategies

```typescript
import { retry, timer } from 'rxjs';

// Simple retry
this.http.get('/api/data').pipe(
  retry(3)
)

// Retry with delay
this.http.get('/api/data').pipe(
  retry({ count: 3, delay: 1000 })
)

// Exponential backoff with conditional retry
this.http.get('/api/data').pipe(
  retry({
    count: 4,
    delay: (error: HttpErrorResponse, retryCount: number) => {
      // Only retry on transient errors (429, 503, 0 = network)
      if ([429, 503, 0].includes(error.status)) {
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
        console.log(`Retrying in ${delay}ms (attempt ${retryCount})`);
        return timer(delay);
      }
      // Don't retry on 4xx client errors
      throw error;
    }
  })
)
```

---

## HttpClientTestingModule

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService],
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // ensure no outstanding requests
  });

  it('should load a user', () => {
    const mockUser: User = { id: 1, name: 'Alice' };
    let result: User | undefined;

    service.getUser(1).subscribe(user => (result = user));

    const req = httpMock.expectOne('/api/users/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);

    expect(result).toEqual(mockUser);
  });

  it('should handle 404', () => {
    let result: User | null | undefined;

    service.getUser(999).subscribe(user => (result = user));

    const req = httpMock.expectOne('/api/users/999');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(result).toBeNull();
  });
});
```

---

## Security Considerations

> See [secure-api-integration.md](../04-security/secure-api-integration.md) for full coverage.

- **Never include API keys in frontend code.** Keys in Angular code are visible in the browser.
- **Validate API responses** — TypeScript types are compile-time only. A compromised server could return unexpected data.
- **Use HTTPS** for all API calls — HTTP requests are visible to network observers.
- **CSRF protection:** Use `HttpClientXsrfModule` or `withXsrfConfiguration()` to automatically add CSRF tokens to mutating requests.
- **Do not log request bodies** in interceptors if they may contain credentials or PII.
- **Content-Type validation:** Check that responses have the expected content type before processing.

---

## Interview Questions with Answers

**Q: What is the difference between `observe: 'body'`, `observe: 'response'`, and `observe: 'events'`?**

> `observe: 'body'` (default) returns the parsed response body. `observe: 'response'` returns the full `HttpResponse` object including headers, status code, and body — useful when you need the status code or response headers. `observe: 'events'` returns an `Observable<HttpEvent<T>>` that emits multiple events during the request lifecycle including `HttpSentEvent`, `HttpUploadProgressEvent`, `HttpDownloadProgressEvent`, `HttpResponseEvent`, and `HttpErrorResponse` — used for progress tracking during file uploads.

**Q: How does a functional interceptor differ from a class-based interceptor?**

> Class-based interceptors implement `HttpInterceptor` and are registered via `HTTP_INTERCEPTORS` multi-token with `multi: true`. They are instantiated as services with full DI support but require more boilerplate. Functional interceptors (Angular 15+) are plain functions with the signature `(req, next) => Observable<HttpEvent<any>>`. They still have access to DI via `inject()` within the function body (called during request processing, which is an injection context). They are simpler, more readable, and registered via `withInterceptors([...])` in `provideHttpClient()`.

**Q: How would you prevent duplicate API calls for the same resource?**

> Use `shareReplay(1)` on the observable to share a single HTTP request among multiple subscribers. Store the observable in a cache map keyed by the resource ID. Use `switchMap` in search scenarios to cancel previous requests. For GET requests, consider implementing an HTTP cache layer as an interceptor that stores responses in a `Map` and returns cached responses for subsequent identical requests, with configurable TTL.

---

## Exercises

1. Implement a token refresh interceptor that queues concurrent 401 responses (only one refresh request, then replay all queued requests).
2. Build an HTTP caching interceptor that caches `GET` responses for 60 seconds using a `Map`.
3. Write a service that uploads files with progress tracking and displays a progress bar.
4. Write unit tests for an interceptor that adds an auth header and test both the case where a token exists and doesn't.

---

## Revision Checklist

- [ ] Know how to set up `provideHttpClient()` with functional interceptors.
- [ ] Can implement auth, error, and logging interceptors as functions.
- [ ] Understand how to cancel requests using `takeUntil` / `takeUntilDestroyed`.
- [ ] Know `retry()` with exponential backoff.
- [ ] Can test HTTP services using `HttpClientTestingModule` and `HttpTestingController`.
- [ ] Know security implications: API keys, CSRF, HTTPS, response validation.

---

## Further Reading

- [Angular: HttpClient](https://angular.dev/guide/http)
- [Angular: HTTP interceptors](https://angular.dev/guide/http/interceptors)
- [Angular: HTTP testing](https://angular.dev/guide/http/testing)
