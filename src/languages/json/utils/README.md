# JSON Structure Comparison

A powerful tool for comparing the structural differences between two JSON objects, focusing on types, keys, and array structures rather than values.

## Features

- **Structural Analysis**: Compares JSON structures by analyzing types, keys, and array patterns
- **Real-time Comparison**: Automatically compares as you type with debounced updates
- **Visual Diff Tree**: Interactive tree view showing structural differences
- **Detailed Reports**: Comprehensive list of all differences with paths and descriptions
- **Configurable Options**: Customize comparison behavior for different use cases
- **Export Capabilities**: Copy reports to clipboard or download as JSON

## Usage

### Accessing the Tool

1. Open a JSON file in the editor
2. Click the "..." menu in the status bar (JSON options)
3. Select "Compare Structures" from the menu
4. The modal will open with your current JSON as the source

### Using the Interface

#### Two-Panel Layout
- **Left Panel**: Source JSON (read-only) - Your current editor content
- **Right Panel**: Target JSON (editable) - Paste or type the JSON to compare against

#### Options Panel
- **Array Sample Count**: Number of array elements to inspect (default: 3)
- **Strict Array Length**: Report differences if arrays have different lengths
- **Case Sensitive Keys**: Treat keys with different cases as different
- **Sync Scroll**: Synchronize scrolling between both editors

#### Results Section
- **Status Header**: Shows whether structures match or differ
- **Structure Tree**: Interactive tree view of the JSON structure with highlighted differences
- **Detailed List**: Complete list of all differences with paths and descriptions
- **Summary Stats**: Quick overview of difference types and counts

### Comparison Types

The tool detects the following types of structural differences:

1. **Missing Keys**: Keys present in one JSON but not the other
   - `MISSING_KEY_LEFT`: Key missing in source JSON
   - `MISSING_KEY_RIGHT`: Key missing in target JSON

2. **Type Mismatches**: Different data types at the same path
   - Example: `string` vs `number`, `object` vs `array`

3. **Array Length Mismatches**: Arrays with different lengths (when strict mode enabled)

4. **Polymorphic Arrays**: Arrays containing elements with different structures
   - Example: `[{"type": "user"}, {"type": "admin", "permissions": []}]`

## Technical Details

### Algorithm

The comparison algorithm works recursively:

1. **Type Check**: Compare data types at each path
2. **Object Comparison**: Compare key sets and recursively compare values
3. **Array Comparison**: 
   - Check for uniform structure (all elements have same structure)
   - Sample array elements based on configuration
   - Compare representative elements
4. **Path Tracking**: Maintain full paths for accurate reporting

### Performance

- **Debounced Updates**: 500ms delay to prevent excessive computation
- **Non-blocking**: Uses `setTimeout` to prevent UI freezing
- **Efficient Sampling**: Only inspects configured number of array elements
- **Early Termination**: Stops comparison when structural differences are found

### Configuration Options

```typescript
interface ComparisonOptions {
  arraySampleCount?: number;    // Default: 3
  strictArrayLength?: boolean;  // Default: false
  caseSensitiveKeys?: boolean;  // Default: true
}
```

## Examples

### Basic Object Comparison

**Source:**
```json
{
  "name": "John",
  "age": 30,
  "city": "NYC"
}
```

**Target:**
```json
{
  "name": "Jane",
  "age": 25
}
```

**Result:** `MISSING_KEY_RIGHT` at `/city`

### Array Structure Comparison

**Source:**
```json
[
  {"name": "John", "age": 30},
  {"name": "Jane", "age": 25}
]
```

**Target:**
```json
[
  {"name": "Bob"},
  {"name": "Alice"}
]
```

**Result:** `MISSING_KEY_RIGHT` at `/[0]/age` and `/[1]/age`

### Type Mismatch

**Source:**
```json
{
  "count": "123"
}
```

**Target:**
```json
{
  "count": 123
}
```

**Result:** `TYPE_MISMATCH` at `/count` (string vs number)

## API Reference

### `compareStructures(jsonA, jsonB, options?)`

Main function for comparing JSON structures.

**Parameters:**
- `jsonA`: Source JSON (string or object)
- `jsonB`: Target JSON (string or object)
- `options`: Optional configuration object

**Returns:**
```typescript
interface ComparisonResult {
  matches: boolean;
  diffTree: DiffTreeNode;
  diffList: DiffItem[];
  summary: {
    totalDifferences: number;
    missingKeysLeft: number;
    missingKeysRight: number;
    typeMismatches: number;
    arrayLengthMismatches: number;
    polymorphicArrays: number;
  };
}
```

## Best Practices

1. **Use for Structure Validation**: Perfect for validating API responses against expected schemas
2. **Configure Array Sampling**: Adjust `arraySampleCount` based on your data patterns
3. **Handle Polymorphic Arrays**: Be aware that polymorphic arrays limit structural comparison
4. **Export Reports**: Use the export features to document differences for team review
5. **Case Sensitivity**: Consider your use case when setting case sensitivity

## Limitations

- **Value Comparison**: Does not compare actual values, only structure
- **Polymorphic Arrays**: Limited analysis for arrays with mixed element structures
- **Large Files**: Performance may degrade with very large JSON files
- **Circular References**: Does not handle circular references in objects

## Future Enhancements

- **Web Worker Support**: Move comparison to background thread for better performance
- **Schema Generation**: Generate JSON schemas from structural analysis
- **Visual Diff**: Enhanced visual representation of differences
- **Batch Processing**: Compare multiple JSON files at once
- **Custom Rules**: User-defined comparison rules and patterns 