# E2E Testing Framework

This directory contains the End-to-End (E2E) testing framework for Scratch Tabs, built with Cucumber.js and Playwright.

## Architecture

### Overview
The E2E testing framework follows a modular, action-based architecture designed for maintainability and scalability:

```
tests/e2e/
├── features/           # Cucumber feature files (.feature)
├── steps/             # Step definitions (interaction, navigation, assertion)
├── support/           # Test infrastructure and action classes
│   ├── world.ts       # Main test world orchestrator
│   ├── hooks.ts       # Setup/teardown hooks
│   └── *.actions.ts   # Modular action classes
└── README.md          # This file
```

### Action Classes Architecture

The framework uses a **modular action-based approach** to avoid the "God Object" anti-pattern:

- **`world.ts`**: **Essential** lightweight orchestrator and dependency injection container
- **`editor.actions.ts`**: Editor-specific interactions (typing, undo, etc.)
- **`tabBar.actions.ts`**: Tab management (clicking tabs, context menus, etc.)
- **`contextMenu.actions.ts`**: Context menu interactions
- **`navigation.actions.ts`**: Page navigation and URL handling
- **`clipboard.actions.ts`**: Clipboard operations
- **`fileActions.ts`**: File upload and drag-drop operations
- **`statusBar.actions.ts`**: Status bar interactions

Each action class encapsulates specific UI interactions and business logic, making tests more maintainable and reusable.

#### Why `world.ts` is Essential

The `world.ts` file **cannot be removed** as it serves three fundamental purposes:

1. **Cucumber Architecture Requirement**: Provides the World class that Cucumber.js requires for:
   - Holding state between steps in a scenario
   - Providing the `this` context in step definitions
   - Managing test resource lifecycle

2. **Playwright Integration**: Essential for:
   - Storing `page` and `context` objects
   - Making them available across all step definitions
   - Proper resource cleanup after tests

3. **Dependency Injection Container**: Serves as the central hub that:
   - Instantiates all action classes with the same `page` instance
   - Provides single point of access to all actions
   - Ensures consistent state management

The file has been **streamlined** to its essential purpose, removing 50+ legacy delegate methods that were just bloat.

### Compilation Process

**Important**: The E2E tests require compilation due to TypeScript and module system constraints:

1. **TypeScript Compilation**: `.ts` files are compiled to `.js` using `tsc`
2. **Module Conversion**: `.js` files are renamed to `.cjs` for CommonJS compatibility
3. **Import Patching**: `require()` statements are updated to reference `.cjs` files

This process is automated by the build scripts but can cause issues if not run properly.

## Commands

### Full Test Execution
```bash
# Run all tests (excluding @wip scenarios)
npm run e2e

# Run all tests (including @wip scenarios)
npm run e2e:full
```

### Selective Test Execution
```bash
# Run specific feature file
npm run e2e:full -- tests/e2e/features/undo.feature

# Run specific scenario by name
npm run e2e:full -- tests/e2e/features/undo.feature --name "Test undo functionality across multiple tabs"

# Run only @wip scenarios
npm run e2e:full -- --tags @wip

# Run all scenarios except @wip
npm run e2e:full -- --tags "not @wip"

# Run scenarios with multiple tags
npm run e2e:full -- --tags "@smoke and not @wip"
```

### Development Commands
```bash
# Compile TypeScript tests only
npm run e2e:compile

# Run with different output formats
npm run e2e:full -- --format summary
npm run e2e:full -- --format progress
npm run e2e:full -- --format json
```

## Framework Evolution

### From Brittle to Stable Selectors

This framework has evolved from using brittle CSS-class-based selectors to implementing a stable test contract:

**❌ Before (Brittle):**
```typescript
// Fragile - breaks when styles change
async expectTabIsActive(tabTitle: string) {
  const activeTab = this.page.locator('[role="button"].bg-gray-600\\/90');
  await expect(activeTab).toContainText(tabTitle);
}
```

**✅ After (Stable):**
```typescript
// Resilient - survives style changes
async expectTabIsActive(tabTitle: string) {
  const activeTab = this.page.locator(`[data-testid="tab-${tabTitle}"][aria-selected="true"]`);
  await expect(activeTab).toBeVisible();
}
```

### Icon Selector Simplification

**❌ Before (Overly Defensive):**
```typescript
async clickIcon(iconTestId: string) {
  // 13 different selectors tried in sequence
  const selectors = [
    () => this.page.getByRole('button', { name: iconTestId, exact: true }).click(),
    () => this.page.getByTitle(iconTestId).click(),
    // ... 11 more fallback selectors
  ];
  // Complex fallback logic...
}
```

**✅ After (Clear Intent):**
```typescript
async clickIcon(iconName: string) {
  const iconTestIdMap = {
    'New tab': 'icon-new-tab',
    'New tablet': 'icon-new-tablet'
  };
  const testId = iconTestIdMap[iconName] || `icon-${iconName.toLowerCase().replace(/\s+/g, '-')}`;
  const locator = this.page.locator(`[data-testid="${testId}"]`);
  await expect(locator).toBeVisible();
  await locator.click();
}
```

### Results

With these improvements:
- **10/10 scenarios pass** (excluding @wip tests)
- **99/99 steps pass** in main test suite
- **Style-resilient** selectors that won't break with UI changes
- **Clear intent** in test code
- **Maintainable** and **scalable** architecture

## Best Practices

### 1. Stable Test Contract (CRITICAL)

