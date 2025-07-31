
import { parseUrl, ParsedUrl } from '../urlUtils';

describe('parseUrl', () => {
  it('should correctly parse a simple URL', () => {
    const url = 'https://www.example.com/path?query=value#hash';
    const result = parseUrl(url);
    
    expect(result.components.scheme).toBe('https');
    expect(result.components.host).toBe('www.example.com');
    expect(result.components.path).toBe('/path');
    expect(result.components.query).toBe('query=value');
    expect(result.components.fragment).toBe('hash');
    expect(result.components.queryParams).toEqual({ query: 'value' });
    expect(result.warnings).toEqual([]);
  });

  it('should handle URLs with no path, query, or hash', () => {
    const url = 'ftp://example.com';
    const result = parseUrl(url);
    
    expect(result.components.scheme).toBe('ftp');
    expect(result.components.host).toBe('example.com');
    expect(result.components.path).toBe('/');
    expect(result.components.query).toBe('');
    expect(result.components.fragment).toBe('');
    expect(result.components.queryParams).toEqual({});
  });

  it('should handle URLs with a port number', () => {
    const url = 'http://localhost:8080';
    const result = parseUrl(url);
    
    expect(result.components.scheme).toBe('http');
    expect(result.components.host).toBe('localhost');
    expect(result.components.port).toBe('8080');
    expect(result.components.path).toBe('/');
  });

  it('should handle multiple query parameters', () => {
    const url = 'https://example.com?a=1&b=2&c=3';
    const result = parseUrl(url);
    
    expect(result.components.scheme).toBe('https');
    expect(result.components.host).toBe('example.com');
    expect(result.components.query).toBe('a=1&b=2&c=3');
    expect(result.components.queryParams).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('should handle URL-encoded characters', () => {
    const url = 'https://example.com/path%20with%20spaces?q=a%26b';
    const result = parseUrl(url);
    
    expect(result.components.scheme).toBe('https');
    expect(result.components.host).toBe('example.com');
    expect(result.components.path).toBe('/path%20with%20spaces');
    expect(result.components.query).toBe('q=a%26b');
  });

  it('should handle invalid URLs with warnings', () => {
    const url = 'not a valid url';
    const result = parseUrl(url);
    
    // Should have warnings about invalid URL
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.type === 'error')).toBe(true);
  });

  it('should handle URLs with only a hash', () => {
    const url = '#just-a-hash';
    const result = parseUrl(url);
    
    // Hash-only URLs are typically handled as invalid or relative
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
