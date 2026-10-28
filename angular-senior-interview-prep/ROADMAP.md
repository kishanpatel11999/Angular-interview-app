# Angular Senior Interview Preparation — Study Roadmap

> **Target:** Developer with 5+ years of experience preparing for senior Angular/Frontend Engineer roles.
> **Format:** Self-paced phases with objectives, effort estimates, exercises, and completion criteria.

---

## How to Use This Roadmap

- Complete phases sequentially — each phase builds on the previous one.
- Use the **Effort Estimate** as a guide, not a strict schedule. Adjust based on your available daily study time.
- A topic is "complete" when you can explain it confidently in a mock interview and write working code without reference.
- Use [PROGRESS.md](./PROGRESS.md) to mark individual topics as done.

---

## Phase 1 — Fundamentals and Language Depth

**Goal:** Reinforce JavaScript and TypeScript knowledge to senior depth, establish strong HTML/CSS/accessibility foundations, and understand Angular's high-level architecture.

**Prerequisites:** Working knowledge of HTML, CSS, JavaScript, and basic Angular.

**Estimated Effort:** 1–2 weeks (2–3 hours/day)

### Topics
- JavaScript: closures, hoisting, event loop, prototype chain, `this` binding
- Async JavaScript: Promises, async/await, microtasks, macrotasks, concurrency
- TypeScript: generics, utility types, discriminated unions, `unknown` vs `any`, decorators
- HTML5 semantic elements, ARIA roles, accessibility standards (WCAG 2.1/2.2)
- CSS: cascade, specificity, flexbox, grid, custom properties, responsive design
- Browser rendering pipeline, repaint vs reflow, DOM event propagation
- Angular architecture overview, application bootstrap, module vs standalone

### Study Files
- [javascript-typescript.md](./01-fundamentals/javascript-typescript.md)
- [html-css-accessibility.md](./01-fundamentals/html-css-accessibility.md)
- [angular-fundamentals.md](./01-fundamentals/angular-fundamentals.md)
- [components-templates-directives.md](./01-fundamentals/components-templates-directives.md)

### Exercises
1. Predict the output of 10 JavaScript closure and event-loop problems.
2. Write a generic TypeScript function with multiple constraints.
3. Audit a sample page for ARIA landmark roles and keyboard navigability.
4. Create a standalone Angular component from scratch without NgModule.

### Completion Criteria
- Can explain the JavaScript event loop with the call stack, task queue, and microtask queue.
- Can write TypeScript utility types and explain when to use `unknown` vs `any`.
- Can describe Angular's bootstrap sequence and the difference between NgModule and standalone.
- Can identify at least five common accessibility anti-patterns in HTML.

---

## Phase 2 — Core Angular and Reactive Programming

**Goal:** Master Angular's core building blocks: DI, change detection, signals, RxJS, forms, routing, and HTTP.

**Prerequisites:** Phase 1 complete. Comfortable with Angular syntax and component basics.

**Estimated Effort:** 2–3 weeks (2–3 hours/day)

### Topics
- Hierarchical dependency injection, providers, tokens, `InjectionToken`
- Component lifecycle hooks and cleanup
- Change detection: default vs OnPush, signals, zoneless preview
- Angular Signals: `signal()`, `computed()`, `effect()`, `toSignal()`, `toObservable()`
- RxJS: cold vs hot, Subject variants, essential operators, error handling
- Subscription management and memory leak prevention
- Reactive forms: `FormGroup`, `FormControl`, `FormArray`, custom validators
- Template-driven forms: `ngModel`, two-way binding, limitations
- Router: routes configuration, lazy loading, guards, resolvers, CanActivate/CanMatch
- HttpClient: functional interceptors (Angular 15+), retry, cancellation, error handling

### Study Files
- [dependency-injection.md](./02-core-angular/dependency-injection.md)
- [lifecycle-change-detection.md](./02-core-angular/lifecycle-change-detection.md)
- [signals-and-rxjs.md](./02-core-angular/signals-and-rxjs.md)
- [forms-basic-to-advanced.md](./02-core-angular/forms-basic-to-advanced.md)
- [routing-and-navigation.md](./02-core-angular/routing-and-navigation.md)
- [http-client-and-interceptors.md](./02-core-angular/http-client-and-interceptors.md)
- [pipes-and-directives.md](./02-core-angular/pipes-and-directives.md)

### Exercises
1. Build a service using hierarchical DI with a component-level override.
2. Convert a `BehaviorSubject`-based state service to signals.
3. Implement a type-safe reactive form with cross-field and async validators.
4. Set up lazy-loaded routes with a functional auth guard.
5. Write a functional HTTP interceptor that adds an auth header and handles 401 responses.

### Completion Criteria
- Can explain `OnPush` change detection and when to use it over default.
- Can demonstrate the difference between `switchMap`, `mergeMap`, `concatMap`, and `exhaustMap` with a use case for each.
- Can build a dynamic reactive form with runtime field addition.
- Can set up route-level lazy loading and demonstrate code-split behavior.

