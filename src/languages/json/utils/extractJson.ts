import { unstringifyJson } from './unstringify';

export interface ExtractedJson {
  content: string;
  index: number;
  start: number;
  end: number;
  isStringified: boolean;
}

export function extractJsonFromText(text: string): ExtractedJson[] {
  const extracted: ExtractedJson[] = [];
  
  // First, try to find regular JSON objects and arrays
  findRegularJson(text, extracted);
  
  // Then, find stringified JSON
  findStringifiedJson(text, extracted);
  
  // Sort by position in text and remove overlaps
  return deduplicateExtracts(extracted);
}

function findRegularJson(text: string, extracted: ExtractedJson[]) {
  let i = 0;
  
  while (i < text.length) {
    const char = text[i];
    
    if (char === '{' || char === '[') {
      const result = extractJsonAtPosition(text, i);
      if (result) {
        extracted.push({
          content: result.content,
          index: extracted.length,
          start: i,
          end: result.end,
          isStringified: false
        });
        i = result.end;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
}

function findStringifiedJson(text: string, extracted: ExtractedJson[]) {
  // Look for quoted strings that might contain JSON
  const stringRegex = /"([^"\\]|\\.)*"/g;
  let match;
  
  while ((match = stringRegex.exec(text)) !== null) {
    const quotedString = match[0];
    const innerContent = quotedString.slice(1, -1); // Remove surrounding quotes
    
    try {
      // Try to parse the unescaped string as JSON
      const unescaped = JSON.parse(quotedString); // This handles escape sequences
      if (typeof unescaped === 'string') {
        // Try to parse the unescaped content as JSON
        JSON.parse(unescaped);
        
        // If we get here, it's valid stringified JSON
        const unstringified = unstringifyJson(quotedString);
        extracted.push({
          content: unstringified,
          index: extracted.length,
          start: match.index,
          end: match.index + quotedString.length,
          isStringified: true
        });
      }
    } catch (e) {
      // Not valid stringified JSON, continue
    }
  }
}

function extractJsonAtPosition(text: string, startPos: number): { content: string, end: number } | null {
  let stack = [];
  let i = startPos;
  let inString = false;
  let escaped = false;
  const startChar = text[startPos];
  const endChar = startChar === '{' ? '}' : ']';
  
  stack.push(startChar);
  i++;
  
  while (i < text.length && stack.length > 0) {
    const char = text[i];
    
    if (escaped) {
      escaped = false;
      i++;
      continue;
    }
    
    if (char === '\\' && inString) {
      escaped = true;
      i++;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      i++;
      continue;
    }
    
    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}' || char === ']') {
        const expectedChar = stack.pop();
        const isMatching = (expectedChar === '{' && char === '}') || 
                          (expectedChar === '[' && char === ']');
        
        if (!isMatching) {
          // Malformed JSON
          return null;
        }
      }
    }
    
    i++;
  }
  
  if (stack.length === 0) {
    const jsonText = text.substring(startPos, i);
    try {
      JSON.parse(jsonText);
      return { content: jsonText, end: i };
    } catch (e) {
      return null;
    }
  }
  
  return null;
}

function deduplicateExtracts(extracted: ExtractedJson[]): ExtractedJson[] {
  if (extracted.length === 0) return [];
  
  // Sort by start position
  extracted.sort((a, b) => a.start - b.start);
  
  const result: ExtractedJson[] = [];
  
  for (const current of extracted) {
    // Check if this extract overlaps with any existing one
    const hasOverlap = result.some(existing => 
      (current.start >= existing.start && current.start < existing.end) ||
      (current.end > existing.start && current.end <= existing.end) ||
      (current.start <= existing.start && current.end >= existing.end)
    );
    
    if (!hasOverlap) {
      current.index = result.length;
      result.push(current);
    }
  }
  
  return result;
} 