# CSV View Feature Tests

This document describes the comprehensive end-to-end tests for CSV view functionality in Scratch Tabs.

## Overview

The CSV view feature allows users to:
1. **Auto-detect** CSV content when typing or pasting CSV data
2. **Toggle** between Monaco editor and specialized CSV table view
3. **Manipulate** CSV data using table-specific tools
4. **Synchronize** changes between editor and table view

## Test Coverage

### 1. CSV Auto-Detection Scenarios

Tests verify that the language detection system correctly identifies CSV content:

- **Comma-separated values**: Standard CSV format with commas
- **Tab-separated values**: TSV format detection
- **Semicolon-separated values**: European CSV format
- **Quoted values**: CSV with quoted strings and special characters
- **Non-CSV rejection**: Ensures JSON and other formats don't trigger CSV detection

**Expected Behavior:**
- Status bar shows "CSV / TSV" language label
- Table View button appears in status bar
- Language detection happens automatically as user types

### 2. CSV Viewer Toggle Scenarios

Tests the toggle functionality between editor and table view:

- **Editor to Table View**: Click Table View button to switch to table interface
- **Table View to Editor**: Click Table View button again to return to editor
- **Content Preservation**: Original content remains intact during view switches
- **UI State Management**: Proper button state changes (Open/Close Table View)

**Expected Behavior:**
- Smooth transition between views
- Table displays proper headers and data structure
- Row/column counts are accurate
- Toolbar controls are visible in table view

### 3. CSV Data Manipulation Scenarios

Tests the specialized table view tools and operations:

- **Duplicate Detection**: Find and highlight duplicate rows
- **Row/Column Operations**: Add, delete, duplicate rows and columns
- **Cell Editing**: In-place editing of individual cells
- **Data Validation**: Handle malformed CSV gracefully
- **Undo/Redo**: Full history management for table operations

**Expected Behavior:**
- Changes are reflected immediately in table view
- Data validation warnings appear for malformed content
- Undo/redo operations work correctly
- Export functionality provides multiple format options

### 4. Synchronization Scenarios

Tests data consistency between editor and table view:

- **Table to Editor Sync**: Changes made in table view appear in editor
- **Content Integrity**: Complex data (quotes, special chars) preserved
- **Format Preservation**: Original CSV formatting maintained
- **Performance**: Large datasets handled efficiently with virtualization

**Expected Behavior:**
- All changes synchronize bidirectionally
- No data loss during view transitions
- Quoted values and special characters handled correctly
- Performance remains responsive with large datasets

## Test Structure

### Feature File: `csv-view.feature`

Contains 15 comprehensive scenarios covering:
- Basic auto-detection for different delimiter types
- View toggling and state management  
- Data manipulation and tool usage
- Synchronization and data integrity
- Error handling and edge cases
- Performance with larger datasets

### Step Definitions: `csv.steps.ts`

Provides CSV-specific step definitions:
- Language detection assertions
- Table view button interactions
- CSV table content verification
- Data manipulation operations
- Export and tool functionality

### Action Classes

**`statusBar.actions.ts`** - Enhanced with CSV-specific methods:
- `expectTableViewButtonVisible()` - Verify table view button appears
- `clickTableViewButton()` - Toggle between views
- `waitForLanguageDetection()` - Wait for CSV detection

**`csvTableView.actions.ts`** - New dedicated class for table operations:
- Table structure verification
- Cell and row manipulation
- Tool interactions (undo, export, etc.)
- Data validation and error handling
- Performance testing utilities

## Running CSV Tests

### Run All CSV Tests
```bash
npm run e2e:full -- tests/e2e/features/csv-view.feature
```

### Run Specific CSV Scenarios
```bash
# Auto-detection tests only
npm run e2e:full -- tests/e2e/features/csv-view.feature --name "CSV auto-detection"

# Table view toggle tests
npm run e2e:full -- tests/e2e/features/csv-view.feature --name "Toggle from editor to CSV table view"

# Data manipulation tests
npm run e2e:full -- tests/e2e/features/csv-view.feature --name "CSV data manipulation"
```

### Debug CSV Tests
```bash
DEBUG=pw:api npm run e2e:full -- tests/e2e/features/csv-view.feature
```

## Key Test Data

### Sample CSV Data Used in Tests

**Simple CSV:**
```csv
ID,Name,Age,City
1,John Doe,28,New York
2,Jane Smith,32,San Francisco
3,Bob Johnson,25,Chicago
```

**CSV with Quotes:**
```csv
"Product","Price","Description"
"Laptop","$999.99","High-performance laptop"
"Mouse","$29.99","Wireless optical mouse"
"Keyboard","$79.99","Mechanical keyboard"
```

**Malformed CSV (for error handling):**
```csv
ID,Name,Age,City
1,John Doe,28,New York,Extra
2,Jane Smith
3,Bob Johnson,25,Chicago
```

## Expected Test Results

All scenarios should pass with:
- ✅ **Auto-detection**: CSV formats recognized correctly
- ✅ **View Toggle**: Seamless switching between editor and table
- ✅ **Data Integrity**: No loss or corruption during operations
- ✅ **Tool Functionality**: All table tools working as expected
- ✅ **Performance**: Responsive handling of larger datasets
- ✅ **Error Handling**: Graceful handling of malformed data

## Troubleshooting

### Common Issues

1. **Language Detection Timing**: If detection seems slow, ensure the content has enough rows and columns to trigger CSV detection
2. **Table View Not Appearing**: Check that the CSV content meets the detection criteria (minimum 3 delimiters per row)
3. **Synchronization Issues**: Verify that changes are saved before switching views
4. **Performance Issues**: Large datasets may require patience for virtualization to load

### Debug Tips

- Use browser DevTools to inspect `data-testid` attributes
- Check console for CSV parsing errors
- Verify that extended view buttons are present in status bar
- Ensure CSV content meets minimum detection thresholds

## Future Enhancements

Potential additional test scenarios:
- Different character encodings (UTF-8, Latin-1)
- Very large datasets (10,000+ rows)
- Complex CSV structures (nested quotes, line breaks)
- Import/export to different formats
- Real-time collaboration in table view
- Advanced sorting and filtering operations

## Architecture Benefits

This comprehensive test suite provides:
- **Confidence** in CSV feature reliability
- **Regression Prevention** for future changes
- **Documentation** of expected behavior
- **Quality Assurance** for the CSV workflow
- **Performance Validation** for large datasets

The tests follow the established E2E framework patterns using stable selectors, proper waiting mechanisms, and modular action classes for maintainability.