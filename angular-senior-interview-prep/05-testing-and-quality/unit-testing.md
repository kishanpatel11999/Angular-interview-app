# Unit Testing in Modern Angular: TestBed, Signals, RxJS, and CDK Harnesses

> **Phase:** 5 — Testing and Quality  
> **Related:** [integration-and-e2e-testing.md](./integration-and-e2e-testing.md) | [debugging-and-code-quality.md](./debugging-and-code-quality.md) | [signals-and-rxjs.md](../02-core-angular/signals-and-rxjs.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Prerequisites](#prerequisites)
3. [The Modern Angular Unit Testing Landscape](#the-modern-angular-unit-testing-landscape)
   - Vitest / Jest vs Karma / Jasmine
   - Standalone Component Testing Philosophy
4. [TestBed Deep-Dive](#testbed-deep-dive)
   - Configuring `TestBed` for Standalone Components
   - Overriding Component Providers & Templates
   - `ComponentFixture` Mechanics and `detectChanges()`
5. [Testing Angular Signals & Computed Values](#testing-angular-signals--computed-values)
   - Testing `signal()`, `computed()`, and `effect()`
   - Interacting with `input()` and `model()` Signals
6. [Testing RxJS Observables and Asynchronous Code](#testing-rxjs-observables-and-asynchronous-code)
   - Asynchronous Testing Strategies: `fakeAsync` + `tick()` / `flush()`
   - `waitForAsync()`
   - RxJS Marble Testing Basics
7. [Testing HTTP Services with Modern `provideHttpClientTesting()`](#testing-http-services-with-modern-providehttpclienttesting)
   - Replacing `HttpClientTestingModule` with Modern Functional Setup
   - `HttpTestingController` Verification & Mocking
8. [Component Testing with Angular CDK Harnesses](#component-testing-with-angular-cdk-harnesses)
   - Why Harnesses Prevent Brittle Tests
   - Writing Custom Component Harnesses
9. [Common Mistakes and Testing Anti-Patterns](#common-mistakes-and-testing-anti-patterns)
10. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
11. [Hands-On Exercise: Testing a Signal-Based Reactive Component](#hands-on-exercise-testing-a-signal-based-reactive-component)
12. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Master unit testing in modern standalone Angular applications using `TestBed` and `ComponentFixture`.
- Test Angular Signals, computed signals, and effects cleanly and synchronously without asynchronous race conditions.
- Test asynchronous code and RxJS streams using `fakeAsync`, `tick()`, `flush()`, and marble testing.
- Test HTTP interactions with modern `provideHttpClient()` and `provideHttpClientTesting()`.
- Use Angular CDK Component Harnesses to write resilient, refactor-proof UI tests.
- Identify testing anti-patterns (over-mocking, testing implementation details, brittle DOM selectors).

---

## The Modern Angular Unit Testing Landscape

### The Transition from Karma/Jasmine to Jest & Vitest
Historically, Angular CLI used Karma (browser-based test runner) and Jasmine. Modern Angular applications (Angular 16+) are moving toward:
- **Web Test Runner / Vitest / Jest:** Near-instant execution in Node without launching heavy Chrome instances.
- **Experimental Vitest / Jest support in Angular CLI:** First-class experimental builder `@angular-devkit/build-angular:jest` or community setups with `@analogjs/vite-plugin-angular`.
- **Standalone components by default:** Tests import components directly via `imports: [MyComponent]` in `TestBed.configureTestingModule()`.

---

## TestBed Deep-Dive

### Configuring `TestBed` for Standalone Components
In standalone Angular, you don't declare components under `declarations: []`. You import them directly into the `imports: []` array:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserProfileComponent } from './user-profile.component';
import { UserService } from './user.service';
import { of } from 'rxjs';

describe('UserProfileComponent', () => {
  let fixture: ComponentFixture<UserProfileComponent>;
  let component: UserProfileComponent;
  let mockUserService: jasmine.SpyObj<UserService>;

  beforeEach(async () => {
    // 1. Create typed mock service using Jasmine spy
    mockUserService = jasmine.createSpyObj<UserService>('UserService', ['getUserDetails']);
    mockUserService.getUserDetails.and.returnValue(of({ id: 'u1', name: 'Alice', role: 'Engineer' }));

    // 2. Configure TestBed
    await TestBed.configureTestingModule({
      imports: [UserProfileComponent], // Standalone components go in imports!
      providers: [
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents();

    // 3. Create fixture and instance
    fixture = TestBed.createComponent(UserProfileComponent);
    component = fixture.componentInstance;
  });

  it('should render user name after change detection', () => {
    fixture.detectChanges(); // Triggers ngOnInit and template render

    const compiled = fixture.nativeElement as HTMLElement;
    const nameHeading = compiled.querySelector('h2');
    expect(nameHeading?.textContent).toContain('Alice');
  });
});
```

### Overriding Providers or Components
```typescript
TestBed.overrideComponent(UserProfileComponent, {
  set: {
    providers: [{ provide: NotificationService, useValue: mockNotificationService }]
  }
});
```

---

## Testing Angular Signals & Computed Values

Testing signals is remarkably simple because signals are synchronous, deterministic primitives:

```typescript
import { Component, computed, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  template: `
    <span class="count">{{ count() }}</span>
    <span class="double">{{ doubleCount() }}</span>
    <button (click)="increment()">Increment</button>
  `
})
export class CounterComponent {
  readonly count = signal<number>(0);
  readonly doubleCount = computed(() => this.count() * 2);

  increment(): void {
    this.count.update(c => c + 1);
  }
}

// Unit Test
describe('CounterComponent Signals', () => {
  it('should correctly update count and computed doubleCount', () => {
    const fixture = TestBed.createComponent(CounterComponent);
    const comp = fixture.componentInstance;

    expect(comp.count()).toBe(0);
    expect(comp.doubleCount()).toBe(0);

    comp.increment();

    expect(comp.count()).toBe(1);
    expect(comp.doubleCount()).toBe(2);

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.double')?.textContent).toBe('2');
  });
});
```

### Testing Signal Inputs (`input()` / `input.required()`)
```typescript
@Component({
  selector: 'app-greeting',
  standalone: true,
  template: `<h1>Hello, {{ name() }}!</h1>`
})
export class GreetingComponent {
  name = input.required<string>();
}

// In test using fixture.componentRef.setInput():
it('should reflect input signal updates', () => {
  const fixture = TestBed.createComponent(GreetingComponent);
  fixture.componentRef.setInput('name', 'Bob');
  fixture.detectChanges();

  expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Hello, Bob!');
});
```

---

## Testing RxJS Observables and Asynchronous Code

### `fakeAsync` with `tick()` and `flush()`
`fakeAsync` wraps a test in a simulated time zone where you can advance virtual clocks deterministically using `tick()`:

```typescript
import { fakeAsync, tick, flush } from '@angular/core/testing';

it('should debounce search input by 300ms', fakeAsync(() => {
  let searchResult = '';
  searchService.searchTerm$.pipe(debounceTime(300)).subscribe(term => {
    searchResult = term;
  });

  searchService.emitTerm('Angular');
  
  // Before 300ms: value should not have emitted yet
  tick(200);
  expect(searchResult).toBe('');

  // Advance remaining 100ms
  tick(100);
  expect(searchResult).toBe('Angular');
}));
```

---

## Testing HTTP Services with Modern `provideHttpClientTesting()`

In modern Angular (Angular 16+), deprecate `HttpClientTestingModule`. Instead, provide HTTP and test controllers using functional setup:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ProductService, Product } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProductService,
        provideHttpClient(),
        provideHttpClientTesting() // Modern functional provider
      ]
    });

    service = inject(ProductService);
    httpTesting = inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify that there are no outstanding unverified HTTP requests
    httpTesting.verify();
  });

  it('should fetch products via GET request', () => {
    const mockProducts: Product[] = [
      { id: '1', title: 'Laptop', price: 999 }
    ];

    service.getProducts().subscribe(products => {
      expect(products.length).toBe(1);
      expect(products[0].title).toBe('Laptop');
    });

    // Expect an outgoing request to /api/products
    const req = httpTesting.expectOne('/api/products');
    expect(req.request.method).toBe('GET');

    // Respond with mock data
    req.flush(mockProducts);
  });

  it('should handle 404 error gracefully', () => {
    let errorMessage = '';

    service.getProductById('invalid-id').subscribe({
      next: () => fail('Should have failed with 404'),
      error: (err) => {
        errorMessage = err.message;
      }
    });

    const req = httpTesting.expectOne('/api/products/invalid-id');
    req.flush('Product not found', { status: 404, statusText: 'Not Found' });

    expect(errorMessage).toContain('404');
  });
});
```

---

## Component Testing with Angular CDK Harnesses

### Why Traditional DOM Testing is Brittle:
```typescript
// BRITTLE: Breaks when CSS class or HTML structure changes
fixture.nativeElement.querySelector('.mat-mdc-button-touch-target').click();
```

### The Component Harness Solution:
Angular CDK provides the **Component Harness** pattern (similar to Page Objects for unit tests). Harnesses interact through official APIs regardless of internal DOM structure changes:

```typescript
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';

describe('SubmitButton with Harness', () => {
  let loader: HarnessLoader;

  beforeEach(async () => {
    const fixture = TestBed.createComponent(MyComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('should click submit button through harness', async () => {
    // Clean, refactor-proof selector
    const submitBtn = await loader.getHarness(MatButtonHarness.with({ text: 'Submit' }));
    
    expect(await submitBtn.isDisabled()).toBeFalse();
    await submitBtn.click();
  });
});
```

---

## Common Mistakes and Testing Anti-Patterns

### Anti-Pattern 1: Testing Implementation Details Instead of User Behavior
Testing private component methods or internal state variables rather than observing template outputs and user interactions. If you refactor internal logic without changing behavior, tests shouldn't break.

### Anti-Pattern 2: Forgetting `httpTesting.verify()`
Omitting `httpTesting.verify()` allows unexpected or duplicated HTTP requests to slip through undetected.

### Anti-Pattern 3: Over-mocking Everything
Mocking out child components, basic pipes, and simple utilities to the point where the test only verifies mock configurations rather than actual system behavior. Use shallow tests judiciously, but integrate related child components when testing features.

---

## Senior Interview Questions with Detailed Answers

### Q1: Compare `fakeAsync` + `tick()` with `waitForAsync()` in Angular unit tests.
**Answer:**
- **`fakeAsync`:** Executes code inside a specialized Zone (`FakeAsyncTestZoneSpec`) where all asynchronous timers (`setTimeout`, `setInterval`, Promises) are intercepted. Developers control the progression of simulated time linearly using `tick(millis)` or `flush()`. Tests run **synchronously** from the runner's perspective, making code readable, deterministic, and free from race conditions. Limitation: Does not support real asynchronous XHR requests (which is why `HttpTestingController` is used).
- **`waitForAsync()` (formerly `async()`):** Runs code in an `AsyncTestZoneSpec` that tracks pending asynchronous operations and resolves a promise when all microtasks and macrotasks settle. It is useful for operations that cannot be simulated via fake timers (e.g. real Web Workers or browser events), but can lead to flaky tests with arbitrary timeouts if async tasks linger.

---

### Q2: Why is testing Angular Signals significantly simpler and more reliable than testing RxJS streams in components?
**Answer:**
Angular Signals are **synchronous reactive values**. When a signal updates via `set()` or `update()`, dependent `computed()` signals evaluate synchronously on read. 
Unlike RxJS observables, there is no need for subscription management, unsubscription in `afterEach`, asynchronous scheduler mocking, or `tick()` advances unless `effect()` or debouncing is specifically involved. You inspect `component.mySignal()` as a direct function call, making assertions clean, synchronous, and immune to unhandled asynchronous subscription leaks in test runners.

---

## Hands-On Exercise: Testing a Signal-Based Reactive Component

```typescript
// Test a shopping cart component with signal inputs and computed total
import { Component, input, computed } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

@Component({
  selector: 'app-cart-summary',
  standalone: true,
  template: `
    <div class="summary">
      <span class="total-price">\${{ totalPrice() }}</span>
      <span class="item-count">{{ totalItems() }} items</span>
    </div>
  `
})
export class CartSummaryComponent {
  items = input<CartItem[]>([]);

  totalPrice = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  totalItems = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );
}

// Unit Test Spec
describe('CartSummaryComponent', () => {
  let fixture: ComponentFixture<CartSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartSummaryComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CartSummaryComponent);
  });

  it('should accurately calculate total price and item count via signals', () => {
    fixture.componentRef.setInput('items', [
      { name: 'Mechanical Keyboard', price: 120, quantity: 2 },
      { name: 'Ergonomic Mouse', price: 80, quantity: 1 }
    ]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.total-price')?.textContent).toBe('$320');
    expect(root.querySelector('.item-count')?.textContent).toBe('3 items');
  });
});
```

---

## Revision Checklist

- [ ] Configure `TestBed` for standalone components with direct `imports: []`.
- [ ] Test synchronous signal updates and computed values directly.
- [ ] Use `fixture.componentRef.setInput()` to test signal-based inputs.
- [ ] Understand `fakeAsync`, `tick()`, and `flush()` for timing tests.
- [ ] Use modern `provideHttpClientTesting()` and `HttpTestingController.verify()`.
- [ ] Adopt Angular CDK Component Harnesses to decouple tests from brittle DOM selectors.
