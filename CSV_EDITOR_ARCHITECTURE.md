# 🏗️ **CSV Editor Architecture & Implementation Guide**

## **Overview**

This document outlines the complete architecture and implementation of a world-class CSV editor integrated into the existing React/TypeScript tabbed editor application. The solution provides an Excel-like editing experience with high performance, comprehensive features, and seamless integration.

## **🎯 Core Design Principles**

1. **Client-Only Architecture**: All parsing, transformation, and exporting happens client-side
2. **Extensible View System**: Generic registry pattern supports future view types beyond CSV
3. **Performance First**: Virtualization and optimizations for 50k+ rows
4. **Developer Experience**: TypeScript-first with comprehensive testing
5. **Seamless Integration**: Works within existing Monaco Editor tabbed architecture

## **🏛️ Architecture Components**

### **1. Extended View Registry System**

**File**: `src/views/registry.ts`

The foundation of the extensible view system that allows different languages to have specialized editing interfaces.

```typescript
interface ExtendedView {
  id: string;
  languageId: string;
  label: string;
  icon: LucideIcon;
  component: React.ComponentType<ExtendedViewProps>;
  priority?: number;
}
```

**Key Features**:
- Language-agnostic registration system
- Priority-based ordering for multiple views per language
- Type-safe component interface
- Centralized view discovery

### **2. Enhanced Tab State Management**

**Files**: 
- `src/types.ts` (Tab interface extension)
- `src/stores/rootStore.ts` (Extended view actions)

Extended the existing Tab interface to support active view tracking:

```typescript
interface Tab {
  // ... existing properties
  activeViewId?: string | null; // For extended views like CSV table editor
}
```

**New Store Actions**:
- `setActiveView(tabId: string, viewId: string | null)`
- `getActiveView(tabId: string): string | null`

### **3. Dynamic Status Bar Integration**

**File**: `src/components/StatusBar/ExtendedViewButtons.tsx`

Dynamically renders view toggle buttons based on the current tab's language:

```typescript
export const ExtendedViewButtons: React.FC<{
  language: string;
  tabId: string;
}> = ({ language, tabId }) => {
  const availableViews = extendedViewRegistry.getViewsForLanguage(language);
  // Renders toggle buttons for each available view
};
```

**Integration**: Automatically appears in status bar when extended views are available.

### **4. CSV Data Management System**

**Files**:
- `src/views/csv/types.ts` (Type definitions)
- `src/views/csv/hooks/useCsvData.ts` (Core data hook)

#### **Type System**

```typescript
interface CsvCell {
  value: string;
  isValid: boolean;
  error?: string;
}

interface CsvRow {
  id: string;
  cells: CsvCell[];
  originalIndex: number;
  isValid: boolean;
}

interface CsvColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  index: number;
}
```

#### **Core Hook: `useCsvData`**

**Responsibilities**:
- CSV parsing with Papa Parse
- Data validation and diagnostics
- Undo/redo history management
- Content synchronization with debouncing
- Export functionality (CSV, JSON, Markdown, SQL)
- Snapshot management
- Column statistics

**Performance Optimizations**:
- Debounced content synchronization (300ms)
- Efficient undo/redo with circular buffer (50 states)
- Lazy validation and type inference
- Memory-efficient data structures

### **5. CSV Table Viewer Component**

**File**: `src/views/csv/components/CsvTableViewer.tsx`

A comprehensive Excel-like table editor built with:
- **@tanstack/react-table**: Grid logic and column management
- **@tanstack/react-virtual**: Row virtualization for performance
- **Custom cell editing**: Double-click to edit, keyboard navigation

#### **Key Features**

1. **Excel-like Interface**:
   - Row/column headers with numbers
   - In-place cell editing
   - Add/delete rows and columns
   - Keyboard navigation (arrows, tab, enter, escape)

2. **Performance**:
   - Virtual scrolling for 50k+ rows
   - Efficient re-rendering with React.memo patterns
   - Optimized column resizing

3. **Data Integrity**:
   - Real-time validation feedback
   - Diagnostic panel for parsing errors
   - Visual indicators for invalid data

4. **User Experience**:
   - Undo/redo with visual feedback
   - Snapshot system for major changes
   - Export options in toolbar
   - Responsive design with dark theme

