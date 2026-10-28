# Reusable Component Design, Dynamic Components, and Content Projection

> **Phase:** 3 — Advanced Angular  
> **Related:** [standalone-and-architecture.md](./standalone-and-architecture.md) | [components-templates-directives.md](../01-fundamentals/components-templates-directives.md) | [html-css-accessibility.md](../01-fundamentals/html-css-accessibility.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Prerequisites](#prerequisites)
3. [Component Design Principles for Enterprise Scale](#component-design-principles-for-enterprise-scale)
4. [Content Projection Deep-Dive](#content-projection-deep-dive)
   - Single-Slot Projection
   - Multi-Slot Projection with Selectors
   - Fallback / Default Projected Content
   - The `ngProjectAs` Directive
5. [Template Injection with `ng-template` & `ngTemplateOutlet`](#template-injection-with-ng-template--ngtemplateoutlet)
6. [Dynamic Component Creation with Modern `ViewContainerRef`](#dynamic-component-creation-with-modern-viewcontainerref)
   - `createComponent()` vs Legacy `ComponentFactoryResolver`
   - Setting Inputs with `setInput()` and Signals
   - Clean Destruction and Memory Management
7. [Compound Components & Headless Component Architecture](#compound-components--headless-component-architecture)
8. [Design System Architecture & Custom Form Controls](#design-system-architecture--custom-form-controls)
9. [Accessibility (a11y) & ARIA in Reusable Components](#accessibility-a11y--aria-in-reusable-components)
10. [Common Mistakes and Design Anti-Patterns](#common-mistakes-and-design-anti-patterns)
11. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
12. [Hands-On Exercise: Reusable Data Table with Custom Template Outlets](#hands-on-exercise-reusable-data-table-with-custom-template-outlets)
13. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Master single-slot, multi-slot, and conditional content projection using `<ng-content>`.
- Use `ngProjectAs` to project custom components into third-party or strict selector slots.
- Implement highly flexible component APIs using `TemplateRef` and `ngTemplateOutlet` with typed context.
- Create and manage dynamic components using modern `ViewContainerRef.createComponent()` and `ComponentRef.setInput()`.
- Architect enterprise design system components following headless and compound component patterns.
- Ensure strict accessibility standards (keyboard navigation, ARIA attributes, focus trapping).

---

## Component Design Principles for Enterprise Scale

When building shared components for an enterprise design system:
1. **Single Responsibility Principle (SRP):** A component should render a specific UI pattern, not handle business logic or make HTTP calls.
2. **Inversion of Control (IoC):** Let the consumer decide how to render complex sub-elements using templates instead of hardcoding 50 boolean flags.
3. **Open/Closed Principle:** Open for extension (via content projection and template outlets) but closed for modification.
4. **Strict Typing:** All `@Input()`, signals, and template contexts must have complete TypeScript interfaces.

---

## Content Projection Deep-Dive

### 1. Single-Slot Projection
Content projection is the Angular equivalent of web standard `<slot>`. The consumer provides children, and the parent renders them in place.

```html
<!-- modal-card.component.html -->
<div class="card-container">
  <ng-content></ng-content>
</div>
```

### 2. Multi-Slot Projection with Selectors
You can project different HTML elements into designated zones using CSS selectors in the `select` attribute:

```html
<!-- app-modal.component.html -->
<div class="modal-dialog">
  <header class="modal-header">
    <ng-content select="[modal-title]"></ng-content>
  </header>
  
  <section class="modal-body">
    <ng-content select="[modal-body], :not([modal-title]):not([modal-footer])"></ng-content>
  </section>

  <footer class="modal-footer">
    <ng-content select="[modal-footer]"></ng-content>
  </footer>
</div>
```

Usage by consumer:
```html
<app-modal>
  <h2 modal-title>Delete Confirmation</h2>
  <p modal-body>Are you sure you want to delete this resource?</p>
  <div modal-footer>
    <button class="btn-cancel">Cancel</button>
    <button class="btn-danger">Confirm</button>
  </div>
</app-modal>
```

### 3. Fallback / Default Content
In modern Angular (v18+), `<ng-content>` supports **fallback content** rendered when the consumer does not provide projected content:

```html
<div class="card">
  <ng-content select="header">
    <!-- Default fallback rendered if no <header> is projected -->
    <header class="default-header">Default Title</header>
  </ng-content>
</div>
```

### 4. The `ngProjectAs` Directive
When a child element is wrapped in another tag (like an `ng-container` or a custom wrapper), standard selector projection fails because the root tag does not match the selector. `ngProjectAs` overrides the projection identity:

```html
<!-- The modal expects select="[modal-title]" -->
<app-modal>
  <ng-container ngProjectAs="[modal-title]">
    <h2>Dynamic Title for User: {{ userName() }}</h2>
    <span class="badge">Active</span>
  </ng-container>
</app-modal>
```

---

## Template Injection with `ng-template` & `ngTemplateOutlet`

Content projection is rendered in the **parent's scope**, meaning the parent evaluates variables. When a component needs to pass **internal data** back to the consumer for customized rendering (e.g., table row items or list cards), use `TemplateRef` with typed context.

### Typed Context Pattern

```typescript
import { Component, ContentChild, Input, TemplateRef, Directive } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CardContext<T> {
  $implicit: T;      // Bound to let-item
  index: number;     // Bound to let-i="index"
  isFirst: boolean;  // Bound to let-first="isFirst"
}

@Component({
  selector: 'app-item-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ul class="list-container">
      @for (item of items; track item.id; let idx = $index; let first = $first) {
        <li class="list-item">
          <!-- Fallback to default rendering if custom template is not provided -->
          <ng-container
            *ngTemplateOutlet="itemTemplate || defaultTemplate; context: { $implicit: item, index: idx, isFirst: first }"
          />
        </li>
      }
    </ul>

    <ng-template #defaultTemplate let-item>
      <span>{{ item.label }}</span>
    </ng-template>
  `
})
export class ItemListComponent<T extends { id: string | number; label: string }> {
  @Input({ required: true }) items: T[] = [];
  @Input() itemTemplate?: TemplateRef<CardContext<T>>;
}
```

Consumer usage:
```html
<app-item-list [items]="users" [itemTemplate]="customUser">
  <ng-template #customUser let-user let-idx="index" let-isFirst="isFirst">
    <div class="user-card" [class.highlight]="isFirst">
      <strong>#{{ idx + 1 }}: {{ user.label }}</strong>
      <span>{{ user.role }}</span>
    </div>
  </ng-template>
</app-item-list>
```

---

## Dynamic Component Creation with Modern `ViewContainerRef`

### `createComponent()` vs Legacy `ComponentFactoryResolver`
Before Angular 13, dynamic components required `ComponentFactoryResolver`, resolving a factory and calling `factory.create()`.
Starting in Angular 13 and standard across Angular 16+:
- `ComponentFactoryResolver` is **deprecated and removed**.
- Directly call `viewContainerRef.createComponent(ComponentType)`.

### Production Dynamic Toast / Modal Service

```typescript
import {
  Injectable,
  ComponentRef,
  ViewContainerRef,
  Type,
  EnvironmentInjector,
  createComponent
} from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private activeModalRef?: ComponentRef<any>;

  open<T>(component: Type<T>, vcr: ViewContainerRef, inputs?: Partial<Record<keyof T, any>>): ComponentRef<T> {
    // 1. Destroy any existing active modal
    this.close();

    // 2. Instantiate component dynamically in the target container
    const compRef = vcr.createComponent(component);

    // 3. Set reactive inputs using modern setInput() API
    if (inputs) {
      for (const [key, value] of Object.entries(inputs)) {
        compRef.setInput(key, value);
      }
    }

    // 4. Trigger change detection
    compRef.changeDetectorRef.detectChanges();

    this.activeModalRef = compRef;
    return compRef;
  }

  close(): void {
    if (this.activeModalRef) {
      this.activeModalRef.destroy();
      this.activeModalRef = undefined;
    }
  }
}
```

### Why Use `setInput()` Instead of `instance[prop] = val`?
When using signal inputs (`input()`, `model()`), direct assignment `compRef.instance.prop = val` fails because signal inputs are read-only signals. `compRef.setInput('prop', val)` correctly updates the underlying signal and notifies downstream computed values and change detection.

---

## Compound Components & Headless Component Architecture

### What is a Compound Component?
A set of components that work together to maintain shared state implicitly without the consumer manually plumbing inputs and outputs to every child.
Examples: `<tabs>` + `<tab>`, `<accordion>` + `<accordion-item>`, `<select>` + `<option>`.

```typescript
// Shared injection token for parent-child communication
import { Component, contentChildren, inject, input, model, output } from '@angular/core';

@Component({
  selector: 'app-accordion-item',
  standalone: true,
  template: `
    <div class="accordion-item" [class.expanded]="isOpen()">
      <button class="accordion-header" (click)="toggle()">
        {{ title() }}
      </button>
      @if (isOpen()) {
        <div class="accordion-content">
          <ng-content />
        </div>
      }
    </div>
  `
})
export class AccordionItemComponent {
  title = input.required<string>();
  isOpen = model<boolean>(false);

  toggle() {
    this.isOpen.update(open => !open);
  }
}

@Component({
  selector: 'app-accordion',
  standalone: true,
  template: `<div class="accordion-group"><ng-content /></div>`
})
export class AccordionComponent {
  // Query all child items dynamically
  items = contentChildren(AccordionItemComponent);

  collapseAll() {
    this.items().forEach(item => item.isOpen.set(false));
  }
}
```

---

## Accessibility (a11y) & ARIA in Reusable Components

Every reusable component must be accessible by default:
1. **Keyboard Accessibility:** Use appropriate key handlers (`Enter`, `Space`, `Escape`, `ArrowUp`, `ArrowDown`).
2. **Focus Management:** Move focus programmatically to newly opened modals and restore focus to trigger buttons on close.
3. **Semantic ARIA Attributes:** 
   - Modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="title-id"`.
   - Menus: `role="menu"`, `role="menuitem"`, `aria-expanded="true/false"`.
   - Tooltips: `role="tooltip"`, `aria-describedby="tooltip-id"`.

---

## Common Mistakes and Design Anti-Patterns

### Anti-Pattern 1: The "Boolean Prop Explosion"
Adding dozens of boolean flags (`[showSearch]`, `[showFooter]`, `[isSmall]`, `[isBordered]`, `[hasShadow]`, `[enableExport]`) to configure every permutation.
**Better approach:** Use content projection and template slots. Let the consumer project buttons and search inputs where desired.

### Anti-Pattern 2: Forgetting to Destroy Dynamic Components
Creating components dynamically via `createComponent()` without calling `destroy()` when closed or on parent destruction leaks memory, event listeners, and DOM nodes. Always keep track of `ComponentRef` and call `.destroy()`.

### Anti-Pattern 3: Bypassing `setInput()` with Signal Inputs
Assigning properties directly to `compRef.instance.myInput = 'value'` throws errors when `myInput` is declared with modern `input()`. Always use `compRef.setInput('myInput', 'value')`.

---

## Senior Interview Questions with Detailed Answers

### Q1: Compare Content Projection (`<ng-content>`) with Template Outlets (`*ngTemplateOutlet`). When do you choose one over the other?
**Answer:**
- **`<ng-content>` (Content Projection):**
  - Evaluated in the **parent component's context**.
  - Always instantiated even if not visually shown (unless inside `@if` on the parent).
  - Cannot pass internal component state to the projected DOM nodes.
  - Ideal for static layouts, card containers, dialog shells, and structural wrappers.
- **`*ngTemplateOutlet` with `TemplateRef`:**
  - Evaluated on-demand and can be rendered multiple times in a loop (e.g. table rows).
  - Can pass **internal context** (`context: { $implicit: item, index: i }`) back to the template.
  - Highly performant because templates are not instantiated until explicitly evaluated.
  - Ideal for data tables, virtual lists, auto-completes, and customizable cell renderers.

---

### Q2: How does modern dynamic component creation (`ViewContainerRef.createComponent`) differ from the legacy `ComponentFactoryResolver`?
**Answer:**
In older Angular versions (pre-v13), Angular generated a separate `ComponentFactory` for every component class during compilation. Dynamically instantiating a component required injecting `ComponentFactoryResolver`, looking up the factory by class reference, and passing it to `ViewContainerRef.createComponent(factory)`.
With the Ivy compiler, component metadata is compiled directly into static definitions on the class itself (`ɵcmp`). Therefore, `ViewContainerRef.createComponent(ComponentClass)` takes the component class directly, eliminating the need for factories and `ComponentFactoryResolver` entirely, leading to cleaner code and smaller bundle sizes.

---

## Hands-On Exercise: Reusable Data Table with Custom Template Outlets

### Goal
Implement a generic, reusable `<app-data-table>` component that accepts an array of data and column definitions, and allows consumers to provide custom cell templates via `TemplateRef`.

```typescript
import { Component, Input, TemplateRef, ContentChildren, QueryList, Directive } from '@angular/core';
import { CommonModule } from '@angular/common';

@Directive({
  selector: '[appCellDef]',
  standalone: true
})
export class CellDefDirective {
  @Input('appCellDef') columnName = '';
  constructor(public template: TemplateRef<any>) {}
}

export interface ColumnConfig<T> {
  key: keyof T & string;
  header: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <table class="custom-table">
      <thead>
        <tr>
          @for (col of columns; track col.key) {
            <th>{{ col.header }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of data; track row.id) {
          <tr>
            @for (col of columns; track col.key) {
              <td>
                <ng-container
                  *ngTemplateOutlet="getCellTemplate(col.key) || defaultCell; context: { $implicit: row[col.key], row: row }"
                />
              </td>
            }
          </tr>
        }
      </tbody>
    </table>

    <ng-template #defaultCell let-value>
      {{ value }}
    </ng-template>
  `
})
export class DataTableComponent<T extends { id: string | number }> {
  @Input({ required: true }) data: T[] = [];
  @Input({ required: true }) columns: ColumnConfig<T>[] = [];

  @ContentChildren(CellDefDirective) customCells!: QueryList<CellDefDirective>;

  getCellTemplate(columnName: string): TemplateRef<any> | null {
    const match = this.customCells?.find(c => c.columnName === columnName);
    return match ? match.template : null;
  }
}
```

---

## Revision Checklist

- [ ] Explain multi-slot content projection and selector matching syntax.
- [ ] Understand `ngProjectAs` to project wrapped elements into specific slots.
- [ ] Know how to pass typed context to `ngTemplateOutlet` (`$implicit` and named keys).
- [ ] Dynamically instantiate components using `ViewContainerRef.createComponent()`.
- [ ] Update dynamic component signal inputs using `compRef.setInput()`.
- [ ] Understand compound component communication using `contentChildren()`.
- [ ] Prevent memory leaks by calling `ComponentRef.destroy()` when dynamic views close.
