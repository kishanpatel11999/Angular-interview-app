# State Management in Angular

> **Phase:** 3 — Advanced Angular  
> **Related:** [signals-and-rxjs.md](../02-core-angular/signals-and-rxjs.md) | [standalone-and-architecture.md](./standalone-and-architecture.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [State Management Decision Criteria](#state-management-decision-criteria)
3. [Component-Level State with Signals](#component-level-state-with-signals)
4. [Service-Based State with Signals](#service-based-state-with-signals)
5. [Service-Based State with RxJS](#service-based-state-with-rxjs)
6. [NgRx Store](#ngrx-store)
7. [NgRx Component Store](#ngrx-component-store)
8. [NgRx Signals Store](#ngrx-signals-store)
9. [Interview Questions with Answers](#interview-questions-with-answers)
10. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Choose the appropriate state management approach for a given scenario.
- Implement service-based state using signals and RxJS.
- Understand NgRx's core concepts and when to adopt it.
- Explain trade-offs between available state management options.

---

## State Management Decision Criteria

| Scenario | Recommended Approach |
|----------|---------------------|
| Toggle, loading flag, form visibility | Component signal or property |
| Component with derived state | `signal()` + `computed()` |
| Shared state between a few components | Service with `signal()` |
| Feature-level state with async operations | Service with `signal()` + RxJS, or NgRx Component Store |
| Complex global state, time-travel debugging, large team | NgRx Store |
| Entity collections with normalization | NgRx Entity + NgRx Store |
| Reactive state in a standalone component tree | NgRx Signals Store |

**Key questions to ask:**
1. How many components share this state?
2. Does state need to persist across route navigations?
3. Is there complex async orchestration (optimistic updates, undo)?
4. Does the team need Redux DevTools for debugging?
5. What is the team's existing familiarity?

---

## Component-Level State with Signals

```typescript
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input [value]="searchTerm()" (input)="updateSearch($event)">
    <ul>
      @for (item of filteredItems(); track item.id) {
        <li>{{ item.name }}</li>
      }
    </ul>
    <p>{{ filteredItems().length }} of {{ items().length }} items</p>
  `
})
export class ItemListComponent {
  items = signal<Item[]>([]);
  searchTerm = signal('');
  isLoading = signal(false);
  error = signal<string | null>(null);

  filteredItems = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.items().filter(item =>
      item.name.toLowerCase().includes(term)
    );
  });

  updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }
}
```

---

## Service-Based State with Signals

```typescript
// Shared state service — available across multiple components
@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);

  // Private writable state
  private _items = signal<CartItem[]>([]);
  private _isLoading = signal(false);

  // Public readonly state
  readonly items = this._items.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly totalPrice = computed(() =>
    this._items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  readonly itemCount = computed(() =>
    this._items().reduce((count, item) => count + item.quantity, 0)
  );

  addItem(product: Product, quantity: number = 1): void {
    this._items.update(items => {
      const existing = items.find(i => i.productId === product.id);
      if (existing) {
        return items.map(i =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...items, { productId: product.id, name: product.name, price: product.price, quantity }];
    });
  }

  removeItem(productId: number): void {
    this._items.update(items => items.filter(i => i.productId !== productId));
  }

  async checkout(): Promise<void> {
    this._isLoading.set(true);
    try {
      await firstValueFrom(this.http.post('/api/orders', { items: this._items() }));
      this._items.set([]);
    } finally {
      this._isLoading.set(false);
    }
  }
}
```

---

## Service-Based State with RxJS

```typescript
@Injectable({ providedIn: 'root' })
export class UserStateService {
  private http = inject(HttpClient);

  private userSubject = new BehaviorSubject<User | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  // Public readonly observables
  readonly user$ = this.userSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly isAuthenticated$ = this.user$.pipe(map(u => u !== null));

  // Derived state using combineLatest
  readonly displayName$ = this.user$.pipe(
    map(user => user ? `${user.firstName} ${user.lastName}` : 'Guest')
  );

  // Convert to signals for template use
  readonly user = toSignal(this.user$, { initialValue: null });

  loadUser(id: number): Observable<void> {
    this.loadingSubject.next(true);
    return this.http.get<User>(`/api/users/${id}`).pipe(
      tap(user => this.userSubject.next(user)),
      map(() => void 0),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  get currentUser(): User | null {
    return this.userSubject.value; // sync access
  }
}
```

---

## NgRx Store

NgRx implements the Redux pattern for Angular. Use it for complex global state with many interactions across many components.

### Core Concepts

```typescript
// 1. Actions — describe events that happen in the app
export const loadProducts = createAction('[Products] Load');
export const loadProductsSuccess = createAction(
  '[Products] Load Success',
  props<{ products: Product[] }>()
);
export const loadProductsFailure = createAction(
  '[Products] Load Failure',
  props<{ error: string }>()
);

// 2. Reducer — pure function that transforms state
export interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  products: [],
  loading: false,
  error: null,
};

export const productsReducer = createReducer(
  initialState,
  on(loadProducts, state => ({ ...state, loading: true, error: null })),
  on(loadProductsSuccess, (state, { products }) => ({
    ...state,
    loading: false,
    products,
  })),
  on(loadProductsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }))
);

// 3. Effects — handle side effects (HTTP calls, routing)
@Injectable()
export class ProductsEffects {
  private actions$ = inject(Actions);
  private productService = inject(ProductService);

  loadProducts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadProducts),
      switchMap(() =>
        this.productService.getAll().pipe(
          map(products => loadProductsSuccess({ products })),
          catchError(error => of(loadProductsFailure({ error: error.message })))
        )
      )
    )
  );
}

