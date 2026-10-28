# Standalone Architecture and Application Design

> **Phase:** 3 — Advanced Angular  
> **Related:** [dependency-injection.md](../02-core-angular/dependency-injection.md) | [angular-fundamentals.md](../01-fundamentals/angular-fundamentals.md) | [state-management.md](./state-management.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Standalone Component Architecture](#standalone-component-architecture)
3. [Application Configuration](#application-configuration)
4. [Feature Module Design with Standalone](#feature-module-design-with-standalone)
5. [DI Scope in Standalone Applications](#di-scope-in-standalone-applications)
6. [Migrating NgModule to Standalone](#migrating-ngmodule-to-standalone)
7. [Large Application Architecture](#large-application-architecture)
8. [Interview Questions with Answers](#interview-questions-with-answers)
9. [Exercises](#exercises)
10. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Design a large Angular application using standalone components and explicit feature boundaries.
- Manage DI scope correctly with route-level providers.
- Apply module boundaries to maintain a scalable architecture.
- Plan an incremental migration from NgModule to standalone.

---

## Standalone Component Architecture

Standalone components own their template dependencies explicitly:

```typescript
@Component({
  standalone: true,
  selector: 'app-user-profile',
  imports: [
    // Angular built-ins
    NgIf, NgFor, AsyncPipe, DatePipe,
    // CDK
    CdkVirtualScrollViewport, CdkFixedSizeVirtualScroll,
    // Angular Material
    MatCardModule, MatButtonModule, MatIconModule,
    // App components
    AvatarComponent, ActivityFeedComponent,
    // App directives/pipes
    TruncatePipe, PermissionDirective,
    // Router
    RouterLink, RouterOutlet,
    // Reactive forms
    ReactiveFormsModule,
  ],
  template: `...`,
})
export class UserProfileComponent {}
```

**Key rules:**
- Standalone components, directives, and pipes can be imported directly.
- Non-standalone things (from external libraries that haven't updated) still need to be wrapped in an `NgModule` or imported via a compatibility module.
- `CommonModule` is rarely needed in standalone — import specific items instead (`NgIf`, `NgFor`, `AsyncPipe`).

---

## Application Configuration

```typescript
// app.config.ts — centralize all root-level configuration
import { ApplicationConfig } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding(), withRouterConfig({
      paramsInheritanceStrategy: 'always',
      onSameUrlNavigation: 'reload',
    })),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor]),
      withFetch(),
    ),
    provideAnimations(),
    provideClientHydration(),        // for SSR — Angular 16+
    provideDateFipe(),               // if using date pipes globally
    { provide: APP_CONFIG, useValue: environment },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};

// main.ts
bootstrapApplication(AppComponent, appConfig);
```

### Environment Configuration

```typescript
// environments/environment.ts (development)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  featureFlags: { betaFeatures: true, darkMode: true },
};

// environments/environment.prod.ts (production)
export const environment = {
  production: true,
  apiUrl: 'https://api.myapp.com',
  featureFlags: { betaFeatures: false, darkMode: true },
};

// angular.json — configure fileReplacements for build
// "fileReplacements": [{
//   "replace": "src/environments/environment.ts",
//   "with": "src/environments/environment.prod.ts"
// }]
```

---

## Feature Module Design with Standalone

The concept of feature boundaries still exists in standalone apps, implemented through route configuration:

```
src/
  app/
    app.component.ts         ← Root component
    app.config.ts            ← Root providers
    app.routes.ts            ← Root routes (lazy-load features)
    
    features/
      auth/
        auth.routes.ts       ← Feature routes + providers
        login.component.ts
        register.component.ts
        auth.service.ts      ← Feature-scoped if provided in routes
      
      dashboard/
        dashboard.routes.ts
        dashboard.component.ts
        widgets/
          revenue-chart.component.ts
          user-stats.component.ts
      
      admin/
        admin.routes.ts      ← Route-level providers for admin
        admin.service.ts
        users/
          admin-users.component.ts
        settings/
          admin-settings.component.ts
    
    shared/
      components/            ← Truly reusable UI components
        button/
        card/
        modal/
      pipes/
        truncate.pipe.ts
        file-size.pipe.ts
      directives/
        permission.directive.ts
        tooltip.directive.ts
      services/
        logger.service.ts    ← providedIn: 'root'
        notification.service.ts
      models/                ← Shared TypeScript interfaces
        user.model.ts
        api-response.model.ts
```

### Root Routes

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  { path: '**', loadComponent: () => import('./shared/not-found.component').then(m => m.NotFoundComponent) },
];
```

### Feature Routes with Scoped Providers

```typescript
// features/admin/admin.routes.ts
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    providers: [
      AdminDataService,         // Scoped to admin feature
      { provide: CacheConfig, useValue: { ttl: 300 } },
    ],
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      { path: 'users', loadComponent: () => import('./users/admin-users.component').then(m => m.AdminUsersComponent) },
      { path: 'settings', loadComponent: () => import('./settings/admin-settings.component').then(m => m.AdminSettingsComponent) },
    ]
  }
];
```

---

## DI Scope in Standalone Applications

```
Root EnvironmentInjector
  (providedIn: 'root' services, bootstrapApplication providers)
  
  ↓ lazy-loaded route
  
  Route EnvironmentInjector
  (providers in route config — shared within the lazy route subtree)
  
  ↓ component instantiation
  
  Element Injector (Component)
  (providers in @Component.providers — per component instance)
```

### Multi-Tenant Example

```typescript
// Provide tenant-specific services at route level
export const TENANT_ROUTES: Routes = [
  {
    path: ':tenantId',
    component: TenantShellComponent,
    providers: [
      TenantContextService,    // New instance per tenant route
      {
        provide: ApiBaseUrl,
        useFactory: (route: ActivatedRoute) =>
          `https://${route.snapshot.params['tenantId']}.api.example.com`,
        deps: [ActivatedRoute],
      }
    ],
    loadChildren: () => ...
  }
];
```

---

## Migrating NgModule to Standalone

Angular provides automated schematics for migration:

```bash
# Migrate all components, directives, and pipes to standalone
ng generate @angular/core:standalone --mode=convert-to-standalone

# Remove unnecessary NgModules
ng generate @angular/core:standalone --mode=prune-ng-modules

# Migrate the bootstrap (app.module.ts → bootstrapApplication)
ng generate @angular/core:standalone --mode=standalone-bootstrap
```

### Manual Migration Steps

1. Add `standalone: true` to a component.
2. Move all `declarations` that the component uses from the NgModule's `imports` into the component's `imports`.
3. Remove the component from the NgModule's `declarations`.
4. If the NgModule becomes empty, delete it.
5. Update any tests that configure the NgModule.

### Interoperability

```typescript
// Use a standalone component inside an NgModule
@NgModule({
  imports: [
    StandaloneUserCardComponent, // standalone component used in NgModule
  ],
  declarations: [LegacyPageComponent],
})
export class LegacyModule {}

// Use an NgModule-declared component inside a standalone component
@Component({
  standalone: true,
  imports: [
    LegacyModule, // import the NgModule to access its declarations
  ],
  template: `<app-legacy-component />`
})
export class ModernWrapperComponent {}
```

---

## Large Application Architecture

### Architecture Decision Records

Document why architectural choices were made:

- Why signals over NgRx for local state?
- Why feature-level DI scope instead of root?
- Why Module Federation over iframe-based micro-frontends?

### Dependency Rules

In a large application, enforce clear dependency rules:

```
Feature A     Feature B     Feature C
    ↓             ↓             ↓
         Shared (UI, Pipes, Directives)
              ↓
         Core (Auth, HTTP, Logging)
              ↓
         Root (bootstrap, app config)
```

- Features depend on Shared and Core — never on each other directly.
- Shared doesn't depend on Feature or Core.
- Core doesn't depend on Feature or Shared.
- Use ESLint with `@typescript-eslint/no-restricted-imports` or nx boundary rules to enforce this.

### Micro-Frontends (When applicable)

For very large teams (10+ frontend developers), consider Module Federation:

```typescript
// webpack.config.js in host application
new ModuleFederationPlugin({
  remotes: {
    payments: 'payments@http://localhost:4201/remoteEntry.js',
    analytics: 'analytics@http://localhost:4202/remoteEntry.js',
  }
})

// Route in host
{ path: 'payments', loadChildren: () => loadRemoteModule({ type: 'module', remoteEntry: '...', exposedModule: './PaymentsModule' }) }
```

---

## Interview Questions with Answers

**Q: How do you enforce feature boundaries in a standalone Angular application?**

> In standalone applications, feature boundaries are enforced through route configuration. Each feature has its own `routes.ts` file that groups its routes and any feature-scoped providers. Services that should only be available within a feature are listed in the `providers` array of the feature's route configuration — they get their own `EnvironmentInjector` scope and are garbage-collected when the route is navigated away from. Additionally, use ESLint or nx workspace boundary rules to enforce that features don't import from each other directly.

**Q: What is the difference between a service provided at root vs at route level?**

> A root-provided service (`providedIn: 'root'`) is a singleton shared across the entire application. It is created when first injected and lives for the application's lifetime. A route-level provider creates a service instance scoped to that route's `EnvironmentInjector`. It is created when the route is activated and destroyed when the route is deactivated. This is important for multi-step workflows (wizard state), per-route data isolation, and feature-flagged behavior.

**Q: When would you use Micro-Frontends in an Angular application?**

> Micro-frontends are appropriate when: multiple teams need to deploy independently to the same URL, when different parts of the application have very different technology requirements, or when the application is extremely large and the monolithic build is becoming a bottleneck. For most applications (even large ones), a well-structured monorepo with feature modules is preferable — micro-frontends add significant operational complexity (runtime compatibility, shared state challenges, network overhead for each remote). Evaluate the actual pain points before adopting.

---

## Exercises

1. Create a feature-based folder structure for a multi-feature application and set up lazy-loaded routes for each feature.
2. Provide a feature-scoped service at the route level and verify it is not accessible from outside the feature.
3. Run the Angular standalone migration schematic on an NgModule-based project and review what was changed.
4. Design and document the dependency diagram for a hypothetical e-commerce Angular application.

---

## Revision Checklist

- [ ] Can set up `bootstrapApplication` with `ApplicationConfig`.
- [ ] Understand route-level DI scope and when to use it.
- [ ] Know how to structure a large standalone application.
- [ ] Can explain NgModule/standalone interoperability.
- [ ] Know the Angular migration schematic commands.
- [ ] Can articulate when micro-frontends make sense vs when they don't.

---

## Further Reading

- [Angular: Standalone components](https://angular.dev/guide/components/importing)
- [Angular: Standalone migration guide](https://angular.dev/reference/migrations/standalone)
- [Angular: Route-level providers](https://angular.dev/guide/di/hierarchical-dependency-injection)
