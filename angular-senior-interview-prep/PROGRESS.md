# Angular Senior Interview Prep — Progress Tracker

> Check off items as you complete them. "Complete" = can explain confidently in a mock interview + wrote code examples from scratch.

---

## Phase 1 — Fundamentals and Language Depth

### JavaScript & TypeScript
- [ ] Closures, scope, hoisting, execution context
- [ ] Prototype chain and `this` binding
- [ ] Event loop, call stack, microtasks, macrotasks
- [ ] Promises, async/await, error handling
- [ ] TypeScript generics and constraints
- [ ] Utility types: `Partial`, `Required`, `Pick`, `Omit`, `Record`, `ReturnType`, `Awaited`
- [ ] Discriminated unions and type narrowing
- [ ] `unknown` vs `any` vs `never`
- [ ] Decorators and metadata reflection
- [ ] Module system and `tsconfig` compiler options

### HTML, CSS, and Accessibility
- [ ] Semantic HTML5 elements
- [ ] ARIA roles, properties, and states
- [ ] Keyboard navigation and focus management
- [ ] CSS cascade, specificity, and inheritance
- [ ] Flexbox and CSS Grid layout
- [ ] CSS custom properties and design tokens
- [ ] Responsive design: media queries, container queries
- [ ] Browser rendering pipeline, repaint, reflow
- [ ] DOM event propagation: bubbling, capturing, delegation

### Angular Fundamentals
- [ ] Application architecture and bootstrap sequence
- [ ] NgModule vs standalone component approach
- [ ] Component metadata: selector, template, styles, encapsulation
- [ ] Built-in control flow: `@if`, `@for`, `@switch`, `@defer`
- [ ] Template expressions, event binding, property binding, two-way binding
- [ ] Component inputs, outputs, and `model()` inputs (version-specific)
- [ ] `@ViewChild`, `@ViewChildren`, `@ContentChild`, `@ContentChildren`

**Phase 1 Complete:** [ ]

---

## Phase 2 — Core Angular and Reactive Programming

### Dependency Injection
- [ ] Hierarchical injector tree
- [ ] `providedIn: 'root'` vs module/component providers
- [ ] `InjectionToken` and factory providers
- [ ] `useClass`, `useExisting`, `useFactory`, `useValue`
- [ ] DI in standalone components
- [ ] `inject()` function and constructor injection

### Lifecycle and Change Detection
- [ ] All lifecycle hooks and their execution order
- [ ] `ngOnChanges` with `SimpleChanges`
- [ ] Default vs `OnPush` change detection
- [ ] Manual `ChangeDetectorRef` control
- [ ] Zone.js mechanics and `NgZone`
- [ ] Zoneless change detection preview (Angular 18+)
- [ ] `DestroyRef` and `takeUntilDestroyed`

### Signals and RxJS
- [ ] `signal()`, `computed()`, `effect()`
- [ ] Signal mutability: `set()`, `update()`, `mutate()` (deprecated in v17+)
- [ ] `toSignal()` and `toObservable()` interop
- [ ] Cold vs hot observables
- [ ] Subject, BehaviorSubject, ReplaySubject, AsyncSubject
- [ ] `switchMap`, `mergeMap`, `concatMap`, `exhaustMap`
- [ ] `combineLatest`, `forkJoin`, `withLatestFrom`, `zip`
- [ ] `shareReplay`, `share`, `publish`
- [ ] Error handling: `catchError`, `retry`, `retryWhen`
- [ ] Subscription management: `takeUntil`, `takeUntilDestroyed`, `async` pipe
- [ ] Memory leak patterns and prevention

### Forms
- [ ] Template-driven forms: `ngModel`, `NgForm`
- [ ] Reactive forms: `FormControl`, `FormGroup`, `FormArray`, `FormBuilder`
- [ ] Built-in validators: `Validators.required`, `pattern`, `min`, `max`
- [ ] Custom synchronous validators
- [ ] Custom asynchronous validators
- [ ] Cross-field validation with `AbstractControl`
- [ ] Dynamic form generation
- [ ] Form state: `dirty`, `touched`, `pristine`, `pending`, `valid`, `invalid`

