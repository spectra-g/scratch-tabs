import { RestClientTablet } from '../RestClientTablet';
import { CurlRequestImport } from '../types';

describe('RestClientTablet', () => {
  describe('createInitialState', () => {
    it('should create default state when no payload is provided', () => {
      const state = RestClientTablet.createInitialState();
      
      expect(state.type).toBe('restclient');
      expect(state.data.request.method).toBe('GET');
      expect(state.data.request.url).toBe('https://jsonplaceholder.typicode.com/posts/1');
      expect(state.data.request.body.type).toBe('none');
      expect(state.data.request.headers).toHaveLength(0); // No default headers
    });

    it('should handle curl request import with form-urlencoded body', () => {
      const curlRequest: CurlRequestImport = {
        method: 'POST',
        url: 'https://api.example.com/signin',
        headers: [
          { key: 'content-type', value: 'application/x-www-form-urlencoded' },
          { key: 'x-api-key', value: 'test-key' }
        ],
        body: 'userIdentifier=test@example.com'
      };

      const state = RestClientTablet.createInitialState(curlRequest);
      
      expect(state.type).toBe('restclient');
      expect(state.data.request.method).toBe('POST');
      expect(state.data.request.url).toBe('https://api.example.com/signin');
      expect(state.data.request.body.type).toBe('x-www-form-urlencoded');
      expect(state.data.request.body.content).toBe('');
      expect(state.data.request.body.params).toHaveLength(1);
      expect(state.data.request.body.params[0]).toEqual({
        key: 'userIdentifier',
        value: 'test@example.com',
        enabled: true
      });
      
      // Check headers are properly converted
      expect(state.data.request.headers).toHaveLength(2);
      expect(state.data.request.headers[0]).toEqual({
        key: 'content-type',
        value: 'application/x-www-form-urlencoded',
        enabled: true
      });
      expect(state.data.request.headers[1]).toEqual({
        key: 'x-api-key',
        value: 'test-key',
        enabled: true
      });
    });

    it('should handle curl request import with JSON body', () => {
      const curlRequest: CurlRequestImport = {
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: [
          { key: 'content-type', value: 'application/json' },
          { key: 'authorization', value: 'Bearer token123' }
        ],
        body: '{"name": "John Doe", "email": "john@example.com"}'
      };

      const state = RestClientTablet.createInitialState(curlRequest);
      
      expect(state.data.request.body.type).toBe('raw');
      expect(state.data.request.body.format).toBe('json');
      expect(state.data.request.body.content).toBe('{"name": "John Doe", "email": "john@example.com"}');
    });

    it('should handle curl request import with XML body', () => {
      const curlRequest: CurlRequestImport = {
        method: 'POST',
        url: 'https://api.example.com/xml',
        headers: [
          { key: 'content-type', value: 'application/xml' }
        ],
        body: '<user><name>John</name></user>'
      };

      const state = RestClientTablet.createInitialState(curlRequest);
      
      expect(state.data.request.body.type).toBe('raw');
      expect(state.data.request.body.format).toBe('xml');
      expect(state.data.request.body.content).toBe('<user><name>John</name></user>');
    });

    it('should guess body format when no content-type header is present', () => {
      const curlRequest: CurlRequestImport = {
        method: 'POST',
        url: 'https://api.example.com/data',
        headers: [],
        body: '{"key": "value"}'
      };

      const state = RestClientTablet.createInitialState(curlRequest);
      
      expect(state.data.request.body.type).toBe('raw');
      expect(state.data.request.body.format).toBe('json');
    });

    it('should handle curl request import without body', () => {
      const curlRequest: CurlRequestImport = {
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: [
          { key: 'authorization', value: 'Bearer token123' }
        ]
      };

      const state = RestClientTablet.createInitialState(curlRequest);
      
      expect(state.data.request.body.type).toBe('none');
      expect(state.data.request.body.content).toBe('');
      expect(state.data.request.headers).toHaveLength(1);
    });

    it('should parse imported URL query parameters into the Query Params tab state', () => {
      const curlRequest: CurlRequestImport = {
        method: 'GET',
        url: 'https://api.acme.test/v1/orders?status=<status>&limit=25',
        headers: []
      };

      const state = RestClientTablet.createInitialState(curlRequest);

      expect(state.data.request.url).toBe('https://api.acme.test/v1/orders');
      expect(state.data.request.params).toEqual([
        { key: 'status', value: '<status>', enabled: true },
        { key: 'limit', value: '25', enabled: true },
      ]);
    });

    it('should handle curl request with multipart/form-data', () => {
      const curlRequest: CurlRequestImport = {
        method: 'POST',
        url: 'https://api.example.com/upload',
        headers: [
          { key: 'content-type', value: 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' }
        ],
        body: '------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="file"'
      };

      const state = RestClientTablet.createInitialState(curlRequest);
      
      expect(state.data.request.body.type).toBe('form-data');
    });

    it('should preserve all headers from curl request and parse form-encoded body', () => {
      const curlRequest: CurlRequestImport = {
        method: 'POST',
        url: 'https://api.example.com/signin/otp',
        headers: [
          { key: 'x-client-provider', value: 'EXAMPLE_APP' },
          { key: 'x-client-channel', value: 'EXAMPLE_APP' },
          { key: 'x-client-region', value: 'GB' },
          { key: 'content-type', value: 'application/x-www-form-urlencoded' }
        ],
        body: 'userIdentifier=test.user@example.com'
      };

      const state = RestClientTablet.createInitialState(curlRequest);
      
      // Check headers
      expect(state.data.request.headers).toHaveLength(4);
      expect(state.data.request.headers.every(h => h.enabled)).toBe(true);
      
      const headerKeys = state.data.request.headers.map(h => h.key);
      expect(headerKeys).toContain('x-client-provider');
      expect(headerKeys).toContain('x-client-channel');
      expect(headerKeys).toContain('x-client-region');
      expect(headerKeys).toContain('content-type');
      
      // Check body parsing
      expect(state.data.request.body.type).toBe('x-www-form-urlencoded');
      expect(state.data.request.body.params).toHaveLength(1);
      expect(state.data.request.body.params[0]).toEqual({
        key: 'userIdentifier',
        value: 'test.user@example.com',
        enabled: true
      });
    });

    it('should handle multiple form-encoded parameters', () => {
      const curlRequest: CurlRequestImport = {
        method: 'POST',
        url: 'https://api.example.com/login',
        headers: [
          { key: 'content-type', value: 'application/x-www-form-urlencoded' }
        ],
        body: 'username=john&password=secret123&remember=true'
      };

      const state = RestClientTablet.createInitialState(curlRequest);
      
      expect(state.data.request.body.type).toBe('x-www-form-urlencoded');
      expect(state.data.request.body.params).toHaveLength(3);
      
      expect(state.data.request.body.params[0]).toEqual({
        key: 'username',
        value: 'john',
        enabled: true
      });
      expect(state.data.request.body.params[1]).toEqual({
        key: 'password',
        value: 'secret123',
        enabled: true
      });
      expect(state.data.request.body.params[2]).toEqual({
        key: 'remember',
        value: 'true',
        enabled: true
      });
    });
  });
});
