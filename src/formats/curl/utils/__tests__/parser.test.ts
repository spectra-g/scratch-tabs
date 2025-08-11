import { parseCurlDocument, getCurlDocumentSummary } from '../parser';
import { compileCurlDocument, updateCurlBlockInDocument } from '../compiler';

describe('Curl Parser', () => {
  describe('parseCurlDocument', () => {
    it('should parse a simple curl command', () => {
      const content = `curl -X POST https://api.example.com/users \\
  -H "Content-Type: application/json" \\
  -d '{"name": "John Doe"}'`;

      const result = parseCurlDocument(content);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('curl');
      
      if (result[0].type === 'curl') {
        expect(result[0].request.method).toBe('POST');
        expect(result[0].request.url).toBe('https://api.example.com/users');
        expect(result[0].request.headers).toHaveLength(1);
        expect(result[0].request.headers[0].key).toBe('Content-Type');
        expect(result[0].request.headers[0].value).toBe('application/json');
        expect(result[0].request.body).toBe('{"name": "John Doe"}');
      }
    });

    it('should parse multiple curl commands with text', () => {
      const content = `# API Documentation

This is a test API with multiple endpoints.

curl -X GET https://api.example.com/users

# Create a new user
curl -X POST https://api.example.com/users \\
  -H "Content-Type: application/json" \\
  -d '{"name": "John"}'

That's all for now.`;

      const result = parseCurlDocument(content);
      
      expect(result).toHaveLength(5); // text, curl, text, curl, text
      expect(result[0].type).toBe('text');
      expect(result[1].type).toBe('curl');
      expect(result[2].type).toBe('text');
      expect(result[3].type).toBe('curl');
      expect(result[4].type).toBe('text');
    });

    it('should handle curl commands without line continuations', () => {
      const content = `curl https://api.example.com/simple`;

      const result = parseCurlDocument(content);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('curl');
      
      if (result[0].type === 'curl') {
        expect(result[0].request.method).toBe('GET');
        expect(result[0].request.url).toBe('https://api.example.com/simple');
      }
    });

    it('should handle empty content', () => {
      const result = parseCurlDocument('');
      expect(result).toHaveLength(0);
    });

    it('should handle malformed curl commands as text', () => {
      const content = `curl invalid command structure`;

      const result = parseCurlDocument(content);
      
      expect(result).toHaveLength(1);
      // Should still parse as curl but with minimal data
      expect(result[0].type).toBe('curl');
    });
  });

  describe('getCurlDocumentSummary', () => {
    it('should calculate correct summary statistics', () => {
      const content = `curl -X GET https://api.example.com/users
curl -X POST https://api.example.com/users
curl -X GET https://other.com/data`;

      const parsed = parseCurlDocument(content);
      const summary = getCurlDocumentSummary(parsed);
      
      expect(summary.totalCommands).toBe(3);
      expect(summary.methods.GET).toBe(2);
      expect(summary.methods.POST).toBe(1);
      expect(summary.domains).toContain('api.example.com');
      expect(summary.domains).toContain('other.com');
    });
  });

  describe('round-trip parsing and compilation', () => {
    it('should preserve content through parse and compile cycle', () => {
      const content = `# API Test
curl -X POST https://api.example.com/test \\
  -H "Authorization: Bearer token" \\
  -d '{"test": true}'

# Another command
curl https://api.example.com/simple`;

      const parsed = parseCurlDocument(content);
      const compiled = compileCurlDocument(parsed);
      
      // Should preserve the structure and content
      expect(compiled).toContain('# API Test');
      expect(compiled).toContain('# Another command');
      expect(compiled).toContain('POST');
      expect(compiled).toContain('Authorization: Bearer token');
    });

    it('should handle updates without affecting other content', () => {
      const content = `# Test
curl -X GET https://example.com
# End`;

      const parsed = parseCurlDocument(content);
      const curlBlock = parsed.find(block => block.type === 'curl');
      
      if (curlBlock?.type === 'curl') {
        const updatedRequest = { ...curlBlock.request, method: 'POST' };
        const updated = updateCurlBlockInDocument(parsed, curlBlock.id, updatedRequest);
        const compiled = compileCurlDocument(updated);
        
        expect(compiled).toContain('# Test');
        expect(compiled).toContain('# End');
        expect(compiled).toContain('POST');
        expect(compiled).not.toContain('-X GET');
      }
    });
  });
});