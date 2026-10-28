# Senior Angular Debugging Exercises: Real-World Errors & Diagnostic Walkthroughs

> **Phase:** 7 — Interview Practice  
> **Related:** [debugging-and-code-quality.md](../05-testing-and-quality/debugging-and-code-quality.md) | [scenario-based-questions.md](./scenario-based-questions.md) | [coding-challenges.md](./coding-challenges.md)

---

## Table of Contents

1. [Overview & Debugging Round Strategy](#overview--debugging-round-strategy)
2. [Exercise 1: `ExpressionChangedAfterItHasBeenCheckedError` (NG0100)](#exercise-1-expressionchangedafterithasbeencheckederror-ng0100)
3. [Exercise 2: Angular Hydration Node Mismatch Error (NG0500)](#exercise-2-angular-hydration-node-mismatch-error-ng0500)
4. [Exercise 3: Silent Memory Leak in Route Navigation](#exercise-3-silent-memory-leak-in-route-navigation)
5. [Exercise 4: Asynchronous Race Condition in Search Autocomplete](#exercise-4-asynchronous-race-condition-in-search-autocomplete)
6. [Exercise 5: Circular Dependency & `NullInjectorError`](#exercise-5-circular-dependency--nullinjectorerror)
7. [Exercise 6: In-Place Mutation Bypassing Signal Change Detection](#exercise-6-in-place-mutation-bypassing-signal-change-detection)
8. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
9. [Revision Checklist](#revision-checklist)

---

## Overview & Debugging Round Strategy

In a senior debugging interview, the candidate is presented with a broken component or failing unit test and asked to:
1. Explain **why** the error occurred under the hood (framework internals).
2. Propose a clean, production-grade architectural fix (not a quick hack like `setTimeout`).
3. Explain how to write a regression test to prevent recurrence.

---

## Exercise 1: `ExpressionChangedAfterItHasBeenCheckedError` (NG0100)

### The Broken Code
```typescript
@Component({
  selector: 'app-child-status',
  standalone: true,
  template: `<span>Status: {{ status }}</span>`
})
export class ChildStatusComponent implements AfterViewInit {
  status = 'Pending';
  @Output() statusChanged = new EventEmitter<string>();

  ngAfterViewInit() {
    // ⚠️ BUG: Emitting or mutating parent state during AfterViewInit
    this.status = 'Ready';
    this.statusChanged.emit(this.status);
  }
}
```

### Why It Fails Internally
In development mode, Angular runs a **second change detection verification pass** to ensure that data bindings are unidirectional and stable. Mutating a bound expression in `ngAfterViewInit` changes the value after the view has already been verified for this cycle, throwing `NG0100`.

### Senior Remediation Options
1. **Best: Move logic to `ngOnInit`:** If the status does not depend on rendered view children, initialize earlier during the regular change detection pass.
2. **Signals / Async Queue:** If the change must happen after view initialization:
   ```typescript
   ngAfterViewInit() {
     queueMicrotask(() => {
       this.status = 'Ready';
       this.statusChanged.emit(this.status);
     });
   }
   ```
3. **Explicit Change Detection:** Call `this.cdr.detectChanges()` if manual synchronization is unavoidable.

---

## Exercise 2: Angular Hydration Node Mismatch Error (NG0500)

### The Broken Code
```typescript
@Component({
  selector: 'app-session-timer',
  standalone: true,
  template: `
    <p>Session started at: <span>{{ startTime }}</span></p>
  `
})
export class SessionTimerComponent {
  // ⚠️ BUG: Evaluates to different timestamps on Node.js server vs Client browser!
  startTime = new Date().toLocaleTimeString();
}
```

### Why It Fails Internally
During SSR, the Node server renders the server's local time string into the HTML text node. When the browser bootstraps and hydrates the DOM, it re-evaluates `new Date().toLocaleTimeString()` in the client's timezone, producing a mismatch. Angular throws `NG0500: Hydration node mismatch`.

### Senior Remediation
Use `afterNextRender` or the `TransferState` API to ensure the client reuses the exact timestamp generated during SSR:

```typescript
import { Component, inject, OnInit, signal, TransferState, makeStateKey } from '@angular/core';

const TIME_KEY = makeStateKey<string>('SERVER_START_TIME');

@Component({
  selector: 'app-session-timer',
  standalone: true,
  template: `<p>Session started at: <span>{{ startTime() }}</span></p>`
})
export class SessionTimerComponent implements OnInit {
  private transferState = inject(TransferState);
  startTime = signal<string>('');

  ngOnInit() {
    if (this.transferState.hasKey(TIME_KEY)) {
      this.startTime.set(this.transferState.get(TIME_KEY, ''));
      this.transferState.remove(TIME_KEY);
    } else {
      const time = new Date().toLocaleTimeString();
      this.startTime.set(time);
      this.transferState.set(TIME_KEY, time);
    }
  }
}
```

---

## Exercise 3: Silent Memory Leak in Route Navigation

### The Broken Code
```typescript
@Component({
  selector: 'app-order-tracker',
  standalone: true,
  template: `<h1>Order: {{ orderId }}</h1>`
})
export class OrderTrackerComponent implements OnInit {
  private router = inject(Router);
  orderId = '';

  ngOnInit() {
    // ⚠️ BUG: Router is a root singleton. This subscription is NEVER cleaned up!
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.orderId = this.router.url;
        console.log('Navigated to:', this.orderId);
      }
    });
  }
}
```

### Remediation with Modern `takeUntilDestroyed`
```typescript
import { Component, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-order-tracker',
  standalone: true,
  template: `<h1>Order: {{ orderId() }}</h1>`
})
export class OrderTrackerComponent {
  private router = inject(Router);
  readonly orderId = signal<string>('');

  constructor() {
    // Automatically unsubscribes when this component's DestroyRef fires
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.orderId.set(this.router.url);
    });
  }
}
```

---

## Exercise 4: Asynchronous Race Condition in Search Autocomplete

### The Broken Code
```typescript
@Component({
  selector: 'app-search',
  standalone: true,
  template: `<input (input)="onSearch($event)" />`
})
export class SearchComponent {
  private http = inject(HttpClient);
  results: string[] = [];

  onSearch(event: any) {
    const query = event.target.value;
    // ⚠️ BUG: mergeMap does not cancel pending requests.
    // If request 1 takes 800ms and request 2 takes 200ms, request 1 overwrites request 2!
    this.http.get<string[]>(`/api/search?q=${query}`).subscribe(data => {
      this.results = data;
    });
  }
}
```

### Remediation with `switchMap` and Debouncing
```typescript
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <input [formControl]="searchControl" />
    <ul>
      @for (item of results(); track item) {
        <li>{{ item }}</li>
      }
    </ul>
  `
})
export class SearchComponent {
  private http = inject(HttpClient);
  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly results = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      // switchMap cancels in-flight requests when a new keystroke arrives!
      switchMap(query =>
        this.http.get<string[]>(`/api/search?q=${query}`).pipe(
          catchError(() => of([]))
        )
      )
    ),
    { initialValue: [] }
  );
}
```

---

## Exercise 5: Circular Dependency & `NullInjectorError`

### The Broken Scenario
`OrderService` injects `PaymentService`, while `PaymentService` simultaneously injects `OrderService`:
```
OrderService ➔ inject(PaymentService)
PaymentService ➔ inject(OrderService) ➔ Circular Dependency Crash!
```

### Remediation
1. **Best: Extract Shared Dependency:** Create a separate `TransactionLedgerService` that both services inject, removing the cyclic reference.
2. **Workaround using `forwardRef` or `Injector`:**
   ```typescript
   export class PaymentService {
     private injector = inject(Injector);

     process() {
       // Lazy resolution breaks the instantiation cycle
       const orderService = this.injector.get(OrderService);
     }
   }
   ```

---

## Exercise 6: In-Place Mutation Bypassing Signal Change Detection

### The Broken Code
```typescript
export class CartComponent {
  items = signal<string[]>(['Apple', 'Banana']);

  addItem(newItem: string) {
    // ⚠️ BUG: Mutating array in place does not change the array reference!
    const current = this.items();
    current.push(newItem);
    this.items.set(current); // Angular Signal checks reference equality (Object.is) and skips update!
  }
}
```

### Remediation
Always produce a new immutable reference when updating array or object signals:
```typescript
addItem(newItem: string) {
  this.items.update(list => [...list, newItem]);
}
```

---

## Senior Interview Questions with Detailed Answers

### Q1: Why should an engineer avoid using `setTimeout(() => ...)` to silence `ExpressionChangedAfterItHasBeenCheckedError`?
**Answer:**
Wrapping code in `setTimeout` simply kicks the state change into the next macrotask turn of the event loop. While it hides the error in the console, it is an **architectural anti-pattern**:
- It introduces an extra change detection cycle and uncoordinated visual flicker.
- It can cause race conditions if the component unmounts before the timer executes.
- It masks poor component boundary design where child components are inappropriately mutating parent state during rendering instead of communicating via inputs, outputs, or unidirectional state services.

---

## Revision Checklist

- [ ] Explain the cause and resolution of `NG0100` (ExpressionChangedAfterItHasBeenCheckedError).
- [ ] Troubleshoot SSR hydration node mismatches (`NG0500`) using `TransferState`.
- [ ] Prevent subscription leaks on route transitions using `takeUntilDestroyed()`.
- [ ] Eliminate search race conditions using `debounceTime` and `switchMap`.
- [ ] Resolve circular dependency deadlocks by extracting shared services.
- [ ] Enforce immutability with `signal.update()` to prevent skipped updates.
