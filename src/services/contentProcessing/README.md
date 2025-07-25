# Content Processing Framework

A extensible framework for processing, cleaning, and formatting content based on language and context.

## Architecture

### Core Components

1. **ContentProcessingEngine** - Main orchestrator that manages processors, detectors, cleaners, and formatters
2. **ContentProcessors** - Language-specific processors that handle detection, cleaning, and formatting
3. **ContentProcessingService** - High-level service that provides a clean API for the ModelManager

### Key Features

- **Extensible**: Easy to add new content processors for different languages
- **Priority-based**: Processors are executed based on priority (highest first)
- **Context-aware**: Processing decisions based on paste events, clipboard imports, etc.
- **Performance-focused**: No logging in hot paths, efficient processing
- **Type-safe**: Full TypeScript support with comprehensive interfaces

## Usage

### Basic Processing

```typescript
import { contentProcessingService } from './contentProcessing';

const context = contentProcessingService.createContext(
  'tab-id',
  'plaintext',
  false, // not language locked
  true,  // from paste
  ''     // previous content
);

const result = await contentProcessingService.processContent(content, context);

if (result.processed) {
  // Content was transformed
  console.log('Processed:', result.content);
  console.log('New language:', result.language);
}
```

### Adding New Processors

```typescript
import { ContentProcessor } from './types';

class XmlContentProcessor implements ContentProcessor {
  id = 'xml-processor';
  name = 'XML Content Processor';
  supportedLanguages = ['xml'];
  priority = 80;

  canProcess(content: string, context: ContentProcessingContext): boolean {
    return context.isFromPaste && content.trim().startsWith('<');
  }

  process(content: string, context: ContentProcessingContext): ContentProcessingResult {
    // Format XML content
    const formatted = formatXml(content);
    return {
      processed: true,
      content: formatted,
      language: 'xml'
    };
  }
}

// Register the processor
contentProcessingService.getEngine().registerProcessor(new XmlContentProcessor());
```

## Current Processors

### JsonContentProcessor

Handles JSON content processing:

- **Unstringifies** double-escaped JSON (`"{\\"key\\":\\"value\\"}"` → formatted JSON)
- **Formats** compact single-line JSON
- **Priority**: 100 (high)
- **Triggers**: Paste events or clipboard imports with JSON content

### Processing Conditions

The JSON processor activates when:
1. Content is from paste (`isFromPaste: true`) OR likely from clipboard
2. Content is detected as JSON OR looks like stringified JSON
3. Content needs processing (stringified or compact format)

## Integration with ModelManager

The framework integrates seamlessly with the existing ModelManager:

```typescript
// In ModelManager
const processingResult = await this.processContent(
  newContent,
  tabId,
  currentTab.language,
  currentTab.languageLocked,
  isFromPaste,
  prevContent
);

if (processingResult.processed) {
  // Apply processed content to Monaco editor
  // Update language if changed
  // Preserve undo boundaries
}
```

## Testing

Comprehensive unit tests cover:

- **JsonContentProcessor**: All processing scenarios and edge cases  
- **ContentProcessingEngine**: Processor management and orchestration
- **ContentProcessingService**: Integration and real-world scenarios

Run tests:
```bash
npm test -- ContentProcessing
```

## Future Extensions

The framework is designed to easily support:

- **SQL formatting**: Detect and format SQL queries
- **CSV processing**: Clean and structure CSV data  
- **XML formatting**: Format and validate XML
- **Code beautification**: Language-specific code formatting
- **Data transformation**: Convert between formats (JSON ↔ YAML, etc.)

## Performance Characteristics

- **Zero logging** in hot paths for optimal performance
- **Lazy processing** - only processes when conditions are met
- **Efficient detection** - quick bail-outs for non-applicable content
- **Memory conscious** - processes content without excessive copying

## Migration from Legacy Code

The old `tryUnstringifyJson` method has been completely replaced with the new framework, providing:

- ✅ Better separation of concerns
- ✅ Extensible architecture  
- ✅ Comprehensive testing
- ✅ Type safety
- ✅ Performance optimizations
- ✅ Maintainable code structure