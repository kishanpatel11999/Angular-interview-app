# Integration and End-to-End (E2E) Testing with Playwright & Cypress

> **Phase:** 5 — Testing and Quality  
> **Related:** [unit-testing.md](./unit-testing.md) | [debugging-and-code-quality.md](./debugging-and-code-quality.md) | [code-review-checklist.md](./code-review-checklist.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Prerequisites](#prerequisites)
3. [The Modern E2E Testing Landscape: Playwright vs Cypress](#the-modern-e2e-testing-landscape-playwright-vs-cypress)
4. [Playwright Architecture for Angular Applications](#playwright-architecture-for-angular-applications)
   - Configuration and Multi-Browser Execution
   - Locating Elements with Resilient Locators (`getByRole`, `getByTestId`)
   - Page Object Model (POM) Design Pattern
5. [Cypress Architecture & Best Practices](#cypress-architecture--best-practices)
   - Commands, Custom Assertions, and Aliases
   - Component Testing in Cypress
6. [Network Interception & API Mocking](#network-interception--api-mocking)
   - `page.route()` in Playwright vs `cy.intercept()` in Cypress
   - Contract Testing with Pact / OpenAPI Specs
7. [Eliminating Flakiness in Enterprise E2E Suites](#eliminating-flakiness-in-enterprise-e2e-suites)
   - Auto-Waiting vs Dangerous `sleep` / `cy.wait(number)`
   - Managing Test Isolation and Authentication State
8. [Visual Regression Testing](#visual-regression-testing)
9. [CI/CD Integration: Parallelization, Sharding, and Trace Reports](#cicd-integration-parallelization-sharding-and-trace-reports)
10. [Common Mistakes and E2E Anti-Patterns](#common-mistakes-and-e2e-anti-patterns)
11. [Senior Interview Questions with Detailed Answers](#senior-interview-questions-with-detailed-answers)
12. [Hands-On Exercise: Production E2E Journey with Playwright](#hands-on-exercise-production-e2e-journey-with-playwright)
13. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Master Playwright and Cypress for testing end-to-end user journeys in modern Angular applications.
- Design maintainable, refactor-proof tests using the Page Object Model (POM) pattern.
- Intercept and mock HTTP network responses to simulate edge cases, network latencies, and API outages.
- Eliminate test flakiness by leveraging automatic web-first assertions and eliminating arbitrary delays (`sleep`).
- Preserve authenticated browser states to bypass repetitive UI logins across test suites.
- Integrate E2E test runs with test sharding, video recording, and trace viewer analysis into CI/CD.

---

## The Modern E2E Testing Landscape: Playwright vs Cypress

| Feature | Playwright | Cypress |
|---|---|---|
| **Architecture** | Out-of-process via Chrome DevTools Protocol (CDP) & WebDriver BiDi | In-browser runner (runs inside an iframe alongside your application) |
| **Multi-tab & Multi-window** | Full native support across multiple contexts | Limited / difficult (workarounds required) |
| **Multi-Browser** | Chromium, Firefox, WebKit (Safari engine) native | Chromium, Firefox, Electron (WebKit experimental) |
| **Speed & Parallelization** | Extremely fast; native worker process isolation and test sharding | Fast, but parallelization requires Cypress Cloud or external plugins |
| **Network Mocking** | `page.route('**/api/*', route => ...)` | `cy.intercept('GET', '**/api/*', ...)` |
| **Trace Viewer / Debugging** | Rich standalone GUI trace viewer with time-travel, console logs, network payloads | Interactive in-browser GUI with DOM time-travel |

---

## Playwright Architecture for Angular Applications

### Configuration (`playwright.config.ts`)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 4 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry', // Collect trace only when a test fails initially
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } }
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000
  }
});
```

### Resilient Locators
Never use brittle CSS classes (e.g. `.css-19a9x` or `.mat-mdc-button`). Use **user-facing locators**:

```typescript
// IDEAL: Mimics how a real user finds the button
page.getByRole('button', { name: 'Submit Order' });

// EXCELLENT: Accessible form label binding
page.getByLabel('Email Address');

// GOOD: Explicit test attribute for unlabelled widgets
page.getByTestId('cart-item-row');
```

### Page Object Model (POM) Pattern
Encapsulates UI interaction logic, keeping test specifications clean and declarative:

```typescript
// e2e/pages/checkout.page.ts
import { expect, Locator, Page } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;
  readonly cardInput: Locator;
  readonly addressInput: Locator;
  readonly placeOrderButton: Locator;
  readonly orderSuccessBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cardInput = page.getByLabel('Card Number');
    this.addressInput = page.getByLabel('Shipping Address');
    this.placeOrderButton = page.getByRole('button', { name: 'Place Order' });
    this.orderSuccessBanner = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/checkout');
  }

  async fillPayment(cardNumber: string, address: string) {
    await this.cardInput.fill(cardNumber);
    await this.addressInput.fill(address);
  }

  async submitOrder() {
    await this.placeOrderButton.click();
  }

  async expectOrderCompleted(orderNumber: string) {
    await expect(this.orderSuccessBanner).toContainText(`Order #${orderNumber} confirmed`);
  }
}
```

---

## Network Interception & API Mocking

E2E tests should not depend on unstable external third-party services (e.g. payment gateways or external SMS verification). Mock network calls at the network layer:

### In Playwright:
```typescript
test('should display out of stock banner on 409 conflict', async ({ page }) => {
  // Intercept the checkout API endpoint
  await page.route('**/api/v1/orders', async route => {
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Item inventory exhausted' })
    });
  });

  const checkout = new CheckoutPage(page);
  await checkout.goto();
  await checkout.submitOrder();

  await expect(page.getByText('Item inventory exhausted')).toBeVisible();
});
```

### In Cypress:
```typescript
it('mocks product inventory response', () => {
  cy.intercept('GET', '/api/products', { fixture: 'products.json' }).as('getProducts');

  cy.visit('/products');
  cy.wait('@getProducts');

  cy.get('[data-testid="product-card"]').should('have.length', 3);
});
```

---

## Eliminating Flakiness in Enterprise E2E Suites

### Anti-Pattern: Hardcoded Delays (`sleep(5000)`)
```typescript
// BAD / FLAKY:
await page.waitForTimeout(5000); // Fails on slow CI or wastes time on fast local dev
```

### Solution: Web-First Assertions & Auto-Waiting
Playwright automatically waits for elements to be actionable (visible, stable, attached to DOM, enabled) before performing clicks or fills:

```typescript
// GOOD: Automatically polls DOM until visible or times out gracefully
await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
await page.getByRole('button', { name: 'Confirm' }).click();
```

### Reusing Authentication State (Bypassing Slow UI Logins)
Instead of typing username/password before every single test, log in once during a global setup script and save browser storage state:

```typescript
// e2e/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate user', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('/dashboard');

  // Persist session cookies and localStorage to disk
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
```

In tests, inject `storageState: 'e2e/.auth/user.json'` to start tests already logged in!

---

## Visual Regression Testing

Playwright provides built-in visual screenshot comparison:

```typescript
test('homepage visual snapshot should not regress', async ({ page }) => {
  await page.goto('/');
  // Automatically masks dynamic timestamps or random avatars
  await expect(page).toHaveScreenshot('homepage-golden.png', {
    mask: [page.getByTestId('dynamic-timestamp')]
  });
});
```

---

## CI/CD Integration: Parallelization, Sharding, and Trace Reports

For large suites containing hundreds of tests, run tests in parallel across multiple CI runners using **sharding**:

```yaml
# GitHub Actions Matrix Sharding
strategy:
  matrix:
    shardIndex: [1, 2, 3, 4]
    shardTotal: [4]

steps:
  - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

---

## Common Mistakes and E2E Anti-Patterns

### Anti-Pattern 1: Testing Static Display Rules in E2E
Using full E2E browser tests to verify 50 combinations of input validation error messages. These belong in **unit or component tests**, which run 50x faster. E2E tests should focus on critical user journeys (happy paths, checkout, permissions).

### Anti-Pattern 2: Dependent Tests
Test B expecting data created in Test A. If Test A fails, Test B cascades into failure. Each test must be completely self-contained.

---

## Senior Interview Questions with Detailed Answers

### Q1: How do you architect an E2E testing strategy that balances test execution speed, coverage, and stability?
**Answer:**
Follow the **Testing Trophy** or Testing Pyramid:
1. **Unit Tests (70%):** Test isolated logic, utilities, signals, computed state, and services. Fast execution (seconds).
2. **Component/Integration Tests (20%):** Mount Angular components with TestBed or Playwright Component Testing. Validate interaction between templates, directives, and child components.
3. **E2E Tests (10%):** Cover critical end-to-end user journeys (authentication, checkout, critical multi-step workflows). 
**Execution speed & stability tactics:**
- Reuse authenticated session states (`storageState`) to avoid logging in before every test.
- Mock non-critical or slow third-party external APIs (Stripe, Twilio).
- Use resilient role-based locators (`getByRole`) and web-first auto-waiting assertions.
- Shard tests across parallel CI nodes.

---

### Q2: What causes flaky E2E tests in Angular applications, and how do you resolve them?
**Answer:**
**Root causes:**
1. **Asynchronous rendering delays:** Waiting for animations, Angular change detection cycles, or lazy-loaded chunks to finish before interacting with elements.
2. **Hardcoded timeouts (`sleep`):** Fails on slower CI machines when arbitrary wait times prove too short.
3. **Non-deterministic backend test data:** Tests colliding on shared database records.

**Resolutions:**
- Rely on Playwright's built-in auto-waiting assertions (`expect(locator).toBeVisible()`).
- Use unique randomized test data (e.g. UUID prefixes for emails) per test run.
- Enable Playwright Trace Viewer on failure (`trace: 'on-first-retry'`) to inspect DOM snapshots, console logs, and network traffic at the exact millisecond of failure.

---

## Hands-On Exercise: Production E2E Journey with Playwright

```typescript
// e2e/specs/product-purchase.spec.ts
import { test, expect } from '@playwright/test';

test.describe('E-Commerce Purchase Flow', () => {
  test('user can search for item, add to cart, and checkout', async ({ page }) => {
    // 1. Visit catalog
    await page.goto('/products');

    // 2. Search for product
    const searchInput = page.getByRole('searchbox', { name: 'Search catalog' });
    await searchInput.fill('Noise-Canceling Headphones');
    await page.getByRole('button', { name: 'Search' }).click();

    // 3. Select product card and add to cart
    const productCard = page.getByTestId('product-card').filter({ hasText: 'Noise-Canceling Headphones' });
    await expect(productCard).toBeVisible();
    await productCard.getByRole('button', { name: 'Add to Cart' }).click();

    // 4. Verify toast notification
    await expect(page.getByRole('status')).toContainText('Added to Cart');

    // 5. Navigate to cart and complete checkout
    await page.getByRole('link', { name: 'View Cart' }).click();
    await expect(page).toHaveURL('/cart');

    await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
    await expect(page).toHaveURL('/checkout');

    await page.getByLabel('Full Name').fill('Jane Doe');
    await page.getByRole('button', { name: 'Confirm Purchase' }).click();

    // 6. Verify successful completion
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thank you for your order!');
  });
});
```

---

## Revision Checklist

- [ ] Compare architectural differences between Playwright and Cypress.
- [ ] Implement the Page Object Model (POM) pattern for maintainability.
- [ ] Use user-facing locators (`getByRole`, `getByLabel`) over CSS classes.
- [ ] Eliminate flakiness with automatic waiting; eliminate `sleep()` / `waitForTimeout()`.
- [ ] Save and reuse authentication state via Playwright `storageState`.
- [ ] Intercept network requests with `page.route()` to test offline and error conditions.
- [ ] Configure test sharding in CI/CD pipelines.
