# Dependency Injection — Deep Dive

> **Phase:** 2 — Core Angular  
> **Related:** [angular-fundamentals.md](../01-fundamentals/angular-fundamentals.md) | [standalone-and-architecture.md](../03-advanced-angular/standalone-and-architecture.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [DI Fundamentals](#di-fundamentals)
3. [Hierarchical Injector Tree](#hierarchical-injector-tree)
4. [Provider Types](#provider-types)
5. [InjectionToken](#injectiontoken)
6. [inject() Function](#inject-function)
7. [DI in Standalone Applications](#di-in-standalone-applications)
8. [Tree-Shakable Services](#tree-shakable-services)
9. [Common Patterns](#common-patterns)
10. [Interview Questions with Answers](#interview-questions-with-answers)
11. [Exercises](#exercises)
12. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Explain the Angular hierarchical DI system without confusion.
- Use all provider types (`useClass`, `useExisting`, `useFactory`, `useValue`).
- Create typed `InjectionToken`s for non-class dependencies.
- Use `inject()` for constructor-free injection.
- Design service scope correctly for large applications.

---

## DI Fundamentals

Dependency Injection is a design pattern where a class declares its dependencies rather than creating them. Angular's DI system:

1. Reads a class's dependencies from its constructor parameters (or `inject()` calls).
2. Looks up each dependency in the injector hierarchy.
3. Creates or reuses the dependency and injects it.

```typescript
// Service — provides business logic
@Injectable({ providedIn: 'root' }) // tree-shakable, singleton at app level
export class UserService {
  private http = inject(HttpClient);

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`/api/users/${id}`);
  }
}

// Component — consumes service
@Component({ ... })
export class ProfileComponent {
  private userService = inject(UserService);
  // Angular resolves UserService from the injector and injects it
}
```

---

## Hierarchical Injector Tree

Angular maintains a tree of injectors that mirrors the component tree. Each injector can provide its own instances of services.

```
NullInjector (throws if not found)
  └── EnvironmentInjector (root)  — providedIn: 'root', bootstrapApplication providers
        └── EnvironmentInjector (lazy route)  — providers in lazy-loaded route config
              └── ElementInjector (component)  — providers[] in @Component
                    └── ElementInjector (child component)
```

### Lookup Resolution

When a component asks for `ServiceA`, Angular:
1. Checks the component's own injector.
2. Walks up the injector tree until the root.
3. Throws `NullInjectorError` if not found.

### Scoped Services

```typescript
// SCENARIO: Each component instance needs its own service instance

@Component({
  standalone: true,
  selector: 'app-wizard',
  providers: [WizardStateService], // New instance per wizard component
  template: `<app-wizard-step /><app-wizard-step />`
})
export class WizardComponent {}

// WizardStateService is shared between wizard and its children
// but different wizard instances have different service instances
@Component({ selector: 'app-wizard-step' })
export class WizardStepComponent {
  // Gets the SAME WizardStateService as its WizardComponent parent
  private state = inject(WizardStateService);
}
```

---

## Provider Types

### useClass

Replace a service with a different implementation:

```typescript
// Testing or environment-specific overrides
providers: [
  { provide: LoggingService, useClass: MockLoggingService }
]
```

### useExisting

Create an alias — both tokens resolve to the same instance:

```typescript
providers: [
  ConcreteService,
  { provide: AbstractServiceToken, useExisting: ConcreteService }
]
// Both ConcreteService and AbstractServiceToken return the SAME instance
```

### useValue

Provide a constant value:

```typescript
const FEATURE_FLAGS: FeatureFlags = { darkMode: true, betaFeatures: false };

providers: [
  { provide: FEATURE_FLAGS_TOKEN, useValue: FEATURE_FLAGS }
]
```

### useFactory

Create a dependency with custom logic:

```typescript
export function storageFactory(platformId: object): StorageService {
  return isPlatformBrowser(platformId)
    ? new BrowserStorageService()
    : new NoopStorageService();
}

providers: [
  {
    provide: StorageService,
    useFactory: storageFactory,
    deps: [PLATFORM_ID]
  }
]
```

---

## InjectionToken

`InjectionToken` provides type-safe DI for non-class values (primitives, interfaces, objects).

```typescript
import { InjectionToken, inject } from '@angular/core';

// Define the token
export interface AppConfig {
  apiUrl: string;
  timeout: number;
  retryAttempts: number;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('AppConfig', {
  // Factory for providedIn: 'root' — optional
  providedIn: 'root',
  factory: () => ({
    apiUrl: 'https://api.example.com',
    timeout: 5000,
    retryAttempts: 3,
  })
});

// Provide in bootstrapApplication
bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: APP_CONFIG,
      useValue: { apiUrl: environment.apiUrl, timeout: 5000, retryAttempts: 3 }
    }
  ]
});

// Inject in any service or component
@Injectable({ providedIn: 'root' })
export class ApiService {
  private config = inject(APP_CONFIG);

  getBaseUrl(): string {
    return this.config.apiUrl;
  }
}
```

---

## inject() Function

`inject()` replaces constructor injection and can be used outside constructors in class fields:

```typescript
@Component({ ... })
export class DashboardComponent {
  // Field injection — cleaner than constructor parameters
  private router = inject(Router);
  private userService = inject(UserService);
  private config = inject(APP_CONFIG);

  // Optional injection — null if not provided
  private logger = inject(LoggingService, { optional: true });

  // SkipSelf — skip component's own injector, go to parent
  private parentService = inject(ParentService, { skipSelf: true });

  // Self — only use component's own injector (throws if not found)
  private localService = inject(LocalService, { self: true });
}
```

### inject() in Functions (Angular 14+)

```typescript
// inject() can be used in functions called during injection context
export function useCurrentUser() {
  const userService = inject(UserService);
  return userService.currentUser;
}

// Useful for composable DI logic (similar to React hooks)
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const flags = inject(FEATURE_FLAGS_TOKEN);
  return flags[flag];
}

@Component({ ... })
class FeatureComponent {
  isDarkMode = useFeatureFlag('darkMode');
}
```

---

## DI in Standalone Applications

```typescript
// Application-level providers (root)
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    { provide: APP_CONFIG, useValue: environment },
  ]
});

// Route-level providers — scoped to the lazy-loaded module
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    providers: [
      AdminDataService,  // only available to admin components
      { provide: CacheService, useClass: AdminCacheService }
    ],
    children: [...]
  }
];
```

---

## Tree-Shakable Services

Services with `providedIn: 'root'` are tree-shakable:

```typescript
// Tree-shakable — if nothing injects AnalyticsService, it's excluded from bundle
@Injectable({ providedIn: 'root' })
export class AnalyticsService { ... }

// NOT tree-shakable — always included because it's in providers[] array
@NgModule({
  providers: [AnalyticsService]  // always bundled
})
export class AppModule {}
```

Use `providedIn: 'root'` for most services. Use `providers` arrays only when you need component-level or route-level scoping.

---

## Common Patterns

### Abstract Service with Multiple Implementations

```typescript
// Abstract token — use InjectionToken for interfaces
export interface NotificationService {
  show(message: string, type: 'success' | 'error'): void;
}

export const NOTIFICATION_SERVICE = new InjectionToken<NotificationService>('NotificationService');

// Implementations
@Injectable()
export class ToastNotificationService implements NotificationService {
  show(message: string, type: string) { /* show toast */ }
}

@Injectable()
export class SnackbarNotificationService implements NotificationService {
  show(message: string, type: string) { /* show snackbar */ }
}

// Provide
providers: [
  { provide: NOTIFICATION_SERVICE, useClass: ToastNotificationService }
]

// Consume
class MyComponent {
  private notifications = inject(NOTIFICATION_SERVICE);
}
```

### Forward Reference

Use `forwardRef` when two classes have circular dependencies (avoid if possible — it signals a design problem):

```typescript
@Injectable()
export class A {
  constructor(@Inject(forwardRef(() => B)) private b: B) {}
}
```

---

## Interview Questions with Answers

**Q: What is the difference between `providedIn: 'root'` and providing a service in a component's `providers` array?**

> `providedIn: 'root'` registers the service with the root environment injector. This creates a single instance shared across the entire application. The service is also tree-shakable — if nothing injects it, it won't be included in the bundle. Providing in a component's `providers` array creates a new injector at that component level. Each instance of that component gets its own service instance, and child components share it. This is useful for stateful services that should be scoped to a subtree (like wizard state, shopping cart context).

**Q: When would you use `useExisting` vs `useClass`?**

> Use `useExisting` to create an alias — both the original token and the alias resolve to the same already-registered instance. This is useful when you want to provide an interface token that resolves to a concrete class: `{ provide: AbstractToken, useExisting: ConcreteService }`. Use `useClass` to replace a service with a different class — Angular will create a new instance of the replacement class. This is common in testing (mock services) or feature-flagged implementations.

**Q: Explain the injector resolution order when `@SkipSelf` and `@Self` are used.**

> By default, Angular walks up the injector tree starting from the component's own injector. `@Self` (or `{ self: true }`) restricts the lookup to the component's own element injector only — it throws if the service is not provided at that exact level. `@SkipSelf` (or `{ skipSelf: true }`) skips the current injector and starts the lookup from the parent injector. This is useful when a service wants to access a parent-level version of itself (e.g., a nested form group accessing its parent form).

**Q: Why is `inject()` preferred over constructor injection in modern Angular?**

> `inject()` eliminates the need to list all dependencies in the constructor signature, which becomes verbose with many dependencies. It also enables DI in non-constructor contexts (field declarations, utility functions called during injection context) and makes code more readable — the dependency is declared next to where it's used. It also works better with class inheritance since the base class can declare its own injections without affecting the subclass constructor.

---

## Exercises

1. Create a `ThemeService` with `providedIn: 'root'` that holds a theme signal. Provide a mock version in a test using `TestBed.configureTestingModule`.
2. Implement a `StorageService` abstraction with `LocalStorageService` and `SessionStorageService` implementations. Use a factory provider to select the right one based on a config token.
3. Create a `FormStateService` provided at the component level in a multi-step form. Verify that each form instance has its own state.
4. Use `inject()` to write a `useAuthState()` function that any component can call to get the current user without constructor injection.

---

## Revision Checklist

- [ ] Know the four provider types and when to use each.
- [ ] Can explain the injector tree lookup order.
- [ ] Can create typed `InjectionToken`s.
- [ ] Know the difference between environment injector and element injector.
- [ ] Can use `inject()` with `{ optional, self, skipSelf }` flags.
- [ ] Understand why `providedIn: 'root'` is tree-shakable.

---

## Further Reading

- [Angular: Dependency Injection](https://angular.dev/guide/di)
- [Angular: Hierarchical injectors](https://angular.dev/guide/di/hierarchical-dependency-injection)
- [Angular: DI in action](https://angular.dev/guide/di/dependency-injection-in-action)
