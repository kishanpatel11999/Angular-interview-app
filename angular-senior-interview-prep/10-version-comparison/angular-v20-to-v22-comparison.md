# Angular Version Comparison: v20 to v22

> **Last verified:** 2026-10-28 | Based on official Angular release notes and changelogs.  
> ⚠️ Angular evolves rapidly. Always verify against official release notes at https://github.com/angular/angular/releases before relying on version-specific claims.

---

## Table of Contents

1. [Angular 20 — What Became Stable](#angular-20--what-became-stable)
2. [Angular 21 — New Capabilities](#angular-21--new-capabilities)
3. [Angular 22 — Latest Release](#angular-22--latest-release)
4. [Side-by-Side Code Comparisons](#side-by-side-code-comparisons)
5. [Interview Questions](#interview-questions)

---

## Angular 20 — What Became Stable

**Released:** May 2025

Angular 20 was a significant stability milestone — many APIs that were in developer preview graduated to stable.

### Stable APIs in Angular 20

| API | Previous status | Angular 20 status |
|-----|----------------|-------------------|
| Zoneless change detection | Developer preview (v18) | **Stable** |
| Incremental hydration | Developer preview (v19) | **Stable** |
| `effect()` | Developer preview | **Stable** |
| `linkedSignal()` | Developer preview (v19) | **Stable** |
| `resource()` / `rxResource()` | Developer preview (v19) | **Stable** |
| Signal-based forms | Under development | Experimental |

### Zoneless Change Detection (Stable)

```typescript
// Angular 20 — stable provider (not experimental)
import { provideZonelessChangeDetection } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(), // stable in Angular 20
  ]
});
```

**What this means:** Angular no longer requires Zone.js. Change detection is triggered only by signal changes, `markForCheck()`, and `async` pipe emissions. Applications must be authored to use signals or explicit CD triggers.

### Incremental Hydration (Stable)

```html
<!-- Incrementally hydrate on viewport entry — stable in Angular 20 -->
@defer (hydrate on viewport) {
  <app-comment-section [postId]="postId" />
}
```

Incremental hydration allows different parts of a server-rendered page to be hydrated on demand, reducing the JavaScript executed on initial load.

### `linkedSignal()` (Stable)

`linkedSignal` creates a writable signal whose initial value depends on another signal and resets when that signal changes:

```typescript
// When selectedCategory changes, selectedProduct resets to null
selectedCategory = signal<Category | null>(null);
selectedProduct = linkedSignal(() => {
  const category = this.selectedCategory();
  return category ? category.defaultProduct : null;
});
```

### `resource()` API (Stable)

`resource()` provides a reactive async data loading pattern integrated with signals:

```typescript
import { resource } from '@angular/core';

@Component({ ... })
class UserComponent {
  userId = signal(1);

  userResource = resource({
    request: () => this.userId(), // re-fetches when userId changes
    loader: async ({ request: id }) => {
      const response = await fetch(`/api/users/${id}`);
      return response.json() as Promise<User>;
    }
  });

  // Access: userResource.value(), userResource.isLoading(), userResource.error()
}
```

For RxJS-based loading, use `rxResource()`:

```typescript
import { rxResource } from '@angular/core/rxjs-interop';

userResource = rxResource({
  request: () => this.userId(),
  loader: ({ request: id }) => this.http.get<User>(`/api/users/${id}`)
});
```

### Breaking Changes in Angular 20

- Zone.js is now an optional dependency — applications that rely on Zone.js behavior without explicit CD need to be updated.
- Some deprecated APIs removed — check the official migration guide.
- TypeScript minimum version updated (verify against official compatibility table).

---

## Angular 21 — New Capabilities

**Released:** ~November 2025 (verify against official release notes)

> ⚠️ Angular 21 details should be verified against the official changelog at the time of your interview. The following is based on Angular roadmap intent and should not be treated as guaranteed.

### Anticipated / Roadmap Areas

Based on the Angular roadmap at time of writing, Angular 21 development areas included:

- **Forms evolution** — improved typed forms, potential signal-based form controls.
- **Developer experience** — improved error messages, language service improvements.
- **Accessibility** — enhanced ARIA patterns in Angular CDK and Angular Material.
- **Performance** — continued SSR and hydration improvements.
- **AI-assisted tooling** — Angular DevTools enhancements.

### What to Do Before an Interview on Angular 21

```bash
# Check actual released features
curl https://api.github.com/repos/angular/angular/releases | jq '.[].name'
# Or visit: https://github.com/angular/angular/blob/main/CHANGELOG.md
```

---

## Angular 22 — Latest Release

**Released:** ~May 2026 (verify against official release notes)

> ⚠️ Angular 22 features must be verified against the official changelog. The claims below represent the state of Angular at the time this document was created (2026-10-28) and should be cross-referenced with the official release notes.

### Key Areas (Verify Before Use)

- Signal-based forms graduation (verify exact stable status).
- Continued `resource()` API improvements.
- Build tooling improvements.
- TypeScript and Node.js compatibility updates.

### Official Sources for Angular 22

- Release notes: https://github.com/angular/angular/releases/tag/22.0.0
- Changelog: https://github.com/angular/angular/blob/main/CHANGELOG.md
- Blog post: https://blog.angular.dev

---

## Side-by-Side Code Comparisons

### Zone-Based vs Zoneless Change Detection

```typescript
// Zone-based (Angular 2–19 default)
@Component({
  template: `<p>Count: {{ count }}</p>`
})
export class ZoneComponent {
  count = 0;

  increment(): void {
    setTimeout(() => {
      this.count++; // Zone.js detects setTimeout completion, triggers CD
    }, 0);
  }
}

// Zoneless (Angular 20+ stable)
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>Count: {{ count() }}</p>`
})
export class ZonelessComponent {
  count = signal(0);

  increment(): void {
    // Signal update directly notifies Angular — no Zone.js needed
    this.count.update(c => c + 1);
  }
}
```

### Traditional Data Loading vs resource()

```typescript
// Traditional — Observable + async pipe
@Component({
  template: `
    @if (user$ | async; as user) { <p>{{ user.name }}</p> }
    @if (loading$ | async) { <app-spinner /> }
  `
})
class TraditionalComponent {
  loading$ = new BehaviorSubject(false);
  user$ = this.loadUser();

  private loadUser(): Observable<User> {
    return this.userIdSignal.pipe(
      toObservable, // hypothetical
      switchMap(id => {
        this.loading$.next(true);
        return this.http.get<User>(`/api/users/${id}`).pipe(
          finalize(() => this.loading$.next(false))
        );
      })
    );
  }
}

// Angular 20+ — resource() API
@Component({
  template: `
    @if (userResource.value(); as user) { <p>{{ user.name }}</p> }
    @if (userResource.isLoading()) { <app-spinner /> }
    @if (userResource.error(); as err) { <p>Error: {{ err.message }}</p> }
  `
})
class ModernComponent {
  userId = signal(1);

  userResource = resource({
    request: () => this.userId(),
    loader: async ({ request: id }) =>
      fetch(`/api/users/${id}`).then(r => r.json()) as Promise<User>
  });
}
```

---

## Interview Questions

**Q: What are the most significant improvements in Angular 20?**

> Angular 20's primary contribution was stabilizing APIs that were in developer preview: zoneless change detection became stable, incremental hydration became stable, `effect()` became stable, and `resource()` / `rxResource()` became stable. This release signaled that the reactive architecture — signals, computed values, effects, resource loading — is now the recommended and production-ready way to build Angular applications.

**Q: What changed in Angular 18's zoneless support compared with later releases?**

> Angular 18 introduced zoneless change detection as a **developer preview** via `provideExperimentalZonelessChangeDetection()`. It was not recommended for production due to potential edge cases. Angular 19 continued developer preview with refinements. Angular 20 graduated it to **stable** with the API renamed to `provideZonelessChangeDetection()`. The production recommendation changed with Angular 20 — that's the first version where zoneless is considered production-ready.

**Q: When did `resource()` become stable, and what problem does it solve?**

> `resource()` was introduced as a developer preview in Angular 19 and became stable in Angular 20. It solves the problem of reactive async data loading with signals. Previously, loading data reactively required combining `toObservable(signal)` + `switchMap` + `toSignal()` — a verbose pattern. `resource()` integrates the full cycle (request signal → async loader → result signal with loading/error states) into a single, ergonomic API that works naturally with the signals model.

**Q: How would you assess the risk of upgrading Angular, TypeScript, and Node.js together?**

> I would: (1) Check the official [Angular compatibility table](https://angular.dev/reference/versions) for the exact TypeScript and Node.js versions supported by the target Angular version. (2) Run `ng update @angular/core@<version>` in a separate branch to see migration schematics. (3) Update one major version at a time — never skip majors. (4) Check each dependency in `package.json` for Angular version compatibility (`ng-packagr`, Material, CDK, NgRx). (5) Run the full test suite after each update. (6) Test in a staging environment before production. (7) Have a rollback plan — deployable artifact of the current version ready.

---

## Further Reading

- [Angular Release History](https://angular.dev/reference/releases)
- [Angular Version Compatibility](https://angular.dev/reference/versions)
- [Angular Update Guide](https://angular.dev/update-guide)
- [Angular Changelog (GitHub)](https://github.com/angular/angular/blob/main/CHANGELOG.md)
- [Angular 20 Blog Post](https://blog.angular.dev)
