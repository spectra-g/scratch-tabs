import {
  detectBodyType,
  makeInvisibleCharactersVisible,
  parseCurlCommand,
  parseHeaders,
  parseRawHttpRequest,
  summarizeBody,
} from '../parser';

describe('webhook HMAC parser', () => {
  it('parses case-insensitive headers and preserves duplicates', () => {
    const headers = parseHeaders('X-Test: one\nx-test: two\nContent-Type: application/json');
    expect(headers.get('x-test')).toBe('one');
    expect(headers.getAll('X-Test')).toEqual(['one', 'two']);
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('parses raw HTTP requests while preserving body bytes after the separator', () => {
    const request = parseRawHttpRequest('POST /hook HTTP/1.1\r\nHost: example.com\r\nContent-Type: application/json\r\n\r\n{"a":1}\n');
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://example.com/hook');
    expect(request.bodyText).toBe('{"a":1}\n');
    expect(request.contentType).toBe('application/json');
  });

  it('parses common cURL webhook commands', () => {
    const request = parseCurlCommand("curl -X POST 'https://example.com/hook' -H 'X-Signature: abc' --data-raw '{\"a\":1}'");
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://example.com/hook');
    expect(request.headersText).toBe('X-Signature: abc');
    expect(request.bodyText).toBe('{"a":1}');
  });

  it('summarizes body bytes and newline style', () => {
    const summary = summarizeBody('a\r\nb\n', 'text/plain');
    expect(summary.byteLength).toBe(5);
    expect(summary.newlineStyle).toBe('mixed');
    expect(summary.hasTrailingNewline).toBe(true);
  });

  it('detects common body types', () => {
    expect(detectBodyType('{"a":1}', '')).toBe('JSON');
    expect(detectBodyType('a=1&b=2', '')).toBe('URL-encoded form');
    expect(detectBodyType('<root />', '')).toBe('XML');
  });

  it('renders invisible characters without double-matching inserted newlines', () => {
    expect(makeInvisibleCharactersVisible('a\r\nb\n\tc')).toBe('a\\r\\n\nb\\n\n\\tc');
  });
});
