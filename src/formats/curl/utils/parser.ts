/**
 * Multi-command cURL parser for handling documents with multiple curl commands
 * and preserving non-curl content
 */

export interface CurlRequest {
  method: string;
  url: string;
  headers: { key: string; value: string }[];
  body?: string;
  otherOptions: { flag: string; value?: string }[];
}

export type ParsedBlock = 
  | { type: 'curl'; request: CurlRequest; raw: string; id: string; }
  | { type: 'text'; content: string; id: string; };

export type ParsedDocument = ParsedBlock[];

/**
 * Parse a document containing curl commands and text
 */
export function parseCurlDocument(text: string): ParsedDocument {
  if (!text.trim()) {
    return [];
  }

  const blocks: ParsedBlock[] = [];
  const lines = text.split('\n');
  let currentIndex = 0;

  while (currentIndex < lines.length) {
    const line = lines[currentIndex].trim();
    
    // Check if this line starts a curl command
    if (line.match(/^\s*curl\s+/)) {
      // Parse multi-line curl command
      const { curlLines, endIndex } = extractCurlCommand(lines, currentIndex);
      const rawCurl = curlLines.join('\n');
      
      try {
        const request = parseSingleCurlCommand(rawCurl);
        blocks.push({
          type: 'curl',
          request,
          raw: rawCurl,
          id: `curl-${blocks.length}-${Date.now()}`,
        });
      } catch (error) {
        // If parsing fails, treat as text block
        blocks.push({
          type: 'text',
          content: rawCurl,
          id: `text-${blocks.length}-${Date.now()}`,
        });
      }
      
      currentIndex = endIndex + 1;
    } else {
      // Collect non-curl lines as text blocks
      const textLines: string[] = [];
      
      while (currentIndex < lines.length && !lines[currentIndex].trim().match(/^\s*curl\s+/)) {
        textLines.push(lines[currentIndex]);
        currentIndex++;
      }
      
      if (textLines.length > 0) {
        blocks.push({
          type: 'text',
          content: textLines.join('\n'),
          id: `text-${blocks.length}-${Date.now()}`,
        });
      }
    }
  }

  return blocks;
}

/**
 * Extract a complete curl command (handling line continuations)
 */
function extractCurlCommand(lines: string[], startIndex: number): { curlLines: string[]; endIndex: number } {
  const curlLines: string[] = [];
  let currentIndex = startIndex;
  
  while (currentIndex < lines.length) {
    const line = lines[currentIndex];
    curlLines.push(line);
    
    // Check if line ends with continuation character
    if (line.trim().endsWith('\\')) {
      currentIndex++;
    } else {
      break;
    }
  }
  
  return { curlLines, endIndex: currentIndex };
}

/**
 * Parse a single curl command string into a structured request object
 */
function parseSingleCurlCommand(curlText: string): CurlRequest {
  // Remove line continuations and normalize whitespace
  const normalizedText = curlText
    .replace(/\\\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const request: CurlRequest = {
    method: 'GET',
    url: '',
    headers: [],
    body: undefined,
    otherOptions: [],
  };

  // Split into tokens, respecting quoted strings
  const tokens = tokenizeCurlCommand(normalizedText);
  
  let i = 1; // Skip 'curl'
  
  while (i < tokens.length) {
    const token = tokens[i];
    
    if (token === '-X' || token === '--request') {
      if (i + 1 < tokens.length) {
        request.method = tokens[i + 1].toUpperCase();
        i += 2;
      } else {
        i++;
      }
    } else if (token === '-H' || token === '--header') {
      if (i + 1 < tokens.length) {
        const headerValue = tokens[i + 1];
        const colonIndex = headerValue.indexOf(':');
        if (colonIndex > 0) {
          const key = headerValue.substring(0, colonIndex).trim();
          const value = headerValue.substring(colonIndex + 1).trim();
          request.headers.push({ key, value });
        }
        i += 2;
      } else {
        i++;
      }
    } else if (token === '-d' || token === '--data' || token === '--data-raw') {
      if (i + 1 < tokens.length) {
        request.body = tokens[i + 1];
        i += 2;
      } else {
        i++;
      }
    } else if (token.startsWith('-')) {
      // Other options
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
        request.otherOptions.push({ flag: token, value: tokens[i + 1] });
        i += 2;
      } else {
        request.otherOptions.push({ flag: token });
        i++;
      }
    } else if (!request.url && !token.startsWith('-')) {
      // First non-flag token is likely the URL
      request.url = token;
      i++;
    } else {
      i++;
    }
  }

  return request;
}

/**
 * Tokenize curl command respecting quoted strings
 */
function tokenizeCurlCommand(text: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      current += char;
      quoteChar = '';
    } else if (!inQuotes && char === ' ') {
      if (current.trim()) {
        tokens.push(unquoteString(current.trim()));
        current = '';
      }
    } else {
      current += char;
    }
    
    i++;
  }
  
  if (current.trim()) {
    tokens.push(unquoteString(current.trim()));
  }
  
  return tokens;
}

/**
 * Remove quotes from a string if they wrap the entire string
 */
function unquoteString(str: string): string {
  if ((str.startsWith('"') && str.endsWith('"')) || 
      (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}

/**
 * Get a summary of curl requests in the document
 */
export function getCurlDocumentSummary(doc: ParsedDocument): {
  totalCommands: number;
  methods: Record<string, number>;
  domains: string[];
} {
  const curlBlocks = doc.filter(block => block.type === 'curl') as Array<ParsedBlock & { type: 'curl' }>;
  
  const methods: Record<string, number> = {};
  const domains = new Set<string>();
  
  curlBlocks.forEach(block => {
    const method = block.request.method;
    methods[method] = (methods[method] || 0) + 1;
    
    try {
      const url = new URL(block.request.url);
      domains.add(url.hostname);
    } catch (e) {
      // Invalid URL, skip domain extraction
    }
  });
  
  return {
    totalCommands: curlBlocks.length,
    methods,
    domains: Array.from(domains),
  };
}