# Angular Migrations, Compatibility, and Large-Scale Codebase Upgrades

> **Phase:** 3 — Advanced Angular  
> **Related:** [standalone-and-architecture.md](./standalone-and-architecture.md) | [angular-migration-guide.md](../10-version-comparison/angular-migration-guide.md) | [angular-feature-availability-matrix.md](../10-version-comparison/angular-feature-availability-matrix.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Prerequisites](#prerequisites)
3. [The Angular Upgrade Philosophy](#the-angular-upgrade-philosophy)
4. [The `ng update` Architecture & Automated Schematics](#the-ng-update-architecture--automated-schematics)
5. [The Major Architectural Migration Milestones](#the-major-architectural-migration-milestones)
   - View Engine to Ivy
   - NgModules to Standalone Components
   - Built-in Control Flow Migration (`*ngIf` ➔ `@if`)
   - Zone-Based to Zoneless Change Detection
6. [Dependency Compatibility Matrix Management](#dependency-compatibility-matrix-management)
   - Node.js, TypeScript, RxJS, and Angular Alignment
7. [Enterprise Step-by-Step Upgrade Strategy](#enterprise-step-by-step-upgrade-strategy)
8. [Large-Scale Monorepo Upgrades (Nx / Angular CLI)](#large-scale-monorepo-upgrades-nx--angular-cli)
9. [Handling Broken Third-Party Libraries and Deprecations](#handling-broken-third-party-libraries-and-deprecations)
10. [Rollback Planning and Production Deployment Safeguards](#rollback-planning-and-production-deployment-safeguards)
11. [Common Mistakes and Upgrade Pitfalls](#common-mistakes-and-upgrade-pitfalls)
12. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
13. [Hands-On Migration Exercise: Standalone & Control Flow Migration](#hands-on-migration-exercise-standalone--control-flow-migration)
14. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Architect and lead multi-version Angular upgrades in mission-critical enterprise codebases.
- Leverage official automated migration schematics (`ng generate @angular/core:standalone`, `control-flow`, etc.).
- Align Node.js, TypeScript, and RxJS peer dependencies safely without `--force` or `--legacy-peer-deps`.
- Plan incremental migrations from NgModule architectures to Standalone components without halting feature delivery.
- Prepare production applications for zoneless change detection and signal-based reactivity.
- Formulate zero-downtime rollback plans, canary deployments, and regression verification strategies.

---

## The Angular Upgrade Philosophy

Angular follows a predictable **6-month major release cadence** with a strict commitment to backwards compatibility:
- **Active Support (6 months):** Regular bug fixes, performance optimizations, and security patches.
- **Long-Term Support (LTS) (12 months):** Critical bug fixes and security vulnerability patches.
- **Total Support Window:** 18 months per major release.
- **Deprecation Policy:** Features are deprecated for at least one major version before complete removal, accompanied by automated code migration schematics whenever feasible.

---

## The `ng update` Architecture & Automated Schematics

`ng update` is not a generic package manager command like `npm update`. It is an **AST-aware code transformation engine**:
1. It analyzes `package.json` and fetches migration manifests published by Angular and ecosystem libraries.
2. It executes TypeScript AST transformations on your source code (renaming deprecated imports, updating template syntax, adjusting config files).
3. It performs intermediate file commits or dry-runs for review.

### Running Automated Migrations
```bash
# Check for pending major updates
ng update

# Update Angular Core and CLI to the next major version
ng update @angular/core @angular/cli

# Run specific standalone migration schematic
ng generate @angular/core:standalone

# Run built-in control flow migration schematic
ng generate @angular/core:control-flow
```

---

## The Major Architectural Migration Milestones

### 1. View Engine to Ivy (Angular 9–12)
- Replaced the legacy View Engine compiler with Ivy.
- Replaced separate factory files (`.ngfactory.js`) with static component definitions on the class itself (`ɵcmp`).
- Enabled tree-shaking of unused Angular features and drastically reduced bundle sizes.

### 2. NgModules to Standalone Components (Angular 14–17+)
- Removed the necessity of `NgModule` wrappers for components, directives, and pipes.
- Components declare their own dependencies via `imports: [CommonModule, ButtonComponent]`.
- Replaced `platformBrowserDynamic().bootstrapModule(AppModule)` with `bootstrapApplication(AppComponent, appConfig)`.

### 3. Built-in Control Flow Migration (Angular 17+)
- Replaced structural directives (`*ngIf`, `*ngFor`, `*ngSwitch`) with modern template syntax (`@if`, `@for`, `@switch`).
- Compiles directly to JavaScript branching statements without allocating directive instances or `TemplateRef` overhead.
- Requires `track` expression on `@for`, eliminating memory-intensive trackBy functions.

```html
<!-- BEFORE (Legacy Structural Directives) -->
<div *ngIf="isLoggedIn; else guestTemplate">
  <div *ngFor="let item of items; trackBy: trackItem">
    {{ item.name }}
  </div>
</div>
<ng-template #guestTemplate><p>Please log in</p></ng-template>

<!-- AFTER (Modern Built-in Control Flow) -->
@if (isLoggedIn) {
  @for (item of items; track item.id) {
    <div>{{ item.name }}</div>
  } @empty {
    <p>No items available</p>
  }
} @else {
  <p>Please log in</p>
}
```

### 4. Zone-Based to Zoneless Change Detection (Angular 18+ Preview / v20+ Stable)
- Traditional Angular relies on `Zone.js` monkey-patching browser async APIs (`setTimeout`, `Promise`, event listeners) to trigger top-down dirty checking.
- Zoneless Angular eliminates `Zone.js` completely, relying on **Signals**, manual `markForCheck()`, and async events to trigger fine-grained local change detection.
- **Migration requirement:** Components must not rely on implicit Zone.js triggers; all reactive values must flow through Signals, `OnPush`, or explicit `ChangeDetectorRef`.

---

## Dependency Compatibility Matrix Management

Never guess version compatibility. Upgrading Angular requires synchronous coordination of Node.js, TypeScript, and RxJS:

| Angular Version | Node.js Support | TypeScript Support | RxJS Support | Default Builder |
|---|---|---|---|---|
| **Angular 16** | 16.14+, 18.10+ | 4.9.3 to 5.0.x | 7.4.x | Webpack (esbuild preview) |
| **Angular 17** | 18.13+, 20.9+ | 5.2.x to 5.4.x | 7.4.x | Application Builder (esbuild) |
| **Angular 18** | 18.19+, 20.9+, 22.0+ | 5.4.x to 5.5.x | 7.4.x | Application Builder (esbuild) |
| **Angular 19** | 18.19+, 20.9+, 22.0+ | 5.5.x to 5.6.x | 7.4.x | Application Builder (esbuild) |
| **Angular 20** | 20.11+, 22.0+ | 5.6.x to 5.7.x | 7.4.x | Application Builder (esbuild) |

> ⚠️ **Golden Rule:** Never run `npm install --force` or `--legacy-peer-deps` during an Angular upgrade in production. That masks severe ABI incompatibilities between libraries and causes cryptic runtime crashes.

---

## Enterprise Step-by-Step Upgrade Strategy

For applications that are several versions behind (e.g., Angular 14 ➔ Angular 18):

```
Phase 1: Discovery & Audit
  ├── Audit all 3rd party packages for target version support
  ├── Check deprecated APIs currently in use
  └── Verify test suite passing with high coverage

Phase 2: Step-by-Step Incremental Upgrades (One Major at a Time!)
  ├── Upgrade v14 ➔ v15 (`ng update @angular/core@15 @angular/cli@15`)
  ├── Fix compiler warnings & run unit/e2e tests
  ├── Upgrade v15 ➔ v16 (`ng update @angular/core@16 @angular/cli@16`)
  ├── Fix compiler warnings & run unit/e2e tests
  ├── Upgrade v16 ➔ v17 (`ng update @angular/core@17 @angular/cli@17`)
  └── Upgrade v17 ➔ v18 (`ng update @angular/core@18 @angular/cli@18`)

Phase 3: Code Modernization (Separate PRs!)
  ├── PR 1: Migrate to Standalone (`ng g @angular/core:standalone`)
  ├── PR 2: Migrate to Built-in Control Flow (`ng g @angular/core:control-flow`)
  └── PR 3: Adopt Signals for state and inputs
```

---

## Large-Scale Monorepo Upgrades (Nx / Angular CLI)

In large organizations with 50+ applications and hundreds of shared libraries:
1. **Single Version Policy:** All projects in the monorepo share the exact same version of `@angular/core` and dependencies to prevent diamond dependency conflicts.
2. **Nx Automated Migrations (`nx migrate`):**
   ```bash
   # Generates migrations.json with precise code transformations
   npx nx migrate latest

   # Review migrations.json, then run migrations across all workspace projects
   npx nx migrate --run-migrations
   ```
3. **Incremental Migration via Module Federation:** If applications cannot be upgraded together, split them into independent micro-frontends with isolated runtimes, upgrading one MFE at a time behind a federated shell.

---

## Handling Broken Third-Party Libraries and Deprecations

When a third-party library has abandoned maintenance and fails to support newer Angular versions:
1. **First Option:** Look for active community forks or official modern replacements (e.g., replacing abandoned UI widgets with Angular CDK primitives).
2. **Second Option:** Wrap the library in an isolated Angular component adapter and isolate its type errors.
3. **Third Option:** Use `patch-package` for minor peer-dependency metadata mismatches if the underlying JavaScript runtime remains compatible.
4. **Never Option:** Do not rewrite half the library into your app as unmaintainable copy-paste code.

---

## Rollback Planning and Production Deployment Safeguards

1. **Blue/Green Deployment:** Maintain the previous stable release container alongside the new release container. Switch traffic via load balancer only after health checks pass.
2. **Canary Releases:** Route 5% of production users to the upgraded Angular bundle. Monitor error reporting dashboards (Sentry/Datadog) for unexpected JavaScript exceptions or spikes in 4xx/5xx errors.
3. **Automated E2E Smoke Tests in Staging:** Verify critical business journeys (login, payment, checkout, form submission) against the production-like staging environment before promoting.

---

## Common Mistakes and Upgrade Pitfalls

### Pitfall 1: Multi-Major Jumping
Running `ng update @angular/core@18` on an Angular 14 codebase in a single command. Schematics assume sequential migration. Skipping versions causes automated AST transformations to fail or corrupt files.

### Pitfall 2: Modernizing Code in the Same PR as Framework Upgrade
Combining version upgrades with architectural rewrites (converting 200 components to signals) makes it impossible to isolate regression bugs. **First upgrade the version and verify tests pass. Then modernize architecture in subsequent PRs.**

### Pitfall 3: Ignoring Deprecation Warnings
Allowing deprecated APIs (like `RouterLinkWithHref` or class-based route guards) to sit in code across multiple versions until they are hard-removed, causing an emergency migration under tight release deadlines.

---

## Senior Interview Questions with Detailed Answers

### Q1: How would you plan and execute an upgrade for an enterprise Angular application that is 3 major versions behind?
**Answer:**
1. **Audit & Pre-flight:** Run `npm outdated`, check third-party library changelogs for Angular compatibility, and verify unit and E2E test suites pass with reliable coverage.
2. **Sequential Upgrade:** Never jump multiple major versions at once. Follow official Angular Upgrade guidelines: upgrade one major release at a time (`15 -> 16 -> 17 -> 18`). At each step:
   - Run `ng update @angular/core@N @angular/cli@N`.
   - Update Node.js and TypeScript to match the version support matrix.
   - Run unit tests, lint checks, and fix any immediate breaking API changes.
   - Commit the working milestone.
3. **Automated Schematics:** After reaching the target version, run dedicated schematics in separate PRs (standalone migration, control-flow migration).
4. **Verification & Deployment:** Execute full end-to-end regression tests in staging, deploy via canary or blue/green to production, and monitor error logs for unexpected runtime exceptions.

---

### Q2: Why is `Zone.js` being phased out in modern Angular, and how do you prepare an existing application for zoneless operation?
**Answer:**
`Zone.js` monkey-patches all browser asynchronous APIs (`addEventListener`, `setTimeout`, `fetch`, `Promise`) to intercept asynchronous events and trigger change detection at the root of the component tree.
**Drawbacks of Zone.js:**
- Performance overhead of dirty checking the entire tree on every minor event.
- Prevents full interoperability with async/await (requires downlevel compilation or zone-aware promise wrappers).
- Adds ~30KB bundle overhead and complicates integration with web components and micro-frontends.

**Preparing for Zoneless:**
1. Switch components to `ChangeDetectionStrategy.OnPush`.
2. Model reactive state using **Signals** (`signal()`, `computed()`), which notify Angular precisely which DOM nodes need updating.
3. Replace manual async mutations with signal inputs/outputs and `toSignal()` RxJS interop.
4. Eliminate reliance on implicit zone dirty checks after asynchronous callbacks.

---

## Hands-On Migration Exercise: Standalone & Control Flow Migration

### Step 1: Run the Standalone Migration Tool
```bash
# 1. Convert components, directives, and pipes to standalone: true
ng generate @angular/core:standalone --mode=convert-to-standalone

# 2. Prune unused NgModules
ng generate @angular/core:standalone --mode=prune-ng-modules

# 3. Switch bootstrap to bootstrapApplication
ng generate @angular/core:standalone --mode=standalone-bootstrap
```

### Step 2: Migrate Control Flow
```bash
# Automatically converts *ngIf, *ngFor, *ngSwitch to @if, @for, @switch
ng generate @angular/core:control-flow
```

---

## Revision Checklist

- [ ] Know the Angular release cadence (6-month majors, 18-month LTS support).
- [ ] Understand why upgrades must be done sequentially one major version at a time.
- [ ] Align Node.js, TypeScript, and RxJS versions using the compatibility matrix.
- [ ] Use `ng update` and Angular schematics (`standalone`, `control-flow`) effectively.
- [ ] Never use `--force` or `--legacy-peer-deps` to bypass real dependency incompatibilities.
- [ ] Know how to design zero-downtime rollback and canary deployment strategies.
- [ ] Understand the technical motivation and preparation steps for Zoneless Angular.
