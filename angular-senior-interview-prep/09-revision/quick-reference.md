# Quick Reference — Angular Senior Interview

> Use this for last-minute revision before an interview. Full details are in the topic files.

---

## Angular Core Commands

```bash
ng new my-app --standalone --routing --style=css
ng generate component features/user/user-list --standalone
ng generate service core/auth/auth
ng build --configuration production
ng test --no-watch --code-coverage
ng lint
ng update @angular/core @angular/cli
ng generate @angular/core:standalone --mode=convert-to-standalone
```

---

## Bootstrap (Standalone)

```typescript
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor]), withFetch()),
    provideAnimations(),
    provideClientHydration(), // SSR
  ]
});
```

---

## Signal API Quick Reference

```typescript
const count = signal(0);           // Create
count();                           // Read
count.set(5);                      // Set
count.update(c => c + 1);         // Update
count.asReadonly();               // Readonly view
computed(() => count() * 2);      // Derived
effect(() => console.log(count())); // Side effect
toSignal(obs$, { initialValue: null }); // Obs → Signal
toObservable(mySignal);           // Signal → Obs
```

---

## RxJS Operators — At a Glance

| Operator | When to use |
|----------|------------|
| `switchMap` | Latest result only (search, navigation) |
| `mergeMap` | All concurrent (parallel HTTP) |
| `concatMap` | Ordered sequence (upload queue) |
| `exhaustMap` | Ignore while busy (submit button) |
| `combineLatest` | Need latest from all sources |
| `forkJoin` | Wait for all to complete |
| `shareReplay(1)` | Share single HTTP request |
| `takeUntilDestroyed` | Auto-unsubscribe on destroy |

---

## Change Detection — Key Rules

| Strategy | Checked when |
|----------|-------------|
| Default | On every event in the app |
| OnPush | Input reference change, own event, async pipe emit, signal change, markForCheck() |
| Zoneless | Signal change, markForCheck(), async pipe |

---

## DI — Provider Summary

```typescript
// Singleton at root (tree-shakable)
@Injectable({ providedIn: 'root' })

// Scoped to route — new instance per route activation
{ path: 'admin', providers: [AdminService], ... }

// Scoped to component — new instance per component
@Component({ providers: [LocalService] })

// Alias
{ provide: AbstractToken, useExisting: ConcreteService }

// Factory
{ provide: StorageService, useFactory: (id) => ..., deps: [PLATFORM_ID] }
```

---

## Route Configuration

```typescript
{ path: 'users/:id', component: UserComponent }
{ path: 'admin', loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES) }
{ path: 'report', loadComponent: () => import('./report.component').then(m => m.ReportComponent) }
{ path: '**', component: NotFoundComponent }

// Guards
canActivate: [authGuard]
canMatch: [featureGuard]
canDeactivate: [unsavedChangesGuard]

// Resolver
resolve: { user: userResolver }
```

---

## Security Quick Rules

| ✅ Do | ❌ Don't |
|------|---------|
| Store tokens in HttpOnly cookies | Store tokens in localStorage |
| Verify JWT on server | Trust JWT content on client |
| Enforce authorization server-side | Rely on route guards for security |
| Use SameSite=Strict on auth cookies | Set SameSite=None without Secure |
| Use PKCE for OAuth2 SPA flows | Use implicit flow |
| Set Content-Security-Policy header | Skip CSP in production |
| Use `bypassSecurityTrustHtml()` only for trusted server content | Call it with user input |
| Audit npm dependencies with `npm audit` | Ignore audit warnings |

---

## Lifecycle Hook Order

```
constructor → ngOnChanges → ngOnInit → ngDoCheck
→ ngAfterContentInit → ngAfterContentChecked
→ ngAfterViewInit → ngAfterViewChecked
→ [repeated on changes: ngOnChanges, ngDoCheck, ngAfterContentChecked, ngAfterViewChecked]
→ ngOnDestroy
```

---

## Subscription Cleanup Options

```typescript
// 1. Preferred — takeUntilDestroyed
obs$.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(...)

// 2. async pipe in template (auto-unsubscribes)
// {{ obs$ | async }}

// 3. toSignal() — auto-managed
userSignal = toSignal(user$, { initialValue: null });

// 4. DestroyRef callback
inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
```

---

## Interview Red Flags to Avoid

- Saying "route guards provide security" — they provide UX.
- Using localStorage for auth tokens — XSS risk.
- Using `any` type without justification.
- Recommending `bypassSecurityTrustHtml` for user input.
- Saying signals replace RxJS — they are complementary.
- Missing `track` in `@for` — performance issue.
- Calling API keys "safe in frontend code" — they are never safe.
- Claiming frontend validation is sufficient — server must validate too.

---

## Angular Version Quick Facts

| Version | Key Feature |
|---------|------------|
| Angular 14 | Standalone (experimental), typed forms |
| Angular 15 | Standalone stable, functional interceptors |
| Angular 16 | Signals (developer preview), full hydration, ESBuild default |
| Angular 17 | `@if/@for/@switch/@defer`, signals stable, SSR improvements |
| Angular 18 | Zoneless preview, signal inputs/outputs/queries stable |
| Angular 19 | Incremental hydration preview, `linkedSignal`, resource API |
| Angular 20 | Zoneless stable, incremental hydration stable |

---

## Performance Checklist

- [ ] All components use `ChangeDetectionStrategy.OnPush`
- [ ] `@for` blocks have `track` expressions
- [ ] No function calls in template expressions
- [ ] Images use `NgOptimizedImage` with width/height
- [ ] LCP image has `priority` attribute
- [ ] Routes are lazy-loaded
- [ ] Large lists use `CdkVirtualScrollViewport`
- [ ] Bundle analyzed — no unnecessary large dependencies
- [ ] `@defer` used for below-fold components
- [ ] Core Web Vitals measured with Lighthouse
