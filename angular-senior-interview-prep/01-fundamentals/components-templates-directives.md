# Components, Templates, and Directives

> **Phase:** 1 — Fundamentals  
> **Related:** [angular-fundamentals.md](./angular-fundamentals.md) | [lifecycle-change-detection.md](../02-core-angular/lifecycle-change-detection.md) | [pipes-and-directives.md](../02-core-angular/pipes-and-directives.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Component Lifecycle Hooks](#component-lifecycle-hooks)
3. [Component Communication](#component-communication)
4. [Content Projection](#content-projection)
5. [View Queries](#view-queries)
6. [Attribute Directives](#attribute-directives)
7. [Structural Directives](#structural-directives)
8. [Host Binding and Host Listener](#host-binding-and-host-listener)
9. [Interview Questions with Answers](#interview-questions-with-answers)
10. [Exercises](#exercises)
11. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Know the complete component lifecycle and what to do in each hook.
- Implement parent–child and sibling communication patterns.
- Use `ng-content` and `ng-template` for flexible, reusable component design.
- Build custom attribute and structural directives.
- Use host binding and host listener to control the host element.

---

## Component Lifecycle Hooks

Hooks are called in this order:

| Hook | When called | Common use |
|------|------------|------------|
| `ngOnChanges` | Before `ngOnInit` and on every input change | React to input changes |
| `ngOnInit` | Once, after first `ngOnChanges` | Initialization, data loading |
| `ngDoCheck` | Every CD cycle | Custom change detection |
| `ngAfterContentInit` | Once, after content projection | Content initialization |
| `ngAfterContentChecked` | After every CD cycle (content) | Rarely needed |
| `ngAfterViewInit` | Once, after component view is initialized | DOM access, focus management |
| `ngAfterViewChecked` | After every CD cycle (view) | Rarely needed |
| `ngOnDestroy` | Before component is destroyed | Cleanup: subscriptions, timers, DOM listeners |

```typescript
@Component({ ... })
export class ProductComponent
  implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  @Input() productId!: string;
  @ViewChild('chart') chartRef!: ElementRef;

  private destroyRef = inject(DestroyRef);
  private subscription?: Subscription;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productId'] && !changes['productId'].firstChange) {
      // React to productId changes after initialization
      this.loadProduct(changes['productId'].currentValue);
    }
  }

  ngOnInit(): void {
    // First load
    this.loadProduct(this.productId);

    // Subscription cleanup using takeUntilDestroyed
    this.priceService.updates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(price => this.updatePrice(price));
  }

  ngAfterViewInit(): void {
    // Safe to access DOM elements here
    this.initChart(this.chartRef.nativeElement);
  }

  ngOnDestroy(): void {
    // Manual cleanup only if not using takeUntilDestroyed or DestroyRef
    this.subscription?.unsubscribe();
  }

  private loadProduct(id: string): void { ... }
  private initChart(el: HTMLElement): void { ... }
  private updatePrice(price: number): void { ... }
}
```

### `ngOnChanges` vs `ngDoCheck`

Use `ngOnChanges` to react to input reference changes. Use `ngDoCheck` only when you need to detect mutations inside input objects (not recommended — prefer immutable patterns instead).

---

## Component Communication

### Parent → Child: `@Input` / `input()`

```typescript
// Parent template
<app-user-card [user]="currentUser" [theme]="'dark'" />

// Child component (Angular 17.1+ signal input)
@Component({ standalone: true, ... })
export class UserCardComponent {
  user = input.required<User>();
  theme = input<'light' | 'dark'>('light');
  
  // Access as functions
  displayName = computed(() => `${this.user().firstName} ${this.user().lastName}`);
}
```

### Child → Parent: `@Output` / EventEmitter

```typescript
// Child
@Component({ ... })
export class SearchComponent {
  @Output() searched = new EventEmitter<string>();
  term = '';

  onSearch() {
    if (this.term.trim()) {
      this.searched.emit(this.term.trim());
    }
  }
}

// Parent template
<app-search (searched)="handleSearch($event)" />
```

### Two-Way Binding with `model()`

```typescript
// Angular 17.1+ — model() creates a two-way bindable signal
@Component({
  standalone: true,
  selector: 'app-counter',
  template: `
    <button (click)="decrement()">-</button>
    <span>{{ count() }}</span>
    <button (click)="increment()">+</button>
  `
})
export class CounterComponent {
  count = model<number>(0);

  increment() { this.count.update(v => v + 1); }
  decrement() { this.count.update(v => v - 1); }
}

// Parent usage — banana in a box syntax
<app-counter [(count)]="parentCount" />
```

### Sibling Communication: Shared Service

```typescript
@Injectable({ providedIn: 'root' })
export class SelectionService {
  private selectedId = signal<number | null>(null);

  select(id: number) { this.selectedId.set(id); }
  clear() { this.selectedId.set(null); }
  
  // Expose as readonly
  readonly selected = this.selectedId.asReadonly();
}

// Component A
class ListComponent {
  private selection = inject(SelectionService);
  select(id: number) { this.selection.select(id); }
}

// Component B
class DetailComponent {
  private selection = inject(SelectionService);
  selectedId = this.selection.selected; // reactive signal
}
```

---

## Content Projection

Content projection (`ng-content`) allows parent templates to inject HTML into a component's template.

### Single-Slot Projection

```typescript
@Component({
  standalone: true,
  selector: 'app-card',
  template: `
    <div class="card">
      <div class="card-body">
        <ng-content />  <!-- projected content goes here -->
      </div>
    </div>
  `
})
export class CardComponent {}

// Usage
<app-card>
  <h3>Card title</h3>
  <p>Card description</p>
</app-card>
```

### Multi-Slot Projection with `select`

```typescript
@Component({
  standalone: true,
  selector: 'app-dialog',
  template: `
    <div class="dialog">
      <header class="dialog-header">
        <ng-content select="[dialog-title]" />
      </header>
      <div class="dialog-body">
        <ng-content select="[dialog-body]" />
      </div>
      <footer class="dialog-footer">
        <ng-content select="[dialog-actions]" />
        <ng-content /> <!-- catch-all slot -->
      </footer>
    </div>
  `
})
export class DialogComponent {}

// Usage
<app-dialog>
  <h2 dialog-title>Confirm Delete</h2>
  <p dialog-body>Are you sure you want to delete this item?</p>
  <div dialog-actions>
    <button (click)="cancel()">Cancel</button>
    <button (click)="confirm()">Delete</button>
  </div>
</app-dialog>
```

### `ng-template` and `ngTemplateOutlet`

```typescript
@Component({
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #defaultHeader>
      <h2>Default Title</h2>
    </ng-template>

    <header>
      <ng-container
        [ngTemplateOutlet]="customHeader || defaultHeader"
        [ngTemplateOutletContext]="{ $implicit: title, subtitle: subtitle }">
      </ng-container>
    </header>
  `
})
export class PageComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @ContentChild('customHeader') customHeader?: TemplateRef<any>;
}

// Usage with custom template
<app-page title="Dashboard" subtitle="Overview">
  <ng-template #customHeader let-title let-subtitle="subtitle">
    <h1>{{ title }}</h1>
    <p>{{ subtitle }}</p>
  </ng-template>
</app-page>
```

---

## View Queries

### `@ViewChild` and `@ViewChildren`

Query elements within the component's own template.

```typescript
@Component({
  template: `
    <canvas #myCanvas></canvas>
    <app-item *ngFor="let item of items" />
  `
})
class ChartComponent implements AfterViewInit {
  @ViewChild('myCanvas') canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChildren(ItemComponent) items!: QueryList<ItemComponent>;

  ngAfterViewInit(): void {
    // Access after view is initialized
    const ctx = this.canvas.nativeElement.getContext('2d');
    this.items.changes.subscribe(() => this.redraw());
  }
}
```

### `@ContentChild` and `@ContentChildren`

Query projected content (what the parent passes into `ng-content`).

```typescript
@Component({
  template: `<ng-content />`
})
class TabGroupComponent implements AfterContentInit {
  @ContentChildren(TabComponent) tabs!: QueryList<TabComponent>;

  ngAfterContentInit(): void {
    // Tabs are available here
    this.tabs.first?.activate();
    this.tabs.changes.subscribe(() => this.updateTabBar());
  }
}
```

### Signal-based Queries (Angular 17.1+)

```typescript
@Component({ ... })
class ModernComponent {
  // Signal-based ViewChild — returns a signal
  canvas = viewChild<ElementRef>('myCanvas');
  
  // Required — throws if not found
  requiredRef = viewChild.required<ElementRef>('required');
  
  // viewChildren — returns a signal of QueryList
  items = viewChildren(ItemComponent);
  
  // contentChild / contentChildren for projected content
  tab = contentChild(TabComponent);
  tabs = contentChildren(TabComponent);

  ngAfterViewInit(): void {
    // Access via function call
    const el = this.canvas()?.nativeElement;
  }
}
```

---

## Attribute Directives

Attribute directives change the appearance or behavior of an element without altering the DOM structure.

```typescript
@Directive({
  standalone: true,
  selector: '[appHighlight]',
})
export class HighlightDirective {
  @Input('appHighlight') color: string = 'yellow';

  private el = inject(ElementRef);
  private renderer = inject(Renderer2);

  @HostListener('mouseenter') onMouseEnter() {
    this.renderer.setStyle(this.el.nativeElement, 'backgroundColor', this.color);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.renderer.removeStyle(this.el.nativeElement, 'backgroundColor');
  }
}

// Usage
<p [appHighlight]="'lightblue'">Hover over me</p>
```

**Why use `Renderer2` instead of direct DOM manipulation?**
`Renderer2` abstracts the rendering layer, allowing Angular to run in non-browser environments (SSR, Web Workers). Direct `nativeElement` manipulation bypasses Angular's security and SSR support.

---

## Structural Directives

Structural directives change the DOM structure by adding, removing, or repeating elements. They use an asterisk (`*`) shorthand.

### `*ngIf` asterisk expansion

```html
<!-- This shorthand -->
<div *ngIf="show">Hello</div>

<!-- Expands to this -->
<ng-template [ngIf]="show">
  <div>Hello</div>
</ng-template>
```

### Custom Structural Directive

```typescript
@Directive({
  standalone: true,
  selector: '[appRepeat]',
})
export class RepeatDirective {
  private templateRef = inject<TemplateRef<{ $implicit: number }>>(TemplateRef);
  private viewContainer = inject(ViewContainerRef);

  @Input() set appRepeat(count: number) {
    this.viewContainer.clear();
    for (let i = 0; i < count; i++) {
      this.viewContainer.createEmbeddedView(this.templateRef, { $implicit: i });
    }
  }
}

// Usage
<div *appRepeat="5; let i">Item {{ i }}</div>
```

---

## Host Binding and Host Listener

```typescript
@Directive({
  standalone: true,
  selector: '[appButton]',
  host: {
    'class': 'btn',                        // static class
    '[class.btn-primary]': 'primary',     // dynamic class binding
    '[attr.aria-disabled]': 'disabled',   // attribute binding
    '(click)': 'handleClick($event)',      // event listener
    '(keydown.enter)': 'handleClick($event)',
  }
})
export class ButtonDirective {
  @Input() primary = false;
  @Input() disabled = false;

  handleClick(event: Event): void {
    if (this.disabled) event.preventDefault();
  }
}

// Alternative decorator approach
@Directive({ selector: '[appButton]' })
export class ButtonDirective {
  @HostBinding('class.btn-primary') @Input() primary = false;
  @HostBinding('attr.aria-disabled') @Input() disabled = false;

  @HostListener('click', ['$event'])
  handleClick(event: Event): void { ... }
}
```

**Prefer the `host` property** in the decorator over `@HostBinding`/`@HostListener` decorators — it is more declarative, analyzable at compile time, and less verbose.

---

## Interview Questions with Answers

**Q: What is the difference between `ngAfterContentInit` and `ngAfterViewInit`?**

> `ngAfterContentInit` fires once after Angular has projected external content into the component via `ng-content` slots. This is when `@ContentChild` and `@ContentChildren` queries are initialized. `ngAfterViewInit` fires once after Angular has initialized the component's own view and all its child components. This is when `@ViewChild` and `@ViewChildren` queries are initialized. You should never modify data bindings in either hook because the expression has already been evaluated for that CD cycle — doing so will cause an ExpressionChangedAfterItHasBeenCheckedError in development mode.

**Q: When is `ngOnChanges` called vs `ngDoCheck`?**

> `ngOnChanges` fires only when Angular detects a change in a bound input **reference**. It is efficient but cannot detect mutations inside objects. `ngDoCheck` fires on every change detection cycle, giving you the opportunity to implement custom comparison logic. However, `ngDoCheck` is expensive because it runs very frequently, and its use is almost always a sign of an architectural problem — prefer immutable data structures and `ngOnChanges` instead.

**Q: What is the difference between `@ContentChild` and `@ViewChild`?**

> `@ViewChild` queries elements within the component's own template (its view). `@ContentChild` queries elements that are projected into the component via `ng-content` from the parent's template. The availability timing differs: `@ViewChild` results are available in `ngAfterViewInit`; `@ContentChild` results are available in `ngAfterContentInit`.

---

## Exercises

1. Build a `<app-accordion>` component that uses `@ContentChildren(AccordionItemComponent)` to manage expand/collapse state of projected items.
2. Create an `[appPermission]="'admin'"` structural directive that removes an element from the DOM if the current user doesn't have the specified permission.
3. Implement a two-way bindable `<app-rating>` component using `model()` (Angular 17.1+).
4. Create an `[appTooltip]="'hint text'"` attribute directive that shows a tooltip on hover using `Renderer2` (no direct DOM manipulation).

---

## Revision Checklist

- [ ] Know all lifecycle hooks and their order.
- [ ] Understand when `@ViewChild` vs `@ContentChild` is appropriate.
- [ ] Can implement multi-slot content projection with `select`.
- [ ] Can build a custom structural directive using `TemplateRef` and `ViewContainerRef`.
- [ ] Know the difference between `@HostBinding`/`@HostListener` and the `host` property.
- [ ] Can use signal-based queries (`viewChild`, `contentChild`) from Angular 17.1+.

---

## Further Reading

- [Angular: Component lifecycle](https://angular.dev/guide/components/lifecycle)
- [Angular: Content projection](https://angular.dev/guide/components/content-projection)
- [Angular: Queries](https://angular.dev/guide/components/queries)
- [Angular: Attribute directives](https://angular.dev/guide/directives/attribute-directives)
- [Angular: Structural directives](https://angular.dev/guide/directives/structural-directives)
