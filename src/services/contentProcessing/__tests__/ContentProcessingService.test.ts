import { ContentProcessingService } from '../ContentProcessingService';

describe('ContentProcessingService', () => {
  let service: ContentProcessingService;

  beforeEach(() => {
    service = new ContentProcessingService();
  });

  describe('initialization', () => {
    it('should initialize with default components', () => {
      const engine = service.getEngine();
      const processors = engine.getProcessors();
      
      // Should have JSON processor
      expect(processors.length).toBeGreaterThan(0);
      expect(processors.some(p => p.id === 'json-processor')).toBe(true);
    });

    it('should have language detection capability', () => {
      // Test with JSON content
      const jsonLanguage = service.detectLanguage('{"test": "value"}');
      expect(jsonLanguage).toBe('json');

      // Test with plain text
      const textLanguage = service.detectLanguage('This is plain text');
      expect(textLanguage).toBe('plaintext');
    });
  });

  describe('context creation', () => {
    it('should create context with basic parameters', () => {
      const context = service.createContext(
        'tab-1',
        'json',
        false,
        true,
        ''
      );

      expect(context).toEqual({
        tabId: 'tab-1',
        currentLanguage: 'json',
        languageLocked: false,
        isFromPaste: true,
        previousContent: '',
        flags: {
          isLikelyFromClipboard: false,
          isInitialContent: false
        }
      });
    });

    it('should detect likely clipboard content when explicitly marked', () => {
      const context = service.createContext(
        'tab-1',
        'plaintext',
        false,
        false, // not from paste
        '', // empty previous content
        { isInitialContent: true, isFromClipboardImport: true }
      );

      expect(context.flags?.isLikelyFromClipboard).toBe(true);
    });

    it('should not detect clipboard when previous content exists', () => {
      const context = service.createContext(
        'tab-1',
        'plaintext',
        false,
        false,
        'existing content',
        { isInitialContent: true }
      );

      expect(context.flags?.isLikelyFromClipboard).toBe(false);
    });

    it('should include additional flags', () => {
      const context = service.createContext(
        'tab-1',
        'json',
        false,
        true,
        '',
        { 
          isInitialContent: true,
          isLikelyFromClipboard: true // explicit override
        }
      );

      expect(context.flags?.isInitialContent).toBe(true);
      expect(context.flags?.isLikelyFromClipboard).toBe(true);
    });
  });

  describe('content processing integration', () => {
    it('should process stringified JSON content', async () => {
      const content = '"{\\"name\\":\\"John\\",\\"age\\":30}"';
      const context = service.createContext(
        'tab-1',
        'json', // Language detection would have determined this is JSON
        false,
        true,
        ''
      );

      const result = await service.processContent(content, context);

      expect(result.processed).toBe(true);
      expect(result.content).toBe('{"name":"John","age":30}'); // Unstringified but not formatted
      expect(result.language).toBe('json');
    });

    it('should not process regular content', async () => {
      const content = 'This is regular text content';
      const context = service.createContext(
        'tab-1',
        'plaintext',
        false,
        true,
        ''
      );

      const result = await service.processContent(content, context);

      expect(result.processed).toBe(false);
      expect(result.content).toBe(content);
    });

    it('should not process content when not from paste or clipboard', async () => {
      const content = '"{\\"name\\":\\"John\\",\\"age\\":30}"';
      const context = service.createContext(
        'tab-1',
        'plaintext',
        false,
        false, // not from paste
        'existing content', // has previous content (not clipboard)
        { isInitialContent: false }
      );

      const result = await service.processContent(content, context);

      expect(result.processed).toBe(false);
      expect(result.content).toBe(content);
    });
  });

  describe('language detection', () => {
    it('should detect JSON correctly', () => {
      const jsonContent = '{"valid": "json", "number": 42}';
      const language = service.detectLanguage(jsonContent);
      expect(language).toBe('json');
    });

    it('should detect JavaScript correctly', () => {
      const jsContent = 'function test() { return "hello"; }';
      const language = service.detectLanguage(jsContent);
      expect(language).toBe('javascript');
    });

    it('should check for ambiguous detection', () => {
      // Test with content that might be ambiguous
      const ambiguousContent = 'test';
      const isAmbiguous = service.isLanguageAmbiguous(ambiguousContent);
      expect(typeof isAmbiguous).toBe('boolean');
    });
  });

  describe('service patterns', () => {
    it('should provide access to underlying engine', () => {
      const engine = service.getEngine();
      expect(engine).toBeDefined();
      expect(typeof engine.processContent).toBe('function');
    });

    it('should be extensible for new processors', () => {
      const engine = service.getEngine();
      const initialProcessorCount = engine.getProcessors().length;

      // Mock processor
      const mockProcessor = {
        id: 'test-processor',
        name: 'Test Processor',
        supportedLanguages: ['test'],
        priority: 50,
        canProcess: () => false,
        process: () => ({ processed: false, content: '' })
      };

      engine.registerProcessor(mockProcessor);
      
      const newProcessorCount = engine.getProcessors().length;
      expect(newProcessorCount).toBe(initialProcessorCount + 1);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle "New tab from Paste" scenario', async () => {
      const stringifiedJson = '"{\\"user\\":\\"test\\",\\"id\\":123}"';
      const context = service.createContext(
        'new-tab-1',
        'json', // Language detection would have determined this is JSON
        false,
        false, // not from paste event
        '', // empty previous content
        { isInitialContent: true, isFromClipboardImport: true } // initial content from clipboard import
      );

      const result = await service.processContent(stringifiedJson, context);

      expect(result.processed).toBe(true);
      expect(result.content).toBe('{"user":"test","id":123}'); // Unstringified but not formatted
      expect(result.language).toBe('json');
    });

    it('should handle regular paste scenario', async () => {
      const stringifiedJson = '"{\\"data\\":\\"value\\"}"';
      const context = service.createContext(
        'existing-tab',
        'json', // Language detection would have determined this is JSON
        false,
        true, // from paste event
        ''
      );

      const result = await service.processContent(stringifiedJson, context);

      expect(result.processed).toBe(true);
      expect(result.content).toBe('{"data":"value"}'); // Unstringified but not formatted
    });

    it('should handle existing JSON tab scenario', async () => {
      const stringifiedJson = '"[\\"item1\\", \\"item2\\"]"';
      const context = service.createContext(
        'json-tab',
        'json',
        true, // language locked
        true,
        '[]'
      );

      const result = await service.processContent(stringifiedJson, context);

      expect(result.processed).toBe(true);
      expect(result.content).toBe('["item1", "item2"]'); // Unstringified but not formatted
    });
  });

  describe('processClipboardForComparison', () => {
    describe('JSON content processing', () => {
      it('should process stringified JSON from clipboard', async () => {
        const stringifiedJson = '"{\\"name\\":\\"John\\",\\"age\\":30}"';

        const result = await service.processClipboardForComparison(stringifiedJson, 'json');

        expect(result.content).toBe('{"name":"John","age":30}'); // Unstringified
        expect(result.language).toBe('json');
      });

      it('should handle already-formatted JSON', async () => {
        const formattedJson = '{\n  "name": "John",\n  "age": 30\n}';

        const result = await service.processClipboardForComparison(formattedJson, 'json');

        expect(result.content).toBe(formattedJson); // Unchanged
        expect(result.language).toBe('json');
      });

      it('should handle compact JSON', async () => {
        const compactJson = '{"name":"John","age":30,"city":"NYC"}';

        const result = await service.processClipboardForComparison(compactJson, 'json');

        expect(result.content).toBe(compactJson); // No processing needed
        expect(result.language).toBe('json');
      });

      it('should handle double-stringified JSON', async () => {
        const doubleStringified = '"{\\"user\\":{\\"name\\":\\"Alice\\",\\"id\\":123}}"';

        const result = await service.processClipboardForComparison(doubleStringified, 'json');

        expect(result.content).toBe('{"user":{"name":"Alice","id":123}}'); // Unstringified
        expect(result.language).toBe('json');
      });

      it('should handle JSON arrays', async () => {
        const stringifiedArray = '"[\\"item1\\",\\"item2\\",\\"item3\\"]"';

        const result = await service.processClipboardForComparison(stringifiedArray, 'json');

        expect(result.content).toBe('["item1","item2","item3"]'); // Unstringified
        expect(result.language).toBe('json');
      });
    });

    describe('language detection', () => {
      it('should auto-detect JSON when no language provided', async () => {
        const jsonContent = '{"test": "value"}';

        const result = await service.processClipboardForComparison(jsonContent);

        expect(result.language).toBe('json');
      });

      it('should auto-detect plaintext when no language provided', async () => {
        const textContent = 'This is just plain text content';

        const result = await service.processClipboardForComparison(textContent);

        expect(result.language).toBe('plaintext');
        expect(result.content).toBe(textContent); // Unchanged
      });

      it('should auto-detect JavaScript', async () => {
        const jsContent = 'function test() { return "hello"; }';

        const result = await service.processClipboardForComparison(jsContent);

        expect(result.language).toBe('javascript');
      });

      it('should use provided language instead of auto-detecting', async () => {
        const content = '{"test": "value"}';

        const result = await service.processClipboardForComparison(content, 'json');

        expect(result.language).toBe('json');
      });
    });

    describe('non-JSON content', () => {
      it('should pass through plaintext unchanged', async () => {
        const textContent = 'This is plain text that should not be processed';

        const result = await service.processClipboardForComparison(textContent, 'plaintext');

        expect(result.content).toBe(textContent);
        expect(result.language).toBe('plaintext');
      });

      it('should pass through JavaScript code unchanged', async () => {
        const jsCode = 'const x = 42;\nconsole.log(x);';

        const result = await service.processClipboardForComparison(jsCode, 'javascript');

        expect(result.content).toBe(jsCode);
        expect(result.language).toBe('javascript');
      });

      it('should pass through CSV content unchanged', async () => {
        const csvContent = 'name,age,city\nJohn,30,NYC\nJane,25,LA';

        const result = await service.processClipboardForComparison(csvContent, 'csv');

        expect(result.content).toBe(csvContent);
        expect(result.language).toBe('csv');
      });
    });

    describe('edge cases', () => {
      it('should handle empty clipboard content', async () => {
        const emptyContent = '';

        const result = await service.processClipboardForComparison(emptyContent);

        expect(result.content).toBe('');
        expect(result.language).toBe('plaintext'); // Default to plaintext
      });

      it('should handle whitespace-only content', async () => {
        const whitespaceContent = '   \n\n   ';

        const result = await service.processClipboardForComparison(whitespaceContent);

        expect(result.content).toBe(whitespaceContent);
      });

      it('should handle very long JSON content', async () => {
        const largeObject = { data: Array(1000).fill({ id: 1, name: "test" }) };
        const stringified = JSON.stringify(JSON.stringify(largeObject));

        const result = await service.processClipboardForComparison(stringified, 'json');

        expect(result.content).toBeDefined();
        expect(result.language).toBe('json');
        // Content should be unstringified
        expect(result.content).not.toContain('\\"');
      });

      it('should handle special characters in JSON', async () => {
        const jsonWithSpecialChars = '"{\\"text\\":\\"Hello\\\\nWorld\\\\t!\\",\\"emoji\\":\\"😀\\"}"';

        const result = await service.processClipboardForComparison(jsonWithSpecialChars, 'json');

        expect(result.content).toContain('Hello\\nWorld\\t!'); // Unstringified but escape sequences preserved
        expect(result.language).toBe('json');
      });
    });

    describe('comparison scenario integration', () => {
      it('should match tab right-click compare behavior', async () => {
        // Simulate the tab right-click "Compare with clipboard" flow
        const clipboardContent = '"{\\"key\\":\\"value\\",\\"number\\":42}"';

        const result = await service.processClipboardForComparison(clipboardContent, 'json');

        // Should process the same way as tab creation
        expect(result.content).toBe('{"key":"value","number":42}');
        expect(result.language).toBe('json');
      });

      it('should match JSON smart view compare behavior', async () => {
        // Simulate the JSON smart view "Compare -> With Clipboard" flow
        const clipboardContent = '"{\\"user\\":{\\"name\\":\\"Alice\\",\\"roles\\":[\\"admin\\",\\"user\\"]}}"';

        const result = await service.processClipboardForComparison(clipboardContent, 'json');

        // Should unstringify for proper diff comparison
        expect(result.content).toBe('{"user":{"name":"Alice","roles":["admin","user"]}}');
        expect(result.language).toBe('json');
      });

      it('should handle invalid JSON gracefully', async () => {
        const invalidJson = 'invalid json content {';

        const result = await service.processClipboardForComparison(invalidJson, 'json');

        // Invalid JSON should pass through unchanged
        expect(result.content).toBe('invalid json content {');
        expect(result.language).toBe('json');
      });
    });
  });
});