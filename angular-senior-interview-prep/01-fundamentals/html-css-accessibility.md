# HTML, CSS, and Accessibility — Deep Dive

> **Phase:** 1 — Fundamentals  
> **Related:** [javascript-typescript.md](./javascript-typescript.md) | [angular-fundamentals.md](./angular-fundamentals.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Semantic HTML](#semantic-html)
3. [Accessibility — ARIA and WCAG](#accessibility--aria-and-wcag)
4. [CSS Fundamentals](#css-fundamentals)
5. [Layout: Flexbox and Grid](#layout-flexbox-and-grid)
6. [Responsive Design](#responsive-design)
7. [CSS Custom Properties and Design Tokens](#css-custom-properties-and-design-tokens)
8. [Browser Rendering Pipeline](#browser-rendering-pipeline)
9. [DOM Events](#dom-events)
10. [Security: DOM and CSS](#security-dom-and-css)
11. [Interview Questions with Answers](#interview-questions-with-answers)
12. [Exercises](#exercises)
13. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Write semantic HTML that communicates meaning to browsers, assistive technologies, and search engines.
- Apply ARIA attributes correctly without overriding native HTML semantics.
- Understand the CSS cascade, specificity, and inheritance deeply enough to debug real-world style conflicts.
- Design accessible, responsive layouts using flexbox and CSS Grid.
- Explain how the browser renders a page and identify what triggers layout recalculations.

---

## Semantic HTML

Semantic HTML uses elements that convey meaning rather than just presentation. This benefits SEO, screen reader users, and maintainability.

### Landmark Elements

```html
<header>         <!-- Page or section header -->
<nav>            <!-- Navigation block -->
<main>           <!-- Primary page content (one per page) -->
<aside>          <!-- Supplementary content -->
<footer>         <!-- Page or section footer -->
<article>        <!-- Self-contained, independently distributable content -->
<section>        <!-- Thematic grouping with a heading -->
```

### Inline and Form Semantics

```html
<!-- Prefer button for interactive elements, not div or span -->
<button type="button">Submit</button>

<!-- Labels must be associated with controls -->
<label for="email">Email</label>
<input id="email" type="email" name="email" required>

<!-- Use fieldset + legend for grouped controls -->
<fieldset>
  <legend>Preferred contact</legend>
  <label><input type="radio" name="contact" value="email"> Email</label>
  <label><input type="radio" name="contact" value="phone"> Phone</label>
</fieldset>
```

### Anti-Patterns

```html
<!-- WRONG: div as button — keyboard inaccessible, no role -->
<div onclick="submit()">Submit</div>

<!-- WRONG: image without alt text -->
<img src="logo.png">

<!-- WRONG: link without meaningful text -->
<a href="/report">Click here</a>

<!-- CORRECT -->
<a href="/report">Download annual report (PDF, 2 MB)</a>
```

---

## Accessibility — ARIA and WCAG

### WCAG 2.1 Core Principles (POUR)

| Principle | Meaning |
|-----------|---------|
| **Perceivable** | Information must be presentable in ways users can perceive |
| **Operable** | UI must be operable via keyboard and not require time-limited interactions |
| **Understandable** | Information and UI operation must be understandable |
| **Robust** | Content must be robust enough to be interpreted by assistive technologies |

Minimum compliance target for most products: **WCAG 2.1 Level AA**.

### ARIA (Accessible Rich Internet Applications)

ARIA attributes supplement native HTML semantics. The first rule of ARIA: **use native HTML elements first**.

```html
<!-- role="button" on a div is an anti-pattern if <button> is available -->
<!-- But necessary for custom interactive components -->
<div
  role="button"
  tabindex="0"
  aria-pressed="false"
  (click)="toggle()"
  (keydown.enter)="toggle()"
  (keydown.space)="toggle()">
  Toggle
</div>
```

### Key ARIA Attributes

| Attribute | Purpose |
|-----------|---------|
| `aria-label` | Provides an accessible name |
| `aria-labelledby` | References another element as the label |
| `aria-describedby` | References descriptive text |
| `aria-hidden="true"` | Removes element from accessibility tree |
| `aria-live` | Announces dynamic content updates |
| `aria-expanded` | Indicates expanded/collapsed state |
| `aria-required` | Indicates required fields |
| `aria-invalid` | Indicates validation errors |
| `role` | Overrides or adds semantic meaning |

### Focus Management in Angular

```typescript
import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

@Component({
  template: `
    <div role="dialog" aria-labelledby="dialog-title" aria-modal="true">
      <h2 id="dialog-title">Confirm deletion</h2>
      <button #firstFocus>Cancel</button>
      <button>Delete</button>
    </div>
  `
})
class DialogComponent implements AfterViewInit {
  @ViewChild('firstFocus') firstButton!: ElementRef<HTMLButtonElement>;

  ngAfterViewInit() {
    // Move focus into dialog when it opens
    this.firstButton.nativeElement.focus();
  }
}
```

### Skip Links

```html
<!-- First element in <body> — visible on focus -->
<a href="#main-content" class="skip-link">Skip to main content</a>
...
<main id="main-content">
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 1000;
}
.skip-link:focus { top: 0; }
```

---

## CSS Fundamentals

### The Cascade

Styles are resolved in this order (later = higher priority):

1. Browser user-agent stylesheet.
2. User stylesheet (`@layer` and preferences).
3. Author stylesheets.
4. `!important` rules (reversed order — browser's `!important` wins).
5. Inline styles.

### Specificity

Specificity is calculated as (A, B, C):

- **A:** Inline styles = 1000.
- **B:** ID selectors = 100.
- **C:** Class, attribute, pseudo-class selectors = 10.
- **D:** Element, pseudo-element selectors = 1.

```css
/* Specificity: 0,1,0 (one class) */
.button { color: red; }

/* Specificity: 0,2,1 (two classes, one element) — wins over above */
.form .primary-button { color: blue; }

/* Specificity: 1,0,0 (one ID) — wins over class selectors */
#submit { color: green; }
```

**Angular's ViewEncapsulation** adds an attribute selector to each component's styles (e.g., `[_nghost-abc]`), effectively adding one specificity point to every component-scoped rule.

### Inheritance

Some properties inherit by default (font-family, color, line-height). Others don't (padding, margin, border). Use `inherit`, `initial`, `unset`, and `revert` to control inheritance explicitly.

---

## Layout: Flexbox and Grid

### Flexbox — One-Dimensional Layout

```css
.container {
  display: flex;
  flex-direction: row;        /* row | column */
  justify-content: center;   /* main axis alignment */
  align-items: stretch;      /* cross axis alignment */
  flex-wrap: wrap;
  gap: 16px;
}

.item {
  flex: 1 1 200px; /* grow shrink basis */
}
```

**Use flexbox when** aligning items in one direction (navigation bars, button groups, card footers).

### CSS Grid — Two-Dimensional Layout

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto;
  gap: 24px;
}

/* Named areas */
.layout {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 250px 1fr;
}

.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
```

**Use CSS Grid when** laying out a full page structure or when both row and column alignment are needed.

---

## Responsive Design

### Media Queries

```css
/* Mobile-first approach */
.card { width: 100%; }

@media (min-width: 768px) { .card { width: 48%; } }
@media (min-width: 1200px) { .card { width: 31%; } }
```

### Container Queries (Modern)

Container queries respond to the size of the parent container, not the viewport:

```css
.card-container { container-type: inline-size; }

@container (min-width: 400px) {
  .card { display: flex; }
}
```

### Angular CDK Breakpoints

```typescript
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({ ... })
class ResponsiveComponent {
  private breakpointObserver = inject(BreakpointObserver);

  isHandset$ = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(map(result => result.matches));
}
```

---

## CSS Custom Properties and Design Tokens

```css
:root {
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --spacing-md: 16px;
  --font-size-base: 1rem;
  --border-radius: 8px;
}

.button {
  background: var(--color-primary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
}

/* Dark mode override */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #60a5fa;
  }
}
```

**Angular Material** uses custom properties for theme tokens. Angular's theming system wraps this in a Sass API but ultimately outputs CSS custom properties.

---

## Browser Rendering Pipeline

Understanding this prevents performance anti-patterns:

```
1. Parse HTML → DOM tree
2. Parse CSS → CSSOM tree
3. Combine → Render tree (visible nodes only)
4. Layout (Reflow) → Calculate position and size
5. Paint → Fill pixels
6. Composite → Combine layers
```

### Repaint vs Reflow

| Trigger | Effect | Cost |
|---------|--------|------|
| Change color, background | Repaint (no layout) | Lower |
| Change width, height, margin, position | Reflow + Repaint | Higher |
| Change `transform`, `opacity` | Composite only | Lowest |

**Performance principle:** Animate using `transform` and `opacity` to avoid triggering reflow. Use `will-change: transform` sparingly to promote elements to GPU layers.

---

## DOM Events

### Event Propagation Phases

1. **Capture phase** — event travels from `window` down to the target.
2. **Target phase** — event reaches the target element.
3. **Bubble phase** — event bubbles up from target to `window`.

```javascript
element.addEventListener('click', handler, true);  // capture phase
element.addEventListener('click', handler, false); // bubble phase (default)
```

### Event Delegation

```javascript
// Attach one listener to a parent instead of many listeners on children
document.getElementById('list').addEventListener('click', (event) => {
  const item = (event.target as HTMLElement).closest('[data-item-id]');
  if (item) {
    const id = item.dataset.itemId;
    handleItemClick(id);
  }
});
```

**Angular uses event delegation internally** for host listeners and template event bindings.

---

## Security: DOM and CSS

### DOM-based XSS

```typescript
// UNSAFE — directly setting innerHTML with user content
element.innerHTML = userContent;

// SAFE — Angular's DomSanitizer bypasses are dangerous; use only with known-safe content
// Angular's template engine escapes by default:
// <div>{{ userContent }}</div>  ← safe, auto-escaped
// <div [innerHTML]="userContent"></div> ← Angular sanitizes HTML, still risky
```

### CSS Injection

User-controlled CSS values can leak data or redirect users:

```typescript
// UNSAFE
element.style.cssText = userInput;

// SAFE — set individual properties
element.style.color = sanitizeColor(userInput);
```

---

## Interview Questions with Answers

**Q: What is the difference between `display: none`, `visibility: hidden`, and `opacity: 0`?**

> `display: none` removes the element from the document flow — it takes no space and is not rendered. `visibility: hidden` hides the element but it still occupies space in the layout. `opacity: 0` makes the element invisible but it remains fully interactive (clickable, focusable) and occupies space. Only `display: none` and `visibility: hidden` remove an element from the accessibility tree by default.

**Q: Explain how CSS specificity is calculated.**

> Specificity is a four-part score (inline, ID, class/attribute/pseudo-class, element/pseudo-element). When two rules match the same element, the one with higher specificity wins, regardless of source order. If specificity is equal, the last rule in source order wins. `!important` creates a separate specificity level that overrides all author declarations.

**Q: What triggers a browser reflow?**

> Reflow is triggered by any change that affects the geometry of elements: changing dimensions (width, height, margin, padding, border), changing the DOM structure (adding/removing elements), changing fonts, querying layout properties (offsetWidth, getBoundingClientRect) which forces the browser to compute current layout. Minimize reflow by batching DOM changes, using CSS transforms for animations, and reading layout properties outside of write loops.

**Q: What is the first rule of ARIA?**

> If a native HTML element or attribute exists that has the required semantics and behavior, use it instead of ARIA. For example, use `<button>` instead of `<div role="button">`, `<input required>` instead of `<input aria-required="true">`. Native elements come with built-in accessibility, keyboard behavior, and form integration that ARIA cannot fully replicate.

---

## Exercises

1. **Audit:** Take a form with three inputs and no labels. Make it fully accessible: add labels, `aria-required`, `aria-describedby` for error messages, and keyboard navigation.
2. **Specificity:** Given five CSS rules targeting the same element, rank them by specificity without running them.
3. **Grid layout:** Build a three-column responsive layout that collapses to one column on small screens using CSS Grid and no media query breakpoints (use auto-fill/auto-fit).
4. **Performance:** Identify which of the following triggers reflow, repaint, or composite-only: changing `color`, changing `width`, changing `transform: translateX(10px)`, changing `opacity`.

---

## Revision Checklist

- [ ] Know the five WCAG 2.1 Level AA requirements for forms.
- [ ] Understand CSS specificity calculation without a calculator.
- [ ] Can explain the browser rendering pipeline and what triggers reflow.
- [ ] Know the difference between display:none, visibility:hidden, opacity:0 for layout and accessibility.
- [ ] Can write a responsive layout using CSS Grid with named template areas.
- [ ] Know when to use ARIA attributes and when native HTML is preferred.

---

## Further Reading

- [MDN: ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WCAG 2.1 Reference](https://www.w3.org/TR/WCAG21/)
- [MDN: CSS Cascade](https://developer.mozilla.org/en-US/docs/Web/CSS/Cascade)
- [CSS Tricks: Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [CSS Tricks: Complete Guide to Grid](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [web.dev: Rendering performance](https://web.dev/rendering-performance/)
