# Routing and Navigation

> **Phase:** 2 — Core Angular  
> **Related:** [standalone-and-architecture.md](../03-advanced-angular/standalone-and-architecture.md) | [http-client-and-interceptors.md](./http-client-and-interceptors.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Route Configuration](#route-configuration)
3. [Lazy Loading](#lazy-loading)
4. [Route Guards](#route-guards)
5. [Resolvers](#resolvers)
6. [ActivatedRoute and Navigation](#activatedroute-and-navigation)
7. [Router Events](#router-events)
8. [Route Reuse and Component Caching](#route-reuse-and-component-caching)
9. [Security: Guards are NOT Authorization](#security-guards-are-not-authorization)
10. [Interview Questions with Answers](#interview-questions-with-answers)
11. [Exercises](#exercises)
12. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Configure routes with parameters, guards, resolvers, and lazy loading.
- Write functional guards and resolvers (Angular 14.2+).
- Distinguish `canActivate`, `canDeactivate`, and `canMatch`.
- Use `ActivatedRoute` to read route data reactively.
- Explain why route guards are NOT sufficient for authorization.

---

## Route Configuration

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  
  // Route parameters
  { path: 'users/:id', component: UserDetailComponent },
  
  // Multiple parameters
  { path: 'projects/:projectId/tasks/:taskId', component: TaskDetailComponent },
  
  // Optional parameters — use query params instead
  // { path: 'search', component: SearchComponent } + ?q=term
  
  // Nested routes (child routes)
  {
    path: 'admin',
    component: AdminShellComponent,
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      { path: 'users', component: AdminUsersComponent },
      { path: 'settings', component: AdminSettingsComponent },
    ]
  },
  
  // Wildcard
  { path: '**', component: NotFoundComponent }
];

// main.ts / bootstrapApplication
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes, withComponentInputBinding())]
});
```

### Router Template

```html
<!-- App component -->
<nav>
  <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
  <a routerLink="/users" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Users</a>
</nav>
<router-outlet />
```

---

## Lazy Loading

Lazy loading defers loading a route's code until the user navigates to it.

### Lazy-Loading a Standalone Component

```typescript
// Routes
{
  path: 'reports',
  loadComponent: () => import('./reports/reports.component')
    .then(m => m.ReportsComponent)
}
```

### Lazy-Loading a Group of Routes

```typescript
// Main routes
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes')
    .then(m => m.ADMIN_ROUTES)
}

// admin/admin.routes.ts
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    providers: [AdminDataService], // route-level providers — scoped to admin
    children: [
      { path: 'users', component: AdminUsersComponent },
      { path: 'analytics', loadComponent: () => import('./analytics.component').then(m => m.AnalyticsComponent) },
    ]
  }
];
```

### Preloading Strategies

```typescript
import { PreloadAllModules, withPreloading } from '@angular/router';

// Preload all lazy routes after initial load
provideRouter(routes, withPreloading(PreloadAllModules))

// Custom preloading strategy — preload routes with `data: { preload: true }`
@Injectable({ providedIn: 'root' })
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    return route.data?.['preload'] ? load() : of(null);
  }
}

provideRouter(routes, withPreloading(SelectivePreloadingStrategy))
```

---

## Route Guards

### Functional Guards (Angular 14.2+ — Recommended)

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Simple auth guard
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // Redirect with returnUrl
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

// Role-based guard
export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.currentUser();
    if (user && allowedRoles.includes(user.role)) {
      return true;
    }

    return router.createUrlTree(['/unauthorized']);
  };
}

// Usage in routes
{
  path: 'admin',
  canActivate: [authGuard, roleGuard(['admin', 'superadmin'])],
  loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
}
```

### Guard Types

