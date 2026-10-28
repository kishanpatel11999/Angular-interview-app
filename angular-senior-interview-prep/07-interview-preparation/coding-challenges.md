# Senior Angular & TypeScript Coding Challenges

> **Phase:** 7 — Interview Practice  
> **Related:** [javascript-typescript-questions.md](./javascript-typescript-questions.md) | [rxjs-and-signals-questions.md](./rxjs-and-signals-questions.md) | [angular-interview-questions.md](./angular-interview-questions.md)

---

## Table of Contents

1. [Overview & Coding Round Expectations](#overview--coding-round-expectations)
2. [Challenge 1: Implement an Observable from Scratch](#challenge-1-implement-an-observable-from-scratch)
3. [Challenge 2: Build a Custom RxJS Operator (`debounceWithCancel`)](#challenge-2-build-a-custom-rxjs-operator-debouncewithcancel)
4. [Challenge 3: Enterprise Dynamic Reactive Form Engine](#challenge-3-enterprise-dynamic-reactive-form-engine)
5. [Challenge 4: Implement a Virtual Scroll Engine from Scratch](#challenge-4-implement-a-virtual-scroll-engine-from-scratch)
6. [Challenge 5: LRU (Least Recently Used) Cache with TypeScript Generics](#challenge-5-lru-least-recently-used-cache-with-typescript-generics)
7. [Senior Interview Discussion Points](#senior-interview-discussion-points)
8. [Revision Checklist](#revision-checklist)

---

## Overview & Coding Round Expectations

In senior live-coding interviews (60–90 minutes), interviewers evaluate:
1. **Algorithmic Correctness:** Clean logic, proper time and space complexity.
2. **Resource Hygiene:** Guaranteeing clean teardown, no memory leaks, unsubscription mechanics.
3. **Enterprise TypeScript:** Proper use of generics, utility types, and strict constraints.
4. **Architectural Thinking:** Inversion of control, edge-case resilience, and modularity.

---

## Challenge 1: Implement an Observable from Scratch

### Problem Statement
Implement a minimal `Observable` class in TypeScript that supports:
- Subscribing via an `Observer` object or next function.
- `next`, `error`, and `complete` callbacks.
- Teardown/unsubscription logic to prevent memory leaks.

### Production Solution
```typescript
export interface Observer<T> {
  next: (value: T) => void;
  error?: (err: any) => void;
  complete?: () => void;
}

export interface Subscription {
  unsubscribe: () => void;
  readonly closed: boolean;
}

export type TeardownLogic = () => void;
export type SubscribeFunction<T> = (observer: Observer<T>) => TeardownLogic | void;

export class SimpleObservable<T> {
  constructor(private subscribeFn: SubscribeFunction<T>) {}

  subscribe(observerOrNext: Observer<T> | ((val: T) => void)): Subscription {
    // Normalize observer
    const observer: Observer<T> =
      typeof observerOrNext === 'function'
        ? { next: observerOrNext }
        : observerOrNext;

    let isClosed = false;

    // Wrap observer to guarantee no emissions after complete/error or unsubscription
    const safeObserver: Observer<T> = {
      next: (val: T) => {
        if (!isClosed && observer.next) {
          observer.next(val);
        }
      },
      error: (err: any) => {
        if (!isClosed) {
          isClosed = true;
          if (observer.error) observer.error(err);
          teardown();
        }
      },
      complete: () => {
        if (!isClosed) {
          isClosed = true;
          if (observer.complete) observer.complete();
          teardown();
        }
      }
    };

    // Execute user subscription logic
    const teardownFn = this.subscribeFn(safeObserver);

    const teardown = () => {
      if (teardownFn && typeof teardownFn === 'function') {
        teardownFn();
      }
    };

    return {
      unsubscribe: () => {
        if (!isClosed) {
          isClosed = true;
          teardown();
        }
      },
      get closed() {
        return isClosed;
      }
    };
  }
}
```

### Verification Test
```typescript
const interval$ = new SimpleObservable<number>((observer) => {
  let count = 0;
  const id = setInterval(() => {
    observer.next(count++);
  }, 1000);

  // Return teardown function
  return () => {
    console.log('Teardown executed: clearing interval');
    clearInterval(id);
  };
});

const sub = interval$.subscribe({
  next: val => console.log('Received:', val)
});

setTimeout(() => sub.unsubscribe(), 3500);
```

---

## Challenge 2: Build a Custom RxJS Operator (`debounceWithCancel`)

### Problem Statement
Create a custom RxJS operator function `debounceWithCancel(delayMs, cancelStream$)` that delays emissions by `delayMs`, but if `cancelStream$` emits during that window, the queued emission is discarded.

### Production Solution
```typescript
import { Observable } from 'rxjs';

export function debounceWithCancel<T>(delayMs: number, cancelStream$: Observable<any>) {
  return (source: Observable<T>): Observable<T> =>
    new Observable<T>(subscriber => {
      let timeoutId: any = null;

      // Listen to the primary source stream
      const sourceSub = source.subscribe({
        next: value => {
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            subscriber.next(value);
            timeoutId = null;
          }, delayMs);
        },
        error: err => subscriber.error(err),
        complete: () => {
          if (!timeoutId) subscriber.complete();
        }
      });

      // Listen to the cancellation trigger
      const cancelSub = cancelStream$.subscribe(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
          console.log('[debounceWithCancel] Pending emission cancelled');
        }
      });

      // Teardown logic
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        sourceSub.unsubscribe();
        cancelSub.unsubscribe();
      };
    });
}
```

---

## Challenge 3: Enterprise Dynamic Reactive Form Engine

### Problem Statement
Build a data-driven form engine that takes a JSON field schema array and dynamically creates a typed `FormGroup` with custom validation and conditional visibility.

```typescript
import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators, ValidatorFn } from '@angular/forms';

export type FieldType = 'text' | 'number' | 'select' | 'checkbox';

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  value?: any;
  required?: boolean;
  min?: number;
  options?: { label: string; value: any }[];
  dependsOn?: {
    field: string;
    value: any;
  };
}

@Injectable({ providedIn: 'root' })
export class DynamicFormFactory {
  private fb = inject(FormBuilder);

  createForm(schema: FieldConfig[]): FormGroup {
    const group: Record<string, FormControl> = {};

    for (const field of schema) {
      const validators: ValidatorFn[] = [];
      if (field.required) validators.push(Validators.required);
      if (field.min !== undefined) validators.push(Validators.min(field.min));

      group[field.name] = this.fb.control(field.value ?? '', validators);
    }

    return this.fb.group(group);
  }
}
```

---

## Challenge 4: Implement a Virtual Scroll Engine from Scratch

### Problem Statement
When rendering 50,000 items, DOM nodes overwhelm browser memory. Implement a mathematical virtual scrolling calculation that determines which items to render given the scroll viewport.

### Mathematical Model
```typescript
export interface VirtualScrollState {
  startIndex: number;
  endIndex: number;
  topPadding: number;
  bottomPadding: number;
}

export function calculateVirtualWindow(
  scrollTop: number,
  viewportHeight: number,
  totalItems: number,
  itemHeight: number,
  buffer = 3
): VirtualScrollState {
  const totalHeight = totalItems * itemHeight;

  // 1. Calculate raw visible start index
  const rawStart = Math.floor(scrollTop / itemHeight);
  const startIndex = Math.max(0, rawStart - buffer);

  // 2. Calculate visible count and end index
  const visibleCount = Math.ceil(viewportHeight / itemHeight);
  const endIndex = Math.min(totalItems, rawStart + visibleCount + buffer);

  // 3. Compute spacer padding to preserve scrollbar dimension
  const topPadding = startIndex * itemHeight;
  const renderedHeight = (endIndex - startIndex) * itemHeight;
  const bottomPadding = Math.max(0, totalHeight - topPadding - renderedHeight);

  return {
    startIndex,
    endIndex,
    topPadding,
    bottomPadding
  };
}
```

### Time & Space Complexity
- **Time Complexity:** $O(1)$ constant time per scroll event.
- **Space Complexity:** $O(K)$ where $K$ is only the visible subset (e.g. 20 items in DOM instead of 50,000).

---

## Challenge 5: LRU (Least Recently Used) Cache with TypeScript Generics

### Problem Statement
Implement an LRU cache data structure supporting `get(key)` and `put(key, value)` with $O(1)$ time complexity using a HashMap and Doubly Linked List.

```typescript
class DNode<K, V> {
  key: K;
  value: V;
  prev: DNode<K, V> | null = null;
  next: DNode<K, V> | null = null;

  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
  }
}

export class LRUCache<K, V> {
  private capacity: number;
  private map = new Map<K, DNode<K, V>>();
  private head: DNode<K, V>;
  private tail: DNode<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    // Sentinel nodes simplify boundary logic
    this.head = new DNode<any, any>(null, null);
    this.tail = new DNode<any, any>(null, null);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;

    // Move accessed node to head (most recently used)
    this.moveToHead(node);
    return node.value;
  }

  put(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.moveToHead(existing);
      return;
    }

    if (this.map.size >= this.capacity) {
      // Evict least recently used (node before tail)
      const lru = this.removeTail();
      if (lru) this.map.delete(lru.key);
    }

    const newNode = new DNode(key, value);
    this.map.set(key, newNode);
    this.addNode(newNode);
  }

  private addNode(node: DNode<K, V>): void {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  private removeNode(node: DNode<K, V>): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  private moveToHead(node: DNode<K, V>): void {
    this.removeNode(node);
    this.addNode(node);
  }

  private removeTail(): DNode<K, V> | null {
    const node = this.tail.prev;
    if (node && node !== this.head) {
      this.removeNode(node);
      return node;
    }
    return null;
  }
}
```

---

## Senior Interview Discussion Points

- **Why return a teardown function in Observable?** To guarantee cleanup of browser timers, event listeners, or network requests when consumer unsubscribes.
- **Why use Sentinel nodes in Doubly Linked List?** Eliminates edge-case checks for empty lists or single-element lists during pointer updates.
- **How does virtual scroll buffer affect INP and frame rates?** A buffer of 2–4 items pre-renders rows just outside the visible viewport, preventing blank flashes during rapid scrolling.

---

## Revision Checklist

- [ ] Write a minimal Observable with subscription teardown from memory.
- [ ] Implement a custom higher-order RxJS operator.
- [ ] Implement a dynamic reactive form builder with conditional validators.
- [ ] Calculate $O(1)$ virtual scroll window ranges with buffer and padding offsets.
- [ ] Implement an $O(1)$ LRU Cache using Map + Doubly Linked List.
