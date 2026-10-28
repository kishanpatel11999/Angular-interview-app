# Signals and RxJS — Reactive Programming in Angular

> **Phase:** 2 — Core Angular  
> **Related:** [lifecycle-change-detection.md](./lifecycle-change-detection.md) | [state-management.md](../03-advanced-angular/state-management.md)  
> **Interview:** [rxjs-and-signals-questions.md](../07-interview-preparation/rxjs-and-signals-questions.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Signals — Core API](#signals--core-api)
3. [Computed Signals](#computed-signals)
4. [Effects](#effects)
5. [Signal Interop with RxJS](#signal-interop-with-rxjs)
6. [Observable Fundamentals](#observable-fundamentals)
7. [Cold vs Hot Observables](#cold-vs-hot-observables)
8. [Subject Variants](#subject-variants)
9. [Essential Operators](#essential-operators)
10. [Flattening Operators Compared](#flattening-operators-compared)
11. [Error Handling and Retry](#error-handling-and-retry)
12. [Subscription Management](#subscription-management)
13. [Choosing Between Signals, RxJS, and Local State](#choosing-between-signals-rxjs-and-local-state)
14. [Interview Questions with Answers](#interview-questions-with-answers)
15. [Exercises](#exercises)
16. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Use Angular signals (`signal`, `computed`, `effect`) correctly.
- Distinguish cold and hot observables and explain multicasting.
- Choose the correct flattening operator for each scenario.
- Manage subscriptions without memory leaks.
- Know when to use signals vs RxJS vs simple component state.

---

## Signals — Core API

Signals are synchronous, reactive state containers introduced in Angular 16 (experimental) and stabilized in Angular 17.

```typescript
import { signal, computed, effect } from '@angular/core';

// Create a writable signal
const count = signal(0);

// Read a signal — call it like a function
console.log(count()); // 0

// Update a signal
count.set(5);
count.update(current => current + 1); // based on previous value

// mutate() — deprecated in Angular 17+; use update() instead
// count.mutate(arr => arr.push(item)); // avoid

// Readonly signal — expose read-only view to consumers
const readonlyCount = count.asReadonly();
```

### Signal Equality

By default signals use `Object.is` for equality. Provide a custom comparator to control when the signal is considered "changed":

```typescript
const filter = signal<ProductFilter>(
  { category: 'all', priceMax: 1000 },
  { equal: (a, b) => a.category === b.category && a.priceMax === b.priceMax }
);
```

---

## Computed Signals

`computed()` creates a derived signal that automatically recalculates when its dependencies change. It is **lazy** (only recalculates when read after a dependency changes) and **memoized** (same result is returned if dependencies haven't changed).

```typescript
const firstName = signal('Jane');
const lastName = signal('Smith');
const fullName = computed(() => `${firstName()} ${lastName()}`);

console.log(fullName()); // 'Jane Smith'
firstName.set('John');
console.log(fullName()); // 'John Smith' — recomputed because firstName changed
```

### Computed with Filtering

```typescript
const allItems = signal<Item[]>([]);
const filter = signal('');

const filteredItems = computed(() =>
  allItems().filter(item =>
    item.name.toLowerCase().includes(filter().toLowerCase())
  )
);

// In a component template
// {{ filteredItems().length }} items found
```

---

## Effects

`effect()` runs a side effect when any signal it reads changes. Effects run asynchronously after component rendering.

```typescript
@Component({ ... })
export class LoggingComponent {
  count = signal(0);
  
  // Effect is automatically cleaned up when the component is destroyed
  private logger = effect(() => {
    // Any signal read here is tracked as a dependency
    console.log(`Count is now: ${this.count()}`);
  });
}

// Effect outside a component — must be in an injection context or use injector
const logEffect = effect(() => {
  console.log('Count:', count());
}, { injector: injector }); // provide injector explicitly

// Stop an effect manually
logEffect.destroy();
```

### Effect Cleanup

```typescript
effect((onCleanup) => {
  const timer = setInterval(() => {
    count.set(count() + 1);
  }, 1000);

  // Runs before the effect re-runs or when the effect is destroyed
  onCleanup(() => clearInterval(timer));
});
```

### When NOT to Use Effects

- **Do not** use effects to propagate data between signals — use `computed()` instead.
- **Do not** use effects to synchronize two writable signals — this leads to infinite loops.
- Use effects only for side effects: logging, DOM manipulation, calling external APIs, analytics.

---

## Signal Interop with RxJS

Angular provides two functions to bridge signals and observables.

### `toSignal()` — Observable to Signal

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

@Component({ ... })
class UserComponent {
  private userService = inject(UserService);

  // Converts observable to signal — automatically subscribes and unsubscribes
  user = toSignal(this.userService.currentUser$, { initialValue: null });

  // With requireSync — for observables that emit synchronously
  items = toSignal(this.itemService.items$, { requireSync: true });
}
```

### `toObservable()` — Signal to Observable

```typescript
import { toObservable } from '@angular/core/rxjs-interop';

@Component({ ... })
class SearchComponent {
  searchTerm = signal('');

  // Convert signal to observable to use RxJS operators
  results$ = toObservable(this.searchTerm).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(term => this.searchService.search(term))
  );
}
```

---

## Observable Fundamentals

An Observable represents a lazy, potentially asynchronous sequence of values.

```typescript
import { Observable, of, from, interval, timer } from 'rxjs';

// Custom observable
const customObs$ = new Observable<number>(subscriber => {
  subscriber.next(1);
  subscriber.next(2);
  subscriber.complete();
  // Return teardown logic
  return () => console.log('Subscription torn down');
});

// Creation operators
of(1, 2, 3)               // emits each value synchronously
from([1, 2, 3])           // from array/iterable/Promise
interval(1000)             // emits 0, 1, 2... every 1 second
timer(0, 1000)             // starts after 0ms, then every 1 second
```

### Observable vs Promise

| | Observable | Promise |
|--|--|--|
| Values | Multiple (stream) | Single |
| Execution | Lazy (starts on subscribe) | Eager (starts immediately) |
| Cancellable | Yes (unsubscribe) | No |
| Operators | Rich operator library | Limited (`.then()`, `.catch()`) |
| Sync support | Yes (`of(1, 2, 3)`) | No (always async) |

---

## Cold vs Hot Observables

### Cold Observable

Starts a new execution for each subscriber. Each subscriber gets the full sequence from the beginning.

```typescript
// HTTP requests are cold — each subscription triggers a new HTTP request
const user$ = this.http.get<User>('/api/user');

user$.subscribe(u => console.log('Subscriber 1:', u));
user$.subscribe(u => console.log('Subscriber 2:', u)); // Second HTTP request!
```

### Hot Observable

Shares a single execution among all subscribers. Subscribers join the stream at the current position.

```typescript
// Subject is hot — all subscribers receive the same emissions
const events$ = new Subject<Event>();

events$.subscribe(e => console.log('Sub 1:', e));
events$.subscribe(e => console.log('Sub 2:', e));

events$.next(new Event('click')); // Both subscribers receive this
```

### Making Cold Observables Hot: shareReplay

```typescript
// Share a single HTTP request among multiple subscribers
const user$ = this.http.get<User>('/api/user').pipe(
  shareReplay(1) // replay last 1 value to new subscribers
);

// Both components sharing the same HTTP request
user$.subscribe(u => this.sidebar.render(u));
user$.subscribe(u => this.header.render(u));
// Only ONE HTTP request is made
```

---

## Subject Variants

| Subject | Buffer | Late subscribers receive |
|---------|--------|--------------------------|
| `Subject` | None | Nothing (only future emissions) |
| `BehaviorSubject(initial)` | Last 1 value | Current value immediately |
| `ReplaySubject(n)` | Last n values | Last n emissions |
| `AsyncSubject` | None | Last value when `complete()` is called |

```typescript
// BehaviorSubject — most common for state management
const currentUser$ = new BehaviorSubject<User | null>(null);

currentUser$.value // sync access to current value

// Subscribe and immediately receive current value
currentUser$.subscribe(user => this.updateHeader(user));

// Emit new value
currentUser$.next({ id: 1, name: 'Alice' });
```

---

## Essential Operators

### Transformation

```typescript
// map — transform each value
prices$.pipe(map(p => p * 1.2))

// tap — side effects without changing values
data$.pipe(tap(d => console.log('Received:', d)))

// pluck is deprecated — use map instead
user$.pipe(map(user => user.name))

// scan — accumulate values (like reduce for streams)
clicks$.pipe(scan((count, _) => count + 1, 0))
```

### Filtering

```typescript
events$.pipe(filter(e => e.type === 'click'))
stream$.pipe(take(5))          // take first 5
stream$.pipe(takeWhile(x => x < 10))
stream$.pipe(distinctUntilChanged()) // filter consecutive duplicates
stream$.pipe(debounceTime(300))      // wait 300ms after last emission
stream$.pipe(throttleTime(1000))     // emit max once per second
```

### Combination

```typescript
// combineLatest — emits when ANY source emits, with latest from all
combineLatest([user$, settings$]).pipe(
  map(([user, settings]) => ({ user, settings }))
)

// forkJoin — waits for all sources to complete, emits their last values
forkJoin({
  users: this.http.get<User[]>('/api/users'),
  products: this.http.get<Product[]>('/api/products')
}) // { users: [...], products: [...] }

// withLatestFrom — combines trigger with latest from another source
buttonClick$.pipe(
  withLatestFrom(currentUser$),
  map(([event, user]) => this.processClick(event, user))
)

// zip — pairs emissions by index (less common)
```

---

## Flattening Operators Compared

These operators subscribe to an inner observable returned by a projection function.

| Operator | Behavior | Use case |
|----------|----------|----------|
| `switchMap` | Cancels previous inner subscription when new outer emission arrives | Search autocomplete, navigation |
| `mergeMap` (flatMap) | Subscribes to all inner observables concurrently | Parallel operations |
| `concatMap` | Subscribes to inner observables one at a time, in order | Sequential operations, order matters |
| `exhaustMap` | Ignores new outer emissions while inner is active | Submit button (prevent duplicate requests) |

```typescript
// switchMap — user types, only last search matters
searchTerm$.pipe(
  debounceTime(300),
  switchMap(term => this.http.get<Result[]>(`/api/search?q=${term}`))
)
// If user types quickly, previous requests are cancelled

// exhaustMap — prevent double submit
submitButton$.pipe(
  exhaustMap(() => this.http.post('/api/submit', formData))
)
// While first request is pending, button clicks are ignored

// concatMap — upload files in order
files$.pipe(
  concatMap(file => this.uploadService.upload(file))
)
// Each file waits for the previous one to finish

// mergeMap — save multiple items concurrently
items$.pipe(
  mergeMap(item => this.http.put(`/api/items/${item.id}`, item))
)
// All saves start immediately
```

---

## Error Handling and Retry

```typescript
// catchError — handle error and return a fallback observable
this.http.get<User>('/api/user').pipe(
  catchError((error: HttpErrorResponse) => {
    if (error.status === 404) {
      return of(null); // fallback value
    }
    return throwError(() => new Error(`Unexpected error: ${error.status}`));
  })
)

// retry — retry on error
this.http.get('/api/data').pipe(
  retry(3) // retry up to 3 times immediately
)

// retryWhen with delay (deprecated in RxJS 8 — use retry with config)
this.http.get('/api/data').pipe(
  retry({
    count: 3,
    delay: 1000 // wait 1 second between retries
  })
)

// Exponential backoff
this.http.get('/api/data').pipe(
  retry({
    count: 3,
    delay: (error, retryCount) =>
      timer(Math.pow(2, retryCount) * 1000) // 2s, 4s, 8s
  })
)
```

---

## Subscription Management

### Memory Leak Pattern

```typescript
// WRONG — subscription never ends
@Component({ ... })
class LeakyComponent implements OnInit {
  ngOnInit(): void {
    interval(1000).subscribe(n => this.update(n));
    // Component destroyed, subscription keeps running
  }
}
```

### Correct Approaches

```typescript
// 1. async pipe (preferred — automatic subscribe/unsubscribe)
@Component({
  template: `<p>{{ data$ | async }}</p>`
})
class SafeComponent {
  data$ = this.service.getData();
}

// 2. takeUntilDestroyed (Angular 16+)
@Component({ ... })
class SafeComponent2 {
  private destroyRef = inject(DestroyRef);
  
  ngOnInit(): void {
    interval(1000).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(n => this.update(n));
  }
}

// 3. toSignal — auto-managed subscription
@Component({ ... })
class SafeComponent3 {
  data = toSignal(this.service.getData$());
}

// 4. Subscription container (legacy)
@Component({ ... })
class SafeComponent4 implements OnDestroy {
  private subs = new Subscription();
  
  ngOnInit(): void {
    this.subs.add(
      interval(1000).subscribe(n => this.update(n))
    );
  }
  
  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
```

---

## Choosing Between Signals, RxJS, and Local State

| Scenario | Use |
|----------|-----|
| Simple counter or toggle in a component | Local property or `signal()` |
| Derived/computed state | `computed()` |
| Shared state across components | Service with `signal()` or `BehaviorSubject` |
| Complex async flows (retry, debounce, combine) | RxJS |
| HTTP requests | RxJS (HttpClient returns Observable) |
| Real-time streams (WebSocket, SSE) | RxJS + `toSignal()` if needed in template |
| Cross-component communication via events | `Subject` (RxJS) or `EventEmitter` |
| Angular 17+ new feature — template reactivity | Signals (integrate natively with CD) |

**General principle:** Prefer signals for state that lives in components and services. Use RxJS when you need the power of operators (debouncing, combining, retrying). Use `toSignal()` to bring RxJS streams into the signals world for template rendering.

---

## Interview Questions with Answers

**Q: What is the difference between `switchMap` and `mergeMap`?**

> `switchMap` cancels (unsubscribes from) the previous inner observable when a new outer emission arrives. It ensures only the latest inner subscription is active. Use it when only the most recent result matters (autocomplete search — you only want the result for the current search term, not older ones). `mergeMap` subscribes to all inner observables concurrently without cancellation. Use it when all results are needed (parallel HTTP requests, multiple concurrent uploads). The risk of `mergeMap` is unbounded concurrency — consider `mergeMap(fn, concurrencyLimit)` when limiting parallel operations.

**Q: When should you choose signals over RxJS?**

> Use signals for: (1) component or service state that is read synchronously, (2) derived state that depends on other signals, (3) state that drives template rendering in Angular 16+ (signals integrate with change detection). Use RxJS for: (1) complex async orchestration (debouncing, combining, retrying), (2) HTTP requests (HttpClient returns Observable), (3) event streams (WebSocket, user events that need advanced buffering), (4) any scenario where you need the operator ecosystem. The two are complementary — use `toSignal()` to convert observables to signals for template use.

**Q: What is `shareReplay` and when should you use it?**

> `shareReplay(n)` makes a cold observable hot and replays the last `n` emissions to new subscribers. Use it when multiple components or services subscribe to the same expensive source (HTTP request, computed stream) and you want to share a single execution. Without `shareReplay`, each subscription triggers a separate HTTP request. The `refCount` option (default true in newer RxJS) controls whether the source unsubscribes when the subscriber count drops to zero. Be careful not to set a buffer size larger than needed, as it holds values in memory.

**Q: What is the difference between `BehaviorSubject` and `ReplaySubject`?**

> `BehaviorSubject` requires an initial value and always holds exactly one value — the most recent emission. New subscribers receive the current value immediately. `ReplaySubject(n)` buffers the last `n` emissions and replays them to new subscribers. Use `BehaviorSubject` for current state (current user, current theme) where you always have an initial value. Use `ReplaySubject` when you want to replay a history of events or when you don't have an initial value.

---

## Exercises

1. Build a search component that uses `signal()` for the search term and `toObservable()` + `switchMap` to search via HTTP. Display results using `toSignal()`.
2. Implement a polling mechanism that polls an API every 5 seconds using `interval` + `switchMap`, stops on component destruction using `takeUntilDestroyed`.
3. Write a custom RxJS operator `rateLimit(maxCalls, windowMs)` that allows a maximum number of calls per time window.
4. Create a service that exposes a BehaviorSubject and converts it to a readonly signal using `toSignal()`. Provide it at the component level and verify isolation.

---

## Revision Checklist

- [ ] Can create, read, update signals with `set()`, `update()`.
- [ ] Know what `computed()` is lazy, memoized, and dependency-tracked.
- [ ] Know when NOT to use `effect()`.
- [ ] Can bridge signals and observables with `toSignal()` and `toObservable()`.
- [ ] Can explain cold vs hot observables with a concrete example.
- [ ] Know `Subject`, `BehaviorSubject`, `ReplaySubject` differences.
- [ ] Can choose between `switchMap`, `mergeMap`, `concatMap`, `exhaustMap`.
- [ ] Know at least three ways to manage subscriptions without memory leaks.

---

## Further Reading

- [Angular: Signals overview](https://angular.dev/guide/signals)
- [Angular: RxJS interop](https://angular.dev/guide/rxjs-interop)
- [RxJS documentation](https://rxjs.dev/api)
- [Learn RxJS operators with marble diagrams](https://rxmarbles.com/)
- [RxJS: Error handling guide](https://rxjs.dev/guide/operators#error-handling-operators)
