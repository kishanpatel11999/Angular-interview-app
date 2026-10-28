# Scenario-Based Architectural & Production Incident Interview Questions

> **Phase:** 7 — Interview Practice  
> **Related:** [frontend-system-design.md](./frontend-system-design.md) | [debugging-exercises.md](./debugging-exercises.md) | [angular-interview-questions.md](./angular-interview-questions.md)

---

## Table of Contents

1. [Overview & Senior Evaluation Framework](#overview--senior-evaluation-framework)
2. [Scenario 1: Large-Scale Incremental Migration (Angular 14 ➔ 18)](#scenario-1-large-scale-incremental-migration-angular-14--18)
3. [Scenario 2: Real-Time Trading Dashboard Performance Bottleneck](#scenario-2-real-time-trading-dashboard-performance-bottleneck)
4. [Scenario 3: Cross-Site Scripting (XSS) Incident & Zero-Trust Remediation](#scenario-3-cross-site-scripting-xss-incident--zero-trust-remediation)
5. [Scenario 4: Multi-Team Monorepo vs Micro-Frontends Architectural Decision](#scenario-4-multi-team-monorepo-vs-micro-frontends-architectural-decision)
6. [Scenario 5: Mysterious Production Memory Leak After Repeated Navigation](#scenario-5-mysterious-production-memory-leak-after-repeated-navigation)
7. [Scenario 6: Audit & Remediation of an Insecure AI-Generated Feature](#scenario-6-audit--remediation-of-an-insecure-ai-generated-feature)
8. [Senior Behavioral & Technical Leadership Questions](#senior-behavioral--technical-leadership-questions)
9. [Revision Checklist](#revision-checklist)

---

## Overview & Senior Evaluation Framework

Scenario-based questions evaluate an engineer's **architectural maturity**, **incident response composure**, and **systems-thinking ability**.
Interviewers look for:
- Structured problem breakdown (Root cause analysis ➔ Immediate containment ➔ Long-term remediation).
- Clear identification of trade-offs and alternatives.
- Real-world production experience over textbook definitions.

---

## Scenario 1: Large-Scale Incremental Migration (Angular 14 ➔ 18)

### Interviewer Prompt:
> *"You join an enterprise organization with a 600,000-line Angular 14 application powered by legacy NgModules, Moment.js, and Karma tests. Product leadership refuses to freeze feature development for 6 months. How do you lead an incremental migration to Angular 18, standalone components, and modern tooling without breaking production?"*

### Model Answer:

#### 1. Strategic Principles:
- **No Feature Freeze:** Migrations must happen concurrently with active sprint delivery.
- **One Major Version at a Time:** Strictly avoid multi-major jumps (`14 -> 15 -> 16 -> 17 -> 18`).
- **Automated Verification:** Rely on CI regression test suites at each intermediate milestone.

#### 2. Phased Execution Roadmap:

```
Step 1: Audit & Pre-flight Alignment (Sprint 1)
  ├── Audit 3rd party npm dependencies for Angular 18 compatibility.
  ├── Establish strict CI/CD baseline (E2E smoke tests for top 10 revenue paths).
  └── Introduce .nvmrc / Node.js 18/20 compatibility.

Step 2: Step-by-Step Major Upgrades (Sprints 2–5)
  ├── Upgrade v14 ➔ v15: Remove legacy ViewEngine remnants, adopt functional interceptors.
  ├── Upgrade v15 ➔ v16: Adopt esbuild preview, evaluate non-destructive hydration.
  ├── Upgrade v16 ➔ v17: Switch to Application Builder (esbuild+Vite), adopt built-in control flow.
  └── Upgrade v17 ➔ v18: Verify TypeScript 5.4/5.5 compatibility and zoneless readiness.

Step 3: Incremental Standalone Migration (Ongoing)
  ├── Configure new features to be built as Standalone components (hybrid coexistence).
  ├── Standalone components can be imported into existing legacy NgModules via imports: [].
  └── Run `ng generate @angular/core:standalone` on isolated leaf modules first.
```

#### 3. Risk Mitigation & Rollback:
- Deploy intermediate major version upgrades behind Canary feature toggles (10% of users).
- Maintain automated Playwright E2E smoke suites in CI.

---

## Scenario 2: Real-Time Trading Dashboard Performance Bottleneck

### Interviewer Prompt:
> *"A financial trading dashboard receives 500 WebSocket price updates per second across 1,000 stock tickers. Users report that the browser freezes, typing into inputs lags by 3 seconds, and the fan spins at maximum speed. What is the root cause, and how do you optimize it to maintain 60 FPS?"*

### Model Answer:

#### 1. Root Cause Analysis:
- **Zone.js Over-Triggering:** Every incoming WebSocket message triggers a microtask/event intercepted by `Zone.js`, causing top-down change detection across all 1,000 tickers 500 times per second ($500 \times 1,000 = 500,000$ dirty checks/sec).
- **Template Churn:** Unmemoized calculations or un-tracked `@for` rows re-rendering DOM nodes.

#### 2. Remediation Strategy:

```typescript
// 1. Ingest WebSocket stream OUTSIDE Angular Zone
@Injectable({ providedIn: 'root' })
export class MarketDataService {
  private ngZone = inject(NgZone);
  private rawSocket = new WebSocket('wss://stream.exchange.com');
  
  // Buffer updates to 60 FPS (approx. every 16ms) using RxJS
  readonly throttledTickers$ = new Observable<Map<string, number>>(subscriber => {
    let buffer = new Map<string, number>();

    this.ngZone.runOutsideAngular(() => {
      this.rawSocket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        buffer.set(msg.symbol, msg.price);
      };

      // Flush buffer on animation frame
      let animationFrameId: number;
      const flush = () => {
        if (buffer.size > 0) {
          // Re-enter Angular zone only to emit the batched batch!
          this.ngZone.run(() => subscriber.next(new Map(buffer)));
          buffer = new Map();
        }
        animationFrameId = requestAnimationFrame(flush);
      };
      animationFrameId = requestAnimationFrame(flush);

      return () => cancelAnimationFrame(animationFrameId);
    });
  });
}
```

```typescript
// 2. Component Level: Virtual Scroll + OnPush + Signals
@Component({
  selector: 'app-ticker-grid',
  standalone: true,
  imports: [ScrollingModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cdk-virtual-scroll-viewport itemSize="40" class="viewport">
      <div *cdkVirtualFor="let ticker of tickers(); trackBy: trackSymbol" class="ticker-row">
        <span>{{ ticker.symbol }}</span>
        <span>{{ ticker.price }}</span>
      </div>
    </cdk-virtual-scroll-viewport>
  `
})
export class TickerGridComponent {
  // Only the visible 20 DOM nodes are rendered in memory!
}
```

---

## Scenario 3: Cross-Site Scripting (XSS) Incident & Zero-Trust Remediation

### Interviewer Prompt:
> *"A penetration tester discovered an XSS vulnerability where an attacker injects a script into their user profile bio that executes when customer support agents view their account. How do you respond to the incident?"*

### Model Answer:

#### 1. Immediate Incident Response:
- **Containment:** Temporarily deploy a restrictive Content Security Policy (CSP) header blocking `'unsafe-inline'` script execution:
  `Content-Security-Policy: default-src 'self'; script-src 'self';`
- **Sanitization Audit:** Locate where the user bio is rendered. The bug is almost certainly caused by:
  `this.sanitizer.bypassSecurityTrustHtml(bio)` or `elementRef.nativeElement.innerHTML = bio`.

#### 2. Root Cause Remediation:
- Remove `bypassSecurityTrustHtml` immediately.
- Use standard Angular interpolation `{{ bio }}` or DOMPurify if rich text is required:
  ```typescript
  import DOMPurify from 'dompurify';

  get safeBio(): string {
    return DOMPurify.sanitize(this.userBio);
  }
  ```
- **Defense in Depth:** Configure DOM Trusted Types to turn any future un-sanitized DOM write into a browser runtime error.

---

## Scenario 4: Multi-Team Monorepo vs Micro-Frontends Architectural Decision

### Interviewer Prompt:
> *"Your company has 6 independent feature teams contributing to a core enterprise SaaS application. Two teams want Micro-Frontends via Module Federation; four teams want a unified Monorepo (Nx). How do you evaluate and guide this architectural decision?"*

### Model Answer:

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ Single Monorepo (Nx / Angular CLI)   │ Micro-Frontends (Module Federation) │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ PROS:                                │ PROS:                                │
│ - Single version of Angular/RxJS      │ - Complete independent deployments   │
│ - Zero runtime bundle duplication    │ - Autonomous team release cycles     │
│ - Instant atomic cross-app refactoring│ - Isolated CI/CD pipelines           │
│ - Shared design system components    │                                      │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ CONS:                                │ CONS:                                │
│ - Requires disciplined CI tooling    │ - Runtime bundle duplication (size)  │
│ - Potential merge queue bottlenecks  │ - High operational/versioning tax    │
│                                      │ - Challenging cross-MFE routing/auth │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

**Recommendation:**
- If all teams write Angular and share the same release schedule or release multiple times daily, **an Nx Monorepo is 80% cheaper to maintain**.
- Micro-frontends should only be chosen if teams have truly disparate deployment cadences, separate backend microservices, or differing tech stacks where cross-team coordination is a major bottleneck.

---

## Scenario 5: Mysterious Production Memory Leak After Repeated Navigation

### Interviewer Prompt:
> *"Users report that after working in an Angular application for 2 hours and navigating between Customer Detail and Invoice views, the browser tab consumes 2GB of RAM and crashes with 'Out of Memory'. How do you isolate the leak?"*

### Model Answer:
1. **Reproduce & Take Heap Snapshots:**
   - In Chrome DevTools Memory tab, record Snapshot 1 (Baseline).
   - Navigate: Customer Detail ➔ Invoices ➔ Customer Detail (10 times).
   - Force Garbage Collection and record Snapshot 2.
2. **Analyze Retaining Paths:**
   - Filter Snapshot 2 for `CustomerDetailComponent`.
   - Inspect the **Retainers Tree**.
3. **Common Culprits:**
   - **Lingering Observable:** `this.customerService.selectedCustomer$.subscribe(...)` was not unsubscribed. The service singleton holds the component in memory.
   - **DOM Event Listener:** `window.addEventListener('resize')` attached in constructor without removal.
4. **Remedy:** Refactor subscriptions to `takeUntilDestroyed()`, or convert streams to signals via `toSignal()`.

---

## Scenario 6: Audit & Remediation of an Insecure AI-Generated Feature

### Interviewer Prompt:
> *"A junior developer used an AI coding assistant to implement a 'Remember Me' authentication feature. In the PR, they stored the user's password and JWT in `localStorage` and bypassed route guards with `if (localStorage.getItem('token'))`. How do you provide constructive, actionable architectural feedback?"*

### Model Answer:
1. **Acknowledge Velocity, Highlight Security Non-Negotiables:**
   - Explain that AI models frequently default to insecure shortcuts that compile but violate enterprise compliance (SOC 2, GDPR).
2. **Provide Concrete Technical Corrections:**
   - **Token Storage:** Move tokens out of `localStorage`. Explain how an XSS vulnerability allows an attacker to exfiltrate tokens via `localStorage.getItem()`. Mandate `HttpOnly`, `Secure`, `SameSite=Strict` cookies with `__Host-` prefix.
   - **Password Security:** Never store plain passwords anywhere in the client.
   - **Route Guards vs Authorization:** Reiterate that route guards are UX helpers, not security barriers. Ensure the backend independently validates session cookies.

---

## Revision Checklist

- [ ] Structure architectural answers using: Principles ➔ Roadmap ➔ Risk Mitigation.
- [ ] Optimize high-frequency WebSocket streams using `runOutsideAngular` + `requestAnimationFrame`.
- [ ] Respond to XSS incidents using immediate CSP containment and Trusted Types.
- [ ] Evaluate Monorepo vs Micro-Frontends using concrete operational trade-offs.
- [ ] Troubleshoot memory leaks using Chrome Heap Snapshot Retainer trees.
