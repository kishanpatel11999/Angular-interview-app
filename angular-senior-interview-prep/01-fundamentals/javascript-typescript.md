# JavaScript and TypeScript — Deep Dive

> **Phase:** 1 — Fundamentals  
> **Related:** [html-css-accessibility.md](./html-css-accessibility.md) | [components-templates-directives.md](./components-templates-directives.md)  
> **Interview files:** [javascript-typescript-questions.md](../07-interview-preparation/javascript-typescript-questions.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Scope, Closures, and Hoisting](#scope-closures-and-hoisting)
3. [Execution Context and the Event Loop](#execution-context-and-the-event-loop)
4. [Prototypes, Inheritance, and `this`](#prototypes-inheritance-and-this)
5. [Promises, Async/Await, and Concurrency](#promises-asyncawait-and-concurrency)
6. [Immutability and Reference Semantics](#immutability-and-reference-semantics)
7. [TypeScript Type System](#typescript-type-system)
8. [Generics and Advanced Types](#generics-and-advanced-types)
9. [Decorators and Metadata](#decorators-and-metadata)
10. [Error Handling and Memory Management](#error-handling-and-memory-management)
11. [Common Mistakes and Anti-Patterns](#common-mistakes-and-anti-patterns)
12. [Interview Questions with Answers](#interview-questions-with-answers)
13. [Hands-on Exercises](#hands-on-exercises)
14. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

After studying this file you should be able to:

- Predict the output of JavaScript code involving closures, hoisting, and the event loop.
- Explain the prototype chain and `this` binding rules without hesitation.
- Write type-safe TypeScript using generics, utility types, discriminated unions, and type guards.
- Identify memory leak patterns and explain how to prevent them.
- Distinguish `unknown`, `any`, and `never` and choose the correct one in production code.

---

## Prerequisites

- Working familiarity with JavaScript (ES6+) and TypeScript basics.
- Experience writing Angular components and services.

---

## Scope, Closures, and Hoisting

### Scope

JavaScript has three scope types:

- **Global scope:** Variables accessible everywhere.
- **Function scope:** Variables declared with `var` are scoped to the enclosing function.
- **Block scope:** Variables declared with `let` or `const` are scoped to the enclosing `{}` block.

```typescript
function outer() {
  let x = 10;

  function inner() {
    // inner can access x from outer's scope — this is a closure
    console.log(x); // 10
  }

  inner();
}
```

### Closures

A **closure** is a function that retains access to its lexical scope even after the outer function has returned.

```typescript
function makeCounter() {
  let count = 0;
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}

const counter = makeCounter();
counter.increment(); // count = 1
counter.increment(); // count = 2
console.log(counter.value()); // 2
// count is not accessible from outside makeCounter
```

**Production use case:** Closures power Angular services. A service class instance closes over its private state (injected dependencies, internal caches) that is inaccessible from outside.

**Classic closure pitfall:**

```javascript
// INCORRECT — all callbacks share the same `i` variable reference
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Output: 3, 3, 3

// CORRECT — `let` creates a new binding per iteration
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Output: 0, 1, 2
```

### Hoisting

**Variable hoisting:**

```javascript
console.log(x); // undefined — var declaration hoisted, not initialization
var x = 5;

// Equivalent to:
var x;
console.log(x); // undefined
x = 5;
```

`let` and `const` are hoisted but not initialized (Temporal Dead Zone):

```javascript
console.log(y); // ReferenceError: Cannot access 'y' before initialization
let y = 5;
```

**Function hoisting:**

```javascript
greet(); // "Hello" — function declarations are fully hoisted
function greet() { console.log("Hello"); }

// Function expressions are NOT fully hoisted
sayHi(); // TypeError: sayHi is not a function
var sayHi = function() { console.log("Hi"); };
```

---

## Execution Context and the Event Loop

### Execution Context

Every function call creates an Execution Context containing:

1. **Variable Environment** — local variables and function declarations.
2. **Lexical Environment** — the scope chain (link to outer scopes).
3. **`this` binding** — depends on how the function is called.

The **Call Stack** is a LIFO structure that tracks active execution contexts.

### The Event Loop

JavaScript is single-threaded but handles concurrency through the event loop.

```
Call Stack  →  Web APIs (setTimeout, fetch, DOM events)
                     ↓
             Task Queue (macrotasks)
             Microtask Queue (Promise callbacks, queueMicrotask)
                     ↓
             Event Loop (moves tasks to call stack when it is empty)
```

**Execution order:**
1. Run all synchronous code (call stack).
2. Drain the **microtask queue** completely (Promises, `MutationObserver`).
3. Pick one task from the **macrotask queue** (`setTimeout`, `setInterval`, I/O).
4. Repeat steps 2–3.

```javascript
console.log('1 - sync');

setTimeout(() => console.log('2 - macrotask'), 0);

Promise.resolve()
  .then(() => console.log('3 - microtask'))
  .then(() => console.log('4 - microtask 2'));

console.log('5 - sync');

// Output order:
// 1 - sync
// 5 - sync
// 3 - microtask
// 4 - microtask 2
// 2 - macrotask
```

**Angular relevance:** Zone.js patches browser APIs (setTimeout, Promises, DOM events) to detect when asynchronous work completes and trigger change detection. Understanding the event loop explains why Zone.js works and why certain patterns (like using `NgZone.runOutsideAngular`) can improve performance.

---

## Prototypes, Inheritance, and `this`

### Prototype Chain

Every JavaScript object has an internal `[[Prototype]]` link. Property lookups traverse the chain until `null` is reached.

```javascript
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function() {
  return `${this.name} makes a noise.`;
};

const dog = new Animal('Dog');
console.log(dog.speak()); // "Dog makes a noise."
// dog.__proto__ === Animal.prototype
// Animal.prototype.__proto__ === Object.prototype
```

TypeScript `class` syntax is syntactic sugar over prototype-based inheritance.

### `this` Binding Rules (in order of precedence)

| Rule | Example | `this` value |
|------|---------|--------------|
| `new` binding | `new Foo()` | The new object |
| Explicit binding | `foo.call(ctx)`, `foo.apply(ctx)`, `foo.bind(ctx)` | `ctx` |
| Implicit binding | `obj.foo()` | `obj` |
| Default binding | `foo()` in strict mode | `undefined` |
| Default binding | `foo()` in sloppy mode | `window` / `global` |
| Arrow function | `() => {}` | Inherits from enclosing scope (lexical `this`) |

```typescript
class Service {
  private value = 42;

  // WRONG: `this` will be undefined when passed as a callback
  getValueWrong() {
    return this.value;
  }

  // CORRECT: arrow function preserves `this`
  getValueRight = () => {
    return this.value;
  };
}

const s = new Service();
const fn = s.getValueWrong;
fn(); // TypeError or undefined in strict mode

const arrow = s.getValueRight;
arrow(); // 42 — works correctly
```

**Angular relevance:** Event handlers in templates (`(click)="handleClick()"`) are called in a context where Angular manages `this` via the component class, so class methods work. But passing methods as callbacks to external APIs requires arrow functions or `.bind(this)`.

---

## Promises, Async/Await, and Concurrency

### Promise States

A Promise is in one of three states:
- **Pending** — initial state.
- **Fulfilled** — operation completed successfully.
- **Rejected** — operation failed.

```typescript
const p = new Promise<number>((resolve, reject) => {
  setTimeout(() => resolve(42), 1000);
});

p.then(value => console.log(value)); // 42 after 1 second
```

### Async/Await

`async/await` is syntactic sugar over Promises. An `async` function always returns a Promise.

```typescript
async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }
  return response.json();
}
```

### Concurrency Patterns

```typescript
// Sequential — each awaits the previous (slower)
const a = await fetchA();
const b = await fetchB();

// Parallel — both start together (faster)
const [a, b] = await Promise.all([fetchA(), fetchB()]);

// Settle all, even if some fail
const results = await Promise.allSettled([fetchA(), fetchB()]);
results.forEach(r => {
  if (r.status === 'fulfilled') console.log(r.value);
  else console.error(r.reason);
});

// First to resolve wins
const first = await Promise.race([fetchA(), fetchB()]);
```

### Error Handling

```typescript
async function safeLoad(): Promise<Data | null> {
  try {
    return await loadData();
  } catch (error) {
    // Always narrow the type — error is `unknown` in modern TypeScript
    if (error instanceof Error) {
      console.error('Load failed:', error.message);
    }
    return null;
  }
}
```

---

## Immutability and Reference Semantics

### Value Types vs Reference Types

Primitive values (number, string, boolean, `null`, `undefined`, symbol, bigint) are copied by value. Objects and arrays are copied by reference.

```typescript
let a = 5;
let b = a;
b = 10;
console.log(a); // 5 — primitives are independent

const obj1 = { x: 1 };
const obj2 = obj1; // both point to the same object
obj2.x = 99;
console.log(obj1.x); // 99 — mutated through reference
```

### Shallow vs Deep Copy

```typescript
const original = { name: 'Alice', address: { city: 'London' } };

// Shallow copy — nested objects are still shared
const shallow = { ...original };
shallow.address.city = 'Paris';
console.log(original.address.city); // 'Paris' — mutated!

// Deep copy (structured clone — available in modern browsers)
const deep = structuredClone(original);
deep.address.city = 'Tokyo';
console.log(original.address.city); // 'Paris' — unchanged
```

**Angular relevance:** `OnPush` change detection relies on reference inequality. If you mutate an object instead of replacing it, Angular will not detect the change.

```typescript
// WRONG — mutates existing reference, OnPush won't re-render
this.user.name = 'New Name';

// CORRECT — new reference triggers change detection
this.user = { ...this.user, name: 'New Name' };
```

---

## TypeScript Type System

### `unknown` vs `any` vs `never`

| Type | Meaning | When to use |
|------|---------|-------------|
| `any` | Opt out of type checking | Legacy interop only; avoid in new code |
| `unknown` | Unknown type — must narrow before use | Error handling, external data, `JSON.parse` results |
| `never` | Value that never occurs | Exhaustiveness checks, unreachable code |

```typescript
function processInput(input: unknown): string {
  if (typeof input === 'string') return input.toUpperCase(); // safe after narrowing
  if (typeof input === 'number') return input.toString();
  throw new Error('Unsupported input type');
}

// never for exhaustiveness
type Shape = 'circle' | 'square';
function describeShape(s: Shape): string {
  switch (s) {
    case 'circle': return 'A circle';
    case 'square': return 'A square';
    default:
      const _exhaustive: never = s; // compile error if a case is missed
      return _exhaustive;
  }
}
```

### Interfaces vs Type Aliases

```typescript
// Interfaces support declaration merging and are better for public APIs
interface User {
  id: number;
  name: string;
}
interface User { // merged — valid
  email: string;
}

// Type aliases support unions, intersections, and complex compositions
type ID = string | number;
type AdminUser = User & { role: 'admin' };
type Result<T> = { data: T; error: null } | { data: null; error: Error };
```

**Rule of thumb:** Use `interface` for object shapes and public APIs. Use `type` for unions, intersections, and computed types.

### Discriminated Unions

```typescript
type ApiState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function render<T>(state: ApiState<T>): string {
  switch (state.status) {
    case 'idle': return 'Not started';
    case 'loading': return 'Loading...';
    case 'success': return `Data: ${JSON.stringify(state.data)}`;
    case 'error': return `Error: ${state.error.message}`;
  }
}
```

---

## Generics and Advanced Types

### Generic Functions

```typescript
function identity<T>(value: T): T {
  return value;
}

function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

function merge<T extends object, U extends object>(a: T, b: U): T & U {
  return { ...a, ...b };
}
```

### Generic Constraints

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: 'Alice' };
getProperty(user, 'name'); // string — type-safe
getProperty(user, 'age');  // Compile error — 'age' not in keyof User
```

### Utility Types

```typescript
interface User { id: number; name: string; email: string; role: string; }

type UserPreview = Pick<User, 'id' | 'name'>;
type UserUpdate = Partial<Pick<User, 'name' | 'email'>>;
type UserWithoutRole = Omit<User, 'role'>;
type UserRecord = Record<string, User>;

// Extract and Exclude for union manipulation
type StringOrNumber = string | number | boolean;
type OnlyStringOrNumber = Exclude<StringOrNumber, boolean>; // string | number

// ReturnType and Parameters
async function loadUser(): Promise<User> { /* ... */ return {} as User; }
type LoadedUser = Awaited<ReturnType<typeof loadUser>>; // User
```

### Conditional Types

```typescript
type IsArray<T> = T extends any[] ? 'array' : 'not-array';
type A = IsArray<string[]>; // 'array'
type B = IsArray<string>;   // 'not-array'

// Infer within conditional types
type UnpackPromise<T> = T extends Promise<infer U> ? U : T;
type Resolved = UnpackPromise<Promise<string>>; // string
type Plain = UnpackPromise<number>;             // number
```

---

## Decorators and Metadata

TypeScript decorators are used extensively in Angular (pre-standalone). They are stage-3 proposals and require `experimentalDecorators: true` in older setups or use the new TC39 decorator standard.

```typescript
// Class decorator
function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

@sealed
class Point { x = 0; y = 0; }

// Method decorator (Angular uses similar patterns internally)
function log(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function(...args: any[]) {
    console.log(`Calling ${key} with`, args);
    return original.apply(this, args);
  };
  return descriptor;
}
```

**Angular-specific:** `@Component`, `@Injectable`, `@NgModule`, `@Input`, `@Output` are Angular decorators that attach metadata used by the framework at runtime through `reflect-metadata`.

---

## Error Handling and Memory Management

### Typed Error Handling

```typescript
// TypeScript 4.0+ — error in catch is `unknown` with useUnknownInCatchVariables
async function parseData(raw: string): Promise<Config> {
  try {
    return JSON.parse(raw) as Config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error; // rethrow unknown errors
  }
}
```

### Memory Leak Patterns in Angular

```typescript
// WRONG — subscription never cleaned up
@Component({ ... })
class LeakyComponent implements OnInit {
  ngOnInit() {
    this.service.data$.subscribe(d => this.data = d);
    // Component destroys, but subscription keeps stream alive
  }
}

// CORRECT — using takeUntilDestroyed (Angular 16+)
@Component({ ... })
class CleanComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.service.data$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(d => this.data = d);
  }
}
```

---

## Common Mistakes and Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Using `any` everywhere | Defeats type safety | Use `unknown` and narrow |
| Mutating arrays/objects for `OnPush` | Change not detected | Return new reference |
| Catching errors and swallowing them | Silent failures | Log and rethrow or handle intentionally |
| Using `var` in modern code | Function scope, hoisting confusion | Always use `let`/`const` |
| `async` function without try/catch | Unhandled rejection | Wrap in try/catch or use `.catch()` |
| `Promise.all` without `allSettled` | One failure cancels all | Use `allSettled` when partial success is acceptable |

---

## Interview Questions with Answers

**Q1: Explain the JavaScript event loop and the difference between microtasks and macrotasks.**

> The event loop manages concurrency in a single-threaded JavaScript runtime. After each synchronous task completes, the engine drains the **microtask queue** (Promise callbacks, `MutationObserver`) entirely before picking the next task from the **macrotask queue** (setTimeout, setInterval, I/O). This is why a resolved Promise callback always runs before a `setTimeout` with 0ms delay.

**Q2: What is the difference between `unknown` and `any`?**

> `any` disables type checking entirely. You can perform any operation on an `any` value without TypeScript complaining, which eliminates the safety net. `unknown` preserves type safety — it accepts any value but forces you to narrow the type (with `typeof`, `instanceof`, or a type guard) before you can perform type-specific operations. `unknown` is the correct type for values from external sources such as API responses, `JSON.parse`, or error objects.

**Q3: Predict the output:**
```javascript
console.log(typeof null);
console.log(null instanceof Object);
console.log([] instanceof Array);
console.log(typeof []);
```

> `"object"` — historical JavaScript bug. `false` — `instanceof` checks the prototype chain and `null` has none. `true`. `"object"` — arrays are objects.

**Q4: When would you use `interface` vs `type alias`?**

> Use `interface` for object shapes, especially in public APIs and library types, because interfaces support declaration merging and are generally more readable for object structures. Use `type alias` for union types, intersection types, conditional types, mapped types, and any composition that cannot be expressed with an interface alone. In practice, most teams pick one for consistency — both are valid for object shapes.

**Q5: How does `structuredClone` differ from `JSON.parse(JSON.stringify(...))`?**

> `structuredClone` is a native browser API that performs a deep clone using the structured clone algorithm. It handles `Date`, `Map`, `Set`, `ArrayBuffer`, and circular references. `JSON.parse(JSON.stringify(...))` converts to JSON and back — it loses `undefined`, `Date` becomes a string, `Map`/`Set` become empty objects, and circular references throw. `structuredClone` is the preferred approach in modern environments.

---

## Hands-on Exercises

### Exercise 1 — Closure Counter

Implement a `createTimer()` function that returns `start()`, `stop()`, `reset()`, and `getElapsed()` methods using closures. No external state allowed.

**Expected outcome:** State is fully encapsulated. Elapsed time increases only when the timer is running.

### Exercise 2 — Type-safe `pick`

Write a TypeScript function `pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>` that extracts specified properties without casting to `any`.

### Exercise 3 — Async Race Condition

You have two async functions `loadFast()` (resolves in 100ms) and `loadSlow()` (resolves in 500ms). Write code that always uses the fast result, even if slow completes first, without cancelling the slow request.

### Exercise 4 — Exhaustiveness Check

Define a type `Status = 'active' | 'inactive' | 'pending'`. Write a function that returns a string for each status and uses a `never` guard to catch missing cases at compile time.

---

## Revision Checklist

- [ ] Can predict output of closure and event-loop questions.
- [ ] Understand the `var` / `let` / `const` difference and TDZ.
- [ ] Can explain all four `this` binding rules with examples.
- [ ] Know when to use `unknown` vs `any` vs `never`.
- [ ] Can write generic functions with constraints using `keyof` and `extends`.
- [ ] Know all major utility types and can combine them.
- [ ] Understand shallow vs deep copy and the impact on OnPush.
- [ ] Know microtask vs macrotask execution order.

---

## Further Reading

- [MDN: Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop)
- [TypeScript Handbook — Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript Handbook — Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [You Don't Know JS — Scope and Closures](https://github.com/getify/You-Dont-Know-JS/tree/2nd-ed/scope-closures)
- [MDN: structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)