**✅ The Foundation: Use `data-testid` and ARIA attributes**

This framework implements a **stable contract** between the application and tests using:
- `data-testid` attributes for reliable element identification
- `aria-selected` for state verification (instead of CSS classes)
- Semantic HTML attributes where appropriate

**Example Implementation:**
```tsx
// In React Component (SortableTab.tsx)
<div
  data-testid={`tab-${tab.title}`}
  aria-selected={isActive}
  className={`... ${isActive ? 'bg-gray-600/90' : '...'} ...`}
>
  {/* ... */}
</div>
```

```typescript
// In Test Action (tabBar.actions.ts)
async expectTabIsActive(tabTitle: string) {
  // Resilient to style changes - checks semantic state, not appearance
  const activeTab = this.page.locator(`[data-testid="tab-${tabTitle}"][aria-selected="true"]`);
  await expect(activeTab).toBeVisible();
}
```

**Why This Matters:**
- **Style-Resilient**: Tests won't break when designers change colors from `bg-gray-600` to `bg-blue-700`
- **Intent-Clear**: Selectors clearly express what they're testing
- **Maintainable**: Easy to update when UI structure changes

### 2. Avoid Arbitrary Timeouts

**❌ Never do this:**
```typescript
await page.waitForTimeout(5000); // Arbitrary timeout
```

**✅ Always use Playwright's built-in waiting:**
```typescript
// Wait for element to be visible
await expect(page.locator('[data-testid="my-button"]')).toBeVisible();

// Wait for element to be in DOM
await page.waitForSelector('[data-testid="my-button"]');

// Wait for network requests
await page.waitForResponse(response => response.url().includes('/api/data'));

// Wait for specific state
await page.waitForLoadState('networkidle');
```

### 3. Use Reliable Selectors

**❌ Avoid fragile selectors:**
```typescript
await page.locator('div:nth-child(3) > button').click();
```

**✅ Use stable, semantic selectors:**
```typescript
// Prefer data-testid attributes
await page.locator('[data-testid="submit-button"]').click();

// Use text content when stable
await page.locator('button:has-text("Submit")').click();

// Use role-based selectors
await page.getByRole('button', { name: 'Submit' }).click();
```

### 4. Handle Asynchronous Operations

**❌ Don't assume immediate state changes:**
```typescript
await button.click();
expect(await page.locator('.result').textContent()).toBe('expected');
```

**✅ Wait for state changes:**
```typescript
await button.click();
await expect(page.locator('.result')).toContainText('expected');
```

### 5. Use Action Classes for Reusability

**❌ Don't repeat complex interactions:**
```typescript
// In multiple test files
await page.locator('[data-testid="editor"]').click();
await page.keyboard.type('Hello World');
await page.keyboard.press('Control+z');
```

**✅ Use action classes:**
```typescript
// In editor.actions.ts
async typeInEditor(content: string) {
  const editor = this.getActiveEditorLocator();
  await editor.focus();
  await editor.type(content);
}

async pressCtrlZ() {
  const editor = this.getActiveEditorLocator();
  await editor.focus();
  await this.page.keyboard.down('Control');
  await this.page.keyboard.press('z');
  await this.page.keyboard.up('Control');
}

// In tests
await this.editor.typeInEditor('Hello World');
await this.editor.pressCtrlZ();
```

### 6. Tag Management

Use tags to organize and filter tests:

```gherkin
@smoke @critical
Scenario: Basic functionality test
  # High priority, runs in smoke tests

@wip
Scenario: Work in progress
  # Excluded from main runs

@slow
Scenario: Performance test
  # Runs separately due to time
```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Run `npm run e2e:compile` to recompile
2. **Step definitions not found**: Ensure compilation completed successfully
3. **Timeout errors**: Check if selectors are correct and elements are actually present
4. **Flaky tests**: Review for race conditions and add proper waits

### Debug Mode

Run tests with debug output:
```bash
DEBUG=pw:api npm run e2e:full
```

### Screenshots and Videos

Failed tests automatically capture screenshots and videos in the `reports/` directory.

## File Structure

```
tests/e2e/
├── features/                    # Cucumber feature files
│   ├── undo.feature           # Undo functionality tests
│   ├── welcome-screen-entry-points.feature
│   └── performance.feature
├── steps/                      # Step definitions
│   ├── interaction.steps.ts   # User interactions
│   ├── navigation.steps.ts    # Page navigation
│   └── assertion.steps.ts     # Verifications
├── support/                    # Test infrastructure
│   ├── world.ts               # Main test world
│   ├── hooks.ts               # Setup/teardown
│   ├── editor.actions.ts      # Editor interactions
│   ├── tabBar.actions.ts      # Tab management
│   ├── contextMenu.actions.ts # Context menus
│   ├── navigation.actions.ts  # Navigation
│   ├── clipboard.actions.ts   # Clipboard operations
│   ├── fileActions.ts         # File operations
│   └── statusBar.actions.ts  # Status bar
└── README.md                  # This file
```

## Contributing

When adding new tests:

1. **Create feature files** in `features/` with clear, descriptive scenarios
2. **Add step definitions** in appropriate `steps/` files
3. **Create action classes** for complex interactions in `support/`
4. **Use semantic selectors** with `data-testid` attributes
5. **Add proper waits** using Playwright's built-in capabilities
6. **Tag appropriately** for test organization and filtering

Remember: The goal is maintainable, reliable tests that provide confidence in the application's functionality. 