### **6. Editor Integration**

**File**: `src/components/Editor/EditorPaneWrapper.tsx`

Updated to conditionally render extended views:

```typescript
{activeTab ? (
  extendedView ? (
    // Render extended view (like CSV table editor)
    <extendedView.component
      content={activeTab.content}
      onContentChange={(newContent) => updateTabState(activeTab.id, { content: newContent })}
      tabId={activeTab.id}
      isActive={true}
    />
  ) : activeTab.isTablet ? (
    <TabletView tab={activeTab} onChange={handleTabletStateChange} />
  ) : (
    <EditorInstance side={side} activeTab={activeTab} />
  )
) : (
  <div>No tab selected</div>
)}
```

## **🚀 Feature Implementation Roadmap**

### **Phase 1: Core Functionality ✅ COMPLETED**

- [x] Extended view registry system
- [x] CSV parsing with Papa Parse
- [x] Basic table rendering with virtualization
- [x] In-place cell editing
- [x] Row/column management (add/delete)
- [x] Undo/redo system
- [x] Content synchronization
- [x] Status bar integration
- [x] Basic diagnostics and validation

### **Phase 2: Enhanced Editing (Next)**

- [ ] **Advanced Keyboard Navigation**
  - Multi-cell selection with Shift+Click
  - Range selection with Shift+Arrow keys
  - Copy/paste with Ctrl+C/V

- [ ] **Drag-to-Fill**
  - Excel-style fill handle
  - Pattern recognition (numbers, dates)
  - Custom fill series

- [ ] **Column Operations**
  - Column reordering with drag-and-drop
  - Column type inference and validation
  - Column-wide transformations

### **Phase 3: Data Analysis**

- [ ] **Sorting & Filtering**
  - Multi-column sorting
  - Advanced filter UI
  - Custom filter expressions

- [ ] **Statistics & Insights**
  - Column statistics popover
  - Data type distribution charts
  - Frequency analysis

- [ ] **Data Validation**
  - Custom validation rules
  - Error highlighting
  - Data cleaning suggestions

### **Phase 4: Advanced Features**

- [ ] **Clipboard Integration**
  - Multi-cell copy/paste to/from Excel
  - Format preservation
  - Cross-application compatibility

- [ ] **Schema Management**
  - CSV schema inference
  - Schema validation
  - Schema templates

- [ ] **Transformation Tools**
  - Column splitting/merging
  - Data type conversions
  - Custom JavaScript transformations

### **Phase 5: Collaboration & Versioning**

- [ ] **Named Snapshots**
  - User-defined checkpoint names
  - Snapshot comparison views
  - Restore with conflict resolution

- [ ] **Version Timeline**
  - Visual timeline interface
  - Diff visualization
  - Branch/merge concepts

- [ ] **Export Enhancements**
  - Custom export templates
  - Batch export operations
  - API integration options

## **🧪 Testing Strategy**

### **Current Test Coverage**

1. **Component Tests**: `src/views/csv/__tests__/CsvTableViewer.test.tsx`
   - Rendering verification
   - User interaction testing
   - State management validation

2. **Hook Tests**: `src/views/csv/__tests__/useCsvData.test.ts`
   - CSV parsing edge cases
   - Data manipulation operations
   - Undo/redo functionality
   - Export format validation

### **Test Execution**

```bash
# Run CSV-specific tests
npm test -- --testPathPattern=csv

# Run all tests
npm test

# Build verification
npm run build
```

## **⚡ Performance Considerations**

### **Current Optimizations**

1. **Virtualization**: Only renders visible rows (35px height estimation)
2. **Debounced Sync**: 300ms delay for content updates
3. **Efficient Undo**: Circular buffer with 50-state limit
4. **Memoized Components**: React.memo for expensive renders
5. **Lazy Loading**: Extended views loaded on demand

### **Performance Targets**

- **50,000 rows × 50 columns**: Smooth scrolling and editing
- **<100ms response time**: For all user interactions
- **<2GB memory usage**: For maximum dataset size
- **<500ms initial load**: For CSV parsing and rendering

### **Monitoring & Profiling**

