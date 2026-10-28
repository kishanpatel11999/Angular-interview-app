# Angular Fundamentals — Architecture to Bootstrap

> **Phase:** 1 — Fundamentals  
> **Related:** [components-templates-directives.md](./components-templates-directives.md) | [dependency-injection.md](../02-core-angular/dependency-injection.md)  
> **Interview files:** [angular-interview-questions.md](../07-interview-preparation/angular-interview-questions.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Angular Architecture Overview](#angular-architecture-overview)
3. [Application Bootstrap](#application-bootstrap)
4. [NgModule vs Standalone](#ngmodule-vs-standalone)
5. [Component Basics](#component-basics)
6. [Data Binding and Template Expressions](#data-binding-and-template-expressions)
7. [Built-in Control Flow](#built-in-control-flow)
8. [Deferrable Views (@defer)](#deferrable-views-defer)
9. [View Encapsulation](#view-encapsulation)
10. [Common Mistakes](#common-mistakes)
11. [Interview Questions with Answers](#interview-questions-with-answers)
12. [Exercises](#exercises)
13. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Explain Angular's application architecture and how components, services, and DI work together.
- Distinguish the NgModule and standalone approaches and know the trade-offs.
- Use the built-in control flow syntax (`@if`, `@for`, `@switch`, `@defer`) introduced in Angular 17.
- Explain view encapsulation modes and their impact on styles.

---

## Prerequisites

- HTML, CSS, and TypeScript basics.
- Familiarity with running an Angular CLI project.

---

## Angular Architecture Overview

Angular is a component-based framework. Key building blocks:

| Building block | Description |
|---|---|
| **Component** | A class with a template and metadata. The fundamental UI unit. |
| **Directive** | Extends HTML with new behavior (attribute directives) or structure (structural directives). |
| **Pipe** | Transforms data in templates. |
| **Service** | Provides shared logic, data access, or state. Injected via DI. |
| **Module (NgModule)** | Legacy grouping of components, directives, pipes, and providers (pre-standalone). |
| **Router** | Maps URLs to component trees. |
| **HttpClient** | Typed HTTP communication. |
| **DI System** | Provides dependencies to classes without tightly coupling them. |

```
Application
  └── Root Component (AppComponent)
        ├── Feature Component
        │     ├── Child Component
        │     └── Shared Component
        └── Feature Component (lazy-loaded)
```

---

## Application Bootstrap

### NgModule-based Bootstrap (legacy / Angular 2–16 default)

```typescript
// main.ts
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));

// app.module.ts
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, RouterModule.forRoot(routes)],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

### Standalone Bootstrap (Angular 15+, recommended)

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    // other app-level providers
  ]
});

// app.component.ts
@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  template: `<router-outlet />`
})
export class AppComponent {}
```

### Bootstrap Sequence

1. Angular compiles the application (Ivy compilation).
2. `bootstrapApplication` (or `bootstrapModule`) creates the root injector with provided services.
3. The root component is compiled and its host element in `index.html` is found.
4. The root component is instantiated and rendered.
5. Change detection runs for the first time.
6. Child components are initialized recursively.

---

## NgModule vs Standalone

| Aspect | NgModule | Standalone |
|---|---|---|
| Introduced | Angular 2 | Angular 14 (experimental), 15 (stable) |
| Declaration | Declared in `declarations[]` | `standalone: true` in `@Component` |
| Imports | Module imports other modules | Component imports components, directives, pipes directly |
| Lazy loading | `loadChildren: () => import(...).then(m => m.FeatureModule)` | `loadComponent` / `loadChildren` with standalone routes |
| DI scope | Module-level providers | Route-level providers via `providers` in route config |
| Migration | Use `ng generate @angular/core:standalone` schematics | N/A — this is the target |

**When to keep NgModule:** When working in an existing NgModule-based codebase that you cannot migrate all at once. NgModules and standalone components are interoperable — you can use standalone components inside NgModule apps and vice versa.

**Recommendation for new projects (Angular 15+):** Use standalone components exclusively.

```typescript
// STANDALONE component — no NgModule needed
@Component({
  standalone: true,
  selector: 'app-user-card',
  imports: [NgIf, DatePipe, RouterLink], // import what you need directly
  template: `
    <div *ngIf="user">  <!-- legacy syntax still works -->
      @if (user) {      <!-- built-in control flow (Angular 17+) -->
        <h3>{{ user.name }}</h3>
        <p>Joined: {{ user.createdAt | date:'mediumDate' }}</p>
        <a [routerLink]="['/users', user.id]">View profile</a>
      }
    </div>
  `,
})
export class UserCardComponent {
  @Input() user?: User;
}
```

---

## Component Basics

```typescript
@Component({
  standalone: true,
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrl: './product.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated, // default
})
export class ProductComponent {
  // Signal-based input (Angular 17.1+)
  product = input.required<Product>();
  
  // Traditional input
  @Input({ required: true }) category!: string;
  
  // Output
  @Output() selected = new EventEmitter<Product>();
  
  // Computed signal
  displayName = computed(() => `${this.product().name} — ${this.category}`);
  
  select() {
    this.selected.emit(this.product());
  }
}
```

### Input and Output

```typescript
// Angular 17.1+ signal inputs
name = input<string>(''); // with default
name = input.required<string>(); // required, no default
count = input(0, { transform: numberAttribute }); // with transform

// Signal-based model (two-way binding)
value = model<string>('');

// Traditional decorator approach
@Input() title: string = '';
@Input({ required: true }) id!: number;
@Output() titleChange = new EventEmitter<string>();
```

---

## Data Binding and Template Expressions

### Types of Binding

```html
<!-- Interpolation — one-way, component → DOM -->
<p>{{ title }}</p>
<p>{{ user.name | uppercase }}</p>

<!-- Property binding — one-way, component → DOM -->
<img [src]="imageUrl" [alt]="imageAlt">
<button [disabled]="isLoading">Submit</button>

<!-- Event binding — DOM → component -->
<button (click)="handleClick($event)">Click</button>
<input (keyup.enter)="search()">

<!-- Two-way binding — NgModel -->
<input [(ngModel)]="searchTerm">

<!-- Attribute binding — for attributes without DOM property equivalent -->
<td [attr.colspan]="columnSpan">Data</td>
<div [attr.aria-label]="label">...</div>

<!-- Class and style binding -->
<div [class.active]="isActive">...</div>
<div [class]="{ active: isActive, disabled: isDisabled }">...</div>
<div [style.color]="textColor">...</div>
<div [style]="{ color: textColor, fontSize: fontSize + 'px' }">...</div>
```

### Template Reference Variables

```html
<input #emailInput type="email">
<button (click)="validate(emailInput.value)">Validate</button>

<!-- Reference a directive instance -->
<form #loginForm="ngForm" (ngSubmit)="submit(loginForm)">
  ...
</form>
```

---

## Built-in Control Flow

Angular 17 introduced built-in control flow syntax that replaces structural directives in templates. The new syntax is more readable and performs better due to compiler-level optimization.

### @if

```html
<!-- Angular 17+ built-in control flow -->
@if (user) {
  <p>Welcome, {{ user.name }}</p>
} @else if (isLoading) {
  <app-spinner />
} @else {
  <p>Please log in</p>
}

<!-- Legacy structural directive — still supported -->
<p *ngIf="user; else loginBlock">Welcome, {{ user.name }}</p>
<ng-template #loginBlock><p>Please log in</p></ng-template>
```

### @for

```html
<!-- @for requires a track expression — mandatory for performance -->
@for (item of items; track item.id) {
  <li>{{ item.name }}</li>
} @empty {
  <li>No items found</li>
}

<!-- Additional context variables available -->
@for (item of items; track item.id; let i = $index, last = $last) {
  <li [class.last]="last">{{ i + 1 }}. {{ item.name }}</li>
}

<!-- Legacy *ngFor -->
<li *ngFor="let item of items; trackBy: trackById">{{ item.name }}</li>
```

### @switch

```html
@switch (status) {
  @case ('active') { <span class="badge active">Active</span> }
  @case ('inactive') { <span class="badge inactive">Inactive</span> }
  @default { <span class="badge unknown">Unknown</span> }
}
```

---

## Deferrable Views (@defer)

`@defer` (Angular 17+) allows parts of a template to be lazily rendered — their code is loaded asynchronously, reducing the initial bundle size.

```html
<!-- Load when the block enters the viewport -->
@defer (on viewport) {
  <app-heavy-chart [data]="chartData" />
} @placeholder {
  <div class="chart-placeholder">Chart loading...</div>
} @loading (minimum 300ms) {
  <app-spinner />
} @error {
  <p>Failed to load chart</p>
}

<!-- Load on interaction -->
@defer (on interaction) {
  <app-comment-thread [postId]="postId" />
}

<!-- Load after a delay -->
@defer (on timer(2s)) {
  <app-upsell-banner />
}

<!-- Prefetch condition -->
@defer (on viewport; prefetch on idle) {
  <app-analytics-dashboard />
}
```

### Trigger Options

| Trigger | Description |
|---|---|
| `on idle` | Browser is idle |
| `on viewport` | Block enters viewport |
| `on interaction` | User interacts with placeholder |
| `on hover` | Mouse hovers placeholder |
| `on immediate` | Loads immediately (async) |
| `on timer(Xms)` | After a delay |
| `when condition` | When a boolean condition becomes true |

---

## View Encapsulation

| Mode | Description | Use case |
|---|---|---|
| `Emulated` (default) | Adds unique attribute to component's styles. Scoped to component. | Default — recommended |
| `ShadowDom` | Uses native Shadow DOM. Full isolation. | Web components, maximum isolation |
| `None` | Styles leak globally. No scoping. | Avoid — debugging nightmare |

```typescript
@Component({
  encapsulation: ViewEncapsulation.Emulated, // [_nghost-abc] attribute added
})
```

**Piercing encapsulation:** Use `::ng-deep` to style child components (deprecated, prefer component inputs/CSS variables). Alternatively, set styles on `:host` to style the host element itself.

```css
/* :host — styles the component's own element */
:host { display: block; padding: 16px; }

/* :host-context — styles host based on an ancestor class */
:host-context(.dark-theme) { background: #222; }
```

---

## Common Mistakes

| Mistake | Consequence | Fix |
|---|---|---|
| Using `@Input()` without `required` on mandatory props | Runtime undefined errors | Use `input.required<T>()` or `@Input({ required: true })` |
| Missing `track` in `@for` | Poor rendering performance | Always provide `track item.id` |
| Setting `encapsulation: None` globally | Style bleed-through | Use `Emulated` and CSS custom properties for theming |
| Mutating `@Input()` values | Violates data-down/events-up flow | Emit events, let parent update the input |
| Using `async` pipe without `@if` to guard `null` | Template renders before data arrives | `@if (data$ | async; as data) { ... }` |

---

## Interview Questions with Answers

**Q: What is the difference between NgModule and standalone components?**

> NgModules were Angular's original compilation and DI grouping mechanism. They required each component to be declared in exactly one module, and required importing other modules to access their components. Standalone components (stable since Angular 15) declare their own imports directly, eliminating the need for NgModule wrappers. This simplifies lazy loading (`loadComponent` for a single component), makes dependency tracking explicit, and reduces boilerplate. NgModules and standalone components are interoperable.

**Q: Why does `@for` require a `track` expression?**

> The `track` expression tells Angular how to identify items in a list for efficient DOM reconciliation. Without it, Angular cannot determine which DOM nodes correspond to which data items when the list changes, forcing it to destroy and recreate all DOM nodes. With a stable `track item.id`, Angular can move, update, or remove only the affected DOM nodes. The `@for` syntax makes `track` mandatory to prevent the performance anti-pattern of `*ngFor` without `trackBy`.

**Q: When should you use `@defer`?**

> Use `@defer` for components that are not needed immediately on page load: below-the-fold content, feature-rich widgets that require interaction, analytics dashboards, comments sections, or any component whose code is large. `@defer` splits the component's code into a separate JavaScript chunk that is loaded only when the trigger condition is met. This reduces initial bundle size, improving Time to Interactive. Avoid `@defer` for above-the-fold critical content — it would hurt LCP.

**Q: What is ViewEncapsulation.Emulated and how does it work?**

> Emulated encapsulation is the default. Angular adds a unique attribute (e.g., `_nghost-abc123`) to the component's host element and `_ngcontent-abc123` to its child elements. Component styles are transformed to include these attribute selectors, making them match only elements within that component's view. No Shadow DOM is used — the styles are in the global stylesheet but are scoped by specificity. This means external styles with higher specificity can still override component styles, unlike real Shadow DOM.

---

## Exercises

1. **Bootstrap:** Create a new Angular 18+ project using the CLI and migrate it to standalone bootstrap without NgModule.
2. **Control flow:** Rewrite a component that uses `*ngIf`, `*ngFor`, and `*ngSwitch` to use the built-in `@if`, `@for`, `@switch` syntax.
3. **Defer:** Add `@defer (on viewport)` to a dashboard component with a placeholder and an `@error` block.
4. **Inputs:** Create a component with both a signal input (`input.required<T>()`) and a legacy `@Input()` and verify they both work.

---

## Revision Checklist

- [ ] Can explain Angular's bootstrap sequence (NgModule and standalone).
- [ ] Understand when to use NgModule vs standalone.
- [ ] Can use `@if`, `@for`, `@switch`, and `@defer` in templates.
- [ ] Know all view encapsulation modes and their effects.
- [ ] Understand property binding, event binding, and interpolation differences.
- [ ] Can set up Angular 17+ signal-based inputs.

---

## Further Reading

- [Angular: Standalone components](https://angular.dev/guide/components/importing)
- [Angular: Built-in control flow](https://angular.dev/guide/templates/control-flow)
- [Angular: Deferrable views](https://angular.dev/guide/defer)
- [Angular: Application bootstrap](https://angular.dev/guide/bootstrapping)
