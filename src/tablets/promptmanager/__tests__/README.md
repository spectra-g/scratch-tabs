# PromptManager Test Suite

This directory contains comprehensive unit tests for the PromptManager tablet and its components. The test suite covers all major functionality including CRUD operations, user interactions, data validation, and error handling.

## Test Structure

### Core Tests

#### `utils.test.ts`
Tests for utility functions used throughout the promptmanager:
- **Token Count Utils**: `estimateTokenCount`, `formatTokenCount`, `getTokenCountColor`
- **Variable Utils**: `parseVariables`, `substituteVariables`, `shouldUseTextarea`

**Coverage**: 100% of utility functions with edge cases and error scenarios.

#### `PromptManagerTablet.test.tsx`
Tests for the main tablet component:
- **Initialization**: State creation, default values, data structure validation
- **State Management**: Serialization, deserialization, data persistence
- **CRUD Operations**: Create, read, update, delete for prompts, templates, snippets, workflows, tags
- **Import/Export**: Data import/export functionality
- **Template Variables**: Variable parsing and substitution

**Coverage**: All tablet functionality with comprehensive error handling.

#### `PromptManagerUI.test.tsx`
Tests for the main UI component:
- **Rendering**: Component structure, data display, counts
- **Tab Navigation**: Switching between prompts, templates, snippets, workflows
- **Search and Filtering**: Search queries, tag filtering, favorites toggle
- **User Interactions**: All CRUD operations through UI
- **Modal Operations**: Import/export, template selection, variable filling
- **Error Handling**: Graceful handling of missing data and errors

**Coverage**: All UI interactions and state management.

### Component Tests

#### `components/PromptList.test.tsx`
Tests for the prompt list component:
- **Rendering**: Display of prompts, metadata, tags
- **Search and Filtering**: Query-based filtering, tag filtering, favorites
- **Sorting**: All sort options (title, date, usage, direction)
- **User Interactions**: Selection, creation, updates, deletion, cloning
- **Performance**: Large datasets, rapid filtering
- **Accessibility**: ARIA labels, keyboard navigation

**Coverage**: Complete list functionality with edge cases.

#### `components/PromptEditor.test.tsx`
Tests for the prompt editor component:
- **Editing**: Title, content, tag management
- **Formatting**: Bold, italic, code formatting with selection
- **Insert Functionality**: Variables, snippets insertion
- **Save/Cancel**: Validation, auto-save, confirmation dialogs
- **History**: Version history, restoration
- **Keyboard Shortcuts**: Ctrl+S, Escape, Ctrl+P
- **Validation**: Field validation, length limits

**Coverage**: Complete editing functionality with user experience testing.

#### `components/WorkflowEditor.test.tsx`
Tests for the workflow editor component:
- **Workflow Management**: Creation, editing, deletion
- **Step Management**: Add, remove, reorder, edit steps
- **Step Validation**: Required fields, unique titles, prompt selection
- **Drag and Drop**: Step reordering via drag and drop
- **Preview**: Step content preview, prompt selection
- **Keyboard Shortcuts**: Save, cancel, add step shortcuts
- **Validation**: Workflow validation, step validation

**Coverage**: Complete workflow editing with complex interactions.

### Data Tests

#### `data.test.ts`
Tests for default data files:
- **Default Templates**: Structure validation, content quality, variable syntax
- **Default Snippets**: Structure validation, content quality, categories
- **Default Tags**: Structure validation, color quality, uniqueness
- **Data Consistency**: ID uniqueness, category naming, no overlaps
- **Content Quality**: Template variables, snippet formatting, tag colors

**Coverage**: All default data with quality and consistency checks.

## Test Categories

### Unit Tests
- Individual function testing
- Component isolation
- Mock dependencies
- Edge case handling

### Integration Tests
- Component interaction testing
- Data flow validation
- State management testing
- User workflow testing

### Error Handling Tests
- Invalid data handling
- Network error simulation
- Validation error testing
- Graceful degradation

### Performance Tests
- Large dataset handling
- Rapid user interactions
- Memory usage testing
- Rendering performance

### Accessibility Tests
- ARIA compliance
- Keyboard navigation
- Screen reader compatibility
- Focus management

