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

    it('should detect likely clipboard content', () => {
      const context = service.createContext(
        'tab-1',
        'plaintext',
        false,
        false, // not from paste
        '', // empty previous content
        { isInitialContent: true }
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
        { isInitialContent: true } // initial content (like clipboard import)
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
});