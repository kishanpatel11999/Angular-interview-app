# Final Interview Checklist

> ✅ Complete this the day before your interview.

---

## The Day Before

### Mental Preparation
- [ ] Get 8 hours of sleep.
- [ ] Review this checklist — do not try to learn new topics.
- [ ] Review [quick-reference.md](./quick-reference.md) for key APIs.
- [ ] Review your own notes and marked PROGRESS.md items.

### Technical Review (2–3 hours max)
- [ ] Write a standalone Angular component from scratch without looking at docs.
- [ ] Write an `authGuard` functional guard.
- [ ] Write a functional HTTP interceptor that adds a Bearer token.
- [ ] Explain the event loop with an output-prediction example.
- [ ] Explain `switchMap` vs `exhaustMap` with a use case.
- [ ] State why route guards are not authorization.

---

## Core Angular — Must Know

### Architecture
- [ ] Difference between NgModule and standalone
- [ ] `bootstrapApplication` providers
- [ ] Hierarchical DI — EnvironmentInjector vs ElementInjector
- [ ] `providedIn: 'root'` vs route-level provider vs component provider

### Change Detection
- [ ] Default vs OnPush — when is each checked?
- [ ] `markForCheck()` vs `detectChanges()` — difference and when to use
- [ ] What triggers CD in Zone.js mode?
- [ ] How signals integrate with CD (and why zoneless works)

### Signals
- [ ] `signal()`, `computed()`, `effect()` — purpose of each
- [ ] When NOT to use `effect()`
- [ ] `toSignal()` and `toObservable()`
- [ ] Signal inputs: `input()`, `input.required()`, `model()`

### RxJS
- [ ] Cold vs hot — with a concrete example
- [ ] `switchMap` vs `mergeMap` vs `concatMap` vs `exhaustMap` — use case for each
- [ ] `shareReplay(1)` — when and why
- [ ] Memory leak prevention (3 approaches)
- [ ] `BehaviorSubject` vs `ReplaySubject`

---

## TypeScript — Must Know

- [ ] `unknown` vs `any` vs `never`
- [ ] Generic functions with `K extends keyof T`
- [ ] Discriminated unions — what they are, why useful
- [ ] Utility types: `Pick`, `Omit`, `Partial`, `Required`, `Record`, `ReturnType`, `Awaited`
- [ ] Event loop output prediction (closure, promise, setTimeout order)

---

## Security — Must Know

- [ ] Three types of XSS — how Angular protects against each
- [ ] What `bypassSecurityTrustHtml()` does and when (if ever) it's safe
- [ ] CSRF attack mechanism and how `HttpClientXsrfModule` prevents it
- [ ] Why tokens should NOT be in localStorage
- [ ] Why route guards are NOT authorization (and what is)
- [ ] JWT structure — what can an attacker read from a JWT?
- [ ] SameSite cookie options — Strict vs Lax vs None

---

## Forms — Must Know

- [ ] `FormControl`, `FormGroup`, `FormArray` — structure and methods
- [ ] Reactive vs template-driven — when to use each
- [ ] Custom synchronous validator signature
- [ ] Cross-field validation (where the validator goes)
- [ ] Async validator — what it returns, how to show pending state
- [ ] `ControlValueAccessor` — when and how to implement

---

## Routing — Must Know

- [ ] Lazy loading with `loadChildren` and `loadComponent`
- [ ] `CanActivate` vs `CanMatch` — difference
- [ ] `CanDeactivate` — use case
- [ ] Resolver — when to use, risk of blocking navigation
- [ ] `ActivatedRoute` — route params, query params, resolved data reactively

---

## Interview Day

### During Technical Questions
- [ ] Think aloud — explain your reasoning before coding.
- [ ] Ask clarifying questions before designing a system.
- [ ] Acknowledge trade-offs — no solution is perfect.
- [ ] Be honest about uncertainty — say "I'd verify this against the docs" rather than guessing.
- [ ] Relate answers to production experience when possible.

### Coding Questions
- [ ] Start with the happy path, then handle edge cases.
- [ ] Name variables clearly — interviews are not competitions for brevity.
- [ ] Check types — interviewers notice type safety.
- [ ] Comment complex logic briefly.

### Security Questions
- [ ] Never say "route guards protect the backend" — they don't.
- [ ] Always mention server-side validation alongside frontend validation.
- [ ] Don't recommend `bypassSecurityTrustHtml()` casually.

### System Design Questions
- [ ] Confirm scale requirements before proposing architecture.
- [ ] Discuss trade-offs (e.g., NgRx adds complexity, signals are simpler but limited).
- [ ] Consider security, accessibility, and performance in your design.
- [ ] Draw component/module boundaries before diving into code.

---

## Questions to Ask the Interviewer

- What is the current Angular version in the codebase?
- Is the team migrating toward standalone components / signals?
- How do you manage state in the application today?
- How is security review handled in the PR process?
- What does the testing strategy look like?
- How do you profile and monitor frontend performance in production?

---

## Resources for Any Last-Minute Gaps

| Topic | Link |
|-------|------|
| Angular official docs | https://angular.dev |
| Angular changelog | https://github.com/angular/angular/releases |
| OWASP Cheat Sheets | https://cheatsheetseries.owasp.org |
| RxJS docs | https://rxjs.dev |
| TypeScript handbook | https://typescriptlang.org/docs/handbook |
| MDN | https://developer.mozilla.org |