---

## Phase 3 — Advanced Angular and Architecture

**Goal:** Develop architectural judgment for large-scale Angular applications, master performance optimization, and understand SSR and build tooling.

**Prerequisites:** Phase 2 complete.

**Estimated Effort:** 2–3 weeks (2–3 hours/day)

### Topics
- Standalone architecture: feature modules, DI scope design, `bootstrapApplication`
- State management: signals, NgRx, component store, Akita — decision criteria
- Performance: OnPush, virtual scrolling, lazy loading, bundle analysis, LCP/FID/CLS
- Angular SSR with Angular Universal, hydration (Angular 16+), incremental hydration
- Build system: Angular CLI, esbuild, Vite, environment configuration
- Reusable component design: content projection, `ng-template`, `ng-content`, design system integration
- Incremental migration: NgModule to standalone, zone-based to zoneless

### Study Files
- [standalone-and-architecture.md](./03-advanced-angular/standalone-and-architecture.md)
- [state-management.md](./03-advanced-angular/state-management.md)
- [performance-optimization.md](./03-advanced-angular/performance-optimization.md)
- [ssr-hydration-and-rendering.md](./03-advanced-angular/ssr-hydration-and-rendering.md)
- [angular-build-and-tooling.md](./03-advanced-angular/angular-build-and-tooling.md)
- [reusable-component-design.md](./03-advanced-angular/reusable-component-design.md)
- [migrations-and-compatibility.md](./03-advanced-angular/migrations-and-compatibility.md)

### Exercises
1. Design the DI scope for a multi-tenant Angular application.
2. Profile a large list component and apply virtual scrolling with `CdkVirtualScrollViewport`.
3. Set up Angular SSR and validate hydration works without flash of unstyled content.
4. Analyze a webpack/esbuild bundle and identify the three largest contributors.
5. Build a multi-slot content projection component with typed outlets.

### Completion Criteria
- Can explain trade-offs between NgRx, signals-based state, and component store.
- Can profile an Angular application and identify rendering bottlenecks.
- Can explain the hydration model and why `isPlatformBrowser` guards are needed for SSR.
- Can design a large application's module boundaries on a whiteboard.

---

## Phase 4 — Security and Testing

**Goal:** Understand frontend security threats and defenses thoroughly. Build confidence in unit, integration, and E2E testing strategies.

**Prerequisites:** Phase 2 complete. Familiarity with browser security basics.

**Estimated Effort:** 1–2 weeks (2–3 hours/day)

### Topics
- XSS: stored, reflected, DOM-based; Angular's built-in sanitization
- Content Security Policy, Trusted Types, `bypassSecurityTrust*` risks
- CSRF/XSRF: `HttpClientXsrfModule`, SameSite cookies, double-submit cookie pattern
- Authentication vs authorization — why frontend guards are not authorization
- JWT handling: storage options, expiration, refresh token security
- OAuth2/OIDC flows: authorization code + PKCE
- Secure cookies: HttpOnly, Secure, SameSite, __Host prefix
- CORS: what it does and does not protect
- Clickjacking, open redirects, supply-chain and dependency risks
- Unit testing: TestBed, component harnesses, service testing, mocks
- Integration and E2E testing: Cypress, Playwright, API contract testing
- Debugging: Angular DevTools, source maps, change detection profiling

### Study Files
- [frontend-security.md](./04-security/frontend-security.md)
- [authentication-authorization.md](./04-security/authentication-authorization.md)
- [secure-api-integration.md](./04-security/secure-api-integration.md)
- [browser-storage-and-sessions.md](./04-security/browser-storage-and-sessions.md)
- [secure-coding-checklist.md](./04-security/secure-coding-checklist.md)
- [unit-testing.md](./05-testing-and-quality/unit-testing.md)
- [integration-and-e2e-testing.md](./05-testing-and-quality/integration-and-e2e-testing.md)
- [debugging-and-code-quality.md](./05-testing-and-quality/debugging-and-code-quality.md)
- [code-review-checklist.md](./05-testing-and-quality/code-review-checklist.md)

### Exercises
1. Identify three XSS vulnerabilities in a provided Angular template and fix them.
2. Implement CSRF protection using `HttpClientXsrfModule` and explain how it works.
3. Write unit tests for a service that calls `HttpClient` using `HttpClientTestingModule`.
4. Write a component test that simulates user interaction using Angular CDK component harnesses.
5. Write an E2E test for the login flow using Cypress or Playwright.

### Completion Criteria
- Can explain the difference between XSS, CSRF, and clickjacking without confusion.
- Can identify at least five security anti-patterns in a code review.
- Can write component unit tests with stubs, spies, and async operations.
- Can explain why `CanActivate` route guards do not replace server-side authorization.

---

## Phase 5 — Performance and System Design

**Goal:** Practice frontend performance profiling and system design interviews.

**Prerequisites:** Phase 3 complete.

**Estimated Effort:** 1 week (2–3 hours/day)

