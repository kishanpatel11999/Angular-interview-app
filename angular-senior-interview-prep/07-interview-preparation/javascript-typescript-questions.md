# JavaScript & Advanced TypeScript: Senior Technical Interview Questions

> **Phase:** 7 — Interview Practice  
> **Related:** [javascript-typescript.md](../01-fundamentals/javascript-typescript.md) | [angular-interview-questions.md](./angular-interview-questions.md) | [coding-challenges.md](./coding-challenges.md)

---

## Table of Contents

1. [Overview & Interview Evaluation Criteria](#overview--interview-evaluation-criteria)
2. [Event Loop, Asynchronous Concurrency & Output Prediction](#event-loop-asynchronous-concurrency--output-prediction)
3. [Closures, Scope, Execution Context & `this` Mechanics](#closures-scope-execution-context--this-mechanics)
4. [Prototypal Inheritance & Object Internals](#prototypal-inheritance--object-internals)
5. [Advanced TypeScript: Generics, Conditional & Mapped Types](#advanced-typescript-generics-conditional--mapped-types)
6. [Type Narrowing, Discriminated Unions & Type Guards](#type-narrowing-discriminated-unions--type-guards)
7. [`unknown` vs `any` vs `never` in Type-Safe Architecture](#unknown-vs-any-vs-never-in-type-safe-architecture)
8. [TypeScript Decorators & Metadata Reflection](#typescript-decorators--metadata-reflection)
9. [Memory Management & Garbage Collection Mechanics](#memory-management--garbage-collection-mechanics)
10. [Output Prediction Challenges (Code Snippets)](#output-prediction-challenges-code-snippets)
11. [Revision Checklist](#revision-checklist)

---

## Overview & Interview Evaluation Criteria

At the 5+ years senior engineer level, interviewers do not ask for basic syntax definitions (e.g. "what is `let` vs `var`"). They assess:
1. **Mental Model of the JavaScript Runtime:** Microtasks vs Macrotasks, call stack, V8 memory heap, garbage collection lifecycles.
2. **Deep TypeScript Type-System Fluency:** Creating refactor-proof APIs using mapped types, template literal types, conditional inference (`infer`), and recursive types.
3. **Debugging Acumen:** Rapidly identifying race conditions, memory leaks, and prototype pollution risks in complex code snippets.

---

## Event Loop, Asynchronous Concurrency & Output Prediction

### Q1: Explain the exact execution order of Microtasks, Macrotasks, and `requestAnimationFrame`. What is the output of this code snippet?

```javascript
console.log('1');

setTimeout(() => {
  console.log('2');
  Promise.resolve().then(() => console.log('3'));
}, 0);

new Promise((resolve) => {
  console.log('4');
  resolve('5');
}).then((val) => {
  console.log(val);
  setTimeout(() => console.log('6'), 0);
});

Promise.resolve().then(() => console.log('7'));

queueMicrotask(() => console.log('8'));

console.log('9');
```

#### Model Answer:
**Output:**
```
1
4
9
5
7
8
2
3
6
```

**Step-by-Step Execution Analysis:**
1. **Synchronous Execution:**
   - `console.log('1')` executes ➔ prints `1`.
   - `setTimeout(..., 0)` registers a macrotask callback in the Macrotask Queue.
   - `new Promise(...)` executor runs **synchronously**! ➔ `console.log('4')` prints `4`, then resolves promise with `'5'`.
   - `.then()` callback for `'5'` is queued in the **Microtask Queue**.
   - `Promise.resolve().then(...)` queues callback `'7'` into the Microtask Queue.
   - `queueMicrotask(...)` queues callback `'8'` into the Microtask Queue.
   - `console.log('9')` executes ➔ prints `9`.
2. **Drain Microtask Queue (Synchronous Drain before next event loop turn):**
   - Head of microtask queue is resolved promise callback ➔ prints `5`. Inside, it schedules another `setTimeout(..., 0)` macrotask.
   - Next microtask ➔ prints `7`.
   - Next microtask ➔ prints `8`.
3. **Execute Next Macrotask:**
   - First `setTimeout` runs ➔ prints `2`.
   - Inside, `Promise.resolve().then(...)` queues microtask `3`.
   - Event loop drains microtask queue before picking next macrotask! ➔ prints `3`.
4. **Execute Final Macrotask:**
   - Second `setTimeout` scheduled during promise resolution runs ➔ prints `6`.

**Senior Follow-up Question:**  
*How does `queueMicrotask` differ from `process.nextTick` (Node.js) or `setTimeout(fn, 0)` in high-frequency Angular UI updates?*  
*Answer:* `queueMicrotask` bypasses the browser timer subsystem and queues directly to the microtask queue, executing immediately after the current script turn and before the browser repaints or processes the next macrotask. `setTimeout(fn, 0)` is clamped to a minimum 4ms delay after nested calls and yields the thread to browser painting and I/O tasks.

---

## Closures, Scope, Execution Context & `this` Mechanics

### Q2: What are the four rules of `this` binding in JavaScript, and how do arrow functions break traditional binding?

#### Model Answer:
The value of `this` is determined at function **call time** (except for arrow functions, which are bound lexically at declaration time). The four rules in order of precedence:

1. **`new` Binding:** Calling a function with `new MyFunc()` binds `this` to the newly instantiated object.
2. **Explicit Binding:** Calling via `.call()`, `.apply()`, or `.bind()` explicitly assigns the context:
   ```javascript
   greet.call({ name: 'Alice' }, 'Hello');
   ```
3. **Implicit Binding:** Calling a method on an owning context object:
   ```javascript
   const obj = { name: 'Bob', get() { return this.name; } };
   obj.get(); // this is obj
   const detached = obj.get;
   detached(); // this is undefined in strict mode or window in loose mode!
   ```
4. **Default Binding:** In standalone function invocation: `window`/`globalThis` in non-strict mode, or `undefined` in strict mode (`"use strict"`).

**Arrow Functions:**
Arrow functions do not possess their own `this`, `arguments`, or `super` bindings. They capture the `this` value of their enclosing lexical execution context at the moment they are defined and **cannot** be rebound using `.bind()`, `.call()`, or `.apply()`.

---

## Prototypal Inheritance & Object Internals

### Q3: Explain how prototype lookup works in JavaScript. What is the difference between `__proto__` and `prototype`?

#### Model Answer:
- **`prototype` Property:** A property present exclusively on **constructor functions** and ES6 `class` definitions. It defines the blueprint of methods and properties that will be inherited by instances created via `new`.
- **`[[Prototype]]` (exposed via `__proto__` or `Object.getPrototypeOf()`):** The internal pointer present on **every JavaScript object** referencing its prototype ancestor.

```
const arr = [1, 2, 3];
arr.__proto__ === Array.prototype;          // true
Array.prototype.__proto__ === Object.prototype; // true
Object.prototype.__proto__ === null;         // true (End of prototype chain)
```

**Prototype Pollution Risk:**  
If an application recursively merges user-supplied JSON objects into an existing object without validating keys, an attacker can pass `{"__proto__": {"isAdmin": true}}`. This mutates `Object.prototype`, elevating permissions for every object in the JavaScript runtime! Defend using `Object.create(null)` for lookup maps or validating keys against `__proto__` and `constructor`.

---

## Advanced TypeScript: Generics, Conditional & Mapped Types

### Q4: Implement a custom TypeScript utility type `DeepReadonly<T>` that recursively makes all nested object properties and arrays readonly.

#### Model Answer:
```typescript
export type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends Function
  ? T
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

// Verification:
interface UserProfile {
  id: string;
  settings: {
    theme: string;
    notifications: {
      email: boolean;
      sms: boolean;
    };
  };
  tags: string[];
}

type LockedProfile = DeepReadonly<UserProfile>;

// LockedProfile type resolves to:
// {
//   readonly id: string;
//   readonly settings: {
//     readonly theme: string;
//     readonly notifications: {
//       readonly email: boolean;
//       readonly sms: boolean;
//     };
//   };
//   readonly tags: ReadonlyArray<string>;
// }
```

**Key Concepts Demonstrated:**
- Conditional typing with `extends`.
- Type inference with `infer`.
- Handling functions to prevent stripping method signatures.
- Recursive mapped type keys `[K in keyof T]`.

---

### Q5: How does the TypeScript `infer` keyword work in conditional types? Provide a practical real-world example extracting the payload type from an asynchronous function.

#### Model Answer:
The `infer` keyword allows you to declare a type variable dynamically within the conditional `extends` clause of a type, enabling the compiler to extract and return that type:

```typescript
// Extract return type of a Promise
export type UnwrapPromise<T> = T extends Promise<infer U> ? UnwrapPromise<U> : T;

// Extract the success payload type of an API function
export type ExtractApiPayload<T> = T extends (...args: any[]) => Promise<infer Response>
  ? Response
  : never;

// Real-world Angular usage:
declare function fetchUsers(): Promise<{ id: string; name: string }[]>;

type UsersList = ExtractApiPayload<typeof fetchUsers>;
// UsersList correctly resolves to { id: string; name: string }[]
```

---

## Type Narrowing, Discriminated Unions & Type Guards

### Q6: What is a Discriminated Union, and why is it superior to optional property modeling in enterprise state management?

#### Model Answer:
A Discriminated Union (also called tagged union or algebraic data type) is a pattern where several types share a common single-value literal property (the "discriminant"), allowing the TypeScript compiler to narrow types exhaustively within switch/if statements.

#### Bad Modeling (Optional Property Anti-pattern):
```typescript
// Ambiguous state: Can have error and data simultaneously!
interface State<T> {
  isLoading: boolean;
  data?: T;
  error?: string;
}
```

#### Senior Architecture (Discriminated Union):
```typescript
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T; timestamp: number }
  | { status: 'error'; error: Error };

function renderState<T>(state: AsyncState<T>) {
  switch (state.status) {
    case 'idle':
      return 'Please trigger action';
    case 'loading':
      return 'Loading spinner...';
    case 'success':
      // TypeScript guarantees state.data exists here!
      return `Data loaded: ${JSON.stringify(state.data)}`;
    case 'error':
      // TypeScript guarantees state.error exists here!
      return `Error: ${state.error.message}`;
    default:
      // Exhaustiveness check: Fails compilation if a new status was added to the union!
      const _exhaustiveCheck: never = state;
      return _exhaustiveCheck;
  }
}
```

---

## `unknown` vs `any` vs `never` in Type-Safe Architecture

| Type | Can Assign TO It? | Can Assign IT To Others? | Operations Allowed Without Narrowing? | Architectural Purpose |
|---|---|---|---|---|
| **`any`** | Everything | Everything | Everything (Disables type-checker completely) | Escape hatch (Avoid in enterprise code) |
| **`unknown`** | Everything | Only `any` and `unknown` | **None** (Must narrow via `typeof`, `instanceof`, or type guards) | Safe representation of untrusted input (API responses, JSON parsing) |
| **`never`** | **Nothing** | Everything | N/A | Represents impossible states, exhaustive check guards, or functions that throw/loop forever |

---

## Output Prediction Challenges (Code Snippets)

### Challenge 1: Closure in Loop with `var` vs `let`
```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log('var:', i), 10);
}

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log('let:', j), 10);
}
```
**Output:**
```
let: 0
let: 1
let: 2
var: 3
var: 3
var: 3
```
**Reasoning:** `var` is function-scoped; all three callbacks share the exact same variable reference, which ends at `3`. `let` is block-scoped; each iteration creates a fresh lexical binding of `j` captured by the closure.

---

## Revision Checklist

- [ ] Explain the microtask queue drain cycle vs macrotask execution.
- [ ] Understand `this` resolution rules: `new`, explicit (`call`/`apply`/`bind`), implicit, and arrow functions.
- [ ] Implement advanced generic utility types (`DeepReadonly`, `UnwrapPromise`).
- [ ] Use `infer` in conditional types to extract nested return values.
- [ ] Model application states using Discriminated Unions with exhaustive `never` checks.
- [ ] Contrast `unknown`, `any`, and `never` in type-safe API boundaries.
