import { DiagramError, DiagramType } from '../types';

/**
 * Detects the type of Mermaid diagram from code
 */
export function detectDiagramType(code: string): DiagramType {
  const trimmedCode = code.trim().toLowerCase();
  
  if (trimmedCode.startsWith('flowchart') || trimmedCode.startsWith('graph')) {
    return 'flowchart';
  }
  if (trimmedCode.startsWith('sequencediagram')) {
    return 'sequence';
  }
  if (trimmedCode.startsWith('gantt')) {
    return 'gantt';
  }
  if (trimmedCode.startsWith('classdiagram')) {
    return 'class';
  }
  if (trimmedCode.startsWith('statediagram')) {
    return 'state';
  }
  if (trimmedCode.startsWith('erdiagram')) {
    return 'er';
  }
  if (trimmedCode.startsWith('journey')) {
    return 'journey';
  }
  if (trimmedCode.startsWith('gitgraph')) {
    return 'gitgraph';
  }
  if (trimmedCode.startsWith('pie')) {
    return 'pie';
  }
  if (trimmedCode.startsWith('mindmap')) {
    return 'mindmap';
  }
  if (trimmedCode.startsWith('timeline')) {
    return 'timeline';
  }
  
  return 'flowchart'; // Default fallback
}

/**
 * Parses Mermaid error messages for better user feedback
 */
export function parseMermaidError(error: Error, code: string): DiagramError {
  const message = error.message;
  
  // Extract line number from error message
  const lineMatch = message.match(/line (\d+)/i) || message.match(/at line (\d+)/i);
  const line = lineMatch ? parseInt(lineMatch[1]) : 1;
  
  // Determine error type and provide suggestions
  let type: DiagramError['type'] = 'render';
  let suggestion: string | undefined;
  
  if (message.toLowerCase().includes('syntax error')) {
    type = 'syntax';
    suggestion = getSyntaxSuggestion(message, code);
  } else if (message.toLowerCase().includes('semantic error')) {
    type = 'semantic';
    suggestion = getSemanticSuggestion(message, code);
  } else if (message.toLowerCase().includes('parse error')) {
    type = 'render'; // Parse errors are render-time errors
    suggestion = getSyntaxSuggestion(message, code);
  } else if (message.toLowerCase().includes('invalid') && message.toLowerCase().includes('syntax')) {
    type = 'syntax';
    suggestion = getSyntaxSuggestion(message, code);
  } else if (message.toLowerCase().includes('invalid')) {
    type = 'semantic';
    suggestion = getSemanticSuggestion(message, code);
  }
  
  return {
    line,
    message: cleanErrorMessage(message),
    type,
    suggestion
  };
}

/**
 * Provides syntax-specific suggestions
 */
function getSyntaxSuggestion(message: string, code: string): string {
  if (message.includes('arrow')) {
    return 'Check arrow syntax. Use --> for solid arrows, -.-> for dotted arrows, ==> for thick arrows';
  }
  if (message.includes('node') || message.includes('bracket')) {
    return 'Check node syntax. Use [] for rectangles, () for rounded rectangles, {} for diamonds';
  }
  if (message.includes('direction')) {
    return 'Check direction syntax. Use TD (top-down), LR (left-right), BT (bottom-top), or RL (right-left)';
  }
  if (message.includes('participant')) {
    return 'In sequence diagrams, declare participants before using them in interactions';
  }
  if (message.includes('class')) {
    return 'Check class syntax. Use proper class declaration format with methods and attributes';
  }
  
  return 'Check the Mermaid documentation for valid syntax patterns';
}

/**
 * Provides semantic-specific suggestions
 */
function getSemanticSuggestion(message: string, code: string): string {
  if (message.includes('undefined') || message.includes('not found')) {
    return 'Make sure all referenced nodes are properly defined before use';
  }
  if (message.includes('duplicate')) {
    return 'Check for duplicate node IDs or conflicting definitions';
  }
  if (message.includes('circular')) {
    return 'Avoid circular references in your diagram structure';
  }
  
  return 'Review your diagram logic for semantic consistency';
}

/**
 * Cleans up error messages for better readability
 */
function cleanErrorMessage(message: string): string {
  // Remove technical stack trace information
  const cleanMessage = message
    .split('\n')[0] // Take only the first line
    .replace(/at line \d+/gi, '') // Remove redundant line references
    .replace(/Parse error on line \d+:/gi, '') // Remove parse error prefixes
    .trim();
  
  return cleanMessage || 'An error occurred while rendering the diagram';
}

/**
 * Validates Mermaid code for common issues
 */
export function validateMermaidCode(code: string): DiagramError | null {
  if (!code.trim()) {
    return null;
  }

  const lines = code.split('\n');
  
  // Check for common syntax issues
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;
    
    // Check for invalid arrow syntax
    if (line.includes('->') && !line.match(/-->|-.->|==>|==>/)) {
      return {
        line: lineNumber,
        message: 'Invalid arrow syntax detected',
        type: 'syntax',
        suggestion: 'Use --> for solid arrows, -.-> for dotted arrows, or ==> for thick arrows'
      };
    }
    
    // Check for unmatched brackets
    const openBrackets = (line.match(/[\[\(\{]/g) || []).length;
    const closeBrackets = (line.match(/[\]\)\}]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      return {
        line: lineNumber,
        message: 'Unmatched brackets detected',
        type: 'syntax',
        suggestion: 'Ensure all opening brackets have corresponding closing brackets'
      };
    }
  }
  
  return null;
}

/**
 * Optimizes Mermaid code by removing unnecessary whitespace and comments
 */
export function optimizeMermaidCode(code: string): string {
  return code
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('%%')) // Remove comments
    .join('\n');
}

/**
 * Extracts metadata from Mermaid code
 */
export function extractDiagramMetadata(code: string) {
  const lines = code.split('\n');
  const type = detectDiagramType(code);
  
  // Extract title if present
  const titleLine = lines.find(line => line.trim().startsWith('title'));
  const title = titleLine ? titleLine.replace(/title\s+/, '').trim() : null;
  
  // Count nodes and connections
  let nodeCount = 0;
  let connectionCount = 0;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    // Check for various arrow types
    if (trimmed.includes('-->') || trimmed.includes('-.->') || trimmed.includes('==>') ||
        trimmed.includes('->>') || trimmed.includes('-->>') || trimmed.includes('-x') ||
        trimmed.includes('--x') || trimmed.includes('-)') || trimmed.includes('--)')) {
      connectionCount++;
    }
    if (trimmed.match(/^\s*[A-Za-z0-9_]+[\[\(\{]/)) {
      nodeCount++;
    }
  });
  
  const totalElements = nodeCount + connectionCount;
  
  return {
    type,
    title,
    nodeCount,
    connectionCount,
    lineCount: lines.length,
    complexity: totalElements > 10 ? 'high' : totalElements > 5 ? 'medium' : 'low'
  };
}