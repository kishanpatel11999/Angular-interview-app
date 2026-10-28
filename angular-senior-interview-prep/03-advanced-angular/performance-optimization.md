# Performance Optimization

> **Phase:** 3 — Advanced Angular  
> **Related:** [lifecycle-change-detection.md](../02-core-angular/lifecycle-change-detection.md) | [ssr-hydration-and-rendering.md](./ssr-hydration-and-rendering.md) | [angular-build-and-tooling.md](./angular-build-and-tooling.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Core Web Vitals](#core-web-vitals)
3. [Change Detection Optimization](#change-detection-optimization)
4. [Template Performance](#template-performance)
5. [Bundle Size Optimization](#bundle-size-optimization)
6. [Image Optimization](#image-optimization)
7. [Virtual Scrolling](#virtual-scrolling)
8. [Profiling Tools](#profiling-tools)
9. [Interview Questions with Answers](#interview-questions-with-answers)
10. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Measure and improve Core Web Vitals (LCP, INP, CLS).
- Optimize Angular change detection with OnPush and signals.
- Reduce JavaScript bundle size through code splitting and tree-shaking.
- Profile an Angular application to identify actual bottlenecks.

---

## Core Web Vitals

Google's Core Web Vitals are the primary performance metrics for web applications:

| Metric | Measures | Good threshold |
|--------|----------|---------------|
| **LCP** (Largest Contentful Paint) | When the largest visible element renders | ≤ 2.5 seconds |
| **INP** (Interaction to Next Paint) | Responsiveness to user inputs | ≤ 200ms |
| **CLS** (Cumulative Layout Shift) | Visual stability | ≤ 0.1 |

### Measuring Core Web Vitals

```bash
# Lighthouse in Chrome DevTools → Performance → Core Web Vitals
# Or: web-vitals library in your app
npm install web-vitals

# In main.ts or separate analytics module
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(metric => analytics.sendVital('LCP', metric.value));
onINP(metric => analytics.sendVital('INP', metric.value));
onCLS(metric => analytics.sendVital('CLS', metric.value));
```

### Improving LCP

- **SSR/prerendering:** Serve HTML immediately, don't wait for JavaScript to bootstrap.
- **Critical CSS:** Inline above-the-fold styles to avoid render-blocking.
- **Image optimization:** Use `NgOptimizedImage` with proper `width`/`height` and `priority` attribute.
- **Preloading:** `<link rel="preload">` for LCP image.
- **Font optimization:** `font-display: swap` to prevent invisible text.

### Improving INP (replacing FID)

- **Long tasks:** Break tasks >50ms into smaller chunks using `scheduler.postTask` or `setTimeout`.
- **Reduce main thread work:** Move complex computation to Web Workers.
- **Reduce component render time:** Use `OnPush`, virtual scrolling, avoid heavy computations in templates.

### Improving CLS

- **Reserve space for images:** Always specify `width` and `height` on images.
- **Avoid inserting content above existing content:** Load above-fold content with SSR.
- **Stable animations:** Use CSS `transform` and `opacity` — they don't trigger layout.

---

## Change Detection Optimization

### OnPush Everywhere

```typescript
// Every component should use OnPush in production apps
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  ...
})
export class FeatureComponent {}
```

### Signals — Zero-Cost Reactivity

```typescript
// With signals, CD only runs for components whose signals actually changed
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ count() }} {{ expensive() }}`
})
export class SignalComponent {
  count = signal(0);
  expensive = computed(() => {
    // Only re-runs when count changes, not on every CD cycle
    return heavyComputation(this.count());
  });
}
```

### Avoid Function Calls in Templates

```html
<!-- WRONG: getItems() is called on EVERY change detection cycle -->
@for (item of getItems(); track item.id) { ... }

<!-- CORRECT: computed signal — only recalculates when dependency changes -->
@for (item of filteredItems(); track item.id) { ... }
```

---

## Template Performance

### trackBy / track in @for

```html
<!-- @for requires track — prevents unnecessary DOM recreation -->
@for (user of users; track user.id) {
  <app-user-card [user]="user" />
}

<!-- Legacy *ngFor with trackBy -->
<app-user-card *ngFor="let user of users; trackBy: trackById" [user]="user" />
```

```typescript
trackById(index: number, user: User): number { return user.id; }
```

### Deferring Non-Critical Components

```html
<!-- Heavy chart component — only load when in viewport -->
@defer (on viewport; prefetch on idle) {
  <app-analytics-chart [data]="chartData" />
} @placeholder {
  <div class="chart-skeleton" style="height: 300px;"></div>
}
```

---

## Bundle Size Optimization

### Analyzing Bundles

```bash
# Build and analyze bundle sizes
ng build --stats-json
npx webpack-bundle-analyzer dist/app/stats.json

# Or use source-map-explorer
npm install -g source-map-explorer
ng build --source-map
source-map-explorer dist/app/*.js
```

### Tree-Shaking

Tree-shaking eliminates unused code. Ensure it works by:

- Using `providedIn: 'root'` on services (not `NgModule.providers`).
- Importing specific items from libraries, not the entire library:

```typescript
// WRONG: imports entire lodash
import _ from 'lodash';
_.cloneDeep(obj);

// CORRECT: imports only cloneDeep
import { cloneDeep } from 'lodash-es';
cloneDeep(obj);
```

### Lazy Loading

```typescript
// Split code by route — each lazy route is a separate chunk
export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent)
  }
];
```

### Differential Loading and Modern Browser Targets

```typescript
// angular.json — target modern browsers to reduce polyfills
"browserslist": "> 0.5%, last 2 years, Firefox ESR, not dead"
```

### Avoid Large Dependencies

| Heavy library | Lighter alternative |
|---|---|
| moment.js (67KB) | date-fns or Intl.DateTimeFormat |
| lodash (72KB) | lodash-es (tree-shakable) or native JS |
| jQuery | Vanilla JS / Angular CDK |

---

## Image Optimization

Angular 15+ provides `NgOptimizedImage` directive:

```typescript
import { NgOptimizedImage } from '@angular/common';

@Component({
  standalone: true,
  imports: [NgOptimizedImage],
  template: `
    <!-- Priority image (LCP candidate) — preloaded -->
    <img
      ngSrc="/images/hero.jpg"
      width="1200"
      height="600"
      priority
      alt="Hero image">

    <!-- Regular image — lazy loaded -->
    <img
      ngSrc="/images/product.jpg"
      width="400"
      height="400"
      alt="Product image">

    <!-- Fill mode — for CSS-controlled dimensions -->
    <div style="position: relative; height: 300px;">
      <img ngSrc="/images/banner.jpg" fill alt="Banner">
    </div>
  `
})
export class ImageComponent {}
```

`NgOptimizedImage` automatically:
- Adds `loading="lazy"` for non-priority images.
- Adds `fetchpriority="high"` for priority images.
- Warns if `width`/`height` are missing (prevents CLS).
- Warns if an LCP image doesn't have `priority`.
- Generates `srcset` for responsive images with image loaders (Cloudinary, Imgix).

---

## Virtual Scrolling

For large lists (1000+ items), render only visible items:

```typescript
import { CdkVirtualScrollViewport, CdkFixedSizeVirtualScroll, CdkVirtualForOf } from '@angular/cdk/scrolling';

@Component({
  standalone: true,
  imports: [CdkVirtualScrollViewport, CdkFixedSizeVirtualScroll, CdkVirtualForOf],
  template: `
    <cdk-virtual-scroll-viewport itemSize="56" style="height: 500px;">
      <div *cdkVirtualFor="let item of items; trackBy: trackById" class="item">
        {{ item.name }}
      </div>
    </cdk-virtual-scroll-viewport>
  `
})
export class VirtualListComponent {
  items = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Item ${i}` }));
  trackById = (_: number, item: any) => item.id;
}
```

---

## Profiling Tools

### Angular DevTools

- **Component tree:** Inspect component hierarchy and change detection status.
- **Profiler:** Record and analyze CD cycles — shows which components were checked and how long.

### Chrome DevTools Performance Tab

1. Open DevTools → Performance.
2. Click "Record" and interact with the application.
3. Stop recording.
4. Look for **long tasks** (red bars — >50ms).
5. Identify if long tasks are in Angular's zone callbacks, component rendering, or application logic.

### Lighthouse

```bash
# Run Lighthouse from CLI
npx lighthouse https://your-app.com --output html --output-path report.html
```

Reports on: Performance (Core Web Vitals), Accessibility, Best Practices, SEO.

---

## Interview Questions with Answers

**Q: How would you investigate a slow initial application load?**

> Investigation steps: (1) Run Lighthouse or WebPageTest to measure LCP, TTI, and total blocking time. (2) Analyze the network waterfall — identify the largest JS chunks. (3) Run `source-map-explorer` on the production build to identify what's in the bundle. (4) Check if routes are lazy-loaded — eager loading all routes increases initial load. (5) Check for large synchronous imports (lodash, moment, rxjs operators imported in bulk). (6) Verify `NgOptimizedImage` is used with `priority` on the LCP image. (7) Consider SSR for immediate HTML content. Fixes: lazy loading, tree-shaking, smaller libraries, SSR, CDN with appropriate cache headers.

**Q: What is the impact of not using `trackBy` in `*ngFor`?**

> Without `trackBy` (or `track` in `@for`), Angular uses object identity to match list items to DOM nodes. When the array reference changes (common with immutable state), Angular cannot reuse any existing DOM nodes — it destroys all and recreates all, even if only one item changed. With `trackBy: item.id`, Angular can identify which items are unchanged (reuse DOM nodes), which were added (create), and which were removed (destroy). For lists of 100+ items with frequent updates, this is the difference between smooth 60fps rendering and janky multi-hundred-millisecond updates.

---

## Revision Checklist

- [ ] Know LCP, INP, CLS thresholds and how to improve each.
- [ ] Can explain why function calls in templates hurt performance.
- [ ] Know how to analyze bundle size with source-map-explorer.
- [ ] Can implement virtual scrolling with CDK.
- [ ] Know how `NgOptimizedImage` improves LCP and CLS.
- [ ] Can use Angular DevTools profiler to identify CD bottlenecks.

---

## Further Reading

- [web.dev: Core Web Vitals](https://web.dev/vitals/)
- [Angular: NgOptimizedImage](https://angular.dev/api/common/NgOptimizedImage)
- [CDK: Virtual Scrolling](https://material.angular.io/cdk/scrolling/overview)
- [Angular: Build performance](https://angular.dev/tools/cli/build)