| Guard | Hook | When to use |
|-------|------|------------|
| `CanActivateFn` | Before activating a route | Authentication, authorization checks |
| `CanDeactivateFn<C>` | Before leaving a route | Unsaved changes warning |
| `CanMatchFn` | Before matching a route config | Feature flags, A/B testing, permission-based routing |
| `CanActivateChildFn` | Before activating a child route | Parent-level protection for all children |
| `ResolveFn<T>` | Before activating, provides data | Pre-fetch data for a route |

### CanDeactivate — Unsaved Changes

```typescript
export const unsavedChangesGuard: CanDeactivateFn<EditFormComponent> = (component) => {
  if (component.form.dirty) {
    return confirm('You have unsaved changes. Leave anyway?');
    // Or return an Observable<boolean> for a dialog-based confirmation
  }
  return true;
};

// Route config
{ path: 'edit/:id', component: EditFormComponent, canDeactivate: [unsavedChangesGuard] }
```

### CanMatch — Feature Flags and Role-Based Routing

```typescript
export const premiumGuard: CanMatchFn = (route, segments) => {
  const subscription = inject(SubscriptionService);
  return subscription.isPremium(); // boolean or UrlTree
};

// Different components for different user tiers
{ path: 'dashboard', canMatch: [premiumGuard], loadComponent: () => import('./premium-dashboard') },
{ path: 'dashboard', loadComponent: () => import('./basic-dashboard') }, // fallback
```

---

## Resolvers

Resolvers pre-fetch data before a route activates, so the component always has its data when it initializes.

```typescript
// Functional resolver (Angular 14.2+)
export const userResolver: ResolveFn<User> = (route) => {
  const userService = inject(UserService);
  const router = inject(Router);
  const id = Number(route.paramMap.get('id'));

  return userService.getUser(id).pipe(
    catchError(() => {
      router.navigate(['/not-found']);
      return EMPTY; // prevents route activation
    })
  );
};

// Route config
{ path: 'users/:id', component: UserDetailComponent, resolve: { user: userResolver } }

// In component — access resolved data
@Component({ ... })
export class UserDetailComponent {
  private route = inject(ActivatedRoute);

  // Via snapshot (synchronous)
  user = this.route.snapshot.data['user'] as User;

  // Via observable (updates when resolver re-runs)
  user$ = this.route.data.pipe(map(data => data['user'] as User));

  // With withComponentInputBinding() — automatic input binding
  @Input() user!: User; // works with Angular 16+ and withComponentInputBinding()
}
```

---

## ActivatedRoute and Navigation

```typescript
@Component({ ... })
export class DetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Route parameters — reactive
  userId$ = this.route.paramMap.pipe(map(params => params.get('id')));

  // Query parameters
  searchTerm$ = this.route.queryParamMap.pipe(map(params => params.get('q')));

  // Fragment (#section)
  fragment$ = this.route.fragment;

  // Static snapshot (for one-time reads)
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
  }

  // Programmatic navigation
  navigate(id: number): void {
    this.router.navigate(['/users', id]); // absolute
    this.router.navigate(['../sibling'], { relativeTo: this.route }); // relative
    this.router.navigate(['/search'], {
      queryParams: { q: 'angular', page: 1 },
      queryParamsHandling: 'merge', // merge with existing query params
      fragment: 'results',
    });
  }
}
```

### Input Binding for Route Parameters (Angular 16+)

With `withComponentInputBinding()`, route parameters, query params, and resolved data are automatically bound to component `@Input()` properties:

```typescript
// Route: { path: 'users/:id', component: UserDetailComponent, resolve: { user: userResolver } }

@Component({ ... })
export class UserDetailComponent {
  @Input() id!: string;           // from route parameter :id
  @Input() q?: string;            // from query parameter ?q=
  @Input() user!: User;           // from resolver
}
```

---

## Router Events

```typescript
@Component({ ... })
export class AppComponent {
  private router = inject(Router);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe((event: NavigationEnd) => {
      // Analytics, logging, scroll-to-top
      window.scrollTo(0, 0);
      this.analytics.pageView(event.urlAfterRedirects);
    });
  }
}

// Show loading indicator during navigation
isNavigating$ = this.router.events.pipe(
  map(event =>
    event instanceof NavigationStart ? true :
    event instanceof NavigationEnd || event instanceof NavigationCancel ||
    event instanceof NavigationError ? false : null
  ),
  filter((v): v is boolean => v !== null),
  startWith(false)
);
```

