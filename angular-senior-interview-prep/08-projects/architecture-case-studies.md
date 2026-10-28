# Enterprise Architecture Case Studies: Real-World Angular Transformations

> **Phase:** 8 — Real-World Projects  
> **Related:** [practical-projects.md](./practical-projects.md) | [production-incident-scenarios.md](./production-incident-scenarios.md) | [standalone-and-architecture.md](../03-advanced-angular/standalone-and-architecture.md)

---

## Table of Contents

1. [Overview & Architectural Case Study Methodology](#overview--architectural-case-study-methodology)
2. [Case Study 1: Modernizing a Global Banking Platform (Strangler Fig Migration)](#case-study-1-modernizing-a-global-banking-platform-strangler-fig-migration)
   - Background & Legacy Bottlenecks
   - The Strangler Fig Pattern Architecture
   - Hybrid State Synchronization
   - Outcome & Production Metrics
3. [Case Study 2: Enterprise Micro-Frontends with Module Federation for 8 Distributed Teams](#case-study-2-enterprise-micro-frontends-with-module-federation-for-8-distributed-teams)
   - Architectural Drivers & Organizational Context
   - Shell & Remote Federated Topology
   - Shared Dependency Governance & Version Conflicts
   - Routing, Authentication, and Shared State
   - Performance Trade-offs & Operational Realities
4. [Case Study 3: Global E-Commerce Core Web Vitals Overhaul](#case-study-3-global-e-commerce-core-web-vitals-overhaul)
   - Baseline Metrics: Failing LCP, INP, and CLS
   - SSR, Non-Destructive Hydration & TransferState Implementation
   - Optimizing Assets with `NgOptimizedImage` and Critical CSS
   - Post-Optimization Results
5. [Senior Interview Discussion Guide](#senior-interview-discussion-guide)
6. [Revision Checklist](#revision-checklist)

---

## Overview & Architectural Case Study Methodology

In senior architecture interviews, interviewers expect candidates to demonstrate experience navigating complex organizational, performance, and technical constraints. These case studies document three enterprise transformations:
1. **Legacy Modernization:** Decommissioning monolithic legacy code safely.
2. **Team Scalability:** Coordinating multi-team delivery via Micro-Frontends.
3. **Performance Engineering:** Diagnosing and resolving critical Core Web Vitals regressions.

---

## Case Study 1: Modernizing a Global Banking Platform (Strangler Fig Migration)

### 1. Background & Legacy Bottlenecks
A Tier-1 financial institution maintained a mission-critical wealth management portal with over 1.2 million lines of legacy AngularJS and Angular 8 code.
- **Pain Points:** 45-minute build times, high vulnerability count in unmaintained npm packages, severe memory leaks, and inability to recruit developers willing to work on legacy code.
- **Constraint:** Zero feature freezes; customer financial transactions could not experience downtime.

### 2. The Strangler Fig Pattern Architecture
Rather than attempting a high-risk "big bang rewrite", the team adopted the **Strangler Fig Pattern**:

```
[ Client Request ] ➔ [ Cloudflare Edge Router / Reverse Proxy ]
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    [ Legacy Monolith ]             [ Modern Angular 18 App ]
    ├── Legacy Dashboard            ├── New Wire Transfer Flow (Standalone)
    └── Legacy Portfolio            └── New Account Settings (Standalone)
```

1. **Edge Routing:** A reverse proxy inspected incoming URL paths:
   - `/transfers/*` and `/settings/*` routed to the modern Angular 18 application.
   - All other routes fell back to the legacy monolith.
2. **Shared Session Bridge:** A secure `HttpOnly` session cookie established on login was shared across subdomains, allowing users to move between legacy and modern views without re-authenticating.
3. **Shared Design System:** A standalone web component library built with Angular Elements ensured pixel-perfect visual consistency across both systems.

### 3. Outcome & Business Impact
- Successfully migrated 100% of user flows over 14 months with zero production outages.
- Build times dropped from 45 minutes to 3.5 minutes using the Angular Application Builder (esbuild).
- Lighthouse Performance score jumped from 28 to 94.

---

## Case Study 2: Enterprise Micro-Frontends with Module Federation for 8 Distributed Teams

### 1. Architectural Drivers & Organizational Context
An enterprise SaaS platform had 8 engineering teams (over 70 frontend engineers) working in a single monolithic Angular repository. Merge conflicts, long CI queues (3 hours per PR), and blocked releases led leadership to demand independent deployability.

### 2. Shell & Remote Federated Topology
The architecture was split into an **Application Shell** and 5 independent **Remote Applications** using Webpack/Rspack Module Federation:

```
┌─────────────────────────────────────────────────────────────┐
│                    Host / Shell Application                 │
│  ├── Global Nav & Header                                    │
│  ├── Authentication & In-Memory Token Manager               │
│  └── Router with Lazy Federated Remote Loading              │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
    ┌───────────▼───────────┐     ┌───────────▼───────────┐
    │   Billing Remote MFE  │     │  Analytics Remote MFE │
    │   (Team Finance)      │     │  (Team Data)          │
    └───────────────────────┘     └───────────────────────┘
```

### 3. Shared Dependency Governance
To avoid users downloading Angular Core 5 times:
```javascript
// module-federation.config.js
module.exports = {
  shared: {
    '@angular/core': { singleton: true, strictVersion: true, requiredVersion: 'auto' },
    '@angular/common': { singleton: true, strictVersion: true, requiredVersion: 'auto' },
    '@angular/router': { singleton: true, strictVersion: true, requiredVersion: 'auto' },
    'rxjs': { singleton: true, strictVersion: true, requiredVersion: 'auto' }
  }
};
```

### 4. Critical Lessons Learned
- **The "Singleton" Risk:** If Remote A upgraded to Angular 18.1 while Remote B remained on Angular 17.0, strictVersion caused runtime crashes. Teams instituted an automated weekly dependency alignment check.
- **Cross-MFE Communication:** Replaced direct component coupling with browser-native `CustomEvent` and `BroadcastChannel`, decoupling MFEs from shared state stores.

---

## Case Study 3: Global E-Commerce Core Web Vitals Overhaul

### 1. Baseline Metrics (Failing Google Search Benchmarks)
An international retail client noticed an 18% drop in organic mobile search traffic due to failing Google Core Web Vitals:
- **LCP (Largest Contentful Paint):** 5.8s (Poor; threshold is ≤ 2.5s)
- **CLS (Cumulative Layout Shift):** 0.38 (Poor; threshold is ≤ 0.1)
- **INP (Interaction to Next Paint):** 460ms (Poor; threshold is ≤ 200ms)

### 2. Diagnostic Root Causes
1. **LCP Bottleneck:** Hero carousel images lacked explicit dimensions, were not preloaded, and required full client JS bundle download before rendering.
2. **CLS Bottleneck:** Dynamic banner ads and asynchronous product badges inserted themselves above existing product cards after load, causing massive layout shifts.
3. **INP Bottleneck:** Massive un-memoized change detection runs triggered by scroll and mousemove events during heavy catalog browsing.

### 3. Engineering Overhaul Strategy
1. **Adopting Angular SSR & Non-Destructive Hydration:**
   - Switched to modern `provideClientHydration(withEventReplay())`.
   - Initial HTML is generated on the server and arrives in the browser in < 400ms.
2. **`TransferState` Implementation:**
   - Serialized catalog API data from SSR into HTML, eliminating redundant client HTTP requests and visual content flicker.
3. **Image Optimization with `NgOptimizedImage`:**
   ```html
   <img [ngSrc]="heroProduct().imageUrl" width="800" height="600" priority />
   ```
   - Automatically generates `srcset`, enforces aspect-ratio layout stability, and injects `<link rel="preload">`.
4. **Change Detection Decoupling:**
   - Converted catalog components to `ChangeDetectionStrategy.OnPush`.
   - Used Signals for price and cart state.

### 4. Post-Optimization Results
| Metric | Baseline | Post-Optimization | Improvement |
|---|---|---|---|
| **LCP** | 5.8s | **1.6s** | **72% faster** (Good) |
| **CLS** | 0.38 | **0.01** | **97% reduction** (Good) |
| **INP** | 460ms | **75ms** | **83% faster** (Good) |
| **Conversion Rate** | 2.1% | **3.4%** | **+62% increase** |

---

## Senior Interview Discussion Guide

- **How to explain Strangler Fig:** Emphasize risk mitigation, business continuity, and shared session architecture.
- **How to evaluate Module Federation:** Candidly acknowledge the operational complexity (shared dependency version lock, testing matrix) rather than selling it as a silver bullet.
- **How to discuss Core Web Vitals:** Focus on real user metrics (RUM), business revenue correlations, and systematic profiling before and after optimization.

---

## Revision Checklist

- [ ] Explain the Strangler Fig pattern for legacy frontend migrations.
- [ ] Understand Module Federation singleton dependency sharing and version lock risks.
- [ ] Master the 3 core metrics: LCP, CLS, INP, and their specific Angular optimizations.
- [ ] Explain how `NgOptimizedImage` resolves both LCP and CLS simultaneously.
