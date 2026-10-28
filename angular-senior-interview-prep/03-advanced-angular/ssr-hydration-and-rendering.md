# Server-Side Rendering (SSR), Hydration, and Rendering Architectures

> **Phase:** 3 — Advanced Angular  
> **Related:** [performance-optimization.md](./performance-optimization.md) | [standalone-and-architecture.md](./standalone-and-architecture.md) | [angular-v20-to-v22-comparison.md](../10-version-comparison/angular-v20-to-v22-comparison.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Prerequisites](#prerequisites)
3. [SSR Fundamentals and Evolution](#ssr-fundamentals-and-evolution)
4. [SSR vs SSG (Prerendering) vs CSR](#ssr-vs-ssg-prerendering-vs-csr)
5. [Angular Hydration Engine Deep-Dive](#angular-hydration-engine-deep-dive)
6. [Non-Destructive Hydration vs Incremental Hydration](#non-destructive-hydration-vs-incremental-hydration)
7. [Event Replay Mechanism](#event-replay-mechanism)
8. [Handling Platform Differences: Browser vs Server](#handling-platform-differences-browser-vs-server)
9. [TransferState API: Eliminating Duplicate Network Calls](#transferstate-api-eliminating-duplicate-network-calls)
10. [SSR Security & Secret Leakage](#ssr-security--secret-leakage)
11. [Production Deployment and Edge SSR](#production-deployment-and-edge-ssr)
12. [Common Mistakes and Hydration Traps](#common-mistakes-and-hydration-traps)
13. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
14. [Hands-On Implementation Scenario](#hands-on-implementation-scenario)
15. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Master Angular SSR setup and configuration in modern standalone applications (`provideClientHydration()`, `provideServerRendering()`).
- Understand internal differences between full destructive re-rendering (legacy Universal), non-destructive hydration (Angular 16+), and event replay (Angular 18+), plus incremental hydration (Angular 19/20+).
- Safely isolate server-side vs client-side APIs (`isPlatformBrowser`, `isPlatformServer`, `DOCUMENT`, `afterRender`, `afterNextRender`).
- Use `TransferState` and HTTP caching to prevent data flicker and redundant backend requests.
- Identify and troubleshoot DOM mismatch hydration errors (NG0500 series).
- Address SSR-specific security risks (secret leakage, SSRF, per-user state leakage in node servers).

---

## SSR Fundamentals and Evolution

### The Historical Problem: Destructive Re-rendering (Angular Universal)
In Angular Universal (prior to v16), Angular rendered the HTML on the Node.js server and served static HTML to the client for fast initial paint. However, once the client-side JavaScript loaded, Angular destroyed the server-rendered DOM nodes completely and recreated the entire DOM tree from scratch.

This caused:
1. **Unpleasant Visual Flicker:** Visible screen flash when client-side Angular bootstrapped.
2. **Lost User Focus and Input:** Any keystrokes typed by a user into an input before client bootstrapping completed were discarded.
3. **High CPU overhead:** The client rendered the entire UI twice (once via HTML parser, once in JavaScript).

### Modern Angular SSR: Non-Destructive Hydration (Angular 16+)
Introduced in Angular 16 and default in modern Angular CLI projects, **non-destructive hydration** allows client-side Angular to:
- Traverse the existing server-rendered DOM instead of destroying it.
- Associate internal Angular framework data structures (LViews, TNodes, components, directives) with existing real DOM elements.
- Attach event listeners directly to the pre-rendered nodes.
- Preserve text, attributes, focus state, and scroll position.

---

## SSR vs SSG (Prerendering) vs CSR

| Architectural Pattern | Render Time | Hosting Requirement | TTFB | FCP / LCP | SEO / Social Crawlers | Use Case |
|---|---|---|---|---|---|---|
| **CSR (Client-Side Rendering)** | Client browser runtime | Static storage / CDN (S3, Cloudflare Pages) | Very Fast (static index.html) | Slower (requires JS fetch + execution) | Limited (crawlers must run JS) | Authenticated internal SaaS dashboards, admin panels, complex SPAs |
| **SSG / Prerendering** | Build time (`ng build --prerender`) | Static CDN | Ultra Fast (static files at edge) | Fast (instant HTML + CSS) | Ideal (static HTML) | Marketing pages, public documentation, blog posts, static product catalogs |
| **SSR (Dynamic)** | Request time (Node.js/Edge runtime) | Compute runtime (Node server, Cloudflare Worker, AWS Lambda) | Dependent on backend latency & server load | Fast for visual paint, requires fast TTFB | Ideal (fresh, personalized metadata and HTML) | E-commerce detail pages, live news, localized user-facing public web apps |

---

## Angular Hydration Engine Deep-Dive

### Enabling Hydration in Modern Standalone Apps

In `app.config.ts`:

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()), // Native fetch is recommended for SSR performance
    provideClientHydration(
      withEventReplay(), // Replays user events clicked before bootstrap
      withHttpTransferCacheOptions({
        includePostRequests: false,
        filter: (req) => !req.url.includes('/api/ephemeral-ping')
      })
    )
  ]
};
```

In `app.config.server.ts`:

```typescript
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering()
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

### Server Entry Point (`server.ts`)
Using the modern Angular Application Builder (esbuild-based):

```typescript
import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Serve static assets from /browser
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the CommonEngine
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}
```

---

## Non-Destructive Hydration vs Incremental Hydration

### How Hydration Works Internally
1. When generating HTML on the server, Angular inserts metadata attributes (such as `ngh="0"`, where `ngh` stands for **N**g **H**ydration) and comments identifying dynamic component boundaries and projected content.
2. An embedded script containing hydration serialization manifests (TNode maps, text node references) is appended to the bottom of the HTML document.
3. On the client, Angular parses this manifest: instead of creating DOM elements with `document.createElement()`, it walks the pre-existing DOM tree and attaches component bindings to existing node references.

### Incremental Hydration (Angular 19 Developer Preview / Angular 20 Stable)
Traditional hydration hydrates the entire application tree at once during initial load. 
Incremental hydration integrates with Angular's deferrable views (`@defer`):
- HTML and CSS for deferred content are rendered on the server during SSR.
- On the client, the JavaScript bundle for the deferred component is **not loaded**, and the DOM is **not hydrated** until the deferred trigger occurs (e.g. `@defer (hydrate on viewport)` or `@defer (hydrate on interaction)`).
- This drastically reduces initial JavaScript execution and improves **INP** (Interaction to Next Paint) and **TBT** (Total Blocking Time).

```html
<!-- Example of incremental hydration in modern Angular -->
@defer (hydrate on viewport) {
  <app-heavy-comments-section [articleId]="article().id" />
} @placeholder {
  <div class="skeleton-comments">Loading discussion...</div>
}
```

---

## Event Replay Mechanism

When `withEventReplay()` is enabled in `provideClientHydration()`:
1. A micro-inline script (< 1KB) is injected at the top of the HTML by Angular SSR.
2. The script listens globally to events like `click`, `input`, `keydown` before the Angular client bundle finishes loading and initializing.
3. The events are queued in a lightweight structure with their target elements.
4. Once the target component completes hydration, Angular dispatches the recorded events to the component's event listeners, preserving user intent without dropped interactions.

---

## Handling Platform Differences: Browser vs Server

### The Rule of Universal Code
Code running during SSR executes in a Node.js process. Browser globals (`window`, `document`, `navigator`, `localStorage`, `sessionStorage`, `IndexedDB`, `HTMLCanvasElement`, `screen`) **do not exist** on the server and will crash the server process with `ReferenceError: window is not defined`.

### Correct Platform Detection

```typescript
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';

@Component({
  selector: 'app-responsive-banner',
  standalone: true,
  template: `
    <p>Window width: {{ screenWidth() }}px</p>
    @if (isBrowser) {
      <p>Running on client browser</p>
    }
  `
})
export class ResponsiveBannerComponent {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly screenWidth = signal<number>(1024); // Safe default for SSR

  constructor() {
    if (this.isBrowser) {
      this.screenWidth.set(window.innerWidth);
      window.addEventListener('resize', () => {
        this.screenWidth.set(window.innerWidth);
      });
    }
  }
}
```

### Modern Lifecycle Hooks: `afterRender` and `afterNextRender`

Angular provides `afterRender` and `afterNextRender` specifically designed to eliminate manual `isPlatformBrowser` checks. **These hooks only execute in the browser**:

```typescript
import { Component, ElementRef, viewChild, afterNextRender } from '@angular/core';

@Component({
  selector: 'app-chart',
  standalone: true,
  template: `<canvas #chartCanvas></canvas>`
})
export class ChartComponent {
  canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');

  constructor() {
    // Guaranteed to execute ONLY on the browser, after the initial DOM paint
    afterNextRender(() => {
      const ctx = this.canvasRef().nativeElement.getContext('2d');
      if (ctx) {
        // Initialize third-party chart library safely
        this.initCanvasChart(ctx);
      }
    });
  }

  private initCanvasChart(ctx: CanvasRenderingContext2D) {
    // Third-party chart drawing logic
  }
}
```

---

## TransferState API: Eliminating Duplicate Network Calls

### The Duplicate Fetch Problem
Without `TransferState`:
1. Node server executes `httpClient.get('/api/products')` and renders HTML.
2. Browser receives HTML and immediately executes `httpClient.get('/api/products')` again when Angular bootstraps on the client.
3. This creates unnecessary database load and causes visible content flicker if data changed slightly.

### Solution: Automatic HTTP Transfer Cache
Angular includes an automatic HTTP transfer cache out of the box with `provideClientHydration()`. GET and HEAD requests performed during SSR are automatically serialized into the HTML body and read into client memory during bootstrap.

For manual caching or complex state:

```typescript
import { Component, inject, OnInit, signal, makeStateKey, TransferState } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface Product {
  id: string;
  name: string;
  price: number;
}

const PRODUCTS_KEY = makeStateKey<Product[]>('SERVER_PRODUCTS');

@Component({
  selector: 'app-product-list',
  standalone: true,
  template: `
    @for (p of products(); track p.id) {
      <div class="product-card">{{ p.name }} - \${{ p.price }}</div>
    }
  `
})
export class ProductListComponent implements OnInit {
  private http = inject(HttpClient);
  private transferState = inject(TransferState);

  products = signal<Product[]>([]);

  async ngOnInit() {
    // 1. Check if TransferState already contains the data serialized from server
    if (this.transferState.hasKey(PRODUCTS_KEY)) {
      const data = this.transferState.get(PRODUCTS_KEY, []);
      this.products.set(data);
      // Clean up key so client-side navigation can fetch fresh data later
      this.transferState.remove(PRODUCTS_KEY);
      return;
    }

    // 2. Otherwise fetch from API (runs on server or client-side navigation)
    const data = await firstValueFrom(this.http.get<Product[]>('/api/products'));
    this.products.set(data);

    // 3. If running on server, serialize data for client consumption
    this.transferState.set(PRODUCTS_KEY, data);
  }
}
```

---

## SSR Security & Secret Leakage

### 1. Secret Exposure in Client Bundles and TransferState
Never put database connection strings, private API keys, or admin tokens in injectable services that are included in the shared client bundle. 
Anything added to `TransferState` is serialized into the public HTML payload as raw JSON. If an admin token is accidentally put in `TransferState`, any user can inspect page source and extract it!

### 2. State Leakage Across Users (Singleton Concurrency Hazard)
In a client browser, Angular runs in a dedicated browser sandbox for a single user. In Node.js SSR, a single Node process handles requests from **hundreds of concurrent users**.
- **Dangerous Anti-pattern:** Storing user-specific session data or authorization tokens in global variables, static class fields, or root services that aren't scoped per request.
- **Consequence:** User A makes a request; user A's profile data is placed in a static variable; User B makes a request concurrently and receives User A's profile!

### 3. Server-Side Request Forgery (SSRF)
When Angular SSR calls internal APIs based on user-supplied URLs or headers (`X-Forwarded-Host`, `referer`), an attacker could craft requests pointing to internal metadata services (e.g., `http://169.254.169.254/latest/meta-data/` on AWS). Always validate API URLs against a strict whitelist.

---

## Common Mistakes and Hydration Traps

### Trap 1: Manipulating the DOM Directly via nativeElement or Vanilla JS
```typescript
// UNSAFE / HYDRATION ERROR TRIGGER:
constructor(private el: ElementRef) {
  // Modifying the DOM directly before hydration completes causes NG0500 DOM mismatch error!
  this.el.nativeElement.innerHTML = '<p>Custom dynamic text</p>';
}
```
**Fix:** Always use Angular template syntax (`@if`, bindings) or defer direct DOM manipulation to `afterNextRender()`.

### Trap 2: Invalid HTML Structure
The browser's HTML parser autocorrects invalid HTML (e.g., putting a `<div>` inside a `<p>`, or forgetting `<tbody>` inside a `<table>`). The server renders the raw string, but the browser parser rearranges the DOM tree before Angular hydrates. Angular sees different node structures and throws a hydration mismatch error.

### Trap 3: Rendering Different Content on Server vs Client (e.g. `Date.now()` or `Math.random()`)
```typescript
// Triggers Hydration Error: Server renders one timestamp, Client renders another!
@Component({
  template: `<span>Current Time: {{ currentTime }}</span>`
})
export class ClockComponent {
  currentTime = new Date().toISOString(); // Different in server vs client!
}
```
**Fix:**
If dynamic client-only data must differ from SSR:
1. Use `ngSkipHydration` attribute on the element: `<span ngSkipHydration>{{ currentTime }}</span>`.
2. Or initialize with a stable server value and update inside `afterNextRender()`.

---

## Senior Interview Questions with Detailed Answers

### Q1: What causes Angular Hydration Error NG0500, and how do you diagnose and fix it in production?
**Answer:**
Error NG0500 (Hydration node mismatch) occurs during client-side hydration when the DOM tree serialized by the server does not match the DOM structure expected by Angular's component template.
**Root causes:**
1. **HTML parser correction:** E.g., nested `<a>` tags, `<div>` inside `<p>`, or missing `<tbody>` causing the browser to auto-insert tags.
2. **Dynamic client state during render:** Rendering `new Date().toLocaleTimeString()` or `Math.random()` directly in the template.
3. **Browser extensions altering DOM:** Ad-blockers or password managers injecting `<style>` or `<input>` attributes into the HTML before Angular bootstraps.
4. **Direct DOM mutation:** Calling `element.appendChild()` or `innerHTML = ...` before hydration finishes.

**How to diagnose:**
Run Angular in development mode. Angular prints a detailed DOM comparison in the DevTools console showing the exact expected node vs actual DOM node, including component selector and line numbers.

**How to fix:**
- Correct HTML syntax errors.
- Wrap third-party components or dynamic areas with the `ngSkipHydration` attribute if necessary.
- Defer client-only rendering to `afterNextRender()`.

---

### Q2: Compare full SSR vs SSG (Prerendering) vs Dynamic Client-Side Rendering from an architectural cost and performance standpoint.
**Answer:**
- **CSR:** Zero server compute cost (hosted on CDN/S3). High scalability. Trade-off: Slower LCP on low-end devices and poor SEO/crawling for bot clients.
- **SSG:** Ideal balance for static or infrequently updated content (blogs, docs, product catalogs). Pre-rendered at build time into static files on CDN edge. Zero server compute per request, ultra-fast TTFB (< 50ms), perfect SEO. Limitation: Build times scale with page count (thousands of pages take hours to compile).
- **Dynamic SSR:** Server renders HTML on every HTTP request in Node.js or Edge runtime. Essential for real-time, user-personalized, or frequently mutating public content. Trade-offs: Requires server infrastructure, horizontal scaling, memory monitoring, and TTFB depends directly on backend API response latency. Requires strict safeguards against cross-user memory leakage and SSRF.

---

### Q3: How does the new `withEventReplay()` feature in Angular 18+ work under the hood?
**Answer:**
Prior to event replay, if a user clicked a button or typed into an input while the client bundle was downloading or initializing, those events were lost or ignored because component listeners were not yet attached to the DOM.
`withEventReplay()` injects an ultra-lightweight inline JavaScript snippet into the server-rendered `<head>`. This snippet listens to high-priority user interaction events (`click`, `input`, `change`, `keydown`) at the `document` level and records them into a replay buffer with references to the target elements.
When the Angular client application finishes hydrating and binds component event handlers, Angular inspects the recorded queue and replays those user events in order on the corresponding hydrated components.

---

## Hands-On Implementation Scenario

### Requirement
Implement an SEO-friendly Product Detail Page that:
1. Renders meta tags and product data on the server for search engine crawlers.
2. Uses `TransferState` so the browser doesn't refetch the product on bootstrap.
3. Safely records window scroll position only when running on the browser.
4. Uses `afterNextRender` to initialize a client-side analytics widget.

```typescript
import { Component, inject, OnInit, signal, afterNextRender } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Title, Meta } from '@angular/platform-browser';
import { TransferState, makeStateKey } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface ProductDetail {
  id: string;
  title: string;
  description: string;
  price: number;
}

const PRODUCT_KEY = makeStateKey<ProductDetail>('PRODUCT_DETAIL_DATA');

@Component({
  selector: 'app-product-detail',
  standalone: true,
  template: `
    @if (product(); as p) {
      <main class="product-container">
        <h1>{{ p.title }}</h1>
        <p class="description">{{ p.description }}</p>
        <span class="price">\${{ p.price }}</span>
        <button (click)="addToCart(p)">Add to Cart</button>
      </main>
    } @else {
      <p>Loading product...</p>
    }
  `
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private title = inject(Title);
  private meta = inject(Meta);
  private transferState = inject(TransferState);

  readonly product = signal<ProductDetail | null>(null);

  constructor() {
    // Client-only initialization without isPlatformBrowser guards
    afterNextRender(() => {
      this.initAnalyticsTracker();
    });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '1';

    if (this.transferState.hasKey(PRODUCT_KEY)) {
      const cached = this.transferState.get(PRODUCT_KEY, null);
      this.product.set(cached);
      this.transferState.remove(PRODUCT_KEY);
      if (cached) this.updateSeo(cached);
      return;
    }

    const fetched = await firstValueFrom(
      this.http.get<ProductDetail>(`https://api.example.com/products/${id}`)
    );

    this.product.set(fetched);
    this.updateSeo(fetched);
    this.transferState.set(PRODUCT_KEY, fetched);
  }

  private updateSeo(product: ProductDetail) {
    this.title.setTitle(`${product.title} | Premium Store`);
    this.meta.updateTag({ name: 'description', content: product.description });
    this.meta.updateTag({ property: 'og:title', content: product.title });
    this.meta.updateTag({ property: 'og:description', content: product.description });
  }

  private initAnalyticsTracker() {
    console.log('[Analytics] Initialized on client for product', this.product()?.id);
  }

  addToCart(item: ProductDetail) {
    console.log('Added to cart:', item.id);
  }
}
```

---

## Revision Checklist

- [ ] Explain the difference between destructive re-rendering (Universal) and non-destructive hydration (Angular 16+).
- [ ] Understand the role of `provideClientHydration()`, `withEventReplay()`, and `withHttpTransferCacheOptions()`.
- [ ] Know how `afterRender` and `afterNextRender` supersede manual `isPlatformBrowser` checks in components.
- [ ] Implement `TransferState` to prevent duplicate API requests between server and client.
- [ ] Recognize causes of `NG0500` hydration mismatch errors (invalid HTML, dynamic dates, direct DOM tampering).
- [ ] Explain why user state must never be stored in global singletons during Node.js SSR.
- [ ] Describe the benefits of incremental hydration with `@defer (hydrate on ...)` in Angular 19/20+.
