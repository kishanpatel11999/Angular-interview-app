# Pipes and Directives

> **Phase:** 2 — Core Angular  
> **Related:** [components-templates-directives.md](../01-fundamentals/components-templates-directives.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Built-in Pipes](#built-in-pipes)
3. [The async Pipe](#the-async-pipe)
4. [Pure vs Impure Pipes](#pure-vs-impure-pipes)
5. [Custom Pipes](#custom-pipes)
6. [Built-in Attribute Directives](#built-in-attribute-directives)
7. [Custom Attribute Directives](#custom-attribute-directives)
8. [Structural Directives Deep Dive](#structural-directives-deep-dive)
9. [Interview Questions with Answers](#interview-questions-with-answers)
10. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Use all built-in pipes effectively, including `async`.
- Understand why pure pipes are more performant than impure.
- Build custom pipes that are testable and composable.
- Build custom attribute and structural directives.

---

## Built-in Pipes

```html
<!-- date — format dates -->
{{ createdAt | date }}                           <!-- 'Oct 28, 2026' -->
{{ createdAt | date:'shortTime' }}               <!-- '9:30 PM' -->
{{ createdAt | date:'yyyy-MM-dd HH:mm' }}        <!-- '2026-10-28 21:30' -->

<!-- number (decimal) -->
{{ price | number:'1.2-2' }}                     <!-- '1,234.56' -->
<!-- format: '{minIntDigits}.{minFracDigits}-{maxFracDigits}' -->

<!-- currency -->
{{ price | currency:'EUR':'symbol':'1.2-2' }}    <!-- '€1,234.56' -->
{{ price | currency:'USD' }}                     <!-- '$1,234.57' -->

<!-- percent -->
{{ rate | percent:'1.1-1' }}                     <!-- '95.0%' -->

<!-- uppercase / lowercase / titlecase -->
{{ name | uppercase }}  {{ name | lowercase }}  {{ name | titlecase }}

<!-- slice — arrays and strings -->
{{ longText | slice:0:100 }}                     <!-- first 100 chars -->
{{ items | slice:0:5 }}                          <!-- first 5 items -->

<!-- json — debugging -->
<pre>{{ data | json }}</pre>

<!-- keyvalue — iterate over object -->
@for (pair of obj | keyvalue; track pair.key) {
  <p>{{ pair.key }}: {{ pair.value }}</p>
}

<!-- i18nPlural — pluralization -->
{{ itemCount | i18nPlural: pluralMap }}
<!-- pluralMap = { '=0': 'No items', '=1': 'One item', 'other': '# items' } -->

<!-- i18nSelect -->
{{ gender | i18nSelect: genderMap }}
<!-- genderMap = { 'male': 'He', 'female': 'She', 'other': 'They' } -->
```

---

## The async Pipe

The `async` pipe subscribes to an Observable or Promise and returns the latest value. It automatically unsubscribes when the component is destroyed.

```html
<!-- Basic usage with Observable -->
<p>{{ user$ | async }}</p>

<!-- Unwrap with @if to get a typed reference -->
@if (user$ | async; as user) {
  <h2>{{ user.name }}</h2>
  <p>{{ user.email }}</p>
}

<!-- Multiple async pipes — creates multiple subscriptions -->
<!-- Better: combine observables before template -->
<div>
  {{ firstName$ | async }} {{ lastName$ | async }}
</div>

<!-- BETTER: combine in component -->
<!-- fullName$ = combineLatest([firstName$, lastName$]).pipe(map(([f, l]) => `${f} ${l}`)) -->
```

**Performance tip:** Each `async` pipe creates its own subscription. If you use the same observable multiple times in a template, use `@if (obs$ | async; as value)` to subscribe once and reference `value` multiple times.

---

## Pure vs Impure Pipes

### Pure Pipes (default)

Angular only re-runs a pure pipe when it detects a **reference change** in the input. This is how all built-in pipes work.

```typescript
@Pipe({ name: 'sortBy', pure: true }) // default
export class SortByPipe implements PipeTransform {
  transform(arr: Item[], field: keyof Item): Item[] {
    return [...arr].sort((a, b) => a[field] < b[field] ? -1 : 1);
  }
}
```

If you push to an array instead of replacing it, a pure pipe will NOT re-run (same reference).

### Impure Pipes

`pure: false` makes Angular re-run the pipe on every change detection cycle. Use this only when necessary — it is expensive.

```typescript
@Pipe({ name: 'filterItems', pure: false }) // runs every CD cycle
export class FilterItemsPipe implements PipeTransform {
  transform(items: Item[], search: string): Item[] {
    return items.filter(item => item.name.includes(search));
  }
}
```

**Recommendation:** Avoid impure pipes. Instead, use a signal or computed property in the component to filter/sort data:

```typescript
// Prefer this over an impure pipe
filteredItems = computed(() =>
  this.items().filter(item => item.name.includes(this.searchTerm()))
);
```

---

## Custom Pipes

```typescript
import { Pipe, PipeTransform } from '@angular/core';

// Truncate text with ellipsis
@Pipe({
  standalone: true,
  name: 'truncate',
  pure: true,
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, maxLength: number = 100, ellipsis: string = '...'): string {
    if (!value || value.length <= maxLength) return value ?? '';
    return value.substring(0, maxLength - ellipsis.length) + ellipsis;
  }
}

// Usage: {{ longText | truncate:50 }} or {{ text | truncate:30:'…' }}

// File size pipe
@Pipe({ standalone: true, name: 'fileSize' })
export class FileSizePipe implements PipeTransform {
  private units = ['B', 'KB', 'MB', 'GB', 'TB'];

  transform(bytes: number, precision: number = 1): string {
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(precision)} ${this.units[i]}`;
  }
}

// Test a pipe in isolation — no TestBed needed
describe('TruncatePipe', () => {
  const pipe = new TruncatePipe();

  it('should not truncate short text', () => {
    expect(pipe.transform('hello', 100)).toBe('hello');
  });

  it('should truncate long text', () => {
    expect(pipe.transform('hello world', 8)).toBe('hello...');
  });
});
```

---

## Built-in Attribute Directives

```html
<!-- ngClass — conditional classes -->
<div [ngClass]="{ active: isActive, 'bg-danger': hasError }">...</div>
<div [ngClass]="[baseClass, conditionalClass]">...</div>

<!-- Prefer direct class binding (simpler for simple cases) -->
<div [class.active]="isActive">...</div>

<!-- ngStyle — inline styles -->
<div [ngStyle]="{ color: textColor, fontSize: fontSize + 'px' }">...</div>

<!-- Prefer direct style binding -->
<div [style.color]="textColor" [style.font-size.px]="fontSize">...</div>

<!-- ngModel — two-way data binding (needs FormsModule) -->
<input [(ngModel)]="searchTerm" (ngModelChange)="onSearch($event)">
```

---

## Custom Attribute Directives

```typescript
import { Directive, HostListener, HostBinding, inject, ElementRef, Renderer2, Input } from '@angular/core';

// Auto-resize textarea
@Directive({
  standalone: true,
  selector: 'textarea[appAutoResize]',
})
export class AutoResizeDirective {
  private el = inject<ElementRef<HTMLTextAreaElement>>(ElementRef);
  private renderer = inject(Renderer2);

  @HostListener('input')
  onInput(): void {
    const textarea = this.el.nativeElement;
    this.renderer.setStyle(textarea, 'height', 'auto');
    this.renderer.setStyle(textarea, 'height', `${textarea.scrollHeight}px`);
  }
}

// Tooltip directive
@Directive({
  standalone: true,
  selector: '[appTooltip]',
})
export class TooltipDirective implements OnDestroy {
  @Input('appTooltip') text = '';

  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private tooltip: HTMLElement | null = null;

  @HostListener('mouseenter')
  show(): void {
    this.tooltip = this.renderer.createElement('span');
    this.renderer.appendChild(this.tooltip, this.renderer.createText(this.text));
    this.renderer.setStyle(this.tooltip, 'position', 'absolute');
    this.renderer.setStyle(this.tooltip, 'background', '#333');
    this.renderer.setStyle(this.tooltip, 'color', '#fff');
    this.renderer.setStyle(this.tooltip, 'padding', '4px 8px');
    this.renderer.setStyle(this.tooltip, 'border-radius', '4px');
    this.renderer.setStyle(this.tooltip, 'z-index', '1000');
    this.renderer.appendChild(document.body, this.tooltip);
  }

  @HostListener('mouseleave')
  hide(): void {
    if (this.tooltip) {
      this.renderer.removeChild(document.body, this.tooltip);
      this.tooltip = null;
    }
  }

  ngOnDestroy(): void {
    this.hide();
  }
}
```

---

## Structural Directives Deep Dive

Structural directives manipulate the DOM structure by adding, removing, or repeating DOM elements.

### The `*` Desugaring

```html
<!-- Shorthand -->
<div *appRepeat="3">Item</div>

<!-- Desugared to -->
<ng-template appRepeat [appRepeatOf]="3">
  <div>Item</div>
</ng-template>
```

### Custom Structural Directive

```typescript
import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';

// Type context for better template type-checking
export interface RepeatContext {
  $implicit: number;
  index: number;
  count: number;
  first: boolean;
  last: boolean;
}

@Directive({
  standalone: true,
  selector: '[appRepeat]',
})
export class RepeatDirective {
  private template = inject<TemplateRef<RepeatContext>>(TemplateRef);
  private viewContainer = inject(ViewContainerRef);
  private _count = 0;

  @Input({ required: true })
  set appRepeat(count: number) {
    if (count !== this._count) {
      this._count = count;
      this.render();
    }
  }

  private render(): void {
    this.viewContainer.clear();
    for (let i = 0; i < this._count; i++) {
      this.viewContainer.createEmbeddedView(this.template, {
        $implicit: i,
        index: i,
        count: this._count,
        first: i === 0,
        last: i === this._count - 1,
      });
    }
  }

  // Type guard for template context — enables type-safe template variables
  static ngTemplateContextGuard(
    _dir: RepeatDirective,
    ctx: unknown
  ): ctx is RepeatContext {
    return true;
  }
}

// Usage
<li *appRepeat="5; let i; let isFirst = first; let isLast = last">
  {{ isFirst ? 'First: ' : '' }}Item {{ i }}{{ isLast ? ' (last)' : '' }}
</li>
```

---

## Interview Questions with Answers

**Q: What is the difference between a pure and an impure pipe?**

> A pure pipe re-evaluates only when Angular detects a change in the pipe's input (primitive value or object reference change). It is memoized — if the reference hasn't changed, Angular reuses the previous result. An impure pipe re-evaluates on every change detection cycle, regardless of whether the input changed. Impure pipes are expensive and should be avoided. Use computed signals or component properties to derive transformed data instead.

**Q: Why should you avoid `pure: false` on pipes?**

> Impure pipes run on every change detection cycle. In a medium-complexity Angular app, change detection may run dozens of times per second. An impure pipe that performs filtering or sorting on a large array would recalculate on every cycle — even if the data hasn't changed — causing significant performance issues. The solution is to compute derived data in the component class using signals' `computed()`, where the calculation only runs when dependencies actually change.

**Q: When does the `async` pipe unsubscribe?**

> The `async` pipe automatically unsubscribes when the component containing it is destroyed (in `ngOnDestroy`). It also unsubscribes and resubscribes when the observable reference changes. This is one of the primary reasons to prefer the `async` pipe over manual subscriptions — it handles the subscription lifecycle automatically and eliminates memory leak risk.

---

## Revision Checklist

- [ ] Know all built-in pipes and their format strings.
- [ ] Understand pure vs impure pipe behavior and performance implications.
- [ ] Can build a custom pipe with parameters.
- [ ] Know when to use the `async` pipe vs `toSignal()`.
- [ ] Can build a custom attribute directive using `Renderer2`.
- [ ] Can build a custom structural directive using `TemplateRef` and `ViewContainerRef`.

---

## Further Reading

- [Angular: Built-in pipes](https://angular.dev/guide/pipes)
- [Angular: Custom pipes](https://angular.dev/guide/pipes/transform-data)
- [Angular: Attribute directives](https://angular.dev/guide/directives/attribute-directives)
- [Angular: Structural directives](https://angular.dev/guide/directives/structural-directives)
