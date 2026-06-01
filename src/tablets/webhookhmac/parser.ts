import type { BodySummary, HeaderEntry, HeaderMap, ParsedRequest } from './types';

class ParsedHeaderMap implements HeaderMap {
  constructor(
    public readonly entries: HeaderEntry[],
    public readonly warnings: string[] = [],
  ) {}

  get(name: string): string | undefined {
    return this.getAll(name)[0];
  }

  getAll(name: string): string[] {
    const target = name.toLowerCase();
    return this.entries
      .filter((entry) => entry.name.toLowerCase() === target)
      .map((entry) => entry.value);
  }

  has(name: string): boolean {
    return this.get(name) !== undefined;
  }

  toText(): string {
    return this.entries.map((entry) => `${entry.name}: ${entry.value}`).join('\n');
  }
}

export function parseHeaders(text: string): HeaderMap {
  const entries: HeaderEntry[] = [];
  const warnings: string[] = [];
  let lastEntry: HeaderEntry | undefined;

  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    if (/^[ \t]/.test(line) && lastEntry) {
      lastEntry.value += ` ${line.trim()}`;
      warnings.push(`Folded header line ${index + 1} was unfolded.`);
      return;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      warnings.push(`Header line ${index + 1} is not in "Name: value" format.`);
      return;
    }

    const entry = {
      name: line.slice(0, separatorIndex).trim(),
      value: line.slice(separatorIndex + 1).trim(),
    };
    entries.push(entry);
    lastEntry = entry;
  });

  return new ParsedHeaderMap(entries, warnings);
}

export function parseRawHttpRequest(raw: string): ParsedRequest {
  const separator = raw.includes('\r\n\r\n') ? '\r\n\r\n' : '\n\n';
  const splitIndex = raw.indexOf(separator);
  const head = splitIndex >= 0 ? raw.slice(0, splitIndex) : raw;
  const bodyText = splitIndex >= 0 ? raw.slice(splitIndex + separator.length) : '';
  const lines = head.split(/\r?\n/);
  const requestLine = lines.shift()?.trim() ?? '';
  const warnings: string[] = [];
  const [, method = 'POST', target = ''] =
    requestLine.match(/^([A-Z]+)\s+(\S+)(?:\s+HTTP\/\d(?:\.\d)?)?$/i) ?? [];

  if (!requestLine) warnings.push('Missing HTTP request line.');
  if (!method || !target) warnings.push('Could not parse request method and target.');

  const headersText = lines.join('\n');
  const headers = parseHeaders(headersText);
  warnings.push(...headers.warnings);
  const host = headers.get('host');
  const inferredUrl = target.startsWith('http')
    ? target
    : host
      ? `https://${host}${target.startsWith('/') ? target : `/${target}`}`
      : target;

  return {
    method: method.toUpperCase(),
    url: inferredUrl,
    headersText,
    bodyText,
    contentType: headers.get('content-type') ?? '',
    warnings,
  };
}

function tokenizeCurl(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (const char of input.replace(/\\\r?\n/g, ' ')) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === '\\' && quote !== "'") {
      escaping = true;
      continue;
    }
    if ((char === '"' || char === "'") && !quote) {
      quote = char;
      continue;
    }
    if (char === quote) {
      quote = null;
      continue;
    }
    if (/\s/.test(char) && !quote) {
      if (current) tokens.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current) tokens.push(current);
  return tokens;
}

export function parseCurlCommand(curl: string): ParsedRequest {
  const tokens = tokenizeCurl(curl);
  const warnings: string[] = [];
  const headers: string[] = [];
  const dataParts: string[] = [];
  let method = 'GET';
  let url = '';

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    if (token === 'curl') continue;

    if (token === '-X' || token === '--request') {
      method = (next ?? method).toUpperCase();
      index += 1;
    } else if (token === '-H' || token === '--header') {
      if (next) headers.push(next);
      index += 1;
    } else if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-ascii'
    ) {
      if (next) dataParts.push(next);
      method = method === 'GET' ? 'POST' : method;
      if (token !== '--data-binary') {
        warnings.push('cURL data flags may not preserve every original byte from a captured request.');
      }
      index += 1;
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      url = token;
    } else if (token.startsWith('-')) {
      warnings.push(`Unsupported cURL flag "${token}" was ignored.`);
    }
  }

  const headersText = headers.join('\n');
  const parsedHeaders = parseHeaders(headersText);
  return {
    method,
    url,
    headersText,
    bodyText: dataParts.join('&'),
    contentType: parsedHeaders.get('content-type') ?? '',
    warnings: [...warnings, ...parsedHeaders.warnings],
  };
}

export function detectBodyType(body: string, contentType = ''): string {
  const lowerContentType = contentType.toLowerCase();
  const trimmed = body.trim();
  if (lowerContentType.includes('json')) return 'JSON';
  if (lowerContentType.includes('x-www-form-urlencoded')) return 'URL-encoded form';
  if (lowerContentType.includes('xml')) return 'XML';
  if (!trimmed) return 'empty';
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return 'JSON';
  }
  if (/^[^=&\s]+=[\s\S]*(&[^=&\s]+=[\s\S]*)*$/.test(trimmed)) return 'URL-encoded form';
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) return 'XML';
  return 'plain text';
}

export function summarizeBody(body: string, contentType = ''): BodySummary {
  const hasCrLf = body.includes('\r\n');
  const withoutCrLf = body.replace(/\r\n/g, '');
  const hasLf = withoutCrLf.includes('\n');
  const newlineStyle = hasCrLf && hasLf ? 'mixed' : hasCrLf ? 'CRLF' : hasLf ? 'LF' : 'none';

  return {
    byteLength: new TextEncoder().encode(body).length,
    charLength: body.length,
    newlineStyle,
    hasTrailingNewline: /\r?\n$/.test(body),
    likelyContentType: detectBodyType(body, contentType),
  };
}

export function makeInvisibleCharactersVisible(value: string): string {
  return value
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n\n')
    .replace(/\t/g, '\\t');
}