```typescript
// Performance monitoring hooks
const csvData = useCsvData(content, onContentChange, {
  maxRows: 50000, // Configurable limits
  delimiter: ',',
  hasHeader: true,
  skipEmptyLines: true
});

// Built-in performance metrics
console.log('Parse time:', csvData.parseTime);
console.log('Row count:', csvData.data.length);
console.log('Memory usage:', csvData.memoryUsage);
```

## **🔧 Development Workflow**

### **Adding New Extended Views**

1. **Create View Component**:
   ```typescript
   // src/views/myview/components/MyViewer.tsx
   export const MyViewer: React.FC<ExtendedViewProps> = ({ content, onContentChange, tabId, isActive }) => {
     // Implementation
   };
   ```

2. **Register View**:
   ```typescript
   // src/views/myview/index.ts
   extendedViewRegistry.register({
     id: 'my-view',
     languageId: 'mylang',
     label: 'My View',
     icon: MyIcon,
     component: MyViewer,
     priority: 1
   });
   ```

3. **Import in Main**:
   ```typescript
   // src/main.tsx
   import './views/myview';
   ```

### **Debugging Extended Views**

```typescript
// Debug registry state
console.log('Available views:', extendedViewRegistry.getAllViews());
console.log('Views for CSV:', extendedViewRegistry.getViewsForLanguage('csv'));

// Debug tab state
const activeView = useRootStore().getActiveView(tabId);
console.log('Active view:', activeView);
```

## **📦 Dependencies**

### **Core Dependencies**

```json
{
  "papaparse": "^5.4.1",           // CSV parsing
  "@tanstack/react-table": "^8.x", // Table logic
  "@tanstack/react-virtual": "^3.x", // Virtualization
  "lodash-es": "^4.x",             // Utilities
  "lucide-react": "^0.x"           // Icons
}
```

### **Development Dependencies**

```json
{
  "@types/papaparse": "^5.x",
  "@types/lodash-es": "^4.x",
  "@testing-library/react": "^14.x",
  "@testing-library/jest-dom": "^6.x"
}
```

## **🎨 Styling & Theming**

### **CSS Classes**

The CSV editor uses Tailwind CSS with dark theme support:

```css
/* Table styling */
.csv-table {
  @apply w-full border-collapse bg-gray-900 text-gray-200;
}

/* Cell styling */
.csv-cell {
  @apply border border-gray-700 p-2 min-h-[35px];
}

.csv-cell.selected {
  @apply bg-blue-900/30 ring-1 ring-blue-500;
}

.csv-cell.invalid {
  @apply bg-red-900/20;
}

/* Virtualization container */
.csv-virtual-container {
  @apply h-full overflow-auto custom-scrollbar;
}
```

### **Custom Scrollbar**

```css
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #374151;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #6b7280;
  border-radius: 4px;
}
```

## **🚀 Getting Started**

### **1. Installation**

Dependencies are already installed. The CSV editor is automatically available when the application starts.

### **2. Usage**

1. Open or create a CSV file in the editor
2. Look for the table icon (📊) in the status bar
3. Click to toggle between text and table view
4. Use Excel-like controls for editing:
   - Double-click cells to edit
   - Use arrow keys for navigation
   - Click + buttons to add rows/columns
   - Use Ctrl+Z/Y for undo/redo

### **3. Testing**

```bash
# Load sample data
# Copy content from sample-data.csv into a new tab
# Set language to 'csv'
# Click table icon in status bar
```

## **🔮 Future Enhancements**

### **Advanced Data Types**

- Date/time parsing and formatting
- Numeric validation and formatting
- Boolean checkbox rendering
- URL/email validation

### **Import/Export Extensions**

- Excel (.xlsx) import/export
- Google Sheets integration
- Database connectivity
- API data sources

### **Collaboration Features**

- Real-time collaborative editing
- Comment system
- Change tracking
- Conflict resolution

### **AI Integration**

- Data cleaning suggestions
- Pattern recognition
- Automated data validation
- Smart column type inference

---

## **📞 Support & Contribution**

This CSV editor is designed to be extensible and maintainable. The architecture supports:

- **Easy feature additions** through the hook-based design
- **Performance optimizations** with built-in monitoring
- **Testing coverage** with comprehensive test suites
- **Type safety** with full TypeScript support

For questions or contributions, refer to the component documentation and test files for implementation examples. 