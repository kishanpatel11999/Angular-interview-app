# Senior Angular Code Review Checklist & PR Quality Gate

> **Phase:** 5 — Testing and Quality  
> **Related:** [unit-testing.md](./unit-testing.md) | [debugging-and-code-quality.md](./debugging-and-code-quality.md) | [secure-coding-checklist.md](../04-security/secure-coding-checklist.md)

---

## Purpose & Scope

This checklist defines the rigorous code review standard for pull requests submitted to enterprise Angular codebases. As a senior engineer, technical lead, or architect, use this framework to verify architectural integrity, performance, security, and maintainability before approving any merge.

---

## 1. Architectural Design & Angular Primitives

- [ ] **Standalone Components:** New components, directives, and pipes must be `standalone: true`. NgModules should not be introduced in modern Angular projects.
- [ ] **Single Responsibility Principle (SRP):** Components are split between container (smart) components that manage state/data and presentational (dumb) components that receive inputs and emit outputs.
- [ ] **Dependency Injection Scoping:** Services intended as global singletons declare `{ providedIn: 'root' }`. Feature-scoped services are declared in route providers, not component providers, unless tied strictly to that component's lifecycle.
- [ ] **Modern Functional APIs:** Functional route guards, functional HTTP interceptors, and `inject()` are preferred over legacy class-based implementations.

---

## 2. Signals & Reactivity Hygiene

- [ ] **Signals vs RxJS Appropriateness:**
  - Synchronous UI state, derived calculations, and simple component state use **Signals** (`signal()`, `computed()`).
  - Asynchronous streams, debouncing, polling, cancellation, and event bus orchestration use **RxJS**.
- [ ] **Zero Unhandled Subscriptions:**
  - No manual `.subscribe()` calls without guaranteed teardown.
  - Subscriptions must be managed using `takeUntilDestroyed()`, the `async` pipe, or converted to signals via `toSignal()`.
- [ ] **No Nested Subscriptions:** Forbid nested `.subscribe()` blocks (e.g. `this.service.get().subscribe(res => this.otherService.save(res).subscribe(...))`). Flatten with `switchMap`, `concatMap`, or `exhaustMap`.
- [ ] **Signal Mutation Rules:** Use `set()` for replacement and `update()` for value derivation. Never mutate arrays or objects in-place.

---

## 3. Runtime Performance & Change Detection

- [ ] **`OnPush` Everywhere:** All new components must declare `changeDetection: ChangeDetectionStrategy.OnPush`.
- [ ] **No Function Calls in Templates:** Methods like `{{ getFormattedPrice(item) }}` or `[disabled]="isValid()"` inside templates execute on every change detection cycle. Replace with `computed()` signals or pure pipes.
- [ ] **`@for` Tracking Required:** Every `@for` block specifies a unique primitive identifier in `track` (e.g., `track item.id`). Never track by index unless the list is completely static and immutable.
- [ ] **Image Optimization:** Large hero images use `NgOptimizedImage` (`ngSrc`) with defined `width`, `height`, and `priority` on above-the-fold content.
- [ ] **Deferred Views (`@defer`):** Heavy below-the-fold widgets, complex dialogs, or chart libraries are wrapped in `@defer (on viewport)` to code-split bundles.

---

## 4. Application Security (Non-Negotiable)

- [ ] **Zero `bypassSecurityTrust*`:** No usage of `DomSanitizer.bypassSecurityTrustHtml/Script/Url` without documented threat modeling and security team sign-off.
- [ ] **No Secrets in Frontend:** Zero private API keys, database credentials, or internal authorization secrets committed to `environment.ts` or client code.
- [ ] **Zero Authentication Tokens in Web Storage:** No JWTs or refresh tokens stored in `localStorage` or `sessionStorage`.
- [ ] **Safe Redirection:** Redirect URLs validate that the target is a relative path starting with `/`, preventing open redirect attacks.
- [ ] **Safe External Links:** All `<a target="_blank">` include `rel="noopener noreferrer"`.
- [ ] **Backend Authorization Enforced:** Route guards only manage visual routing. Verify that backend APIs enforce authorization claims independently.

---

## 5. TypeScript Quality & Type Safety

- [ ] **No `any` Annotations:** The use of `any` is strictly prohibited. Use `unknown`, generics, or explicit interfaces.
- [ ] **Strict Null Checks:** Variables are typed with explicit nullability (`string | null`), avoiding non-null assertion operators (`!`) unless guaranteed by preceding guards.
- [ ] **Readonly Immutability:** State objects and signals emit immutable data structures. Use `readonly` array types where appropriate.

---

## 6. Testing & Maintainability

- [ ] **Meaningful Unit Tests:** PR includes tests verifying behavior and error states, not just confirming that the component instantiates.
- [ ] **CDK Harnesses:** UI component tests use Angular CDK Component Harnesses or user-facing selectors (`getByRole`, `getByLabel`) rather than brittle CSS class selectors.
- [ ] **HttpTestingController Verification:** Service unit tests verify that no unhandled requests linger using `httpTesting.verify()`.
- [ ] **Coverage Standards:** Core business calculation logic and custom validators achieve ≥ 90% code coverage.

---

## 7. Accessibility (a11y) & UX

- [ ] **Keyboard Navigable:** Interactive custom controls can be operated entirely via `Tab`, `Enter`, `Space`, and arrow keys.
- [ ] **Semantic HTML:** Buttons use `<button>`, links use `<a>`, headings follow logical `h1`–`h6` hierarchy.
- [ ] **ARIA Attributes:** Dynamic expanders include `aria-expanded`, modals include `role="dialog"` and `aria-modal="true"`.
- [ ] **Focus Management:** Dialogs and drawers trap focus when open and return focus to the trigger button when closed.

---

## Code Reviewer Quick Decision Matrix

```
If you see this in the PR:
├── .subscribe() inside a component without takeUntilDestroyed()
│   ➔ Action: REQUEST CHANGES (Memory leak risk)
├── innerHTML = userProvidedString
│   ➔ Action: BLOCK / CRITICAL SECURITY RISK (XSS)
├── localStorage.setItem('jwt', token)
│   ➔ Action: BLOCK / CRITICAL SECURITY RISK (Token theft)
├── *ngFor without trackBy or @for without unique track
│   ➔ Action: REQUEST CHANGES (DOM re-creation lag)
├── Method call in template binding {{ calculateTotal() }}
│   ➔ Action: REQUEST CHANGES (Change detection CPU churn)
└── Component missing ChangeDetectionStrategy.OnPush
    ➔ Action: REQUEST CHANGES (Default CD strategy prohibited)
```