### Routing and Navigation
- [ ] `Routes` configuration and lazy loading with `loadChildren`/`loadComponent`
- [ ] `ActivatedRoute` and route parameters
- [ ] `CanActivate`, `CanDeactivate`, `CanMatch` (functional guards)
- [ ] `Resolve` interface and functional resolvers
- [ ] Route-level providers and component reuse
- [ ] Router events and navigation lifecycle
- [ ] Query parameters and fragment handling

### HTTP Client and Interceptors
- [ ] `HttpClient` setup with `provideHttpClient()`
- [ ] Functional interceptors (Angular 15+)
- [ ] Class-based interceptors (legacy)
- [ ] Request modification: headers, params
- [ ] Response typing and transformation
- [ ] Error handling and retry strategies
- [ ] Request cancellation with `AbortController` / unsubscription
- [ ] `HttpClientTestingModule` for testing

### Pipes and Directives
- [ ] Built-in pipes: `date`, `currency`, `decimal`, `json`, `async`, `keyvalue`
- [ ] Pure vs impure pipes
- [ ] Custom pipe implementation
- [ ] Built-in attribute directives: `ngClass`, `ngStyle`
- [ ] Custom attribute directive
- [ ] Structural directives with `TemplateRef` and `ViewContainerRef`

**Phase 2 Complete:** [ ]

---

## Phase 3 — Advanced Angular and Architecture

### Standalone Architecture
- [ ] `bootstrapApplication` and `ApplicationConfig`
- [ ] Standalone components, directives, and pipes
- [ ] Feature-level DI scoping with `providers` in routes
- [ ] Migrating NgModule apps to standalone incrementally

### State Management
- [ ] Signal-based state in components
- [ ] Service-based state with signals
- [ ] NgRx: Store, Actions, Reducers, Effects, Selectors
- [ ] NgRx Component Store
- [ ] Criteria for choosing a state management approach

### Performance Optimization
- [ ] `ChangeDetectionStrategy.OnPush` throughout
- [ ] `CdkVirtualScrollViewport` for large lists
- [ ] Lazy loading routes and components
- [ ] Image optimization with `NgOptimizedImage`
- [ ] Bundle analysis with `source-map-explorer` or `webpack-bundle-analyzer`
- [ ] Tree-shaking and dead-code elimination
- [ ] Core Web Vitals: LCP, INP, CLS measurement and improvement

### SSR, Hydration, and Rendering
- [ ] Angular Universal and Server-Side Rendering setup
- [ ] Full-app hydration (Angular 16+)
- [ ] Incremental hydration (Angular 19+ developer preview, Angular 20 stable)
- [ ] `isPlatformBrowser` / `isPlatformServer` guards
- [ ] `TransferState` for server-to-client data transfer
- [ ] Event replay during hydration

### Build and Tooling
- [ ] Angular CLI commands: `build`, `serve`, `test`, `lint`, `generate`
- [ ] `angular.json` configuration
- [ ] Environment configuration with `environment.ts` / build-time configuration
- [ ] esbuild / Vite builder (Angular 16+ application builder)
- [ ] CI/CD considerations

### Reusable Component Design
- [ ] Single-slot and multi-slot content projection
- [ ] `ng-template`, `ng-container`, `ngTemplateOutlet`
- [ ] `ViewContainerRef` and dynamic component creation
- [ ] `ComponentRef` lifecycle management
- [ ] Design system integration

### Migration and Compatibility
- [ ] `ng update` workflow
- [ ] Migrating from ViewEngine to Ivy
- [ ] Migrating NgModules to standalone
- [ ] Migrating zone-based to zoneless
- [ ] Angular Update Guide usage

**Phase 3 Complete:** [ ]

---

## Phase 4 — Security and Testing

### Frontend Security
- [ ] XSS: stored, reflected, DOM-based — Angular's sanitization
- [ ] `DomSanitizer` and `bypassSecurityTrust*` risks
- [ ] Content Security Policy and Trusted Types
- [ ] CSRF/XSRF — `HttpClientXsrfModule`, SameSite cookies
- [ ] Clickjacking — `X-Frame-Options`, `frame-ancestors` CSP
- [ ] Open redirects — URL validation
- [ ] Security headers checklist
- [ ] Dependency and supply-chain vulnerability scanning

