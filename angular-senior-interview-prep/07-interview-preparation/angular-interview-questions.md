# Angular Senior Interview Questions

> **Phase:** 7 — Interview Preparation  
> **Related:** [rxjs-and-signals-questions.md](./rxjs-and-signals-questions.md) | [scenario-based-questions.md](./scenario-based-questions.md)

---

## Table of Contents

1. [Angular Architecture](#angular-architecture)
2. [Change Detection and Performance](#change-detection-and-performance)
3. [Signals and State Management](#signals-and-state-management)
4. [Forms and Routing](#forms-and-routing)
5. [Security](#security)
6. [Advanced Angular](#advanced-angular)
7. [Behavioral and Design Questions](#behavioral-and-design-questions)

---

## Angular Architecture

**Q1: What is the difference between NgModule and standalone component architecture?**

> NgModules were Angular's original compilation and DI grouping mechanism. They required each component to be declared in exactly one module and required importing other modules to access their exported components. Standalone components (stable since Angular 15) declare their own imports directly via the `imports` array in `@Component`, eliminating NgModule wrappers. Standalone simplifies lazy loading (loadComponent), makes dependencies explicit and traceable, and reduces boilerplate. NgModules and standalone are interoperable — you can migrate incrementally. New projects should use standalone exclusively.

**Q2: Explain Angular's dependency injection hierarchy.**

> Angular maintains two types of injectors: EnvironmentInjectors (associated with application and lazy routes) and ElementInjectors (per component). When a component requests a service, Angular searches the ElementInjector tree from the component up to the root, then the EnvironmentInjector chain. The first injector that can provide the dependency wins. Services with `providedIn: 'root'` are in the root EnvironmentInjector. Services in `providers: []` of a route config get their own EnvironmentInjector scoped to that route. Services in `@Component.providers` get an ElementInjector scoped to that component instance.

**Q3: How does Angular's compilation work with Ivy?**

> Ivy is Angular's current compilation and rendering engine (default since Angular 9). Ivy compiles each component independently into JavaScript instructions (a "component factory") that directly create DOM nodes. This enables tree-shaking — only the framework code used by an application is bundled. Ivy also supports incremental compilation (only recompiling changed files), faster testing (no NgModule required for TestBed in many cases), and better debugging (component tree is visible in DevTools). The previous View Engine compiled components with a runtime-interpreted intermediate representation.

**Q4: What does `bootstrapApplication` do vs `platformBrowserDynamic().bootstrapModule()`?**

> `bootstrapApplication(AppComponent, config)` bootstraps a standalone Angular application. It creates the root environment injector with the provided services, then creates and renders the root component. `platformBrowserDynamic().bootstrapModule(AppModule)` is the NgModule approach — it creates the platform injector, compiles the NgModule (collecting declarations, imports, and providers), then bootstraps the declared root component. The standalone approach eliminates NgModule compilation overhead and is the recommended approach for Angular 15+.

**Q5: How would you structure a large Angular application for multiple teams?**

> I would use a layered architecture with enforced dependency rules: (1) **Core** — authentication, logging, HTTP configuration (no feature dependencies). (2) **Shared** — reusable UI components, pipes, directives (no feature dependencies). (3) **Features** — lazy-loaded feature modules with their own route configs and providers (depend only on core and shared). (4) Features should not import from each other directly — communicate through shared services or URL parameters. I'd use Nx workspaces to enforce boundary rules with ESLint and provide separate publishable libraries for shared components. DI scope at the route level prevents state leakage between features.

---

## Change Detection and Performance

**Q6: Why is an Angular component rendering more often than expected?**

> Common root causes: (1) Default change detection strategy — any event in the application triggers CD for all components. (2) An impure pipe re-evaluating every cycle. (3) A function call in a template expression (e.g., `{{ getItems() }}`) — functions are called every CD cycle. (4) `setInterval` or frequent async events triggering Zone.js and CD. (5) A parent with Default CD forcing checks on OnPush children. **Diagnosis:** Angular DevTools → Profiler tab shows which components are checked and how long they take. **Fix:** Adopt `OnPush` everywhere, replace function calls with memoized properties or signals, replace impure pipes with computed signals.

**Q7: Explain the difference between `markForCheck()` and `detectChanges()`.**

> `markForCheck()` marks the component and all its ancestors as dirty, scheduling them for CD in the **next Angular CD cycle**. It does not immediately update the DOM. It is appropriate for use in subscription callbacks, setTimeout handlers, or Web Worker messages within `OnPush` components. `detectChanges()` **immediately and synchronously** runs CD on the component and its entire subtree. It is used when you need an immediate DOM update (e.g., after programmatic focus changes) or in tests. Use `markForCheck()` in production code; `detectChanges()` should be rare.

**Q8: What is zoneless change detection and what must change to support it?**

> Zoneless change detection (Angular 18 developer preview, stable in Angular 20) removes Zone.js's responsibility for triggering CD. Angular relies exclusively on: signal changes, `markForCheck()` calls, and `async` pipe emissions. Code that previously worked because Zone.js automatically detected async completions now requires explicit notification: Observable subscriptions that write to class properties need `markForCheck()`, `setTimeout` callbacks need signal updates or `markForCheck()`, and third-party library callbacks need explicit CD triggers. The benefit is significant performance improvement from eliminating Zone.js overhead and unnecessary CD cycles.

---

## Signals and State Management

**Q9: When would you choose signals over RxJS?**

> Use **signals** for: synchronous state values in components and services, derived state (use `computed()`), state that drives template rendering (signals integrate natively with Angular's CD), simple reactive state where operators are not needed. Use **RxJS** for: complex async orchestration (debouncing, combining multiple streams, retrying), HTTP (HttpClient returns Observables), real-time streams (WebSocket, SSE, polling), any scenario requiring the operator library. They are complementary — use `toSignal()` to convert an Observable stream to a signal for template rendering, and `toObservable()` to trigger RxJS pipelines when a signal changes.

**Q10: How would you manage global state in a large Angular application?**

> I evaluate state management needs along two axes: **complexity** and **team size**. For local component state, use component properties or signals. For shared state within a feature, use a service with signals or BehaviorSubject. For complex interactions (optimistic updates, undo/redo, entity normalization, time-travel debugging), use NgRx Store. For medium-complexity apps (2–5 developers, some cross-feature state), NgRx Component Store or a signals-based state service is often the right balance. I avoid introducing NgRx just because the application is large — the team's familiarity, the complexity of state interactions, and the need for devtools debugging are the key decision factors.

**Q11: What is the difference between `effect()` and `computed()` in signals?**

> `computed()` creates a new derived signal whose value is recalculated when dependencies change. It is lazy (recomputes only when read after dependencies change), memoized, and returns a value — use it to derive state from other signals. `effect()` creates a side-effect that runs when its signal dependencies change. It does not return a value. Use it for: logging, DOM manipulation outside Angular's rendering, analytics, or calling external APIs. The key rule: **never use `effect()` to synchronize one signal's value to another** — that is what `computed()` is for. Misusing `effect()` for state propagation creates circular dependencies and inconsistent state.

---

## Forms and Routing

**Q12: How would you design a reusable dynamic form system?**

> I'd create a configuration-driven form system with these components: (1) A `FormConfig` interface with field definitions (type, label, validators, conditional visibility). (2) A `DynamicFormComponent` that reads the config and builds a `FormGroup` using `FormBuilder`. (3) A factory for custom validators that accepts config parameters. (4) A `FormFieldComponent` that renders the right control type (input, select, textarea, date picker) based on `field.type`. (5) Conditional field visibility using `valueChanges` on controlling fields. (6) A shared `ControlValueAccessor`-based component for complex field types. This allows forms to be defined in JSON (e.g., from a CMS or backend) and rendered without code changes.

**Q13: What is the difference between `CanActivate` and `CanMatch`?**

> `CanActivate` runs after Angular has matched a route — it decides whether to activate the matched route or redirect. If it returns false, no other route is tried. `CanMatch` runs during route matching — if it returns false, Angular continues to the next matching route in the configuration. `CanMatch` is used for pattern: the same URL path maps to different components based on user state (feature flags, subscription tier, A/B testing). For example, `/dashboard` could resolve to `PremiumDashboard` for premium users and `BasicDashboard` for free users — both on the same path, differentiated by `CanMatch`.

---

## Security

**Q14: Why can Angular route guards not be used as authorization?**

> Route guards execute in the browser — an environment the user fully controls. Any guard can be bypassed by: (1) calling `router.navigate(['/admin'])` in browser DevTools, (2) monkey-patching the guard function, (3) sending API requests directly with curl or fetch, bypassing the Angular application entirely. Guards are appropriate for user experience — preventing accidental navigation and providing immediate feedback. Authorization must be enforced server-side: every API request must be authenticated (JWT verified), the caller's permissions must be checked against the requested resource, and unauthorized requests must be rejected with HTTP 403, regardless of what the client claims.

**Q15: How would you secure authentication in an Angular application?**

> Secure implementation: (1) **Token storage**: access token in memory (not localStorage — XSS-resistant), refresh token in HttpOnly cookie. (2) **OAuth2 + PKCE** for third-party auth, server-issued JWTs for internal auth. (3) **Short access token lifetime** (15–60 minutes) with automatic refresh. (4) **Interceptor**: adds auth header to API requests, handles 401 by refreshing then retrying. (5) **Server-side validation**: every API endpoint verifies JWT signature, expiry, issuer, and audience before processing. (6) **Rate limiting**: on login and token refresh endpoints. (7) **Logout**: clears memory and instructs server to invalidate the refresh token. Frontend guards provide redirect UX — not authorization.

---

## Advanced Angular

**Q16: How would you investigate a memory leak that appears only after repeated navigation?**

> Investigation steps: (1) Use Chrome DevTools Memory tab → take heap snapshots before and after several navigations → compare to find growing object counts. (2) Look for retained component instances or detached DOM nodes. (3) Check subscriptions — the most common cause is Observable subscriptions in `ngOnInit` that are not cleaned up. (4) Check `setInterval` and `setTimeout` not cleared in `ngOnDestroy`. (5) Check EventListener additions without corresponding removeEventListener. (6) Check ViewContainerRef references not explicitly cleared. (7) Angular DevTools can show component count — navigate and check if it grows. Fix: use `takeUntilDestroyed`, `DestroyRef.onDestroy`, and `async` pipe consistently.

**Q17: How would you migrate a legacy NgModule Angular application incrementally?**

> Incremental migration approach: (1) Run `ng update` to bring the application to the latest Angular version on the current major. (2) Add `standalone: true` to leaf components (those with no child component dependencies), move their imports from the NgModule `declarations` into the component `imports`. (3) Work upward through the component tree. (4) Use the Angular schematic: `ng generate @angular/core:standalone --mode=convert-to-standalone`. (5) Once all components are standalone, run `--mode=prune-ng-modules` to remove empty NgModules. (6) Finally, migrate the bootstrap: `--mode=standalone-bootstrap`. (7) At each step: run tests, check the application, commit incrementally.

**Q18: What is Angular SSR hydration and when does it improve user experience?**

> Hydration is the process of connecting Angular's event handlers and component tree to the server-rendered HTML, without destroying and recreating the DOM. Without hydration (prior to Angular 16), the client-rendered application would throw away the server HTML and re-render everything from scratch, causing a flash. With full hydration (Angular 16+), Angular reuses the existing DOM nodes. With incremental hydration (Angular 19+ preview, Angular 20 stable), components can be hydrated on-demand — deferred components are hydrated when their trigger fires (viewport, interaction, timer). This improves LCP (content visible immediately from server), CLS (no layout shift from re-render), and TTI (only interactive code is loaded upfront).

---

## Behavioral and Design Questions

**Q19: How would you review an AI-generated authentication implementation?**

> I would check: (1) **Token storage** — is the token in localStorage? (XSS risk). (2) **JWT verification** — is the token being verified only on the frontend? Server must verify. (3) **Interceptor logic** — is the refresh handling concurrent 401s correctly? (4) **PKCE** — if OAuth2 is used, is PKCE implemented? (5) **State leak** — is user state shared between unrelated tests? (6) **Error handling** — what happens when refresh fails? Is the user locked out? (7) **Logout** — does it invalidate the server-side session? (8) **Hallucinated APIs** — does the code reference Angular APIs that don't exist in the targeted version? (9) **Security anti-patterns** — credentials in console.log, hardcoded secrets, commented-out security checks.

**Q20: How would you structure a large application maintained by multiple teams?**

> I would use: (1) **Nx monorepo** with library boundaries enforced by ESLint rules. (2) **Feature libraries** owned by individual teams — lazy-loaded, no cross-feature imports. (3) **Shared library** for reusable UI components — reviewed by all teams before merging. (4) **Core library** for authentication, HTTP configuration, logging — owned by a platform team. (5) **Design system** as a separate library with versioned releases. (6) **Architecture Decision Records (ADRs)** for documenting why choices were made. (7) **Automated boundary enforcement** — CI fails if boundary rules are violated. (8) Clear ownership of each library in CODEOWNERS. (9) Contract tests between feature APIs. (10) Shared CI/CD pipeline with parallel builds using Nx affected commands.

---

## Further Reading

- [angular.dev/guide](https://angular.dev/guide)
- [Angular Blog](https://blog.angular.dev)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
