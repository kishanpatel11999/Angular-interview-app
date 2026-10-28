# Frontend System Design for Senior Angular Architects

> **Phase:** 7 — Interview Practice  
> **Related:** [scenario-based-questions.md](./scenario-based-questions.md) | [performance-optimization.md](../03-advanced-angular/performance-optimization.md) | [state-management.md](../03-advanced-angular/state-management.md)

---

## Table of Contents

1. [Overview & The 45-Minute Frontend System Design Framework (RADIO)](#overview--the-45-minute-frontend-system-design-framework-radio)
2. [System Design 1: Infinite Scrolling Social Media & Media Feed](#system-design-1-infinite-scrolling-social-media--media-feed)
   - Requirements & Scope
   - Component & State Architecture
   - Virtualization & Memory Management
   - Predictive Prefetching & Image Caching
   - Optimistic Mutations & Offline Resilience
3. [System Design 2: Real-Time Collaborative Kanban Board (Trello / Jira)](#system-design-2-real-time-collaborative-kanban-board-trello--jira)
   - Architecture & WebSocket Protocol
   - Drag-and-Drop Performance with Angular CDK
   - Conflict Resolution: Optimistic UI vs Server Truth
4. [System Design 3: Enterprise Configurable Analytics Dashboard](#system-design-3-enterprise-configurable-analytics-dashboard)
   - Dynamic Component Engine & Widget Grid
   - Plugin Architecture & Micro-Frontends
   - Global Event Bus & Synchronized Filtering
5. [State Management Selection Criteria](#state-management-selection-criteria)
6. [Offline-First Architecture & Service Workers](#offline-first-architecture--service-workers)
7. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
8. [Revision Checklist](#revision-checklist)

---

## Overview & The 45-Minute Frontend System Design Framework (RADIO)

Senior frontend interviews frequently feature an open-ended system design round. To deliver a structured, comprehensive answer, use the **RADIO framework**:

```
[ R - Requirements & Clarifications (5 mins) ]
  ├── Functional requirements (core user workflows)
  └── Non-functional requirements (latency, offline, devices, a11y, scale)

[ A - Architecture & High-Level Components (10 mins) ]
  ├── Component hierarchy (containers, presentational, layout)
  ├── Routing & Lazy loading boundaries
  └── Data flow topology (Unidirectional, Signals, RxJS, Store)

[ D - Data Model & State Strategy (10 mins) ]
  ├── Client state vs Server state vs URL state
  └── TypeScript interfaces and normalization

[ I - Interface & API Design (10 mins) ]
  ├── REST / GraphQL / WebSocket endpoints
  ├── Real-time protocols & pagination contracts
  └── Error & retry handling

[ O - Optimizations & Deep-Dives (10 mins) ]
  ├── Performance (Core Web Vitals, virtualization, code splitting)
  ├── Security (XSS, CSRF, auth tokens)
  └── Telemetry & offline caching (Service Workers, IndexedDB)
```

---

## System Design 1: Infinite Scrolling Social Media & Media Feed

### 1. Requirements
- **Functional:** Scroll through endless posts containing text, images, and video; like/comment on posts; pull-to-refresh; persist scroll position on navigation.
- **Non-Functional:** Maintain 60 FPS scrolling on mobile devices; < 100MB RAM usage; instant response to like interactions (optimistic UI); offline browsing of cached posts.

### 2. High-Level Architecture
```
┌───────────────────────────────────────────────────────────────┐
│                       FeedContainer                           │
│  ├── VirtualScrollViewport (CDK Scrolling)                    │
│  │     └── @for (post of posts(); track post.id)              │
│  │           ├── TextPostCard                                 │
│  │           ├── ImagePostCard (NgOptimizedImage)             │
│  │           └── VideoPostCard (IntersectionObserver Player)  │
└───────────────────────────────┬───────────────────────────────┘
                                │
                  ┌─────────────▼──────────────┐
                  │      FeedStateService      │
                  │  ├── posts: Signal<Post[]> │
                  │  ├── cursor: string | null │
                  │  └── isLoading: boolean    │
                  └─────────────┬──────────────┘
                                │
                  ┌─────────────▼──────────────┐
                  │    IndexedDB Local Cache   │
                  └────────────────────────────┘
```

### 3. Virtualization & DOM Pruning
Rendering 5,000 DOM nodes crashes mobile Safari. Use `@angular/cdk/scrolling` with a fixed or dynamic item size strategy:
- Keep only 15–20 DOM elements mounted at any moment.
- Replace unmounted elements with top/bottom spacers.

### 4. Video Playback & Resource Management
- Do not initialize HTML5 `<video>` tags until the post enters the viewport.
- Use an `IntersectionObserver` directive (`appInViewport`) to autoplay the video only when ≥ 60% visible, pausing immediately when scrolled out.

### 5. Optimistic UI Updates
When a user clicks "Like":
```typescript
likePost(postId: string) {
  // 1. Optimistically update local Signal state immediately
  this.posts.update(list =>
    list.map(p => p.id === postId ? { ...p, isLiked: true, likesCount: p.likesCount + 1 } : p)
  );

  // 2. Dispatch network request in background
  this.http.post(`/api/posts/${postId}/like`, {}).pipe(
    catchError(() => {
      // 3. Rollback on failure & show toast
      this.posts.update(list =>
        list.map(p => p.id === postId ? { ...p, isLiked: false, likesCount: p.likesCount - 1 } : p)
      );
      this.toastService.show('Failed to like post. Please check connection.');
      return EMPTY;
    })
  ).subscribe();
}
```

---

## System Design 2: Real-Time Collaborative Kanban Board (Trello / Jira)

### 1. Requirements
- Multiple users drag-and-drop cards across columns in real-time.
- Changes made by User A immediately reflect on User B's screen without page refresh.
- Reordering cards must be atomic and handle concurrent moves cleanly.

### 2. Real-Time Protocol & Architecture
- **Transport:** WebSocket connection with bidirectional JSON frames.
- **State Engine:** Local Signals updated via incoming WebSocket events.
- **Drag-and-Drop:** `@angular/cdk/drag-drop` using `cdkDropListGroup`.

### 3. Reordering Algorithm (Lexicographical Rank Ordering)
Instead of updating an integer `position: 1, 2, 3...` on every card in the database when an item moves:
- Assign each card a fractional or lexicographical string key (e.g., between `"a"` and `"b"`, insert `"am"`).
- Moving a card only requires updating that single card's rank key, eliminating table lock contention and race conditions.

---

## System Design 3: Enterprise Configurable Analytics Dashboard

### 1. Requirements
- End-users can customize their dashboard by adding, removing, and resizing diverse analytics widgets (Charts, KPIs, Tables, Live Logs).
- Widgets must load on-demand without bloating the initial application bundle.
- A global date filter (`startDate`, `endDate`) must synchronize across all active widgets.

### 2. High-Level Component & Plugin Engine
```typescript
export interface WidgetDefinition {
  id: string;
  type: 'line-chart' | 'bar-chart' | 'kpi-card' | 'data-grid';
  title: string;
  gridSpan: { cols: number; rows: number };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="dashboard-grid">
      @for (widget of activeWidgets(); track widget.id) {
        <div class="widget-wrapper" [style.grid-column]="'span ' + widget.gridSpan.cols">
          <!-- Dynamic Component Outlet with typed inputs -->
          <ng-container
            *ngComponentOutlet="getWidgetComponent(widget.type); inputs: { config: widget, dateRange: selectedDateRange() }"
          />
        </div>
      }
    </div>
  `
})
export class DashboardComponent {
  selectedDateRange = signal<{ start: Date; end: Date }>({ start: new Date(), end: new Date() });
  activeWidgets = signal<WidgetDefinition[]>([]);

  // Lazy load component types on demand
  getWidgetComponent(type: string): Type<any> {
    switch (type) {
      case 'line-chart': return LineChartWidgetComponent;
      case 'kpi-card': return KpiCardWidgetComponent;
      default: return PlaceholderWidgetComponent;
    }
  }
}
```

---

## State Management Selection Criteria

When justifying your state management approach to an interviewer:

```
Question: "Why did you choose Signal Services over NgRx for this architecture?"

Decision Framework:
1. Application Complexity & Team Size:
   - Medium Apps / Single Team: Angular Signals + Services provide 90% of state needs
     with zero boilerplate, type safety, and direct reactivity.
   - Massive Enterprise / 10+ Teams: NgRx Store provides enforced action hygiene,
     time-travel debugging, serialization, and strict separation between side-effects (Effects)
     and reducers.
2. Serialization Requirements:
   - If state must be completely serialized to localStorage or replayed for session debugging,
     an explicit Redux-style action store excels.
```

---

## Offline-First Architecture & Service Workers

### Angular Service Worker (`@angular/pwa`)
1. **Asset Caching (`assetGroups`):**
   - Prefetch core application bundles, icons, and fonts for instant offline startup.
2. **Data Caching (`dataGroups`):**
   - **`performance` strategy:** Return cached response immediately while refreshing in background (Stale-While-Revalidate).
   - **`freshness` strategy:** Try network first with timeout fallback to cache.

---

## Senior Interview Questions with Detailed Answers

### Q1: How do you design an optimistic update strategy for a collaborative frontend, and how do you handle server rejection?
**Answer:**
1. **Local State Application:** When the user initiates an action, generate a client-side temporary ID (UUIDv4) and update the local Signal or Store immediately.
2. **Snapshot Previous State:** Retain a snapshot of the state prior to mutation.
3. **Dispatch Async Request:** Send the mutation to the backend API.
4. **On Success:** Reconcile the temporary client ID with the permanent server record.
5. **On Error / Conflict (HTTP 409/500):** Revert the local state to the snapshot, notify the user with a dismissible toast explaining the failure, and offer a "Retry" action.

---

### Q2: How do you prevent excessive re-renders and memory bloat in a real-time analytics dashboard with 50 live charts?
**Answer:**
1. **Run Sockets Outside Zone:** Ingest WebSocket/SSE data using `ngZone.runOutsideAngular()`.
2. **Throttling with `requestAnimationFrame`:** Batch incoming data bursts and flush updates once per frame (60 FPS / ~16ms).
3. **`ChangeDetectionStrategy.OnPush` Everywhere:** Ensure each chart component only triggers change detection when its specific input signal updates.
4. **Canvas / WebGL over SVG:** For high-density data visualizations (>10,000 data points), render charts using HTML5 Canvas or WebGL rather than thousands of SVG DOM elements.

---

## Revision Checklist

- [ ] Structure frontend system design answers using the RADIO framework.
- [ ] Implement infinite scrolling using CDK Virtual Scrolling and IntersectionObserver.
- [ ] Implement optimistic updates with reliable error rollback logic.
- [ ] Design lazy-loaded dynamic dashboard widgets using `*ngComponentOutlet`.
- [ ] Justify the trade-offs between Signal Services and NgRx Store.
- [ ] Protect real-time UI responsiveness using `runOutsideAngular()` and RAF throttling.
