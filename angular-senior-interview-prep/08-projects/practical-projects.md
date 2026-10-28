# Senior Angular Practical Projects: Production Architectures & Implementations

> **Phase:** 8 — Real-World Projects  
> **Related:** [architecture-case-studies.md](./architecture-case-studies.md) | [production-incident-scenarios.md](./production-incident-scenarios.md) | [frontend-system-design.md](../07-interview-preparation/frontend-system-design.md)

---

## Table of Contents

1. [Overview & Project Portfolio Architecture](#overview--project-portfolio-architecture)
2. [Project 1: Enterprise Typed CRUD Application (Enterprise User & Tenant Portal)](#project-1-enterprise-typed-crud-application-enterprise-user--tenant-portal)
3. [Project 2: Advanced Standalone & Reactive Application (E-Commerce Platform)](#project-2-advanced-standalone--reactive-application-e-commerce-platform)
4. [Project 3: Zero-Trust Security & Authentication Hardening](#project-3-zero-trust-security--authentication-hardening)
5. [Project 4: Extreme Performance Profiling & Virtual Table Optimization](#project-4-extreme-performance-profiling--virtual-table-optimization)
6. [Project 5: Safe AI-Assisted Feature Engineering & Security Audit](#project-5-safe-ai-assisted-feature-engineering--security-audit)
7. [Senior Interview Discussion Guide for Projects](#senior-interview-discussion-guide-for-projects)
8. [Revision Checklist](#revision-checklist)

---

## Overview & Project Portfolio Architecture

These five production-grade projects are designed to demonstrate senior-level mastery (5+ years experience) across Angular architecture, reactive data flows, enterprise security, runtime performance profiling, and safe AI tooling. Each project contains:
- Complete architectural specifications.
- Implementation milestones.
- Strict acceptance criteria.
- Automated test requirements.
- Security and performance considerations.
- Senior interview defense talking points.

---

## Project 1: Enterprise Typed CRUD Application (Enterprise User & Tenant Portal)

### 1. Requirements & Scope
Build a multi-tenant administration portal enabling organization administrators to manage enterprise users, assign granular RBAC roles, and review audit logs.

### 2. Architecture & Design Decisions
- **Framework:** Angular 18+ Standalone Architecture.
- **Routing:** Lazy-loaded feature routes with `loadComponent`.
- **Forms:** Typed Reactive Forms (`FormGroup<{ name: FormControl<string>; email: FormControl<string> }>`) with custom asynchronous validators checking email uniqueness.
- **Error Handling:** Functional HTTP Interceptor with standardized error toasts and RFC 7807 problem details parsing.

### 3. Implementation Milestones
- **Milestone 1:** Establish domain models and API service contracts using TypeScript interfaces.
- **Milestone 2:** Build reusable data table component with column configuration and sorting.
- **Milestone 3:** Implement dynamic modal form with field validation, dirty-checking guard (`canDeactivate`), and server error mapping.
- **Milestone 4:** Configure unit test suite using `provideHttpClientTesting()` and CDK Harnesses.

### 4. Acceptance Criteria
- [ ] Form submission button is disabled while form is pristine, invalid, or pending async validation.
- [ ] Navigating away with unsaved form changes triggers a confirmation modal (`canDeactivate`).
- [ ] API network errors display human-readable notifications without unhandled exceptions.
- [ ] 100% type-safe with zero `any` annotations.

---

## Project 2: Advanced Standalone & Reactive Application (E-Commerce Platform)

### 1. Requirements & Scope
Build a high-performance modern e-commerce storefront with product filtering, live catalog search, shopping cart management, and checkout.

### 2. Architecture & State Strategy
- **Signals for UI State:** Shopping cart items, drawer open/close state, computed order totals (`computed()`).
- **RxJS for Asynchronous Search:** Debounced typeahead search (`debounceTime(300)`, `distinctUntilChanged()`, `switchMap()`) converted to signals via `toSignal()`.
- **Deferred Views:** Product recommendations and user reviews loaded lazily via `@defer (on viewport)`.

### 3. Implementation Milestones
- **Milestone 1:** Standalone layout with global navigation, cart drawer, and responsive header.
- **Milestone 2:** Reactive product catalog service with faceted category and price filtering.
- **Milestone 3:** Signal-driven CartService supporting persistent local state, optimistic quantity updates, and discount coupon computations.
- **Milestone 4:** Checkout workflow with multi-step stepper component.

### 4. Acceptance Criteria
- [ ] Typeahead search cancels previous in-flight HTTP requests when new keystrokes arrive.
- [ ] Below-the-fold product review widgets are deferred until scrolled into viewport.
- [ ] Cart updates recalculate subtotals, tax, and shipping immediately via `computed()`.

---

## Project 3: Zero-Trust Security & Authentication Hardening

### 1. Requirements & Scope
Threat-model and harden an enterprise banking portal against Cross-Site Scripting (XSS), CSRF, token theft, and authorization bypass.

### 2. Security Architecture
- **In-Memory Access Tokens:** Access tokens stored exclusively in private service variables; zero tokens in `localStorage`.
- **HttpOnly Refresh Cookies:** Server-managed `__Host-refreshToken` cookie with `SameSite=Strict; Secure; HttpOnly`.
- **Silent Refresh Interceptor:** Functional interceptor catches 401 Unauthorized errors and executes token refresh before retrying the failed request.
- **Content Security Policy (CSP):** Strict CSP headers with DOM Trusted Types enabled.

### 3. Acceptance Criteria
- [ ] `localStorage` and `sessionStorage` contain zero authentication tokens or sensitive user data.
- [ ] XSRF tokens are transferred via custom `X-XSRF-TOKEN` headers on all mutating HTTP requests.
- [ ] Terminating a session in one tab broadcasts a logout event across all open tabs via `BroadcastChannel`.
- [ ] User inactivity of 15 minutes automatically triggers session termination.

---

## Project 4: Extreme Performance Profiling & Virtual Table Optimization

### 1. Requirements & Scope
Profile, diagnose, and optimize a sluggish enterprise financial table rendering 100,000 transaction records with live updates.

### 2. Performance Engineering Strategy
- **Baseline Profiling:** Measure initial load time, JS heap allocation, and Interaction to Next Paint (INP) using Chrome DevTools Performance Profiler.
- **CDK Virtual Scroll:** Replace traditional table rendering with `cdk-virtual-scroll-viewport` with fixed 48px row heights.
- **Change Detection Isolation:** Apply `ChangeDetectionStrategy.OnPush` throughout and decouple live WebSocket ticks using `ngZone.runOutsideAngular()`.
- **Track Expressions:** Use `@for (tx of transactions(); track tx.id)` to prevent DOM node re-creation.

### 3. Measurable Acceptance Criteria
- [ ] Initial DOM node count reduced from 50,000+ nodes to < 50 nodes.
- [ ] Scroll frame rate maintains steady 60 FPS without jank.
- [ ] INP remains under 100ms during heavy real-time data ingestion.

---

## Project 5: Safe AI-Assisted Feature Engineering & Security Audit

### 1. Requirements & Scope
Utilize an AI coding assistant (or IDE agent) to scaffold an automated PDF Invoice Generator feature, followed by a rigorous human security, privacy, and architectural audit.

### 2. Workflow Milestones
- **Milestone 1 (Scoping):** Formulate structured prompts mandating Angular 18 standalone components and strict typing without sharing confidential enterprise data.
- **Milestone 2 (AI Generation):** Prompt AI for step-by-step plan before accepting code generation.
- **Milestone 3 (Security & Dependency Audit):** Inspect generated code for hallucinated npm dependencies, `DomSanitizer` bypasses, and unmanaged RxJS subscriptions.
- **Milestone 4 (Refactoring):** Remove any discovered anti-patterns, enforce `OnPush`, and add comprehensive unit tests with Angular CDK Harnesses.

### 3. Acceptance Criteria
- [ ] All third-party dependencies verified in npm registry with verified security reputation.
- [ ] Zero unmanaged RxJS subscriptions (all subscriptions use `takeUntilDestroyed`).
- [ ] Code reviewed and approved through the 5-Stage AI Code Review Rubric.

---

## Senior Interview Discussion Guide for Projects

When discussing these projects in an interview:
1. **Focus on Trade-offs:** Explain *why* you chose Signals over NgRx in Project 2, or *why* you chose In-Memory tokens over localStorage in Project 3.
2. **Quantify Results:** Mention specific metrics (e.g. *"reduced DOM node count by 99% and improved INP from 450ms to 65ms"* in Project 4).
3. **Highlight Security & AI Governance:** Emphasize how you audited AI-generated code to prevent supply-chain and XSS risks in Project 5.

---

## Revision Checklist

- [ ] Explain the architecture of all 5 projects confidently.
- [ ] Articulate the technical defense of In-Memory authentication tokens.
- [ ] Explain the mathematics and configuration of CDK Virtual Scrolling for 100k records.
- [ ] Detail the audit process applied to AI-assisted pull requests.
