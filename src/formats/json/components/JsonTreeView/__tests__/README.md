# JsonTreeView Test Suite

This directory contains comprehensive unit tests for the JsonTreeView components. The test suite covers all major functionality, edge cases, error handling, and performance scenarios.

## Test Files Overview

### 1. `useJsonTreeView.test.ts`
Tests for the `useJsonTreeView` custom hook that manages the tree view state.

**Coverage:**
- Hook initialization with default values
- Opening and closing tree view
- State management for JSON strings
- Multiple open/close operations
- Edge cases with empty, large, and malformed JSON
- State persistence between renders

### 2. `JsonTreeViewModal.test.tsx`
Tests for the modal wrapper component that displays the tree view.

**Coverage:**
- Modal rendering and structure
- Close button functionality
- Backdrop click handling
- Keyboard accessibility
- Loading states
- Large JSON handling
- ARIA attributes and accessibility

### 3. `JsonTreeView.unit.test.tsx`
Unit tests for the main JsonTreeView component focusing on core functionality.

**Coverage:**
- JSON parsing and error handling
- Search functionality (key/value and path modes)
- Tree expansion and collapse
- Copy functionality (paths, values, all paths)
- Node selection and keyboard navigation
- Open in new tab functionality
- Different data types (strings, numbers, booleans, null, arrays, objects)

### 4. `JsonTreeView.helpers.test.ts`
Tests for helper functions and complex logic within JsonTreeView.

**Coverage:**
- `buildTree` function for tree structure creation
- `buildVisibleNodes` function for expansion state
- `evaluateJsonPath` function for path evaluation
- `findAllMatches` function for search functionality
- `getAncestorPaths` function for path navigation
- `toggleAllNodes` function for bulk operations
- `copyToClipboard` function for clipboard operations
- `copyAllVisiblePaths` function for bulk copying

### 5. `JsonTreeView.integration.test.tsx`
Integration tests that test the component as a whole system.

**Coverage:**
- Component rendering with valid JSON
- Search mode switching
- Tree expansion and filtering
- Copy operations
- Node selection
- Different data types handling
- Performance with large JSON objects
- Edge cases and error scenarios

### 6. `JsonTreeView.error.test.tsx`
Comprehensive error handling and edge case tests.

**Coverage:**
- JSON parsing errors (malformed JSON, syntax errors)
- Path evaluation errors (invalid paths, out of bounds)
- Clipboard error handling
- Memory and performance edge cases
- Search edge cases
- Component state edge cases
- Accessibility error handling

### 7. `index.test.ts`
Tests for the index file exports to ensure proper module structure.

**Coverage:**
- Export verification for all components
- Hook export verification
- Import/export functionality

## Test Categories

### Functional Tests
- JSON parsing and validation
- Tree structure building
- Search and filtering
- Expansion and collapse
- Copy operations
- Path evaluation

### Error Handling Tests
- Invalid JSON input
- Malformed JSON syntax
- Invalid path expressions
- Clipboard errors
- Memory overflow scenarios

### Performance Tests
- Large JSON objects (1000+ items)
- Deeply nested structures (100+ levels)
- Rapid state changes
- Concurrent operations

### Accessibility Tests
- Keyboard navigation
- ARIA attributes
- Focus management
- Screen reader compatibility

### Edge Case Tests
- Empty and null inputs
- Special characters and Unicode
- Very long strings
- Complex nested structures
- Mixed data types

## Running the Tests

```bash
# Run all JsonTreeView tests
npm test -- JsonTreeView

# Run specific test file
npm test -- useJsonTreeView.test.ts

# Run with coverage
npm test -- JsonTreeView --coverage

# Run in watch mode
npm test -- JsonTreeView --watch
```

## Test Dependencies

The tests use the following testing libraries and mocks:

- **@testing-library/react**: For component rendering and interaction
- **@testing-library/user-event**: For user interaction simulation
- **jest**: Test framework
- **Mocked dependencies**: Stores, hooks, and external libraries

## Mock Strategy

The tests use comprehensive mocking to isolate the components:

1. **useDebounce hook**: Mocked to return the value directly for immediate testing
2. **Store hooks**: Mocked to return test data
3. **react-window**: Mocked with a simple implementation for virtual scrolling
4. **Clipboard API**: Mocked for copy operation testing
5. **Language detection**: Mocked to return consistent results

## Coverage Goals

The test suite aims for comprehensive coverage:

- **Line Coverage**: >95%
- **Branch Coverage**: >90%
- **Function Coverage**: >95%
- **Statement Coverage**: >95%

## Best Practices

1. **Isolation**: Each test is independent and doesn't rely on other tests
2. **Cleanup**: Proper cleanup in beforeEach/afterEach hooks
3. **Descriptive names**: Test names clearly describe what is being tested
4. **Edge cases**: Comprehensive coverage of error scenarios
5. **Performance**: Tests include performance benchmarks
6. **Accessibility**: Tests cover keyboard navigation and ARIA compliance

## Maintenance

When updating the JsonTreeView components:

1. Update corresponding test files
2. Add new test cases for new functionality
3. Ensure all error paths are covered
4. Update mocks if dependencies change
5. Run the full test suite before merging

## Troubleshooting

### Common Issues

1. **Mock failures**: Ensure all dependencies are properly mocked
2. **Async timing**: Use `waitFor` for asynchronous operations
3. **State updates**: Use `act` for state-changing operations
4. **Memory leaks**: Clean up event listeners and timers

### Debug Tips

1. Use `screen.debug()` to inspect the rendered DOM
2. Use `console.log()` in tests to debug state
3. Run individual tests with `--verbose` flag
4. Check coverage reports for uncovered code paths 