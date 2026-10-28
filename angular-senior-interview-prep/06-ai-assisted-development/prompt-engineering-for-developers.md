# Prompt Engineering for Senior Angular Developers

> **Phase:** 6 — Safe AI-Assisted Development  
> **Related:** [ai-coding-workflow.md](./ai-coding-workflow.md) | [ai-generated-code-review.md](./ai-generated-code-review.md) | [ai-security-and-privacy.md](./ai-security-and-privacy.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Prerequisites](#prerequisites)
3. [The Core Anatomy of a Senior-Level Engineering Prompt](#the-core-anatomy-of-a-senior-level-engineering-prompt)
4. [The "Plan Before Code" Philosophy](#the-plan-before-code-philosophy)
5. [Context Window Management & Chunking Strategies](#context-window-management--chunking-strategies)
6. [Production-Ready Prompt Templates for Enterprise Angular](#production-ready-prompt-templates-for-enterprise-angular)
   - Template 1: Architecture Discovery & Codebase Explanation
   - Template 2: Incremental Feature Implementation (Standalone + Signals)
   - Template 3: Architectural Refactoring (NgModules ➔ Standalone)
   - Template 4: Unit Test Generation with CDK Harnesses
   - Template 5: Security & Vulnerability Audit
   - Template 6: Performance Bottleneck Investigation
   - Template 7: Major Version Migration Planning
7. [Prompt Anti-Patterns and Common Mistakes](#prompt-anti-patterns-and-common-mistakes)
8. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
9. [Hands-On Prompt Refactoring Exercise](#hands-on-prompt-refactoring-exercise)
10. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Master prompt engineering techniques tailored specifically for senior frontend architects and Angular developers.
- Formulate prompts using the **Context-Persona-Constraints-Acceptance Criteria (CPCA)** framework.
- Prevent AI hallucination and scope creep by mandating architectural planning prior to code generation.
- Manage token budget and context windows effectively when analyzing large enterprise codebases.
- Leverage reusable, hardened prompt templates for feature implementation, refactoring, test generation, and security auditing.

---

## The Core Anatomy of a Senior-Level Engineering Prompt

Junior prompts are vague: *"Write an Angular component that shows user orders."*  
Senior prompts use structured constraints to eliminate ambiguities and prevent outdated patterns:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PERSONA: Role definition & technical baseline            │
│    "Act as a Principal Angular Architect specializing in     │
│     Angular 18+ standalone applications and OnPush reactivity"│
├─────────────────────────────────────────────────────────────┤
│ 2. CONTEXT: Existing architecture, dependencies & state      │
│    "We are building an order portal using Angular 18,       │
│     TypeScript 5.4, signals for state, and TailwindCSS"      │
├─────────────────────────────────────────────────────────────┤
│ 3. GOAL: Explicit task description                          │
│    "Implement a paginated OrderTableComponent"               │
├─────────────────────────────────────────────────────────────┤
│ 4. CONSTRAINTS: Forbidden patterns & boundary conditions     │
│    "- Must be standalone: true                              │
│     - Use ChangeDetectionStrategy.OnPush                    │
│     - State must use signals (signal(), computed())         │
│     - Do NOT use NgModules, CommonModule, or *ngFor         │
│     - Use modern built-in @for with track item.id           │
│     - Zero usage of 'any' type"                             │
├─────────────────────────────────────────────────────────────┤
│ 5. ACCEPTANCE CRITERIA & OUTPUT FORMAT                      │
│    "Output only the TypeScript and inline template.         │
│     Explain the time complexity and memory considerations."  │
└─────────────────────────────────────────────────────────────┘
```

---

## The "Plan Before Code" Philosophy

When tackling complex architectural tasks, never ask an LLM to generate full code immediately. Forcing the model to generate a plan first:
1. Forces the model to allocate reasoning tokens to edge cases, data structures, and trade-offs.
2. Allows the human engineer to review and approve architectural decisions before hundreds of lines of code are written.
3. Drastically reduces bugs, hallucinations, and rework.

### Directive:
```
"Do NOT write any implementation code yet. 
First, provide a step-by-step architectural plan detailing:
1. Proposed component hierarchy and state management approach.
2. Data contracts / TypeScript interfaces.
3. Edge cases and error handling strategy.
Wait for my explicit approval before writing code."
```

---

## Production-Ready Prompt Templates for Enterprise Angular

### Template 1: Architecture Discovery & Codebase Explanation
```markdown
**Role:** Senior Angular Systems Architect  
**Task:** Analyze the provided Angular service and identify its responsibilities, dependencies, and potential scalability bottlenecks.  

**Input Code:**
[PASTE CODE HERE]

**Required Analysis:**
1. Summarize primary responsibility in 2 sentences.
2. Identify all state holders (Signals, BehaviorSubjects) and their lifecycles.
3. Flag any memory leak hazards (unmanaged subscriptions, DOM listeners).
4. Evaluate compliance with modern Angular standards (signals, functional DI, OnPush).
5. Outline 3 recommended refactoring steps in priority order.
```

---

### Template 2: Incremental Feature Implementation (Standalone + Signals)
```markdown
**Role:** Lead Angular Developer  
**Task:** Implement a standalone `NotificationBellComponent` that displays an unread count badge and a dropdown list of recent notifications.

**Technical Constraints:**
- Framework: Angular 18+ Standalone Component
- Change Detection: `ChangeDetectionStrategy.OnPush`
- Reactivity: Use `signal()` and `computed()`. Input via `input<Notification[]>()`.
- Template Syntax: Modern built-in control flow (`@if`, `@for` with `track item.id`, `@empty`).
- Styling: Plain CSS / SCSS with scoped encapsulation.
- Accessibility: ARIA attributes (`aria-expanded`, `aria-haspopup`, `role="menu"`).
- Types: Strict TypeScript (no `any`, full interfaces for `NotificationItem`).

**Output Required:**
Provide the complete standalone component code with inline template and explanation of how accessibility and keyboard events are handled.
```

---

### Template 3: Architectural Refactoring (NgModules ➔ Standalone)
```markdown
**Role:** Angular Migration Specialist  
**Task:** Refactor the following legacy NgModule-based feature into a modern standalone architecture.

**Legacy Code:**
[PASTE LEGACY MODULE AND COMPONENT HERE]

**Refactoring Rules:**
1. Eliminate `NgModule` completely.
2. Mark the component `standalone: true` and specify exact imports in the `imports: []` array.
3. Replace `*ngIf` / `*ngFor` with built-in `@if` / `@for`.
4. Replace constructor dependency injection with the `inject()` function.
5. Provide a route configuration snippet showing lazy loading with `loadComponent`.
```

---

### Template 4: Unit Test Generation with CDK Harnesses
```markdown
**Role:** Senior Frontend QA & Test Automation Engineer  
**Task:** Write a comprehensive unit test suite using Angular TestBed for the provided standalone component.

**Component Code:**
[PASTE COMPONENT CODE HERE]

**Testing Requirements:**
1. Configure `TestBed` using standalone `imports: [MyComponent]`.
2. Mock external services using typed Jasmine/Jest spies.
3. Use Angular CDK Component Harnesses or accessible role queries (`getByRole`).
4. Test both happy path rendering and error states.
5. Verify synchronous signal reactivity and clean up any timers.
```

---

### Template 5: Security & Vulnerability Audit
```markdown
**Role:** Application Security (AppSec) Engineer  
**Task:** Perform a rigorous security review of the provided Angular component and HTTP interceptor.

**Input Code:**
[PASTE CODE HERE]

**Audit Scope:**
1. Check for Cross-Site Scripting (XSS) risks (usage of `innerHTML`, `DomSanitizer`, untrusted attributes).
2. Check token storage and handling (localStorage usage, authorization header leakage to 3rd-party domains).
3. Check Open Redirect vulnerabilities in routing parameters.
4. Check error handling for sensitive data/PII leakage in logs.
5. Provide a remediation diff for every identified vulnerability.
```

---

### Template 6: Performance Bottleneck Investigation
```markdown
**Role:** Angular Performance Optimization Specialist  
**Task:** Diagnose why the following data table component is causing frame drops and sluggish scrolling.

**Input Code:**
[PASTE COMPONENT AND TEMPLATE HERE]

**Investigation Focus:**
1. Are there function calls or complex expressions bound inside the template?
2. Is `ChangeDetectionStrategy.OnPush` missing or defeated?
3. Is `@for` or `*ngFor` lacking an optimal `track` expression?
4. Would CDK Virtual Scroll be appropriate here?
5. Provide the optimized code with benchmark estimates.
```

---

## Prompt Anti-Patterns and Common Mistakes

| Anti-Pattern | Why It Fails | Senior Correction |
|---|---|---|
| **"Make it modern"** | LLM guesses what "modern" means; might use experimental APIs or hallucinate. | Specify exact versions and features: *"Use Angular 18 standalone components and signals."* |
| **Pasting a 3,000-line file at once** | Exceeds effective attention span of LLM; leads to lost context and lazy truncated responses (`// ... existing code ...`). | Chunk into isolated services, models, and components. Prompt iteratively. |
| **Accepting code with `any`** | Degrades type safety and hides runtime bugs. | Explicitly forbid: *"Strict typing required; no usage of `any`."* |
| **Asking for tests without specifying runner** | LLM outputs deprecated Karma/Protractor tests instead of modern Jest/Playwright. | Explicitly specify: *"Write tests using Vitest/Jest and Angular CDK Harnesses."* |

---

## Senior Interview Questions with Detailed Answers

### Q1: How do you structure an AI prompt to ensure the generated code strictly complies with modern Angular architectural standards (signals, standalone, control flow)?
**Answer:**
1. **Define Explicit Version Baseline:** Specify "Angular 18+ standalone architecture", preventing the model from falling back on legacy NgModule training data.
2. **State Negative Constraints (What NOT to do):** LLMs respond strongly to negative constraints. Explicitly forbid `NgModule`, `CommonModule`, `*ngIf`, `*ngFor`, `BehaviorSubject` for local state, and the `any` type.
3. **Mandate Specific Primitives:** Mandate `standalone: true`, `ChangeDetectionStrategy.OnPush`, `inject()`, `signal()`, `computed()`, and `@if`/`@for (track item.id)`.
4. **Demand Justification:** Require the model to briefly justify its architectural choices (e.g. why a signal was chosen over RxJS) before producing code.

---

### Q2: Why is the "Plan Before Code" pattern critical when using AI coding assistants in enterprise codebases?
**Answer:**
Generating large blocks of code without prior alignment leads to **accumulated architectural debt**:
- The AI may introduce incompatible third-party dependencies.
- It may violate existing state management conventions or introduce circular dependencies.
- It is significantly harder and more time-consuming for a human engineer to spot subtle architectural flaws in a 300-line code diff than in a 10-bullet-point plan.
By enforcing a planning phase, the engineer can validate component boundaries, interfaces, and security considerations before a single line of implementation code is drafted.

---

## Hands-On Prompt Refactoring Exercise

### Junior / Ineffective Prompt:
> *"Create an Angular service to fetch users from an API and show a loader."*

### Refactored Senior-Grade Prompt:
> *"Act as a Senior Angular Architect. Create a standalone `UserService` in Angular 18+ that fetches a paginated list of users from `GET /api/users`.  
> **Requirements:**  
> 1. Use `inject(HttpClient)` with modern functional DI.  
> 2. Model loading state, error state, and data using Angular **Signals** (`data = signal<User[]>([])`, `isLoading = signal<boolean>(false)`, `error = signal<string | null>(null)`).  
> 3. Provide an explicit TypeScript interface for `User` and `PaginatedResponse<T>` (strict typing, no `any`).  
> 4. Handle HTTP errors gracefully and ensure loading state resets to `false` on failure.  
> 5. Service must be tree-shakable with `{ providedIn: 'root' }`."*

---

## Revision Checklist

- [ ] Structure prompts using the Context-Persona-Constraints-Acceptance Criteria framework.
- [ ] Enforce the "Plan Before Code" approach for complex features.
- [ ] Explicitly specify modern Angular version constraints (standalone, signals, control flow).
- [ ] Use negative constraints to ban outdated patterns (`NgModule`, `CommonModule`, `any`).
- [ ] Chunk large files to stay within optimal model context windows.
