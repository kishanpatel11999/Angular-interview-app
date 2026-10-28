# Lifecycle Hooks and Change Detection

> **Phase:** 2 — Core Angular  
> **Related:** [signals-and-rxjs.md](./signals-and-rxjs.md) | [components-templates-directives.md](../01-fundamentals/components-templates-directives.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Component Lifecycle in Detail](#component-lifecycle-in-detail)
3. [Change Detection — Default Strategy](#change-detection--default-strategy)
4. [OnPush Change Detection](#onpush-change-detection)
5. [Zone.js and NgZone](#zonejs-and-ngzone)
6. [Zoneless Change Detection (Angular 18+)](#zoneless-change-detection-angular-18)
7. [Signals and Reactive Change Detection](#signals-and-reactive-change-detection)
8. [Manual Change Detection Control](#manual-change-detection-control)
9. [ExpressionChangedAfterItHasBeenCheckedError](#expressionchangedafterithasbeencheckederror)
10. [DestroyRef and Cleanup](#destroyref-and-cleanup)
11. [Interview Questions with Answers](#interview-questions-with-answers)
12. [Exercises](#exercises)
13. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Describe the full component lifecycle with timing accuracy.
- Explain the difference between default and OnPush change detection.
- Understand how Zone.js triggers change detection.
- Know when and how to use `ChangeDetectorRef` correctly.
- Understand the zoneless change detection model and signals' role in it.

---

## Component Lifecycle in Detail

### Execution Order

```
constructor()
  ↓
ngOnChanges()  [if inputs exist; also fires on every input change]
  ↓
ngOnInit()  [once]
  ↓
ngDoCheck()  [every CD cycle]
  ↓
ngAfterContentInit()  [once]
  ↓
ngAfterContentChecked()  [every CD cycle]
  ↓
ngAfterViewInit()  [once]
  ↓
ngAfterViewChecked()  [every CD cycle]
  ↓
ngOnDestroy()  [once, before destruction]
```

### Key Timing Rules

| Hook | Safe to access | NOT safe |
|------|---------------|---------|
| `ngOnInit` | Input values | DOM elements (`@ViewChild`) |
| `ngAfterContentInit` | Projected content (`@ContentChild`) | — |
| `ngAfterViewInit` | Component's own DOM (`@ViewChild`) | Do not modify binding expressions |
| `ngOnDestroy` | Everything for cleanup | Do not start new subscriptions |

### `ngOnChanges` with `SimpleChanges`

```typescript
ngOnChanges(changes: SimpleChanges): void {
  // Only runs if the component has @Input() bindings
  if (changes['userId']) {
    const change = changes['userId'];
    console.log('Previous:', change.previousValue);
    console.log('Current:', change.currentValue);
    console.log('First change?:', change.firstChange);

    if (!change.firstChange) {
      // React to subsequent changes only
      this.reloadUser(change.currentValue);
    }
  }
}
```

**Important:** `ngOnChanges` only fires when the INPUT REFERENCE changes. If you mutate an object passed as input, `ngOnChanges` will NOT fire (because the reference hasn't changed).

---

## Change Detection — Default Strategy

By default, Angular checks **every component** in the component tree on every change detection cycle.

**What triggers a change detection cycle?**

- DOM events (click, input, keyup)
- HTTP responses completing
- `setTimeout` / `setInterval` callbacks
- Observable subscriptions (via `async` pipe or Zone.js)
- Manually calling `ChangeDetectorRef.detectChanges()` or `markForCheck()`

```
Change Detection Cycle (Default):
  For each component (top-down):
    1. Evaluate template expressions
    2. Compare with previous values
    3. Update DOM if changed
    4. Repeat for child components
```

**Problem:** In large applications with hundreds of components, running change detection on every component is expensive.

---

## OnPush Change Detection

`ChangeDetectionStrategy.OnPush` tells Angular: *"only check this component and its children when something significant changes."*

Angular only runs CD for an `OnPush` component when:

1. **An `@Input()` reference changes** (not a mutation — a new object/array reference).
2. **An event originates from the component or its children** (DOM events, outputs).
3. **An Observable emits via the `async` pipe.**
4. **A signal used in the template changes** (Angular 16+).
5. **`ChangeDetectorRef.markForCheck()` is called manually.**
6. **`ChangeDetectorRef.detectChanges()` is called directly.**

```typescript
@Component({
  selector: 'app-product-list',
  changeDetection: ChangeDetectionStrategy.OnPush, // ← opt-in
  template: `
    @for (product of products; track product.id) {
      <app-product-card [product]="product" />
    }
  `
})
export class ProductListComponent {
  @Input() products: Product[] = [];
}
```

### OnPush with Immutable Patterns

```typescript
// Parent — WRONG: mutating the array, OnPush won't detect this
addProduct(newProduct: Product): void {
  this.products.push(newProduct); // same reference — OnPush child won't update
}

// Parent — CORRECT: new array reference triggers OnPush
addProduct(newProduct: Product): void {
  this.products = [...this.products, newProduct]; // new reference
}
```

### OnPush with Signals (Angular 16+)

Signals automatically integrate with OnPush — no manual `markForCheck()` needed:

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>{{ count() }}</p><button (click)="increment()">+</button>`
})
export class CounterComponent {
  count = signal(0);
  increment() { this.count.update(c => c + 1); } // triggers CD automatically
}
```

---

## Zone.js and NgZone

Zone.js is a library that patches browser async APIs (setTimeout, Promise, XMLHttpRequest, etc.) to create an "execution zone." Angular uses Zone.js to know when async work completes and trigger change detection automatically.

```
User clicks a button
  → Zone.js intercepts the event handler
  → Event handler runs (may start HTTP calls, set timers)
  → When all async work in the zone completes
  → Angular's zone notifies Angular
  → Angular runs change detection on all components
```

### Running Outside Angular's Zone

Use `NgZone.runOutsideAngular()` for frequent operations that don't need to trigger CD (animations, game loops, third-party charts):

```typescript
@Component({ ... })
export class ChartComponent implements AfterViewInit {
  private ngZone = inject(NgZone);
  private chart?: d3.Selection<any, any, any, any>;

  ngAfterViewInit(): void {
    // Initialize D3 chart outside Angular zone — no unnecessary CD
    this.ngZone.runOutsideAngular(() => {
      this.chart = d3.select('#chart');
      this.startAnimation(); // requestAnimationFrame loop — very frequent
    });
  }

  // When data changes and we NEED Angular to re-render
  updateData(data: ChartData[]): void {
    this.ngZone.runOutsideAngular(() => {
      this.chart?.datum(data).call(this.renderFn);
    });
    // Only call detectChanges if Angular bindings need updating
    this.cdr.detectChanges();
  }
}
```

---

## Zoneless Change Detection (Angular 18+)

Angular 18 introduced zoneless change detection as a **developer preview**. Angular 20 made it **stable**.

With zoneless mode, Zone.js is **not** patched. Angular relies exclusively on:
- Signal changes
- `markForCheck()` calls
- `async` pipe emissions

### Enabling Zoneless (Angular 18+ developer preview, stable in Angular 20)

```typescript
// main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection(), // Angular 18-19 (experimental)
    // provideZonelessChangeDetection()           // Angular 20+ (stable)
  ]
});
```

### What Must Change for Zoneless

```typescript
// WORKS in zoneless — signal-based reactivity
count = signal(0);
doubled = computed(() => this.count() * 2);
increment() { this.count.update(c => c + 1); } // triggers CD automatically

// REQUIRES markForCheck() in zoneless — non-signal async result
loadUser() {
  this.http.get<User>('/api/user').subscribe(user => {
    this.user = user;
    this.cdr.markForCheck(); // manually tell Angular to check this component
  });
}

// BEST: Use async pipe — works with both zone-based and zoneless
user$ = this.http.get<User>('/api/user');
// Template: {{ user$ | async }}
```

---

## Signals and Reactive Change Detection

Signals represent a new reactivity model that works independently of Zone.js:

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush, // recommended with signals
  template: `
    <h1>{{ title() }}</h1>
    <p>Count: {{ count() }}</p>
    <p>Double: {{ doubled() }}</p>
  `
})
export class SignalComponent {
  title = signal('Hello');
  count = signal(0);
  doubled = computed(() => this.count() * 2);

  // effect() — runs side effects when signals change
  private logger = effect(() => {
    // Automatically tracks any signal read inside
    console.log(`Count changed to ${this.count()}`);
  });
}
```

**How signals integrate with change detection:**
When a signal used in a component's template changes, Angular marks that specific component as dirty and schedules a CD cycle. With signals, Angular doesn't need Zone.js to know that something changed — the signal system notifies the framework directly.

---

## Manual Change Detection Control

```typescript
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
export class ManualCdComponent {
  private cdr = inject(ChangeDetectorRef);
  data: Item[] = [];

  loadData(): void {
    // Called from a context Angular doesn't know about (Web Socket, third-party lib)
    this.websocket.on('data', (data: Item[]) => {
      this.data = data;
      this.cdr.markForCheck(); // Schedule this component for next CD cycle
    });
  }

  // detectChanges() vs markForCheck()
  // markForCheck(): marks this component and ancestors as dirty — runs in next tick
  // detectChanges(): immediately runs CD on this component subtree
}

// Detaching from CD entirely (very advanced — use sparingly)
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
export class DetachedComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  
  ngOnInit(): void {
    this.cdr.detach(); // No automatic CD — you control when it runs
    
    setInterval(() => {
      // Update data and manually trigger
      this.cdr.detectChanges();
    }, 5000);
  }
}
```

---

## ExpressionChangedAfterItHasBeenCheckedError

This error occurs in development mode when a template expression changes its value during the same change detection cycle that just read it.

**Common cause:** Modifying binding data in lifecycle hooks that run after expressions are evaluated.

```typescript
// WRONG — modifying a bound value in ngAfterViewInit
@Component({ template: `<p>{{ message }}</p>` })
class BadComponent implements AfterViewInit {
  message = 'Initial';
  
  ngAfterViewInit(): void {
    this.message = 'Changed'; // ERROR: expression changed after it was checked
  }
}

// FIX 1 — use setTimeout to defer until next tick
ngAfterViewInit(): void {
  setTimeout(() => { this.message = 'Changed'; });
}

// FIX 2 — use a signal (signals are always safe to update)
message = signal('Initial');
ngAfterViewInit(): void {
  this.message.set('Changed'); // OK with signals
}

// FIX 3 — move logic to ngOnInit if possible
ngOnInit(): void {
  this.message = 'Changed'; // OK in ngOnInit
}
```

---

## DestroyRef and Cleanup

Angular 16+ provides `DestroyRef` for lifecycle-aware cleanup:

```typescript
@Component({ ... })
export class CleanComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // Option 1: takeUntilDestroyed operator
    this.dataService.stream$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => this.processData(data));

    // Option 2: register cleanup callback
    const timer = setInterval(() => this.poll(), 5000);
    this.destroyRef.onDestroy(() => clearInterval(timer));

    // Option 3: cleanup for non-Angular resources
    const handler = () => this.handleResize();
    window.addEventListener('resize', handler);
    this.destroyRef.onDestroy(() => window.removeEventListener('resize', handler));
  }
}
```

---

## Interview Questions with Answers

**Q: Why does Angular run change detection from top to bottom in the component tree?**

> Angular's change detection runs in a unidirectional data flow — from parent to child. This guarantees that parent components are checked before their children, so parent data is stable when child components are evaluated. Bidirectional data flow would create infinite loops. This constraint is why the ExpressionChangedAfterItHasBeenCheckedError exists — it catches violations of this unidirectional guarantee.

**Q: What is the difference between `markForCheck()` and `detectChanges()`?**

> `markForCheck()` marks the component and all its ancestors in the component tree as dirty, scheduling them for change detection in the next CD cycle initiated by the framework. It does not immediately run CD. `detectChanges()` immediately and synchronously runs CD on the component and all its descendants (not ancestors). Use `markForCheck()` for the common case (async data arrival in OnPush components). Use `detectChanges()` when you need an immediate DOM update, or in testing.

**Q: Why is an Angular application rendering more often than expected?**

> Common causes: (1) Default change detection strategy — every event triggers a full tree scan. (2) Observable subscriptions in non-`async` pipe form update mutable state without reference changes in an OnPush component. (3) Impure pipes re-evaluate on every CD cycle. (4) `ngDoCheck` running heavy logic. (5) A parent component with default CD triggering CD on all child components. The fix is to adopt `OnPush` everywhere, use signals or `async` pipe, replace impure pipes with pure pipes or memoized functions.

**Q: When does zoneless change detection require manual `markForCheck()` calls?**

> In zoneless mode, Angular no longer uses Zone.js to detect when async work completes. Therefore, anything that updates component state outside of signals or the `async` pipe requires a manual `markForCheck()` or `detectChanges()` call. This includes: direct subscriptions to observables where the result is stored in a class property, setTimeout callbacks that update properties, Web Socket message handlers, and third-party library callbacks. Signals eliminate this need entirely.

---

## Exercises

1. Create a component with `OnPush` that displays a list of items. Verify that mutating the array doesn't update the view, but replacing it does.
2. Add a Web Socket service that receives messages every 2 seconds. Use `markForCheck()` to update an `OnPush` component. Then convert it to use signals and remove `markForCheck()`.
3. Reproduce the `ExpressionChangedAfterItHasBeenCheckedError` deliberately and fix it using three different approaches.
4. Use `NgZone.runOutsideAngular` to run a `requestAnimationFrame` loop without triggering change detection. Verify it doesn't cause CD cycles using Angular DevTools.

---

## Revision Checklist

- [ ] Know the lifecycle hook order and correct usage timing.
- [ ] Understand what triggers a CD cycle in Zone.js-based Angular.
- [ ] Know the five conditions under which `OnPush` components are checked.
- [ ] Can explain the difference between `markForCheck()` and `detectChanges()`.
- [ ] Know what must change when migrating to zoneless mode.
- [ ] Understand how signals integrate with change detection.
- [ ] Can fix `ExpressionChangedAfterItHasBeenCheckedError`.

---

## Further Reading

- [Angular: Change detection](https://angular.dev/best-practices/runtime-performance)
- [Angular: Signals](https://angular.dev/guide/signals)
- [Angular: Zoneless change detection](https://angular.dev/guide/experimental/zoneless)
- [Angular: Component lifecycle](https://angular.dev/guide/components/lifecycle)
