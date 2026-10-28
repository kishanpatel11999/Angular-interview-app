# Angular Feature Availability Matrix

> **Last verified:** 2026-10-28  
> ⚠️ This matrix reflects the best available information at the time of writing. Features evolve rapidly — always verify against [angular.dev/reference/releases](https://angular.dev/reference/releases) and the [official changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md) before relying on specific version claims in interviews.

---

## How to Read This Matrix

- **✅ Stable** — Production-ready, stable API.
- **🔬 Preview** — Developer preview or experimental — API may change.
- **❌ Not available** — Feature does not exist in this version.
- **🗑️ Deprecated** — Still works but will be removed in a future version.
- **🚫 Removed** — No longer available.
- **⚠️ Verify** — Status uncertain — check official changelog.

---

## Core Feature Matrix

| Feature / API | Introduced | Stable | v18 | v19 | v20 | v21 | v22 |
|---|---|---|---|---|---|---|---|
| **Standalone components** | v14 (exp) | v15 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`@if` / `@for` / `@switch`** (built-in control flow) | v17 | v17 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`@defer`** (deferrable views) | v17 | v17 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`signal()`** | v16 (exp) | v17 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`computed()`** | v16 (exp) | v17 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`effect()`** | v16 (exp) | v20 | 🔬 | 🔬 | ✅ | ✅ | ✅ |
| **Signal inputs** (`input()`, `input.required()`) | v17.1 | v17.3 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Signal outputs** (`output()`) | v17.3 | v17.3 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Signal model** (`model()`) | v17.2 | v17.3 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Signal queries** (`viewChild()`, `contentChild()`, etc.) | v17.2 | v17.3 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`toSignal()` / `toObservable()`** | v16 | v16 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`linkedSignal()`** | v19 (exp) | v20 | ❌ | 🔬 | ✅ | ✅ | ✅ |
| **`resource()` / `rxResource()`** | v19 (exp) | v20 | ❌ | 🔬 | ✅ | ✅ | ✅ |
| **Zoneless change detection** | v18 (exp) | v20 | 🔬 | 🔬 | ✅ | ✅ | ✅ |
| **Full-app hydration** | v16 (exp) | v17 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Incremental hydration** | v19 (exp) | v20 | ❌ | 🔬 | ✅ | ✅ | ✅ |
| **Event replay** (during hydration) | v18 | v18 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Functional route guards** (`CanActivateFn`) | v14.2 | v15 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Functional HTTP interceptors** | v15 | v15 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`provideHttpClient()`** | v15 | v15 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`withFetch()`** (Fetch API for HttpClient) | v17.3 | v17.3 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`NgOptimizedImage`** | v15 (exp) | v15 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Typed reactive forms** | v14 | v14 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`withComponentInputBinding()`** | v15 | v16 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **esbuild/Vite application builder** | v16 (exp) | v17 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`DestroyRef`** | v16 | v16 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`takeUntilDestroyed()`** | v16 | v16 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`inject()` in injection context** | v14 | v14 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`ResolveFn`** (functional resolvers) | v15 | v15 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`CanMatchFn`** | v15 | v15 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Signal-based forms** | ⚠️ In development | ⚠️ Not yet stable | ❌ | ❌ | ⚠️ Verify | ⚠️ Verify | ⚠️ Verify |
| **NgRx Signals Store** | NgRx v17 | NgRx v17 | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Notes by Feature

### Zoneless Change Detection

- **v18:** `provideExperimentalZonelessChangeDetection()` — developer preview only.
- **v19:** Continued developer preview, refined behavior.
- **v20:** `provideZonelessChangeDetection()` — **stable**, production-ready.
- **Migration:** Requires removing Zone.js from `polyfills`, ensuring all state updates go through signals or explicit `markForCheck()`.

### Signals

- **`signal()` and `computed()`:** Developer preview in v16, stable in v17.
- **`effect()`:** Developer preview until v20 when it became stable. Note the semantics of cleanup and allowed write behaviors differ slightly between preview and stable.
- **Signal inputs/outputs/queries:** Stable since v17.3.

### Incremental Hydration

- **v19:** Developer preview — `@defer (hydrate on ...)` syntax.
- **v20:** Stable — recommended for production SSR applications.
- **What it does:** Components wrapped in `@defer` blocks are hydrated on-demand (on viewport, interaction, timer) rather than all at once on page load.

### `resource()` API

- **v19:** Developer preview — may change.
- **v20:** Stable — recommended for reactive async data loading with signals.
- **`rxResource()`:** RxJS-based alternative, same stability timeline.

### Built-in Control Flow

- **`@if`, `@for`, `@switch`:** Stable since v17.
- **Old syntax** (`*ngIf`, `*ngFor`, `*ngSwitch`): Still supported in v18–v22 but considered legacy. Migration schematic available.
- **`@for` requires `track`:** Mandatory, unlike `trackBy` in `*ngFor`.

---

## Deprecated and Removed APIs

| API | Deprecated | Removed | Alternative |
|-----|-----------|---------|------------|
| `NgModule` | Not deprecated (still supported) | — | Standalone components |
| `*ngIf`, `*ngFor`, `*ngSwitch` | Not formally deprecated | — | `@if`, `@for`, `@switch` |
| `moduleId` in `@Component` | v15 | v17 | No replacement needed (Ivy handles paths) |
| `signal.mutate()` | v17 | v17 | `signal.update()` |
| `ReflectiveInjector` | v8 | v13 | `Injector` |
| Class-based route guards (`CanActivate`) | v15 | Not yet removed | Functional guards |
| `ComponentFactoryResolver` | v13 | v16 | `ViewContainerRef.createComponent()` |
| `EventManager.addEventListener` | — | — | Angular event binding |

> ⚠️ The deprecation timeline is subject to change. Always check the official Angular changelog for the version you're targeting.

---

## TypeScript and Node.js Compatibility

> Verify the exact versions against [angular.dev/reference/versions](https://angular.dev/reference/versions) for the Angular version you are using.

| Angular version | TypeScript minimum | Node.js minimum |
|---|---|---|
| Angular 18 | ~5.4 | 18.19.1 |
| Angular 19 | ~5.6 | 18.19.1 |
| Angular 20 | ~5.8 | 18.19.1 (verify) |
| Angular 21 | ⚠️ Verify | ⚠️ Verify |
| Angular 22 | ⚠️ Verify | ⚠️ Verify |

---

## Using This Matrix in Interviews

When asked about feature availability:

1. **State the version it was introduced.**
2. **State whether it was experimental or stable.**
3. **State the version it became stable** (if applicable).
4. **Acknowledge uncertainty:** "This is accurate as of my last research, but I'd verify against the official changelog before implementing in production."

This demonstrates both knowledge and the professional discipline of verifying version-specific claims — a quality interviewers respect.

---

## Further Reading

- [Angular Release Notes](https://angular.dev/reference/releases)
- [Angular Compatibility Guide](https://angular.dev/reference/versions)
- [Angular Changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md)
- [Angular Deprecation Guide](https://angular.dev/reference/migrations)
