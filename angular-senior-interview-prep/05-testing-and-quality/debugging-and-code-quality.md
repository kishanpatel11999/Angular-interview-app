# Debugging, Performance Profiling, and Code Quality in Angular

> **Phase:** 5 — Testing and Quality  
> **Related:** [unit-testing.md](./unit-testing.md) | [performance-optimization.md](../03-advanced-angular/performance-optimization.md) | [code-review-checklist.md](./code-review-checklist.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Prerequisites](#prerequisites)
3. [Angular DevTools Profiling & Diagnostics](#angular-devtools-profiling--diagnostics)
   - Component Tree Inspection & Live Signal Inspection
   - Profiler Tab: Measuring Change Detection Execution Time
4. [Memory Leak Investigation with Chrome DevTools](#memory-leak-investigation-with-chrome-devtools)
   - Heap Snapshots & Retaining Paths
   - Finding Detached DOM Trees
   - Locating Lingering RxJS Subscriptions
5. [Enterprise Global Error Handling (`ErrorHandler`)](#enterprise-global-error-handling-errorhandler)
   - Custom `ErrorHandler` Implementation
   - Telemetry Integration (Sentry / Datadog)
6. [Production Debugging with Source Maps](#production-debugging-with-source-maps)
   - Hidden Source Maps vs Inlined Source Maps
7. [Static Analysis & Code Quality Tooling](#static-analysis--code-quality-tooling)
   - `@angular-eslint` Best Practices
   - Enforcing `OnPush` and Prohibiting `any`
   - Git Hooks with Husky and lint-staged
8. [Identifying Common Angular Code Smells](#identifying-common-angular-code-smells)
9. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
10. [Hands-On Exercise: Finding and Fixing a Memory Leak](#hands-on-exercise-finding-and-fixing-a-memory-leak)
11. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Use **Angular DevTools** to profile change detection cycles, identify performance bottlenecks, and inspect live Signal values.
- Diagnose and eliminate memory leaks using Chrome DevTools Heap Snapshots and allocation timelines.
- Implement a production-grade custom `ErrorHandler` to capture unhandled client exceptions with metadata.
- Secure production debugging workflows using hidden source maps.
- Configure automated quality gates using `@angular-eslint`, Prettier, Husky, and lint-staged.
- Recognize senior-level code smells (zombie subscriptions, god components, impure template functions).

---

## Angular DevTools Profiling & Diagnostics

The official **Angular DevTools** extension (available on Chrome and Firefox) provides two primary tabs:

### 1. Components Tab
- **Component Hierarchy:** Live tree showing standalone components, projected content, and directives.
- **State & Signals Inspector:** Live inspection and editing of component properties, inputs, and signals.
- **Direct Link to DOM:** Right-click any component in the tree to jump directly to its rendered DOM node in the Elements panel.

### 2. Profiler Tab
- **Recording Change Detection:** Click "Start Recording", perform user actions (typing, clicking, scrolling), and stop recording.
- **Flame Graph & Bar Chart:** Visualizes every change detection cycle, showing:
  - Exact time spent in change detection (e.g., `4.2ms`).
  - Which components triggered change detection and why.
  - Which components were skipped due to `ChangeDetectionStrategy.OnPush`.

---

## Memory Leak Investigation with Chrome DevTools

Memory leaks in Angular applications typically arise from:
1. **Unsubscribing from RxJS Observables:** Long-lived observables (like `router.events`, `interval()`, or WebSocket services) retaining component references.
2. **DOM Event Listeners:** Adding `window.addEventListener()` inside a component without `removeEventListener()` on destroy.
3. **Detached DOM Nodes:** JavaScript objects holding references to DOM elements that have been removed from the visual page.

### The 3-Snapshot Memory Leak Diagnosis Technique

```
Step 1: Open Chrome DevTools ➔ Memory tab ➔ Select "Heap snapshot" ➔ Click "Take snapshot" (Snapshot 1: Baseline).
Step 2: Navigate to target feature component (e.g., /dashboard/orders) and use it.
Step 3: Navigate AWAY from the component to another route (e.g., /settings).
Step 4: Click the Trash icon (Collect garbage) to force garbage collection.
Step 5: Take "Snapshot 2".
Step 6: In Snapshot 2, select "Objects allocated between Snapshot 1 and Snapshot 2" (or search for Component name).
```

If `OrdersComponent` or its child DOM elements appear in Snapshot 2 after navigating away, a **memory leak exists**! Inspect the **Retainers** tree below to identify what object holds the lingering reference.

---

## Enterprise Global Error Handling (`ErrorHandler`)

Angular's default `ErrorHandler` simply prints uncaught errors to `console.error`. In production, you must capture contextual data (user ID, current route, build version) and send it to your monitoring backend:

```typescript
import { ErrorHandler, Injectable, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  timestamp: string;
  buildVersion: string;
}

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private ngZone = inject(NgZone);
  private router = inject(Router);

  handleError(error: unknown): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    const report: ErrorReport = {
      message: errorObj.message,
      stack: errorObj.stack,
      url: this.router.url,
      timestamp: new Date().toISOString(),
      buildVersion: environment.buildVersion
    };

    // Print to console in local development
    if (!environment.production) {
      console.error('[GlobalErrorHandler]', errorObj);
      return;
    }

    // Execute network logging outside Angular zone to avoid triggering change detection!
    this.ngZone.runOutsideAngular(() => {
      this.sendTelemetry(report);
    });
  }

  private sendTelemetry(report: ErrorReport): void {
    // Navigator.sendBeacon guarantees transmission even if tab is closing
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/telemetry/errors', JSON.stringify(report));
    } else {
      fetch('/api/telemetry/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        keepalive: true
      }).catch(() => {});
    }
  }
}
```

In `app.config.ts`:
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ErrorHandler, useClass: GlobalErrorHandler }
  ]
};
```

---

## Production Debugging with Source Maps

### The Risk of Public Source Maps
If `"sourceMap": true` is deployed to production, anyone can open DevTools and read your raw TypeScript source code, comments, internal architectural structures, and unpublished endpoints.

### The Enterprise Solution: Hidden Source Maps
Configure `angular.json`:
```json
"configurations": {
  "production": {
    "sourceMap": {
      "scripts": true,
      "styles": false,
      "hidden": true
    }
  }
}
```
**Hidden source maps** generate `.js.map` files without the trailing `//# sourceMappingURL=...` comment in the `.js` files. 
- The browser will not load them automatically.
- Your CI/CD pipeline uploads the `.js.map` files privately to Sentry or Datadog, allowing stack traces to resolve to exact TypeScript lines while keeping source code hidden from public visitors.

---

## Static Analysis & Code Quality Tooling

### Strict ESLint Rules (`.eslintrc.json`)
```json
{
  "rules": {
    "@angular-eslint/prefer-on-push-component-change-detection": "error",
    "@angular-eslint/no-empty-lifecycle-method": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": ["error", { "allowExpressions": true }],
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### Git Hooks with Husky and lint-staged
Ensure no unlinted or non-compiling code reaches Git:
```json
// package.json
{
  "lint-staged": {
    "*.{ts,html}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

---

## Identifying Common Angular Code Smells

| Code Smell | Architectural Risk | Senior Remedy |
|---|---|---|
| **Impure functions called in template** (`{{ calculateDiscount(item) }}`) | Runs on every change detection pass; causes massive CPU lag. | Use pure pipes (`{{ item \| discount }}`) or `computed()` signals. |
| **Nested subscriptions** (`sub.subscribe(() => sub2.subscribe())`) | Race conditions, callback hell, unhandled errors. | Flatten with higher-order operators (`switchMap`, `concatMap`). |
| **Manual subscriptions without cleanup** | Leaks memory on component destruction. | Use `takeUntilDestroyed()`, `async` pipe, or convert to signals (`toSignal`). |
| **God Components (>500 lines)** | Violates SRP; impossible to test or maintain. | Split into presentational (dumb) components and container (smart) components. |
| **`any` type annotations** | Bypasses compiler type-safety; runtime crashes. | Use `unknown`, strict interfaces, or generics. |

---

## Senior Interview Questions with Detailed Answers

### Q1: How do you identify and resolve an RxJS memory leak in an Angular application?
**Answer:**
1. **Diagnosis:** Take two Heap Snapshots in Chrome DevTools: one before navigating into a route, and another after navigating away and triggering garbage collection. If the component or its subscribers remain in memory, inspect the **Retaining Path** to see which Observable or Subject maintains the reference.
2. **Root Cause:** A long-lived Observable (such as a global singleton service, `router.events`, or WebSocket stream) holds an active subscriber callback that references the destroyed component's instance (`this`).
3. **Resolution:**
   - Use `takeUntilDestroyed(inject(DestroyRef))` inside the injection context (constructor or field initializer).
   - Use the `async` pipe in the template, which automatically handles subscription and unsubscription.
   - Convert long-lived streams to Signals using `toSignal()`, which manages cleanup automatically.

---

### Q2: What is the purpose of Angular DevTools Profiler, and how does it help optimize runtime performance?
**Answer:**
The Angular DevTools Profiler records the execution of change detection cycles during real user interactions. It reveals:
1. **Duration:** How long each change detection tick took in milliseconds.
2. **Trigger Source:** What event or asynchronous trigger caused change detection to run.
3. **Component Breakdown:** A flame chart showing which components executed their render function vs which were skipped.
This allows engineers to pinpoint components that lack `OnPush`, identify expensive template bindings, and verify that adopting Signals successfully isolates updates to only the affected nodes.

---

## Hands-On Exercise: Finding and Fixing a Memory Leak

### Vulnerable Code (Memory Leak)
```typescript
// ⚠️ VULNERABLE: Leaks memory every time the user enters and leaves this component!
@Component({
  selector: 'app-ticker',
  standalone: true,
  template: `<div>Live price: {{ price }}</div>`
})
export class TickerComponent implements OnInit {
  private cryptoService = inject(CryptoWebSocketService);
  price = 0;

  ngOnInit() {
    // Global service observable never unsubscribed!
    this.cryptoService.priceStream$.subscribe(val => {
      this.price = val;
    });
  }
}
```

### Fixed Code (Clean Lifecycle Management)
```typescript
// SECURE: Automatically cleaned up on component destruction
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-ticker',
  standalone: true,
  template: `<div>Live price: {{ price() }}</div>`
})
export class TickerComponent {
  private cryptoService = inject(CryptoWebSocketService);

  // Modern idiomatic approach: converts observable to signal with auto-cleanup
  readonly price = toSignal(this.cryptoService.priceStream$, { initialValue: 0 });
}
```

---

## Revision Checklist

- [ ] Profile change detection execution times using the Angular DevTools Profiler.
- [ ] Take and compare Chrome DevTools Heap Snapshots to find retained component instances.
- [ ] Implement an enterprise `ErrorHandler` with telemetry reporting outside `NgZone`.
- [ ] Configure hidden source maps to debug production issues securely.
- [ ] Enforce strict lint rules with `@angular-eslint` (prohibit `any`, require `OnPush`).
- [ ] Eliminate memory leaks using `takeUntilDestroyed` and `toSignal()`.
