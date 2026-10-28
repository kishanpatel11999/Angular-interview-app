# RxJS & Signals: Senior Technical Interview Questions & Operator Scenarios

> **Phase:** 7 — Interview Practice  
> **Related:** [signals-and-rxjs.md](../02-core-angular/signals-and-rxjs.md) | [angular-interview-questions.md](./angular-interview-questions.md) | [coding-challenges.md](./coding-challenges.md)

---

## Table of Contents

1. [Overview & Evaluation Framework](#overview--evaluation-framework)
2. [RxJS vs Signals: Architectural Coexistence & Decision Matrix](#rxjs-vs-signals-architectural-coexistence--decision-matrix)
3. [Higher-Order Flattening Operators Deep-Dive](#higher-order-flattening-operators-deep-dive)
   - `switchMap` vs `mergeMap` vs `concatMap` vs `exhaustMap`
   - Race Condition Scenarios & Operator Selection Matrix
4. [Multicasting & Caching: `shareReplay` vs `share`](#multicasting--caching-sharereplay-vs-share)
5. [Subject Variants & Memory Retention Rules](#subject-variants--memory-retention-rules)
6. [Angular Signals Internals & Glitch-Free Dependency Tracking](#angular-signals-internals--glitch-free-dependency-tracking)
   - Pull-Based Evaluation & Dirty Marking
   - Dynamic Dependency Graph & `untracked()`
   - Signal Effects & Teardown with `onCleanup`
7. [Signals ⇄ RxJS Interoperability (`toSignal` & `toObservable`)](#signals--rxjs-interoperability-tosignal--toobservable)
8. [Error Handling & Resilient Retry Strategies](#error-handling--resilient-retry-strategies)
9. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
10. [Operator Selection Scenarios & Output Predictions](#operator-selection-scenarios--output-predictions)
11. [Revision Checklist](#revision-checklist)

---

## Overview & Evaluation Framework

In senior frontend interviews, interviewers assess whether an engineer treats RxJS and Signals as competitors or complementary tools:
- **Signals are for Synchronous State:** Local component state, derived values, UI bindings, and fine-grained change detection.
- **RxJS is for Asynchronous Event Coordination:** Streams over time, debouncing, web sockets, HTTP orchestration, cancellation, and complex retry logic.

---

## RxJS vs Signals: Architectural Coexistence & Decision Matrix

| Dimension | Angular Signals | RxJS Observables |
|---|---|---|
| **Primary Purpose** | Synchronous reactive value holding & fine-grained UI updates | Asynchronous event streaming & coordination over time |
| **Execution Timing** | Synchronous push/pull (evaluated lazily on read) | Push-based (emits values to observers over time) |
| **Glitch Freedom** | Guarantees zero "glitches" (diamond problem solved) | Values propagate through stream topology; intermediate states can emit |
| **Cancellation Support** | N/A (Holds current value; no stream to cancel) | First-class (`switchMap`, `takeUntil`, `unsubscribe`) |
| **Time-based Operators** | None (No native `debounceTime`, `throttle`, `audit`) | Rich operator library (`debounceTime`, `delay`, `bufferTime`) |
| **Cleanup Overhead** | Auto-managed via framework; zero subscription leak risk | Requires explicit unsubscription or `takeUntilDestroyed` |

---

## Higher-Order Flattening Operators Deep-Dive

When an outer observable emits values that map to inner observables (e.g. user keystrokes triggering HTTP calls), you must choose the appropriate flattening operator:

```
┌─────────────┬─────────────────────────────────────────────────┬──────────────────────────────┐
│ Operator    │ Concurrency Behavior                            │ Ideal Use Case               │
├─────────────┼─────────────────────────────────────────────────┼──────────────────────────────┤
│ switchMap   │ Cancels active inner observable upon new outer  │ Typeahead search, autocomplete,│
│             │ emission (Discards stale responses)             │ tab switching                │
├─────────────┼─────────────────────────────────────────────────┼──────────────────────────────┤
│ concatMap   │ Buffers outer emissions and runs inner          │ Sequential saving, queued UI  │
│             │ observables in strict sequential order          │ animations, ordered uploads  │
├─────────────┼─────────────────────────────────────────────────┼──────────────────────────────┤
│ mergeMap    │ Runs all inner observables concurrently in      │ Parallel downloads, real-time│
│             │ parallel without queuing or cancellation        │ bulk data requests           │
├─────────────┼─────────────────────────────────────────────────┼──────────────────────────────┤
│ exhaustMap  │ Ignores new outer emissions while an inner      │ Submit buttons, login forms, │
│             │ observable is currently active/in-flight         │ payment processing           │
└─────────────┴─────────────────────────────────────────────────┴──────────────────────────────┘
```

### Visualizing the Behavior:
```
Outer clicks: ---A--------B----------------C--------|
Inner task takes 500ms.

switchMap:
A starts ➔ (B arrives at 200ms: A cancelled!) ➔ B finishes ➔ C finishes

concatMap:
A starts ➔ (B arrives at 200ms: queued) ➔ A finishes ➔ B starts ➔ B finishes ➔ C starts

mergeMap:
A starts ➔ (B arrives at 200ms: runs alongside A) ➔ Both run concurrently!

exhaustMap:
A starts ➔ (B arrives at 200ms: IGNORED/DROPPED!) ➔ A finishes ➔ C starts
```

---

## Multicasting & Caching: `shareReplay` vs `share`

### `share()`
- Shares a single subscription among multiple subscribers.
- If the subscriber count drops to zero, it unsubscribes from the source.
- Late subscribers do **not** receive past values; they only receive emissions that occur *after* they subscribe.

### `shareReplay({ bufferSize: 1, refCount: true })`
- Caches the last `bufferSize` emitted values and immediately replays them to late subscribers.
- **The `refCount: true` flag is mandatory in Angular components:** Without `refCount: true`, `shareReplay` holds an internal reference to the source stream indefinitely, creating a permanent memory leak even after all components unsubscribe!

```typescript
// SECURE & LEAK-PROOF:
readonly userProfile$ = this.http.get<UserProfile>('/api/profile').pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);
```

---

## Subject Variants & Memory Retention Rules

1. **`Subject`:** Plain event bus. Has no initial value and does not buffer. Late subscribers only receive emissions after subscription.
2. **`BehaviorSubject`:** Requires an initial value. Stores the latest value in memory (`.value`). Immediately emits current value to new subscribers.
3. **`ReplaySubject(n)`:** Buffers up to `n` past emissions and replays all `n` to any late subscriber.
4. **`AsyncSubject`:** Emits only the **last value** upon stream completion.

---

## Angular Signals Internals & Glitch-Free Dependency Tracking

### How Glitch-Free Reactivity Works
In naive reactive systems, diamond dependency topologies cause "glitches" (transient invalid states):

```
       [ Signal A: count = 1 ]
          /                 \
[ Computed B: A * 2 ]     [ Computed C: A + 1 ]
          \                 /
        [ Computed D: B + C ]
```

When `A` updates from 1 to 2:
- In a naive reactive system: `D` might evaluate when `B` has updated but `C` has not, computing a temporary corrupt value (`4 + 2 = 6`).
- **Angular's Solution:** Angular uses a **Push-Pull Algorithm**:
  1. **Push Phase:** When `A` mutates, it pushes a "dirty" notification down the dependency graph, marking `B`, `C`, and `D` as dirty without evaluating their values.
  2. **Pull Phase:** When the UI or template reads `D()`, `D` pulls fresh values from `B` and `C`. `B` and `C` evaluate once, and `D` evaluates once. Zero temporary states are ever exposed!

### `untracked()`
Prevents reading a signal inside an `effect()` or `computed()` from establishing a reactive dependency:

```typescript
effect(() => {
  const currentCount = this.count(); // Reactive dependency: re-runs when count changes
  const loggingLevel = untracked(() => this.logConfig().level); // NOT a dependency!
  console.log(`[${loggingLevel}] Count: ${currentCount}`);
});
```

---

## Signals ⇄ RxJS Interoperability (`toSignal` & `toObservable`)

```typescript
import { Component, inject } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

@Component({
  selector: 'app-search',
  standalone: true,
  template: `
    <input (input)="query.set($any($event.target).value)" />
    <ul>
      @for (item of results(); track item.id) {
        <li>{{ item.name }}</li>
      }
    </ul>
  `
})
export class SearchComponent {
  private http = inject(HttpClient);
  readonly query = signal<string>('');

  // 1. Convert signal to observable for asynchronous debouncing
  private query$ = toObservable(this.query);

  // 2. Orchestrate async HTTP pipeline with switchMap
  private results$ = this.query$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(term => this.http.get<Item[]>(`/api/search?q=${term}`))
  );

  // 3. Convert back to signal for clean, unsubscription-safe template consumption
  readonly results = toSignal(this.results$, { initialValue: [] });
}
```

---

## Error Handling & Resilient Retry Strategies

### Retry with Exponential Backoff and Jitter
In enterprise apps, never retry failed network requests in an infinite or immediate loop. Use exponential backoff to avoid overwhelming failing servers:

```typescript
import { Observable, throwError, timer } from 'rxjs';
import { mergeMap, retry } from 'rxjs/operators';

export function retryWithBackoff(maxRetries = 3, initialDelayMs = 1000) {
  return (source: Observable<any>) =>
    source.pipe(
      retry({
        count: maxRetries,
        delay: (error, retryCount) => {
          // Exponential delay: 1s, 2s, 4s + random jitter (0-200ms)
          const delay = Math.pow(2, retryCount - 1) * initialDelayMs + Math.random() * 200;
          console.warn(`[Network] Attempt ${retryCount} failed (${error.status}). Retrying in ${Math.round(delay)}ms...`);
          return timer(delay);
        }
      })
    );
}
```

---

## Senior Interview Questions with Detailed Answers

### Q1: In an Angular application, when would you choose Signals over RxJS, and when is RxJS irreplaceable?
**Answer:**
- **Choose Signals for:**
  - Component UI state (counters, form toggle flags, visibility toggles).
  - Derived synchronous calculations (`computed()`).
  - Driving fine-grained template updates under `OnPush` or future Zoneless Angular.
  - Zero-maintenance unsubscription: Signals are synchronous values with no lingering teardown requirements.
- **Choose RxJS when:**
  - You need to coordinate events over time: debouncing keystrokes (`debounceTime`), throttling, or windowing.
  - Managing asynchronous race conditions where in-flight HTTP requests must be cancelled (`switchMap`).
  - Orchestrating complex asynchronous multi-stream pipelines (`combineLatest`, `forkJoin`, `zip`).
  - Handling web sockets or server-sent event (SSE) streams.

---

### Q2: What is the difference between `exhaustMap` and `switchMap`, and what are real-world UI examples of each?
**Answer:**
- **`switchMap`:** Discards the currently running inner observable whenever a new outer emission arrives. Ideal for **Search / Autocomplete**: if the user types "ang", then quickly types "angular", the request for "ang" is cancelled and only the response for "angular" is processed, preventing stale out-of-order data from overwriting newer search results.
- **`exhaustMap`:** Drops/ignores any new outer emissions while an inner observable is currently executing. Ideal for **Form Submission / Payment Buttons**: if an impatient user clicks "Submit Payment" 5 times in rapid succession, `exhaustMap` processes the first click and ignores the subsequent 4 clicks until the payment HTTP call completes, preventing duplicate charges.

---

## Operator Selection Scenarios & Output Predictions

### Scenario: What happens if an error is thrown inside `switchMap` without a nested `catchError`?
```typescript
source$.pipe(
  switchMap(() => this.http.get('/api/data')),
  catchError(err => of([]))
).subscribe();
```
**Consequence:** The entire `source$` stream terminates! If `source$` is tied to an input field's `valueChanges`, the search box permanently ceases to function after the first network failure.  
**Fix:** Move `catchError` inside the inner observable:
```typescript
source$.pipe(
  switchMap(() => this.http.get('/api/data').pipe(
    catchError(err => of([])) // Catches inner error; source$ remains alive!
  ))
).subscribe();
```

---

## Revision Checklist

- [ ] Articulate the technical decision boundaries between Signals and RxJS.
- [ ] Diagram and explain `switchMap`, `mergeMap`, `concatMap`, and `exhaustMap`.
- [ ] Understand why `shareReplay` requires `{ refCount: true }` in components.
- [ ] Explain how Angular Signals solve the diamond dependency glitch problem.
- [ ] Connect signals and observables using `toSignal()` and `toObservable()`.
- [ ] Implement exponential backoff retry strategies for resilient HTTP communication.
