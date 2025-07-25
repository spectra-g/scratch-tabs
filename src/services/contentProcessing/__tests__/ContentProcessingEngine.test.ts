import { ContentProcessingEngine } from '../ContentProcessingEngine';
import { ContentProcessor, ContentProcessingContext, ContentProcessingResult } from '../types';

// Mock processor for testing
class MockProcessor implements ContentProcessor {
  id = 'mock-processor';
  name = 'Mock Processor';
  supportedLanguages = ['test'];
  priority = 50;

  constructor(
    private shouldProcess: boolean = true,
    private resultContent: string = 'processed-content'
  ) {}

  canProcess(content: string, context: ContentProcessingContext): boolean {
    return this.shouldProcess && content.includes('mock');
  }

  process(content: string, context: ContentProcessingContext): ContentProcessingResult {
    return {
      processed: true,
      content: this.resultContent,
      language: 'test',
      metadata: {
        type: 'mock-processing',
        originalLength: content.length,
        processedLength: this.resultContent.length
      }
    };
  }
}

class HighPriorityProcessor extends MockProcessor {
  id = 'high-priority-processor';
  priority = 100;
}

class LowPriorityProcessor extends MockProcessor {
  id = 'low-priority-processor';
  priority = 10;
}

describe('ContentProcessingEngine', () => {
  let engine: ContentProcessingEngine;
  let mockContext: ContentProcessingContext;

  beforeEach(() => {
    engine = new ContentProcessingEngine();
    mockContext = {
      tabId: 'test-tab',
      currentLanguage: 'plaintext',
      languageLocked: false,
      isFromPaste: true,
      previousContent: ''
    };
  });

  describe('processor registration and management', () => {
    it('should register processors', () => {
      const processor = new MockProcessor();
      engine.registerProcessor(processor);
      
      const processors = engine.getProcessors();
      expect(processors).toHaveLength(1);
      expect(processors[0]).toBe(processor);
    });

    it('should sort processors by priority', () => {
      const lowPriorityProcessor = new LowPriorityProcessor();
      const highPriorityProcessor = new HighPriorityProcessor();
      const mediumPriorityProcessor = new MockProcessor();

      engine.registerProcessor(lowPriorityProcessor);
      engine.registerProcessor(highPriorityProcessor);
      engine.registerProcessor(mediumPriorityProcessor);

      const processors = engine.getProcessors();
      expect(processors[0]).toBe(highPriorityProcessor);
      expect(processors[1]).toBe(mediumPriorityProcessor);
      expect(processors[2]).toBe(lowPriorityProcessor);
    });

    it('should get processor by ID', () => {
      const processor = new MockProcessor();
      engine.registerProcessor(processor);
      
      const retrieved = engine.getProcessor('mock-processor');
      expect(retrieved).toBe(processor);
    });

    it('should return undefined for non-existent processor', () => {
      const retrieved = engine.getProcessor('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should remove processor by ID', () => {
      const processor = new MockProcessor();
      engine.registerProcessor(processor);
      
      const removed = engine.removeProcessor('mock-processor');
      expect(removed).toBe(true);
      expect(engine.getProcessors()).toHaveLength(0);
    });

    it('should return false when removing non-existent processor', () => {
      const removed = engine.removeProcessor('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('content processing', () => {
    it('should process content with applicable processor', async () => {
      const processor = new MockProcessor(true, 'processed-mock-content');
      engine.registerProcessor(processor);

      const result = await engine.processContent('mock content', mockContext);

      expect(result.processed).toBe(true);
      expect(result.content).toBe('processed-mock-content');
      expect(result.language).toBe('test');
      expect(result.metadata?.type).toBe('mock-processing');
    });

    it('should use highest priority processor when multiple match', async () => {
      const lowPriorityProcessor = new LowPriorityProcessor(true, 'low-priority-result');
      const highPriorityProcessor = new HighPriorityProcessor(true, 'high-priority-result');

      engine.registerProcessor(lowPriorityProcessor);
      engine.registerProcessor(highPriorityProcessor);

      const result = await engine.processContent('mock content', mockContext);

      expect(result.content).toBe('high-priority-result');
    });

    it('should return unprocessed result when no processors match', async () => {
      const processor = new MockProcessor(false);
      engine.registerProcessor(processor);

      const result = await engine.processContent('non-mock content', mockContext);

      expect(result.processed).toBe(false);
      expect(result.content).toBe('non-mock content');
      expect(result.language).toBe('plaintext');
    });

    it('should handle processor errors gracefully', async () => {
      const faultyProcessor: ContentProcessor = {
        id: 'faulty-processor',
        name: 'Faulty Processor',
        supportedLanguages: ['test'],
        priority: 50,
        canProcess: () => true,
        process: () => {
          throw new Error('Processing failed');
        }
      };

      engine.registerProcessor(faultyProcessor);

      const result = await engine.processContent('test content', mockContext);

      expect(result.processed).toBe(false);
      expect(result.content).toBe('test content');
    });

    it('should handle async processors', async () => {
      const asyncProcessor: ContentProcessor = {
        id: 'async-processor',
        name: 'Async Processor',
        supportedLanguages: ['test'],
        priority: 50,
        canProcess: () => true,
        process: async (content: string) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return {
            processed: true,
            content: 'async-processed',
            language: 'test'
          };
        }
      };

      engine.registerProcessor(asyncProcessor);

      const result = await engine.processContent('test content', mockContext);

      expect(result.processed).toBe(true);
      expect(result.content).toBe('async-processed');
    });
  });

  describe('detector integration', () => {
    it('should detect language using registered detector', () => {
      const mockDetector = {
        id: 'mock-detector',
        detectLanguage: jest.fn().mockReturnValue('detected-language'),
        isAmbiguous: jest.fn().mockReturnValue(false)
      };

      engine.registerDetector(mockDetector);

      const language = engine.detectLanguage('test content');
      expect(language).toBe('detected-language');
      expect(mockDetector.detectLanguage).toHaveBeenCalledWith('test content');
    });

    it('should check if language is ambiguous', () => {
      const mockDetector = {
        id: 'mock-detector',
        detectLanguage: jest.fn().mockReturnValue('test'),
        isAmbiguous: jest.fn().mockReturnValue(true)
      };

      engine.registerDetector(mockDetector);

      const isAmbiguous = engine.isLanguageAmbiguous('test content');
      expect(isAmbiguous).toBe(true);
      expect(mockDetector.isAmbiguous).toHaveBeenCalledWith('test content');
    });

    it('should return plaintext when no detector is registered', () => {
      const language = engine.detectLanguage('test content');
      expect(language).toBe('plaintext');
    });

    it('should return false for ambiguous when no detector is registered', () => {
      const isAmbiguous = engine.isLanguageAmbiguous('test content');
      expect(isAmbiguous).toBe(false);
    });
  });

  describe('cleaner and formatter integration', () => {
    it('should clean content using registered cleaner', () => {
      const mockCleaner = {
        id: 'mock-cleaner',
        supportedLanguages: ['test'],
        clean: jest.fn().mockReturnValue('cleaned content')
      };

      engine.registerCleaner(mockCleaner);

      const cleaned = engine.cleanContent('dirty content', 'test');
      expect(cleaned).toBe('cleaned content');
      expect(mockCleaner.clean).toHaveBeenCalledWith('dirty content', 'test');
    });

    it('should format content using registered formatter', () => {
      const mockFormatter = {
        id: 'mock-formatter',
        supportedLanguages: ['test'],
        format: jest.fn().mockReturnValue('formatted content')
      };

      engine.registerFormatter(mockFormatter);

      const formatted = engine.formatContent('unformatted content', 'test');
      expect(formatted).toBe('formatted content');
      expect(mockFormatter.format).toHaveBeenCalledWith('unformatted content', 'test');
    });

    it('should return original content when no cleaner matches language', () => {
      const mockCleaner = {
        id: 'mock-cleaner',
        supportedLanguages: ['other'],
        clean: jest.fn()
      };

      engine.registerCleaner(mockCleaner);

      const cleaned = engine.cleanContent('content', 'test');
      expect(cleaned).toBe('content');
      expect(mockCleaner.clean).not.toHaveBeenCalled();
    });

    it('should return original content when no formatter matches language', () => {
      const mockFormatter = {
        id: 'mock-formatter',
        supportedLanguages: ['other'],
        format: jest.fn()
      };

      engine.registerFormatter(mockFormatter);

      const formatted = engine.formatContent('content', 'test');
      expect(formatted).toBe('content');
      expect(mockFormatter.format).not.toHaveBeenCalled();
    });
  });
});