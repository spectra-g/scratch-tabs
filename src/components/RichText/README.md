# Rich Text Editor Implementation

This module implements a TipTap-based rich text editor that transforms the existing "Text Tab" architecture into a "Universal Tab" system.

## Architecture Overview

### Universal Tab Concept
- All tabs start as plain text (`isRich: false`)
- Users can upgrade tabs to rich text mode (`isRich: true`) 
- The upgrade is triggered by pasting images or manual conversion
- Rich text tabs support images, formatting, tables, and background textures

### Key Components

#### Core Editor
- `RichTextEditor.tsx` - Main editor component with TipTap integration
- `hooks/useRichTextEditor.ts` - Editor configuration and setup
- `hooks/useImagePasteDetection.ts` - Detects image pastes for upgrade prompts

#### UI Components
- `components/RichTextToolbar.tsx` - Floating bubble menu for formatting
- `components/EditorSearchBar.tsx` - In-editor search functionality
- `components/UpgradeConfirmationModal.tsx` - Modal for plain-to-rich conversion
- `components/ImportCodeModal.tsx` - Modal for importing code from other tabs
- `components/BlockContextMenu.tsx` - Contextual actions for content blocks

#### Extensions
- `extensions/DateCreatedNode.tsx` - Non-editable date display at top
- `extensions/BlockWrapper.tsx` - Wrapper for block-level contextual actions
- `extensions/SearchExtension.ts` - Custom search implementation

#### Services & Utils
- `services/RichTextService.ts` - Business logic for rich text operations
- `utils/contentMigration.ts` - Utilities for converting between text and rich formats

### Features Implemented

1. **Date Created Display** - Shows creation date at top of rich text documents
2. **Full-Page Canvas** - Editor takes full height/width with unlimited scrolling
3. **Simple Toolbar** - Bubble menu with bold, italic, lists, tables, links
4. **Dark Mode Integration** - Seamless integration with existing dark theme
5. **Background Textures** - Paper and grid texture options
6. **Code Import** - Import content from other tabs as syntax-highlighted code blocks
7. **Block-Level Actions** - Hover menus on paragraphs/headings with blur effect
8. **In-Page Search** - Search with highlighting and navigation

### Integration Points

#### EditorPaneWrapper
The main editor container now conditionally renders:
- Monaco Editor for `isRich: false` tabs
- RichTextEditor for `isRich: true` tabs
- Existing tablet views for `isTablet: true` tabs

#### Status Bar
- Added `RichTextControls` component for mode switching and texture selection
- Language detection disabled for rich text tabs
- Font size controls hidden for rich text tabs (TipTap handles its own styling)

#### Data Persistence
- Added `richContent` field to Tab interface for TipTap JSON
- Added `isRich` boolean flag
- Added `backgroundTexture` enum field
- Database layer handles JSON serialization/deserialization

### Usage Examples

```typescript
// Upgrade a tab to rich text
RichTextService.upgradeTabToRichText('tab-id');

// Import code from another tab
await RichTextService.importContentAsCodeBlock('target-tab', 'source-tab', editor);

// Set background texture
RichTextService.setBackgroundTexture('tab-id', 'paper');
```

### Testing
- Comprehensive unit tests for all utilities and services
- Component tests for UI interactions
- Integration tests for the upgrade/downgrade flow

### Future Enhancements
- Collaborative editing support
- More background texture options
- Advanced table editing features
- Plugin system for custom extensions