### Topics
- Core Web Vitals: LCP, FID/INP, CLS — measurement and optimization
- Bundle size optimization: tree-shaking, code splitting, differential loading
- Rendering strategies: CSR, SSR, SSG, ISR — when to use which
- Frontend system design: large-scale SPA architecture, micro-frontends, design systems
- API design considerations from the frontend perspective

### Study Files
- [performance-optimization.md](./03-advanced-angular/performance-optimization.md)
- [frontend-system-design.md](./07-interview-preparation/frontend-system-design.md)

### Exercises
1. Analyze a Lighthouse report and create an improvement plan.
2. Design a system architecture for a multi-team enterprise Angular application.
3. Describe how you would implement micro-frontends using Module Federation.

---

## Phase 6 — Safe AI-Assisted Development

**Goal:** Learn to use AI coding assistants effectively and safely in professional projects.

**Prerequisites:** Phases 1–4 complete. Familiarity with at least one AI coding tool.

**Estimated Effort:** 3–5 days (2 hours/day)

### Topics
- Writing precise prompts with context and constraints
- Detecting AI hallucinations and outdated API suggestions
- Reviewing AI-generated code for security, correctness, and maintainability
- Data privacy: what not to share with AI tools
- Prompt injection risks in agentic coding tools
- License and supply-chain considerations for AI-generated code

### Study Files
- [ai-coding-workflow.md](./06-ai-assisted-development/ai-coding-workflow.md)
- [ai-security-and-privacy.md](./06-ai-assisted-development/ai-security-and-privacy.md)
- [prompt-engineering-for-developers.md](./06-ai-assisted-development/prompt-engineering-for-developers.md)
- [ai-generated-code-review.md](./06-ai-assisted-development/ai-generated-code-review.md)
- [agentic-coding-and-tool-safety.md](./06-ai-assisted-development/agentic-coding-and-tool-safety.md)

### Exercises
1. Use an AI tool to generate an Angular service, then audit it for security and correctness.
2. Identify three API suggestions in an AI-generated Angular component that do not match Angular 18.
3. Write a prompt template for "implement a feature" that includes all necessary context fields.

---

## Phase 7 — Coding Practice and Mock Interviews

**Goal:** Solidify interview readiness through deliberate coding practice and simulated interviews.

**Prerequisites:** Phases 1–6 complete, or concurrent with Phases 5–6.

**Estimated Effort:** Ongoing (minimum 1 week intensive before interviews)

### Topics
- Angular deep-dive questions and answers
- JavaScript/TypeScript algorithmic and design questions
- RxJS and signals interview questions
- Coding challenges (implement from scratch)
- Scenario-based architecture discussions
- Debugging exercises
- Mock interviews with scoring

### Study Files
- [angular-interview-questions.md](./07-interview-preparation/angular-interview-questions.md)
- [javascript-typescript-questions.md](./07-interview-preparation/javascript-typescript-questions.md)
- [rxjs-and-signals-questions.md](./07-interview-preparation/rxjs-and-signals-questions.md)
- [coding-challenges.md](./07-interview-preparation/coding-challenges.md)
- [scenario-based-questions.md](./07-interview-preparation/scenario-based-questions.md)
- [debugging-exercises.md](./07-interview-preparation/debugging-exercises.md)
- [mock-interviews.md](./07-interview-preparation/mock-interviews.md)

### Practice Schedule (Intensive 1-Week Sprint)
| Day | Focus |
|-----|-------|
| Day 1 | Angular core Q&A + 2 coding challenges |
| Day 2 | RxJS/Signals Q&A + debugging exercises |
| Day 3 | System design mock + scenario questions |
| Day 4 | Full mock interview (60–90 min timed) |
| Day 5 | Review weak areas from mock, security Q&A |
| Day 6 | Full mock interview (60–90 min timed) |
| Day 7 | Revision using final-interview-checklist.md |

---

## Version Comparison Study (Ongoing)

Study the version history section to answer questions about Angular's evolution, feature availability, and migration strategies. This is increasingly common in senior interviews.

- [angular-v20-to-v22-comparison.md](./10-version-comparison/angular-v20-to-v22-comparison.md) — Stable signals, zoneless, and hydration
- [angular-feature-availability-matrix.md](./10-version-comparison/angular-feature-availability-matrix.md) — Comprehensive feature × version matrix
- [angular-migration-guide.md](./10-version-comparison/angular-migration-guide.md) — Migration recipes and tooling

---

## Adjusting for Your Schedule

| Available time | Suggested approach |
|---|---|
| 1 hour/day | Focus on one topic file per day, prioritize Phases 2, 4, and 7 |
| 2–3 hours/day | Follow phases as structured above |
| Full-time study | Compress to 2–3 weeks total, run mock interviews from week 2 |
| Interview in 48 hours | Use [final-interview-checklist.md](./09-revision/final-interview-checklist.md) and [quick-reference.md](./09-revision/quick-reference.md) |