// 4. Selectors — derive data from store state
export const selectProductsState = (state: AppState) => state.products;
export const selectAllProducts = createSelector(selectProductsState, s => s.products);
export const selectLoading = createSelector(selectProductsState, s => s.loading);
export const selectProductById = (id: number) => createSelector(
  selectAllProducts,
  products => products.find(p => p.id === id)
);

// 5. In Component
@Component({ ... })
export class ProductListComponent {
  private store = inject(Store);

  products$ = this.store.select(selectAllProducts);
  loading$ = this.store.select(selectLoading);

  ngOnInit(): void {
    this.store.dispatch(loadProducts());
  }
}
```

### NgRx Setup (Standalone)

```typescript
provideStore({ products: productsReducer }),
provideEffects([ProductsEffects]),
provideStoreDevtools({ maxAge: 25, logOnly: environment.production }),
```

---

## NgRx Component Store

NgRx Component Store is a lighter-weight alternative for local/feature state. It doesn't require the global store setup.

```typescript
interface ProductsLocalState {
  products: Product[];
  selectedId: number | null;
  filter: string;
}

@Injectable()
export class ProductsStore extends ComponentStore<ProductsLocalState> {
  private productService = inject(ProductService);

  constructor() {
    super({ products: [], selectedId: null, filter: '' });
  }

  // Selectors
  readonly products$ = this.select(s => s.products);
  readonly filter$ = this.select(s => s.filter);
  readonly filteredProducts$ = this.select(
    this.products$,
    this.filter$,
    (products, filter) => products.filter(p => p.name.includes(filter))
  );

  // Updaters — pure synchronous state updates
  readonly setFilter = this.updater((state, filter: string) => ({
    ...state, filter
  }));

  readonly selectProduct = this.updater((state, id: number) => ({
    ...state, selectedId: id
  }));

  // Effects — async operations
  readonly loadProducts = this.effect((trigger$: Observable<void>) =>
    trigger$.pipe(
      switchMap(() => this.productService.getAll().pipe(
        tapResponse(
          products => this.patchState({ products }),
          error => console.error(error)
        )
      ))
    )
  );
}

// Usage — provide at component level
@Component({
  providers: [ProductsStore],
})
export class ProductsComponent {
  store = inject(ProductsStore);
  products$ = this.store.filteredProducts$;

  ngOnInit(): void { this.store.loadProducts(); }
}
```

---

## NgRx Signals Store

NgRx 17+ introduces a Signals-based store that integrates natively with Angular's reactivity model.

```typescript
import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals';
import { withEntities, setAllEntities } from '@ngrx/signals/entities';

export const ProductsStore = signalStore(
  { providedIn: 'root' },
  withEntities<Product>(),
  withState({ filter: '', isLoading: false }),
  withComputed(({ entities, filter }) => ({
    filteredProducts: computed(() =>
      entities().filter(p => p.name.includes(filter()))
    )
  })),
  withMethods((store, productService = inject(ProductService)) => ({
    async loadProducts() {
      patchState(store, { isLoading: true });
      const products = await firstValueFrom(productService.getAll());
      patchState(store, setAllEntities(products), { isLoading: false });
    },
    setFilter(filter: string) {
      patchState(store, { filter });
    }
  }))
);

// Usage
@Component({ ... })
export class ProductsComponent {
  store = inject(ProductsStore);
  // Access signals directly
  // store.filteredProducts() — computed signal
  // store.isLoading()       — state signal
}
```

---

## Interview Questions with Answers

**Q: When would you choose NgRx over signals-based state?**

> Choose NgRx when: (1) Multiple developers need to understand the same complex state flow — NgRx's explicit actions, reducers, and effects create a documented audit trail. (2) Redux DevTools time-travel debugging is valuable for your team. (3) The application has complex side effect orchestration (optimistic updates with rollback, entity caching, cross-feature state synchronization). (4) The team has NgRx expertise. Signals-based services are better for: simpler state, smaller teams, faster iteration, and when the overhead of actions/reducers outweighs the benefits.

**Q: What is the difference between NgRx Store and NgRx Component Store?**

> NgRx Store is a **global** store — one centralized state tree for the entire application, accessed via selectors, mutated via dispatched actions. It requires setup in the root module/bootstrap config. It's appropriate for state that must be shared across many feature areas. NgRx Component Store is a **local** store — each component or feature gets its own store instance, provided at the component level. It has a simpler API (updaters and effects instead of actions/reducers) and is appropriate for self-contained feature state without the global overhead.

---

## Revision Checklist

- [ ] Can implement service-based state with signals (private writable, public readonly).
- [ ] Know when to use NgRx vs signals vs component store.
- [ ] Can set up NgRx with actions, reducer, effects, and selectors.
- [ ] Know the NgRx Component Store API.
- [ ] Understand NgRx Signals Store concept.

---

## Further Reading

- [NgRx documentation](https://ngrx.io/docs)
- [Angular: Signals overview](https://angular.dev/guide/signals)
- [NgRx Signals Store](https://ngrx.io/guide/signals)