### Authentication and Authorization
- [ ] Authentication vs authorization distinction
- [ ] JWT: structure, storage options, risks
- [ ] OAuth2 + PKCE authorization code flow
- [ ] OIDC and ID token handling
- [ ] Token storage: cookies vs memory vs localStorage
- [ ] Route guards are NOT authorization — server-side enforcement required
- [ ] Refresh token rotation and silent authentication

### Browser Storage and Sessions
- [ ] `localStorage` vs `sessionStorage` security risks
- [ ] Secure, HttpOnly, SameSite cookie properties
- [ ] Cookie prefix: `__Host-` and `__Secure-`
- [ ] CORS limitations as a security control
- [ ] Sensitive data in browser history and URLs

### Unit Testing
- [ ] `TestBed` configuration
- [ ] Component testing with `ComponentFixture`
- [ ] Angular CDK component harnesses
- [ ] Service testing with `HttpClientTestingModule`
- [ ] Mocking with Jasmine/Jest spies
- [ ] Testing signals and RxJS streams

### Integration and E2E Testing
- [ ] Cypress: commands, fixtures, interceptors
- [ ] Playwright: test structure, page objects
- [ ] API contract testing

### Debugging and Code Quality
- [ ] Angular DevTools: component tree, profiler
- [ ] Source maps and production debugging
- [ ] ESLint with `@angular-eslint`
- [ ] Code smell identification

**Phase 4 Complete:** [ ]

---

## Phase 5 — Performance and System Design

- [ ] Lighthouse profiling workflow
- [ ] Core Web Vitals: LCP, INP, CLS optimization strategies
- [ ] Frontend system design patterns
- [ ] Micro-frontend architecture with Module Federation
- [ ] API design considerations from the frontend

**Phase 5 Complete:** [ ]

---

## Phase 6 — Safe AI-Assisted Development

- [ ] AI coding workflow (10-step process)
- [ ] Prompt engineering for Angular development
- [ ] Reviewing AI-generated code
- [ ] Data privacy and confidential information handling
- [ ] Prompt injection and agentic tool safety
- [ ] License and supply-chain checks for AI-generated code

**Phase 6 Complete:** [ ]

---

## Phase 7 — Interview Practice

### Angular Interview Questions
- [ ] Read all questions without answers first
- [ ] Write answers from memory
- [ ] Compare with provided answers
- [ ] Repeat for questions answered incorrectly

### Coding Challenges
- [ ] Challenge 1 (implement observable from scratch)
- [ ] Challenge 2 (custom RxJS operator)
- [ ] Challenge 3 (reactive form with dynamic fields)
- [ ] Challenge 4 (virtual scroll implementation)
- [ ] Challenge 5 (memoization and pure functions)

### Scenario-Based Questions
- [ ] Architecture scenarios (complete)
- [ ] Security scenarios (complete)
- [ ] Performance debugging scenarios (complete)
- [ ] Migration scenarios (complete)

### Mock Interviews
- [ ] Mock Interview 1 — Angular Core
- [ ] Mock Interview 2 — RxJS/Signals + TypeScript
- [ ] Mock Interview 3 — System Design
- [ ] Mock Interview 4 — Full-Stack Scenario
- [ ] Final Review using final-interview-checklist.md

**Phase 7 Complete:** [ ]

---

## Version Comparison Section

- [ ] Angular 2–9 history overview
- [ ] Angular 10–16 changes
- [ ] Angular 17–19 modern APIs
- [ ] Angular 20–22 stable APIs comparison
- [ ] Feature availability matrix reviewed
- [ ] Migration guide studied
- [ ] Version interview questions reviewed

---

## Practical Projects

- [ ] **Project 1:** Typed CRUD application with reactive forms and routing
- [ ] **Project 2:** Standalone + lazy loading + signals + state management app
- [ ] **Project 3:** Security audit and authentication integration
- [ ] **Project 4:** Performance profiling and optimization (large data table)
- [ ] **Project 5:** AI-assisted feature implementation + code audit

---

## Revision Rounds

- [ ] Revision Round 1 — after Phase 4
- [ ] Revision Round 2 — 1 week before interview
- [ ] Revision Round 3 — 1 day before interview (checklist only)

---

*Last updated: 2026-10-28*
