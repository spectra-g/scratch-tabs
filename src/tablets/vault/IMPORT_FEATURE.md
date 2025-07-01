# Knowledge Vault Import Feature

The Knowledge Vault now supports importing items from various external sources. This feature allows you to quickly populate your vault with existing data from terminal history, VS Code snippets, and markdown notes.

## How to Use

1. Open the Knowledge Vault tablet
2. Click the "Import Items" button in the sidebar
3. Select the import source from the dropdown
4. Either paste content or upload a file (depending on the source)
5. Review the preview of items that will be created
6. Click "Import" to add the items to your vault

## Supported Import Sources

### Terminal History
- **Format**: Bash/zsh history output
- **Example**:
  ```
  998 chmod +x inspect_folder.sh
  999 git status
  1000 npm install
  ```
- **Features**:
  - Automatically extracts commands from history format
  - Generates titles from command content
  - Adds program names as additional labels (e.g., "git", "npm")
  - Sets content type to "script"

### VS Code Snippets
- **Format**: VS Code snippets.json file content
- **Example**:
  ```json
  {
    "Console log": {
      "body": "console.log($1);",
      "description": "Console log"
    },
    "Function": {
      "body": ["function $1($2) {", "  $3", "}"],
      "description": "Function"
    }
  }
  ```
- **Features**:
  - Parses JSON format
  - Handles both string and array body formats
  - Uses snippet names as titles
  - Sets content type to "code"

### Markdown Notes
- **Format**: Markdown content separated by horizontal rules (`---`)
- **Example**:
  ```markdown
  # Note 1
  This is the first note content.

  ---

  # Note 2
  This is the second note content.

  ---

  Note 3
  This note has no header.
  ```
- **Features**:
  - Splits content by horizontal rules
  - Uses first line as title (removes markdown headers)
  - Generates titles for notes without headers
  - Sets content type to "plaintext"

## Features

### Duplicate Detection
- The import system automatically detects duplicate items based on content
- Duplicates are highlighted in the preview and skipped during import
- Only unique items are added to your vault

### Preview System
- See a preview of all items that will be created
- View summary statistics (total items, new items, duplicates)
- Toggle preview visibility to save space

### Error Handling
- Parsing errors are displayed with specific details
- Invalid formats are handled gracefully
- Empty or malformed content is skipped

### Content Type Detection
- Automatically detects appropriate content types
- Uses existing content type detection logic
- Ensures proper categorization of imported items

## Technical Implementation

### File Structure
```
src/tablets/vault/
├── utils/
│   ├── importParsers.ts          # Core parsing logic
│   └── __tests__/
│       └── importParsers.test.ts # Unit tests
├── components/
│   ├── VaultImportModal.tsx      # Import modal UI
│   └── VaultSidebar.tsx          # Updated with import button
└── VaultTablet.tsx               # Main tablet with import integration
```

### Key Components

1. **Import Parsers** (`importParsers.ts`)
   - Modular parser functions for each import source
   - Error handling and validation
   - Consistent output format (Partial<VaultItem>[])

2. **Import Modal** (`VaultImportModal.tsx`)
   - User-friendly interface for import configuration
   - Real-time preview and validation
   - File upload and text input support

3. **Integration** (`VaultTablet.tsx`)
   - State management for import modal
   - Handler functions for import workflow
   - Duplicate detection and item addition

### Data Flow
1. User clicks "Import Items" → Opens import modal
2. User selects source and provides content → Parsers process data
3. Preview shows parsed items → User reviews and confirms
4. Import handler adds unique items to vault → Modal closes

## Best Practices

1. **Backup your vault** before large imports
2. **Review the preview** before importing to ensure correct parsing
3. **Use appropriate sources** for different types of content
4. **Clean up duplicates** after import if needed
5. **Organize imported items** with labels and categories

## Future Enhancements

Potential improvements for future versions:
- Support for more import sources (JSON, CSV, etc.)
- Custom import templates
- Batch import from multiple sources
- Import/export of vault structure and organization
- Integration with external services (GitHub Gists, etc.) 