---

## Security: Guards are NOT Authorization

> ⚠️ **Critical Security Principle**

Angular route guards run in the **browser**, which the user controls entirely. A determined attacker can:

- Open browser DevTools and call `router.navigate(['/admin'])` directly.
- Modify the JavaScript to bypass guard logic.
- Send API requests directly using curl or Postman, completely bypassing the Angular app.

**Route guards are for UX, not security.** They improve user experience by preventing navigation to unauthorized routes in the normal flow. They do NOT replace server-side authorization.

```typescript
// This guard provides ZERO security against a determined attacker
export const adminGuard: CanActivateFn = () => {
  return inject(AuthService).isAdmin(); // This check can be bypassed client-side
};

// The REAL authorization must happen on the server:
// GET /api/admin/users → server checks JWT, verifies admin role → 403 if unauthorized
```

**Defense:** Every API endpoint that serves sensitive data must verify the caller's identity and permissions server-side, regardless of what the frontend routing does.

---

## Interview Questions with Answers

**Q: What is the difference between `CanActivate` and `CanMatch`?**

> `CanActivate` runs after Angular has already matched the route — it decides whether the matched component should be activated. If it returns false or a redirect UrlTree, navigation is cancelled but no other route is tried. `CanMatch` runs during route matching — if it returns false, Angular continues to the next route in the configuration. This makes `CanMatch` ideal for providing alternative routes based on conditions (feature flags, user tiers) where different components should render for the same URL pattern.

**Q: How would you implement an unsaved changes guard?**

> Implement `CanDeactivateFn<T>` where T is your component type. The guard function receives the component instance as its first argument. Check `component.form.dirty` (for reactive forms) or an `isDirty` flag. If dirty, return a confirmation dialog observable (from a dialog service). The guard should return `Observable<boolean>` so the dialog can resolve asynchronously. Register the guard in the route config under `canDeactivate`.

**Q: What are the risks of using resolvers?**

> Resolvers block navigation until the data loads. If a resolver makes a slow API call, the user sees no feedback (the URL hasn't changed yet). Solutions: (1) Use `setTimeout` or a loading spinner that appears globally via router events; (2) Return a default/empty value immediately and let the component load the real data; (3) Consider loading data in the component's `ngOnInit` instead of a resolver, showing a local skeleton state. Resolvers are most appropriate when the component cannot render meaningfully without the data and navigation should fail if data loading fails.

---

## Exercises

1. Set up lazy-loaded admin routes with `loadChildren`. Provide an `AdminService` at the route level.
2. Write a functional `CanDeactivate` guard for an edit form that shows a dialog confirmation using Angular CDK Dialog.
3. Implement a custom preloading strategy that preloads routes marked with `data: { preload: true }`.
4. Use `withComponentInputBinding()` and bind a route parameter directly to a component `@Input()`.

---

## Revision Checklist

- [ ] Can configure nested routes, lazy loading, and wildcard routes.
- [ ] Know `canActivate`, `canDeactivate`, `canMatch` — what each does and when to use it.
- [ ] Can write a functional resolver with error handling using `EMPTY`.
- [ ] Can read route params, query params, and resolved data reactively via `ActivatedRoute`.
- [ ] Understand why guards are not authorization mechanisms.
- [ ] Know how preloading strategies work.

---

## Further Reading

- [Angular: Routing overview](https://angular.dev/guide/routing)
- [Angular: Route guards](https://angular.dev/guide/routing/route-guards)
- [Angular: Lazy loading](https://angular.dev/guide/routing/lazy-loading)
- [Angular: Resolvers](https://angular.dev/api/router/ResolveFn)
