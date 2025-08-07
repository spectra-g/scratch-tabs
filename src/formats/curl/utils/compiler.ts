/**
 * Compiler for converting CurlRequest objects back to curl command strings
 */

import { CurlRequest, ParsedDocument, ParsedBlock } from './parser';

/**
 * Compile a single CurlRequest back to a curl command string
 */
export function compileCurlCommand(request: CurlRequest): string {
  const parts: string[] = ['curl'];
  
  // Add method if not GET
  if (request.method && request.method !== 'GET') {
    parts.push('-X', request.method);
  }
  
  // Add headers
  request.headers.forEach(header => {
    if (header.key && header.value) {
      const headerValue = `${header.key}: ${header.value}`;
      parts.push('-H', `"${headerValue}"`);
    }
  });
  
  // Add body
  if (request.body) {
    parts.push('-d', `'${request.body}'`);
  }
  
  // Add other options
  request.otherOptions.forEach(option => {
    parts.push(option.flag);
    if (option.value) {
      parts.push(option.value);
    }
  });
  
  // Add URL last
  if (request.url) {
    parts.push(request.url);
  }
  
  // Format as multi-line with proper escaping
  return formatMultiLineCurl(parts);
}

/**
 * Format curl command parts as a multi-line command with line continuations
 */
function formatMultiLineCurl(parts: string[]): string {
  if (parts.length <= 3) {
    // Short commands stay on one line
    return parts.join(' ');
  }
  
  const lines: string[] = [];
  let currentLine = parts[0]; // Start with 'curl'
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    // Check if adding this part would make the line too long
    if (currentLine.length + part.length + 1 > 80) {
      // End current line with continuation
      lines.push(currentLine + ' \\');
      currentLine = '  ' + part; // Start new line with indentation
    } else {
      currentLine += ' ' + part;
    }
  }
  
  // Add the final line
  lines.push(currentLine);
  
  return lines.join('\n');
}

/**
 * Compile an entire parsed document back to text
 */
export function compileCurlDocument(doc: ParsedDocument): string {
  const parts: string[] = [];
  
  doc.forEach(block => {
    if (block.type === 'curl') {
      parts.push(block.raw);
    } else {
      parts.push(block.content);
    }
  });
  
  return parts.join('\n');
}

/**
 * Update a specific curl block in a document
 */
export function updateCurlBlockInDocument(
  doc: ParsedDocument,
  blockId: string,
  newRequest: CurlRequest
): ParsedDocument {
  return doc.map(block => {
    if (block.id === blockId && block.type === 'curl') {
      return {
        ...block,
        request: newRequest,
        raw: compileCurlCommand(newRequest),
      };
    }
    return block;
  });
}

/**
 * Add a new curl command to the document
 */
export function addCurlCommandToDocument(
  doc: ParsedDocument,
  request: CurlRequest,
  position: 'start' | 'end' = 'end'
): ParsedDocument {
  const newBlock: ParsedBlock = {
    type: 'curl',
    request,
    raw: compileCurlCommand(request),
    id: `curl-${doc.length}-${Date.now()}`,
  };
  
  if (position === 'start') {
    return [newBlock, ...doc];
  } else {
    return [...doc, newBlock];
  }
}

/**
 * Remove a curl command from the document
 */
export function removeCurlCommandFromDocument(
  doc: ParsedDocument,
  blockId: string
): ParsedDocument {
  return doc.filter(block => block.id !== blockId);
}