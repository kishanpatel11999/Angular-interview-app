# Angular Architectural Evolution: Angular 2 to Angular 9 Overview

> **Section:** 10 — Version Comparison & Evolution  
> **Related:** [angular-v10-to-v16-changes.md](./angular-v10-to-v16-changes.md) | [angular-v17-to-v19-comparison.md](./angular-v17-to-v19-comparison.md) | [angular-feature-availability-matrix.md](./angular-feature-availability-matrix.md)

---

## Table of Contents

1. [Historical Context: The AngularJS (1.x) to Angular 2 Pivot](#historical-context-the-angularjs-1x-to-angular-2-pivot)
2. [Release-by-Release Architectural Evolution (v2 through v9)](#release-by-release-architectural-evolution-v2-through-v9)
3. [The Evolution of Angular Compilers: View Engine vs Ivy](#the-evolution-of-angular-compilers-view-engine-vs-ivy)
4. [Legacy HTTP (`HttpModule`) to Modern `HttpClient`](#legacy-http-httpmodule-to-modern-httpclient)
5. [The Rise and Fall of `entryComponents`](#the-rise-and-fall-of-entrycomponents)
6. [TypeScript, RxJS, and Node Compatibility History (v2–v9)](#typescript-rxjs-and-node-compatibility-history-v2v9)
7. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
8. [Revision Checklist](#revision-checklist)

---

## Historical Context: The AngularJS (1.x) to Angular 2 Pivot

### The Limitations of AngularJS (1.x)
AngularJS was designed in 2009 for simple interactive web forms. As enterprise single-page applications grew in complexity, AngularJS hit critical architectural walls:
- **Two-Way Data Binding (`$scope`) & Digest Cycle:** Every variable binding registered a watcher. The `$digest` loop iterated over all watchers repeatedly until state stabilized (dirty checking). In large DOM trees with > 2,000 watchers, applications suffered severe UI lag.
- **Lack of Component Encapsulation:** Relied on controllers, scopes, and complex directive definitions (`restrict`, `transclude`, `link`, `compile`) without component boundaries.
- **Mobile Unreadiness:** Heavy DOM overhead, memory consumption, and lack of Ahead-of-Time compilation.

### The Angular 2 Transformation (2016)
Angular 2 was a complete ground-up rewrite:
1. **Unidirectional Data Flow:** Data flows down via property bindings `[prop]`, and events flow up via `(event)`.
2. **First-Class TypeScript & Classes:** Components declared as decorated ES6 classes (`@Component`) with strong typing.
3. **Zone.js for Change Detection:** `Zone.js` intercepted browser asynchronous events (`setTimeout`, click events, XHR), eliminating manual `$scope.$apply()`.
4. **Hierarchical Dependency Injection:** Injectors tied to component DOM trees.

---

## Release-by-Release Architectural Evolution (v2 through v9)

```
┌───────────────┬──────┬──────────────────────────────────────────────────────────────┐
│ Version       │ Year │ Key Architectural Milestones                                 │
├───────────────┼──────┼──────────────────────────────────────────────────────────────┤
│ Angular 2     │ 2016 │ Complete rewrite from AngularJS; TypeScript, Component/DI.   │
│ Angular 4     │ 2017 │ Skipped v3 (router alignment); smaller view engine; *ngIf/else│
│ Angular 5     │ 2017 │ Build Optimizer; HttpClient introduced; RxJS 5.5 pipeable ops│
│ Angular 6     │ 2018 │ Angular CLI `ng update`, `ng add`; Angular Elements; CDK.    │
│ Angular 7     │ 2018 │ CLI prompts; Virtual Scrolling & Drag-and-Drop in CDK.       │
│ Angular 8     │ 2019 │ Differential loading (ES5/ES2015); Web Workers; Dynamic import│
│ Angular 9     │ 2020 │ The Ivy Compiler becomes default; faster AOT, smaller bundles│
└───────────────┴──────┴──────────────────────────────────────────────────────────────┘
```

---

## The Evolution of Angular Compilers: View Engine vs Ivy

The transition from View Engine to **Ivy** in Angular 9 was the most critical architectural transformation in modern Angular history:

| Dimension | Legacy View Engine (v2–v8) | Ivy Engine (v9+) |
|---|---|---|
| **Compilation Output** | Generated separate `.ngfactory.js` and `.ngsummary.json` files alongside every component. | Compiles component metadata directly into static properties on the component class itself (`ɵcmp`, `ɵfac`). |
| **Tree-Shakability** | Framework features were bundled even if unused because factories contained hard references. | Unused framework features (e.g. pipes, animation directives) are 100% tree-shakable. |
| **AOT Compilation** | Slower; often disabled in development mode (using JIT locally). | Ahead-of-Time (AOT) compilation is so fast it became the default for both dev and prod. |
| **Dynamic Components** | Required `ComponentFactoryResolver` to look up compiled factories. | Instantiate components directly via class reference (`createComponent(MyComp)`). |

---

## Legacy HTTP (`HttpModule`) to Modern `HttpClient`

In Angular 4.3, the legacy `@angular/http` (`HttpModule`) was deprecated and replaced with `@angular/common/http` (`HttpClientModule`):
- **Typed Responses:** `http.get<User>('/api/user')` eliminated manual `res.json()` parsing.
- **HTTP Interceptors:** Introduced `HttpInterceptor` interface, providing a clean middleware chain for attaching authorization headers and logging.
- **Progress Events:** First-class reporting for file uploads and downloads.

---

## The Rise and Fall of `entryComponents`

In the View Engine era (Angular 2–8), dynamic components (such as modals or dynamic tabs created via `ViewContainerRef`) had to be registered in the `entryComponents: [MyModalComponent]` array of their `NgModule`. 
- **Why?** View Engine needed to know which components required generated factories even if they were never referenced in any template.
- **Ivy Removal:** Because Ivy compiles static component definitions directly onto the class, `entryComponents` became completely obsolete in Angular 9 and was removed in subsequent releases.

---

## TypeScript, RxJS, and Node Compatibility History (v2–v9)

| Angular Version | Release Date | TypeScript Support | RxJS Support | Node.js Minimum |
|---|---|---|---|---|
| **Angular 2** | Sept 2016 | 2.0.x | 5.0.x | Node 6 |
| **Angular 4** | March 2017 | 2.1.x – 2.2.x | 5.0.x – 5.4.x | Node 6 |
| **Angular 5** | Nov 2017 | 2.4.x – 2.5.x | 5.5.x (Pipeable operators) | Node 6 |
| **Angular 6** | May 2018 | 2.7.x – 2.9.x | 6.0.x (Breaking operator imports) | Node 8 |
| **Angular 7** | Oct 2018 | 3.1.x – 3.2.x | 6.3.x | Node 8 |
| **Angular 8** | May 2019 | 3.4.x – 3.5.x | 6.4.x | Node 10 |
| **Angular 9** | Feb 2020 | 3.6.x – 3.8.x | 6.5.x | Node 10.13+ |

---

## Senior Interview Questions with Detailed Answers

### Q1: What was the architectural motivation behind the Ivy compiler transition in Angular 9?
**Answer:**
View Engine suffered from two severe flaws:
1. **Compilation Bloat:** It generated separate `ngfactory` JavaScript files for every component, increasing build times and bundle sizes.
2. **Poor Tree-Shaking:** The View Engine runtime was monolithic; if an application imported Angular, large portions of the framework could not be removed by dead-code elimination.
**Ivy solved this** by emitting static definition properties directly onto component classes (`ɵcmp`). This made template instructions look like regular JavaScript function calls (e.g. `ɵɵelementStart`, `ɵɵtext`), allowing standard bundlers to tree-shake unused framework instructions. It also enabled instant AOT compilation in development and paved the way for standalone components.

---

### Q2: Why did Angular skip Version 3?
**Answer:**
In late 2016, Angular packages were on version 2.x, but the Angular Router package had already advanced to version 3.x due to breaking router rewrites. To resolve version divergence and align all official packages (`@angular/core`, `@angular/common`, `@angular/router`, `@angular/compiler`) under a single coherent version number, the Angular team skipped version 3 and released **Angular 4** in March 2017.

---

## Revision Checklist

- [ ] Explain the key limitations of AngularJS and how Angular 2 addressed them.
- [ ] Understand the differences between View Engine and the Ivy compiler.
- [ ] Explain why `entryComponents` was required in View Engine and removed in Ivy.
- [ ] Trace the evolution from `HttpModule` to `HttpClient`.
- [ ] Understand the introduction of `ng update` in Angular 6.
