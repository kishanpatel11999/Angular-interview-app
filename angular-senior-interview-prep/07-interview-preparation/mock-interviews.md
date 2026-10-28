# Senior Angular Mock Interview Simulations & Evaluation Rubrics

> **Phase:** 7 — Interview Practice  
> **Related:** [angular-interview-questions.md](./angular-interview-questions.md) | [frontend-system-design.md](./frontend-system-design.md) | [scenario-based-questions.md](./scenario-based-questions.md)

---

## Table of Contents

1. [Overview & Scoring Rubric for 5+ Year Candidates](#overview--scoring-rubric-for-5-year-candidates)
2. [Mock Interview 1: Angular Core Architecture & Reactivity](#mock-interview-1-angular-core-architecture--reactivity)
3. [Mock Interview 2: Advanced TypeScript & Reactive Programming](#mock-interview-2-advanced-typescript--reactive-programming)
4. [Mock Interview 3: Frontend System Design & Performance Profiling](#mock-interview-3-frontend-system-design--performance-profiling)
5. [Mock Interview 4: Security, Incident Response & Safe AI Development](#mock-interview-4-security-incident-response--safe-ai-development)
6. [Senior Evaluation Scorecard](#senior-evaluation-scorecard)
7. [Revision Checklist](#revision-checklist)

---

## Overview & Scoring Rubric for 5+ Year Candidates

In senior interviews, candidates are evaluated against four core competencies:
1. **Depth of Framework Internals:** Explaining *why* and *how* systems work rather than reciting syntax.
2. **Architectural Trade-Off Judgment:** Evaluating competing solutions with nuanced pros and cons.
3. **Resilience & Production Readiness:** Security, error handling, performance budgets, and testing.
4. **Communication & Technical Leadership:** Concise explanations, structured breakdowns, collaborative problem solving.

---

## Mock Interview 1: Angular Core Architecture & Reactivity

### Round Focus: Standalone Components, DI Hierarchies, Signals, Zoneless

#### Q1: "How does the dependency injection resolution algorithm work in Angular when navigating up the component tree?"
- **Candidate Response (Strong):**
  > "Angular DI uses a hierarchical two-tier injector tree: the **ElementInjector** hierarchy and the **EnvironmentInjector** hierarchy. When a component injects a token via constructor or `inject()`, Angular first searches the component's own `providers` and `viewProviders`. If not found, it traverses upward through parent DOM nodes checking their ElementInjectors. If it reaches the root component without finding the token, it switches to the EnvironmentInjector tree: checking Route-level providers, then the `EnvironmentInjector` (formerly `ModuleInjector`), and finally the `PlatformInjector`. If the token is not found anywhere and has no default fallback, Angular throws `NullInjectorError`."
- **Interviewer Follow-up:** *"What is the architectural difference between `providers` and `viewProviders` on a component?"*
- **Candidate Follow-up Answer:**
  > "`viewProviders` makes tokens accessible strictly to the component's internal view and direct children, but hides them from projected content (`<ng-content>`). This is essential when building composite design system components where you do not want consumers projecting third-party elements that accidentally access or override internal implementation tokens."

---

## Mock Interview 2: Advanced TypeScript & Reactive Programming

### Round Focus: Generics, Inferred Return Types, RxJS Operator Mechanics

#### Q1: "You have a typeahead search stream that occasionally returns out-of-order results and causes memory leaks. Walk me through your implementation using modern Angular and RxJS."
- **Candidate Response (Strong):**
  ```typescript
  export class SearchComponent {
    private http = inject(HttpClient);
    readonly searchControl = new FormControl('', { nonNullable: true });

    // Stream converts seamlessly to signal with guaranteed auto-unsubscription
    readonly searchResults = toSignal(
      this.searchControl.valueChanges.pipe(
        startWith(''),
        map(term => term.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          if (!query) return of([]);
          return this.http.get<SearchResult[]>(`/api/search`, { params: { q: query } }).pipe(
            catchError(err => {
              console.error('Search failed:', err);
              return of([]);
            })
          );
        })
      ),
      { initialValue: [] }
    );
  }
  ```
- **Interviewer Follow-up:** *"Why did you place `catchError` inside `switchMap` instead of at the end of the outer pipe?"*
- **Candidate Follow-up Answer:**
  > "Because an unhandled error inside an observable completes/terminates the stream. If `catchError` is placed on the outer pipe, the first failed HTTP network request will catch the error, return an empty array, and permanently terminate the `searchControl.valueChanges` subscription, breaking search functionality for all future keystrokes. Nesting `catchError` inside the inner `switchMap` catches the HTTP error locally, emits an empty array, and leaves the outer search listener active."

---

## Mock Interview 3: Frontend System Design & Performance Profiling

### Round Focus: Core Web Vitals, Virtualization, Bundle Splitting

#### Q1: "Design a high-volume financial analytics portal with 50 live charts updating multiple times per second. How do you guarantee a sub-2.5s LCP and smooth 60 FPS scrolling?"
- **Candidate Response (Strong):**
  > "1. **LCP Optimization:** Use Angular SSR with hydration and prerender the structural layout and hero chart skeleton. Serve static critical CSS inline and avoid render-blocking scripts.
  > 2. **WebSocket Ingestion Outside Angular Zone:** Real-time data bursts must be ingested via `ngZone.runOutsideAngular()`. Batch incoming price ticks and flush to the UI once per animation frame (~16ms) via `requestAnimationFrame`.
  > 3. **Fine-Grained Signals with OnPush:** Model each ticker chart with its own discrete Signal. Because Signals update only the specific DOM nodes subscribed to them, we eliminate full-tree dirty checking.
  > 4. **Virtual Scrolling & Canvas Rendering:** Use `@angular/cdk/scrolling` so only the 15 charts currently in view are rendered. Use HTML5 Canvas or WebGL rather than SVGs for high-density time-series charts."

---

## Mock Interview 4: Security, Incident Response & Safe AI Development

### Round Focus: XSS, Cookie Hardening, Trust Boundaries, AI Code Auditing

#### Q1: "A developer asks to store JWT access tokens in `localStorage` for convenience across browser tabs. How do you respond, and what architecture do you mandate?"
- **Candidate Response (Strong):**
  > "I reject storing tokens in `localStorage`. Any script running on the origin — including third-party analytics, compromised npm packages, or an XSS exploit — can read `localStorage.getItem('token')` and exfiltrate the session.
  > **Mandated Architecture:**
  > 1. Store short-lived access tokens (10–15 mins) **strictly in JavaScript memory** in a private singleton service.
  > 2. Store long-lived refresh tokens in **`HttpOnly`, `Secure`, `SameSite=Strict` cookies** using the `__Host-` prefix set by the backend.
  > 3. When the access token expires, a functional HTTP interceptor performs a silent refresh against `/api/auth/refresh`.
  > 4. Synchronize logouts across multiple browser tabs using the `BroadcastChannel` API."

---

## Senior Evaluation Scorecard

| Competency | Below Bar | Meets Bar (Senior) | Exceeds Bar (Lead / Architect) |
|---|---|---|---|
| **Angular Architecture** | Relies on NgModules; confused by DI resolution order; uses default CD everywhere. | Implements standalone components, uses `inject()`, `OnPush`, and signals appropriately. | Deep understanding of Ivy internals, hydration reconciliation, and zoneless mechanics. |
| **Reactivity (RxJS/Signals)** | Manual unsubscriptions missing; nested subscribes; confuses signals with RxJS. | Clean unsubscription via `takeUntilDestroyed()`; correct use of `switchMap`/`mergeMap`. | Implements custom operators, marble tests, and push-pull glitch-free signal architectures. |
| **Security & Systems** | Thinks route guards are security; puts tokens in localStorage; unaware of CSP. | Enforces server-side authorization; uses HttpOnly cookies; sanitizes user inputs. | Designs end-to-end zero-trust web architectures; establishes Content Security Policy & Trusted Types. |
| **AI Tool Safety** | Pastes proprietary logs blindly; accepts AI code without review. | Sanitizes prompts; verifies AI code for memory leaks and hallucinations. | Establishes automated review rubrics, HITL safety gates, and defenses against prompt injection. |

---

## Revision Checklist

- [ ] Practice explaining DI hierarchy resolution from ElementInjector to PlatformInjector.
- [ ] Explain why inner observable error handling is mandatory in `switchMap` typeahead pipelines.
- [ ] Articulate the technical strategy for high-frequency real-time dashboard performance.
- [ ] Defend in-memory token storage + HttpOnly cookie architecture against localStorage.
- [ ] Evaluate candidate responses using the 4-tier Senior Evaluation Scorecard.