## Running Tests

### Run All Tests
```bash
npm test -- promptmanager
```

### Run Specific Test Files
```bash
# Run utility tests only
npm test -- utils.test.ts

# Run component tests only
npm test -- components/

# Run data tests only
npm test -- data.test.ts
```

### Run with Coverage
```bash
npm test -- promptmanager --coverage
```

### Run in Watch Mode
```bash
npm test -- promptmanager --watch
```

## Test Coverage Goals

### Function Coverage: 100%
- All exported functions tested
- All public methods tested
- All utility functions tested

### Branch Coverage: >95%
- All conditional branches tested
- Error paths tested
- Edge cases covered

### Line Coverage: >90%
- All significant code paths tested
- Mock implementations excluded
- Error handling included

## Mock Strategy

### Component Mocks
- Child components mocked to isolate testing
- Props and callbacks tested
- User interactions simulated

### External Dependencies
- Browser APIs mocked (clipboard, storage)
- Network requests mocked
- Timer functions mocked

### Data Mocks
- Test data factories
- Consistent test data
- Edge case data scenarios

## Test Data

### Mock Prompts
```typescript
const mockPrompts: Prompt[] = [
  {
    id: "prompt-1",
    title: "Test Prompt 1",
    content: "This is test content 1",
    tags: ["tag1", "tag2"],
    isFavorite: false,
    createdAt: Date.now() - 1000,
    lastModified: Date.now() - 500,
    usageCount: 5,
    history: []
  }
];
```

### Mock Templates
```typescript
const mockTemplates: Template[] = [
  {
    id: "template-1",
    title: "Test Template 1",
    description: "Test description 1",
    content: "Hello {{name}}!",
    category: "test"
  }
];
```

### Mock Workflows
```typescript
const mockWorkflows: Workflow[] = [
  {
    id: "workflow-1",
    title: "Test Workflow 1",
    description: "Test workflow description 1",
    steps: [{ id: "step1", promptId: "prompt-1" }],
    tags: ["tag1"],
    isFavorite: false,
    createdAt: Date.now(),
    lastModified: Date.now()
  }
];
```

## Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Mock Management
- Clear mocks before each test
- Use consistent mock data
- Mock at appropriate level

### Error Testing
- Test both success and failure paths
- Validate error messages
- Test error recovery

### Performance Testing
- Test with realistic data sizes
- Measure rendering performance
- Test memory usage

## Maintenance

### Adding New Tests
1. Follow existing test patterns
2. Use consistent mock data
3. Test both success and error cases
4. Add appropriate assertions

### Updating Tests
1. Update mocks when components change
2. Maintain test data consistency
3. Update coverage expectations
4. Document breaking changes

### Debugging Tests
1. Use `console.log` for debugging
2. Check mock implementations
3. Verify test data
4. Run tests in isolation

## Common Issues

### Mock Dependencies
- Ensure all imports are mocked
- Check mock implementation
- Verify mock return values

### Async Operations
- Use `waitFor` for async operations
- Handle promises correctly
- Test loading states

### User Interactions
- Use `userEvent` for interactions
- Wait for state updates
- Test keyboard shortcuts

### Component Rendering
- Check for required props
- Verify component structure
- Test conditional rendering

## Performance Considerations

### Test Execution Time
- Keep individual tests fast (<100ms)
- Use efficient mocks
- Avoid unnecessary setup

### Memory Usage
- Clean up after tests
- Avoid memory leaks in mocks
- Use appropriate data sizes

### Coverage Optimization
- Focus on critical paths
- Test edge cases
- Maintain high coverage

## Future Enhancements

### Planned Improvements
- E2E test integration
- Visual regression testing
- Performance benchmarking
- Accessibility testing

### Test Automation
- CI/CD integration
- Automated coverage reporting
- Test result analysis
- Performance monitoring

## Contributing

### Adding New Tests
1. Follow existing patterns
2. Maintain high coverage
3. Test edge cases
4. Document complex tests

### Test Review
1. Check test quality
2. Verify coverage
3. Ensure maintainability
4. Review performance impact

### Documentation
1. Update README for new tests
2. Document test patterns
3. Explain complex scenarios
4. Maintain examples 