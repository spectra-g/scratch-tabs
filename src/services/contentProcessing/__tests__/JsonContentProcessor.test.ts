import { JsonContentProcessor } from '../processors/JsonContentProcessor';
import { ContentProcessingContext } from '../types';

describe('JsonContentProcessor', () => {
  let processor: JsonContentProcessor;
  let mockContext: ContentProcessingContext;

  beforeEach(() => {
    processor = new JsonContentProcessor();
    mockContext = {
      tabId: 'test-tab-id',
      currentLanguage: 'json', // Language detection has already determined this is JSON
      languageLocked: false,
      isFromPaste: true,
      previousContent: '',
      flags: {}
    };
  });

  describe('canProcess', () => {
    it('should return true for stringified JSON from paste', () => {
      const content = '"{\\"name\\":\\"John\\",\\"age\\":30}"';
      const result = processor.canProcess(content, mockContext);
      expect(result).toBe(true);
    });

    it('should return false for compact JSON from paste (no unstringifying needed)', () => {
      const content = '{"name":"John","age":30,"address":{"street":"123 Main St","city":"New York"}}';
      const result = processor.canProcess(content, mockContext);
      expect(result).toBe(false); // No processing needed - not stringified
    });

    it('should return true for content from clipboard', () => {
      const content = '"{\\"name\\":\\"John\\",\\"age\\":30}"';
      const contextFromClipboard = {
        ...mockContext,
        isFromPaste: false,
        flags: { isLikelyFromClipboard: true }
      };
      const result = processor.canProcess(content, contextFromClipboard);
      expect(result).toBe(true);
    });

    it('should return false for non-paste, non-clipboard content', () => {
      const content = '"{\\"name\\":\\"John\\",\\"age\\":30}"';
      const contextNoPaste = {
        ...mockContext,
        isFromPaste: false,
        flags: {}
      };
      const result = processor.canProcess(content, contextNoPaste);
      expect(result).toBe(false);
    });

    it('should return false for already formatted JSON', () => {
      const content = '{\n  "name": "John",\n  "age": 30\n}';
      const result = processor.canProcess(content, mockContext);
      expect(result).toBe(false);
    });

    it('should return false for non-JSON content when language is not json', () => {
      const content = 'This is just plain text';
      const contextNonJson = {
        ...mockContext,
        currentLanguage: 'plaintext'
      };
      const result = processor.canProcess(content, contextNonJson);
      expect(result).toBe(false);
    });

    it('should return false for stringified JSON when currentLanguage is plaintext (Bug Fix Test)', () => {
      // This test validates the fix for Bug 1:
      // When pasting stringified JSON, if the old language is passed instead of detected language,
      // the processor should reject it
      const stringifiedJson = '"{\\"name\\":\\"John\\",\\"age\\":30}"';
      const contextWithPlaintext = {
        ...mockContext,
        currentLanguage: 'plaintext', // Simulates passing old language instead of detected 'json'
        isFromPaste: true
      };
      const result = processor.canProcess(stringifiedJson, contextWithPlaintext);
      expect(result).toBe(false); // Should reject because language is not 'json'
    });

    it('should return true for stringified JSON when currentLanguage is json (Bug Fix Test)', () => {
      // This test validates the fix for Bug 1:
      // When the newly detected language 'json' is passed, processor should accept it
      const stringifiedJson = '"{\\"name\\":\\"John\\",\\"age\\":30}"';
      const contextWithJson = {
        ...mockContext,
        currentLanguage: 'json', // Correct: uses newly detected language
        isFromPaste: true
      };
      const result = processor.canProcess(stringifiedJson, contextWithJson);
      expect(result).toBe(true); // Should accept because language is 'json'
    });
  });

  describe('process', () => {
    it('should unstringify double-escaped JSON', () => {
      const content = '"{\\"name\\":\\"John Doe\\",\\"age\\":30,\\"city\\":\\"New York\\"}"';
      const result = processor.process(content, mockContext);
      
      expect(result.processed).toBe(true);
      expect(result.language).toBe('json');
      expect(result.content).toBe('{"name":"John Doe","age":30,"city":"New York"}'); // Unstringified but not formatted
      expect(result.metadata?.type).toBe('unstringify');
    });

    it('should not process compact single-line JSON (no unstringifying needed)', () => {
      const content = '{"name":"John","age":30,"address":{"street":"123 Main St","city":"New York","zipCode":"10001"}}';
      const result = processor.process(content, mockContext);
      
      expect(result.processed).toBe(false); // No processing needed
      expect(result.content).toBe(content); // Unchanged
    });

    it('should not process short JSON strings', () => {
      const content = '{"a":1}';
      const result = processor.process(content, mockContext);
      
      expect(result.processed).toBe(false);
      expect(result.content).toBe(content);
    });

    it('should not process already formatted JSON', () => {
      const content = '{\n  "name": "John",\n  "age": 30\n}';
      const result = processor.process(content, mockContext);
      
      expect(result.processed).toBe(false);
      expect(result.content).toBe(content);
    });

    it('should handle invalid JSON gracefully', () => {
      const content = '"invalid json string"';
      const result = processor.process(content, mockContext);
      
      expect(result.processed).toBe(true); // Will unstringify the string
      expect(result.content).toBe('invalid json string'); // Unstringified
    });

    it('should handle malformed stringified JSON', () => {
      const content = '"{invalid json}"';
      const result = processor.process(content, mockContext);
      
      expect(result.processed).toBe(true); // Will unstringify
      expect(result.content).toBe('{invalid json}'); // Unstringified
    });

    it('should include processing metadata', () => {
      const content = '"{\\"name\\":\\"John\\",\\"age\\":30}"';
      const result = processor.process(content, mockContext);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.originalLength).toBe(content.length);
      expect(result.metadata?.processedLength).toBeLessThan(content.length); // Unstringified is shorter
      expect(result.metadata?.type).toBe('unstringify');
    });
  });

  describe('priority and configuration', () => {
    it('should have correct configuration', () => {
      expect(processor.id).toBe('json-processor');
      expect(processor.name).toBe('JSON Content Processor');
      expect(processor.supportedLanguages).toEqual(['json']);
      expect(processor.priority).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('should handle nested stringified JSON', () => {
      const nestedJson = { user: { name: "John", details: { age: 30, city: "NYC" } } };
      const stringified = JSON.stringify(JSON.stringify(nestedJson));
      
      const result = processor.process(stringified, mockContext);
      
      expect(result.processed).toBe(true);
      expect(result.content).toContain('"user"');
      expect(result.content).toContain('"details"');
      expect(result.content).not.toContain('\n'); // No formatting, just unstringified
    });

    it('should handle arrays in stringified JSON', () => {
      const arrayJson = { items: [1, 2, 3], tags: ["a", "b", "c"] };
      const stringified = JSON.stringify(JSON.stringify(arrayJson));
      
      const result = processor.process(stringified, mockContext);
      
      expect(result.processed).toBe(true);
      expect(result.content).toContain('"items"');
      expect(result.content).toContain('[');
      expect(result.content).not.toContain('\n'); // No formatting, just unstringified
    });

    it('should unstringify stringified primitives', () => {
      const stringifiedNumber = JSON.stringify("42");
      const result = processor.process(stringifiedNumber, mockContext);
      
      expect(result.processed).toBe(true); // Will unstringify
      expect(result.content).toBe('42'); // Unstringified
    });
  });
});