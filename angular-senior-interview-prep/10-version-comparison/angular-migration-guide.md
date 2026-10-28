# Enterprise Angular Migration Guide: Multi-Version Upgrades & Modernization

> **Section:** 10 — Version Comparison & Evolution  
> **Related:** [angular-v20-to-v22-comparison.md](./angular-v20-to-v22-comparison.md) | [angular-feature-availability-matrix.md](./angular-feature-availability-matrix.md) | [migrations-and-compatibility.md](../03-advanced-angular/migrations-and-compatibility.md)

---

## Table of Contents

1. [Overview & Guiding Principles](#overview--guiding-principles)
2. [Pre-Upgrade Assessment & Dependency Audit](#pre-upgrade-assessment--dependency-audit)
3. [The Sequential Upgrade Rule: Step-by-Step Major Execution](#the-sequential-upgrade-rule-step-by-step-major-execution)
4. [Using the Angular Update Guide (`angular.dev/update`) & `ng update`](#using-the-angular-update-guide-angulardevupdate--ng-update)
5. [Worked Migration Scenario: Upgrading an Enterprise App from Angular 18 to Angular 20+](#worked-migration-scenario-upgrading-an-enterprise-app-from-angular-18-to-angular-20)
   - Step 1: Pre-Upgrade Verification & Test Baseline
   - Step 2: Upgrading from Angular 18 to Angular 19
   - Step 3: Upgrading from Angular 19 to Angular 20
   - Step 4: Adopting Stable Zoneless and Linked Signals
6. [Resolving Common Upgrade Build & Compiler Failures](#resolving-common-upgrade-build--compiler-failures)
7. [Post-Migration Testing Matrix (Regression, Performance, a11y)](#post-migration-testing-matrix-regression-performance-a11y)
8. [Production Deployment, Canary Releases & Rollback Strategy](#production-deployment-canary-releases--rollback-strategy)
9. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
10. [Revision Checklist](#revision-checklist)

---

## Overview & Guiding Principles

Upgrading mission-critical enterprise Angular applications requires strict engineering discipline:
1. **Never Skip Major Versions:** Always upgrade sequentially (`16 -> 17 -> 18 -> 19 -> 20`). Skipping versions bypasses intermediate AST code transformation schematics, corrupting codebase structure.
2. **Never Use `--force` or `--legacy-peer-deps`:** Bypassing npm resolution creates diamond dependency conflicts and cryptic runtime crashes.
3. **Decouple Version Upgrades from Feature Modernization:** First make the codebase compile and pass tests on the new Angular version. Modernize architecture (e.g. converting to signals) in subsequent dedicated PRs.

---

## Pre-Upgrade Assessment & Dependency Audit

Before initiating an upgrade:

```bash
# 1. Audit current installed versions
ng version

# 2. Check for outdated packages across dependencies
npm outdated

# 3. Check for open security vulnerabilities
npm audit

# 4. Verify that existing test suite passes 100%
npm run test:ci
npm run test:e2e
```

### Dependency Audit Checklist:
- [ ] Check official changelogs of critical UI libraries (Angular Material, ng-bootstrap, AG-Grid, PrimeNG).
- [ ] Verify that Node.js on CI runners and local developer machines satisfies the target Angular version support matrix.
- [ ] Inspect git status to ensure working trees are clean.

---

## The Sequential Upgrade Rule: Step-by-Step Major Execution

```
[ Current: Angular 16 ]
        │
        ▼ (Execute `ng update @angular/core@17 @angular/cli@17`)
[ Angular 17 Stable Milestone ] ➔ Run Unit & E2E Tests ➔ Commit
        │
        ▼ (Execute `ng update @angular/core@18 @angular/cli@18`)
[ Angular 18 Stable Milestone ] ➔ Run Unit & E2E Tests ➔ Commit
        │
        ▼ (Execute `ng update @angular/core@19 @angular/cli@19`)
[ Angular 19 Stable Milestone ] ➔ Run Unit & E2E Tests ➔ Commit
        │
        ▼ (Execute `ng update @angular/core@20 @angular/cli@20`)
[ Angular 20 Target Milestone ] ➔ Full Regression & Staging Deploy
```

---

## Using the Angular Update Guide (`angular.dev/update`) & `ng update`

The official **Angular Update Guide** (`https://angular.dev/update`) generates customized, step-by-step instructions based on your source version, target version, and application complexity (Basic, Medium, Advanced).

### Key `ng update` Commands:
```bash
# Check available updates
ng update

# Perform dry run to review pending AST file changes
ng update @angular/core @angular/cli --dry-run

# Run update and migrate dependencies
ng update @angular/core @angular/cli

# Run ecosystem updates (e.g. Angular Material)
ng update @angular/material
```

---

## Worked Migration Scenario: Upgrading an Enterprise App from Angular 18 to Angular 20+

### Context:
An enterprise billing portal on Angular 18.2 with Node 20, TypeScript 5.4, and RxJS 7.4. Target: Upgrade to Angular 20 to adopt stable zoneless change detection and incremental hydration.

### Step 1: Pre-Upgrade Verification & Test Baseline
- Ensure git repository is clean: `git status`.
- Create a dedicated upgrade branch: `git checkout -b chore/upgrade-angular-18-to-20`.
- Execute full unit and E2E test suite to establish clean baseline.

### Step 2: Upgrading from Angular 18 to Angular 19
```bash
# 1. Update Core and CLI to v19
ng update @angular/core@19 @angular/cli@19

# 2. Update Angular Material if used
ng update @angular/material@19

# 3. Check for TypeScript compatibility (requires TS 5.5 to 5.6)
npm list typescript
```
- Address any deprecations reported by the CLI schematics.
- Run `npm test` and `npm run build`.
- Commit milestone: `git commit -am "chore: upgrade to Angular 19"`.

### Step 3: Upgrading from Angular 19 to Angular 20
```bash
# 1. Ensure Node.js is >= 20.11 or 22
node -v

# 2. Update Core and CLI to v20
ng update @angular/core@20 @angular/cli@20

# 3. Update Angular Material to v20
ng update @angular/material@20
```
- Run automated schematics provided by the release.
- Verify TypeScript 5.6/5.7 compatibility.
- Commit milestone: `git commit -am "chore: upgrade to Angular 20"`.

### Step 4: Adopting Stable Zoneless and Linked Signals (Post-Upgrade PR)
Once the application compiles cleanly on Angular 20:
```typescript
// app.config.ts (Switch to stable zoneless provider)
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(), // Stable zoneless in Angular 20+
    provideRouter(routes),
    provideClientHydration(withEventReplay())
  ]
};
```
Remove `zone.js` from `angular.json` polyfills array, saving ~30KB bundle weight!

---

## Resolving Common Upgrade Build & Compiler Failures

### 1. Peer Dependency Resolution Failure (`ERESOLVE`)
- **Cause:** A third-party package specifies an older version of `@angular/core` in its `peerDependencies`.
- **Solution:** Check if the library has a newer beta/release supporting the target Angular version. If the library is abandoned, check for community forks or wrap with `patch-package`. **Do not use `--force`.**

### 2. TypeScript Compilation Errors (`TS2345` / `TS2322`)
- **Cause:** Upgraded TypeScript compiler introduces stricter checks or changed standard library signatures.
- **Solution:** Fix type annotations. Do not cast to `any`.

---

## Post-Migration Testing Matrix (Regression, Performance, a11y)

| Testing Layer | Scope | Tool | Pass Criteria |
|---|---|---|---|
| **Static Verification** | Types & Linting | `tsc --noEmit`, ESLint | 0 errors, 0 warnings |
| **Unit Tests** | Component & Service Logic | Vitest / Jest / Karma | 100% passing tests |
| **E2E Smoke Suite** | Top 5 Revenue User Journeys | Playwright / Cypress | 100% passing tests |
| **Visual Regression** | Core UI components | Playwright snapshots | 0 unexpected layout shifts |
| **Performance Audit** | Core Web Vitals | Lighthouse in CI | LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 |

---

## Production Deployment, Canary Releases & Rollback Strategy

1. **Staging Environment Soak Test:** Deploy upgraded build to staging for 48 hours with automated synthetic traffic.
2. **Canary Rollout:** Route 5% of production traffic to the new build via Cloudflare/CDN edge workers.
3. **Automated Health Monitoring:** Monitor Datadog/Sentry for JavaScript exception spikes.
4. **Immediate Rollback Trigger:** If error rate increases by > 0.5%, the edge worker instantly routes 100% of traffic back to the previous stable container.

---

## Senior Interview Questions with Detailed Answers

### Q1: Why is it considered dangerous to jump multiple major Angular versions in a single update step?
**Answer:**
`ng update` uses **Abstract Syntax Tree (AST) code transformation schematics** designed to migrate code sequentially from one major release to the next.
If an application jumps from Angular 14 directly to 18:
- Schematics written for v15, v16, and v17 are bypassed or execute out of order.
- Intermediate configuration changes (such as the migration of `angular.json` builders from Webpack to Application Builder, or deprecation transformations in `tsconfig.json`) fail to run.
- The developer is left with dozens of cryptic compile and build errors that must be resolved manually. Upgrading sequentially guarantees automated schematics run cleanly and isolate regressions to a single version boundary.

---

## Revision Checklist

- [ ] Explain the sequential upgrade rule (`ng update` one major version at a time).
- [ ] Understand why `--force` and `--legacy-peer-deps` are prohibited in enterprise upgrades.
- [ ] Outline the worked migration steps from Angular 18 to Angular 20.
- [ ] Identify and resolve peer dependency conflicts cleanly.
- [ ] Design a canary deployment and zero-downtime rollback strategy.
