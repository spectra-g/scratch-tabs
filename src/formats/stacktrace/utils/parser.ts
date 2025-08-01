/**
 * Multi-language stack trace parser
 * Supports Java, JavaScript/Node.js, Python, and Go stack traces
 */

export interface StackFrame {
  id: string; // Unique key for rendering
  raw: string; // Original line of text
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  methodName?: string;
  className?: string; // For Java/C# style traces
  isLibraryFrame: boolean; // Crucial for filtering
  language: 'java' | 'javascript' | 'python' | 'go' | 'unknown';
}

export interface ErrorInfo {
  errorType?: string;
  errorMessage?: string;
  raw: string; // Original error line
}

export interface StackTrace {
  language: 'java' | 'javascript' | 'python' | 'go' | 'unknown';
  errorInfo: ErrorInfo;
  frames: StackFrame[];
  causedBy?: StackTrace; // For nested exceptions (Java)
}

/**
 * Detect the primary language of a stack trace
 */
function detectLanguage(text: string): StackTrace['language'] {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  // Java indicators
  if (lines.some(line => 
    line.includes('at com.') || 
    line.includes('at org.') || 
    line.includes('... ') && line.includes(' more') ||
    line.includes('Caused by:')
  )) {
    return 'java';
  }
  
  // Python indicators
  if (lines.some(line => 
    line.includes('File "') && line.includes('", line ') ||
    line.includes('Traceback (most recent call last):')
  )) {
    return 'python';
  }
  
  // Go indicators
  if (lines.some(line => 
    line.includes('goroutine ') ||
    line.match(/[\w./-]+\.go:\d+/) ||
    line.includes('panic:')
  )) {
    return 'go';
  }
  
  // Default to JavaScript if 'at' is present
  if (lines.some(line => line.trim().startsWith('at '))) {
    return 'javascript';
  }
  
  return 'unknown';
}

/**
 * Determine if a frame is from a library/system code
 */
function isLibraryFrame(filePath?: string, methodName?: string, className?: string): boolean {
  if (!filePath && !methodName && !className) return false;
  
  const path = filePath || '';
  const method = methodName || '';
  const cls = className || '';
  
  // JavaScript/Node.js library patterns
  if (path.includes('node_modules') || 
      path.includes('/internal/') ||
      path.includes('webpack://') ||
      method.includes('Module.') ||
      method.includes('require(')) {
    return true;
  }
  
  // Java library patterns
  if (method.startsWith('java.') ||
      method.startsWith('javax.') ||
      method.startsWith('sun.') ||
      method.startsWith('com.sun.') ||
      method.startsWith('org.springframework.') ||
      method.startsWith('org.hibernate.') ||
      method.startsWith('org.apache.') ||
      method.startsWith('org.eclipse.') ||
      method.includes('java.base/') ||
      cls.startsWith('java.') ||
      cls.startsWith('javax.')) {
    return true;
  }
  
  // Python library patterns
  if (path.includes('site-packages') ||
      path.includes('dist-packages') ||
      path.includes('/lib/python') ||
      path.includes('\\lib\\python') ||
      path.includes('/usr/lib/') ||
      path.includes('/usr/local/lib/')) {
    return true;
  }
  
  // Go library patterns
  if (path.startsWith('runtime/') ||
      path.includes('/vendor/') ||
      path.includes('/pkg/mod/') ||
      path.startsWith('src/runtime/') ||
      path.includes('/src/runtime/') ||
      method.startsWith('runtime.')) {
    return true;
  }
  
  return false;
}

/**
 * Parse Java stack trace frames
 */
function parseJavaFrame(line: string, index: number): StackFrame | null {
  const trimmed = line.trim();
  
  // Standard Java frame: at com.example.MyClass.method(MyClass.java:123)
  // Also handles module syntax: at java.base/java.lang.reflect.Method.invoke(Method.java:566)
  const javaFrameRegex = /^\s*at\s+((?:[\w$.]+\/)?[^.\s]+(?:\.[^.\s]+)*)\.([^.]+)\(([^:)]+):(\d+)\)$/;
  const match = trimmed.match(javaFrameRegex);
  
  if (match) {
    const [, classWithModule, methodName, fileName, lineNumber] = match;
    const fullMethodName = `${classWithModule}.${methodName}`;
    
    // Extract just the class name for the className field
    const className = classWithModule.includes('/') 
      ? classWithModule.split('/')[1] 
      : classWithModule;
    
    return {
      id: `frame-${index}`,
      raw: line,
      filePath: fileName,
      lineNumber: parseInt(lineNumber, 10),
      methodName: fullMethodName,
      className,
      isLibraryFrame: isLibraryFrame(fileName, fullMethodName, className),
      language: 'java',
    };
  }
  
  // Java frame without line number: at com.example.MyClass.method(Unknown Source)
  const javaNoLineRegex = /^\s*at\s+((?:[\w$.]+\/)?[^.\s]+(?:\.[^.\s]+)*)\.([^.]+)\(([^)]+)\)$/;
  const noLineMatch = trimmed.match(javaNoLineRegex);
  
  if (noLineMatch) {
    const [, classWithModule, methodName, source] = noLineMatch;
    const fullMethodName = `${classWithModule}.${methodName}`;
    
    // Extract just the class name for the className field
    const className = classWithModule.includes('/') 
      ? classWithModule.split('/')[1] 
      : classWithModule;
    
    return {
      id: `frame-${index}`,
      raw: line,
      filePath: source === 'Unknown Source' ? undefined : source,
      methodName: fullMethodName,
      className,
      isLibraryFrame: isLibraryFrame(source, fullMethodName, className),
      language: 'java',
    };
  }
  
  return null;
}

/**
 * Parse JavaScript/Node.js stack trace frames
 */
function parseJavaScriptFrame(line: string, index: number): StackFrame | null {
  const trimmed = line.trim();
  
  // V8 format: at functionName (file.js:123:45)
  const v8FrameRegex = /^\s*at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)$/;
  const match = trimmed.match(v8FrameRegex);
  
  if (match) {
    const [, methodName, filePath, lineNumber, columnNumber] = match;
    
    return {
      id: `frame-${index}`,
      raw: line,
      filePath,
      lineNumber: parseInt(lineNumber, 10),
      columnNumber: parseInt(columnNumber, 10),
      methodName: methodName.trim(),
      isLibraryFrame: isLibraryFrame(filePath, methodName),
      language: 'javascript',
    };
  }
  
  // V8 format without function name: at file.js:123:45
  const v8SimpleRegex = /^\s*at\s+(.+?):(\d+):(\d+)$/;
  const simpleMatch = trimmed.match(v8SimpleRegex);
  
  if (simpleMatch) {
    const [, filePath, lineNumber, columnNumber] = simpleMatch;
    
    return {
      id: `frame-${index}`,
      raw: line,
      filePath,
      lineNumber: parseInt(lineNumber, 10),
      columnNumber: parseInt(columnNumber, 10),
      isLibraryFrame: isLibraryFrame(filePath),
      language: 'javascript',
    };
  }
  
  // Generic 'at' format
  const genericAtRegex = /^\s*at\s+(.+)$/;
  const genericMatch = trimmed.match(genericAtRegex);
  
  if (genericMatch) {
    const [, content] = genericMatch;
    
    return {
      id: `frame-${index}`,
      raw: line,
      methodName: content.trim(),
      isLibraryFrame: isLibraryFrame(undefined, content),
      language: 'javascript',
    };
  }
  
  return null;
}

/**
 * Parse Python stack trace frames
 */
function parsePythonFrame(line: string, index: number): StackFrame | null {
  const trimmed = line.trim();
  
  // Python format: File "/path/to/file.py", line 123, in function_name
  const pythonFrameRegex = /^\s*File\s+"(.+?)",\s*line\s+(\d+),\s*in\s+(.+)$/;
  const match = trimmed.match(pythonFrameRegex);
  
  if (match) {
    const [, filePath, lineNumber, methodName] = match;
    
    return {
      id: `frame-${index}`,
      raw: line,
      filePath,
      lineNumber: parseInt(lineNumber, 10),
      methodName: methodName.trim(),
      isLibraryFrame: isLibraryFrame(filePath, methodName),
      language: 'python',
    };
  }
  
  // Python format without function: File "/path/to/file.py", line 123
  const pythonSimpleRegex = /^\s*File\s+"(.+?)",\s*line\s+(\d+)$/;
  const simpleMatch = trimmed.match(pythonSimpleRegex);
  
  if (simpleMatch) {
    const [, filePath, lineNumber] = simpleMatch;
    
    return {
      id: `frame-${index}`,
      raw: line,
      filePath,
      lineNumber: parseInt(lineNumber, 10),
      isLibraryFrame: isLibraryFrame(filePath),
      language: 'python',
    };
  }
  
  return null;
}

/**
 * Parse Go stack trace frames
 */
function parseGoFrame(line: string, index: number, nextLine?: string): StackFrame | null {
  const trimmed = line.trim();
  
  // Go function format: main.main() or package.function()
  const goFuncRegex = /^\s*([\w./-]+(?:\.[\w./-]+)*)\(.*?\)$/;
  const funcMatch = trimmed.match(goFuncRegex);
  
  if (funcMatch) {
    const [, methodName] = funcMatch;
    const frame: StackFrame = {
      id: `frame-${index}`,
      raw: line,
      methodName,
      isLibraryFrame: isLibraryFrame(undefined, methodName),
      language: 'go',
    };
    
    // Check if the next line has file info and merge it
    if (nextLine) {
      const nextTrimmed = nextLine.trim();
      const goFileRegex = /^\s*([\w./-]+\.go):(\d+)(?:\s+\+0x[0-9a-fA-F]+)?$/;
      const fileMatch = nextTrimmed.match(goFileRegex);
      
      if (fileMatch) {
        const [, filePath, lineNumber] = fileMatch;
        frame.filePath = filePath;
        frame.lineNumber = parseInt(lineNumber, 10);
        frame.isLibraryFrame = isLibraryFrame(filePath, methodName);
      }
    }
    
    return frame;
  }
  
  // Go format: /path/to/file.go:123 +0xabc (standalone, shouldn't normally happen in proper traces)
  const goFileRegex = /^\s*([\w./-]+\.go):(\d+)(?:\s+\+0x[0-9a-fA-F]+)?$/;
  const fileMatch = trimmed.match(goFileRegex);
  
  if (fileMatch) {
    const [, filePath, lineNumber] = fileMatch;
    
    return {
      id: `frame-${index}`,
      raw: line,
      filePath,
      lineNumber: parseInt(lineNumber, 10),
      isLibraryFrame: isLibraryFrame(filePath),
      language: 'go',
    };
  }
  
  return null;
}

/**
 * Determine if a line looks like a stack frame (and not just code or other content)
 */
function isLikelyStackFrame(line: string): boolean {
  const trimmed = line.trim();
  
  // Skip code lines that are clearly not stack frames
  if (trimmed.match(/^[a-zA-Z_]\w*\(\)$/) || // function calls like "process_data()"
      trimmed.match(/^return\s+/) || // return statements
      trimmed.match(/^[a-zA-Z_]\w*\s*=/) || // assignments
      trimmed.match(/^if\s|^for\s|^while\s|^def\s|^class\s/) || // control structures
      trimmed.match(/^goroutine\s+\d+\s+\[/) || // Go goroutine lines
      trimmed.includes('=') && !trimmed.includes('at ') || // assignments without "at"
      // Skip error lines (they should be parsed as errorInfo, not frames)
      trimmed.match(/^[A-Za-z_][\w.]*(?:Error|Exception|Panic):\s+/) ||
      trimmed.match(/^ValueError:\s+/) ||
      trimmed.match(/^TypeError:\s+/) ||
      trimmed.match(/^RuntimeError:\s+/) ||
      // Skip go file location lines that immediately follow function lines
      trimmed.match(/^\s*\/.*\.go:\d+\s+\+0x[0-9a-fA-F]+$/)
  ) {
    return false;
  }
  
  return true;
}

/**
 * Parse error information from the first line(s)
 */
function parseErrorInfo(lines: string[]): { errorInfo: ErrorInfo; startIndex: number } {
  if (lines.length === 0) {
    return {
      errorInfo: { raw: '' },
      startIndex: 0,
    };
  }
  
  const firstLine = lines[0].trim();
  
  // Try to extract error type and message
  const errorRegex = /^(?:Exception in thread "[^"]*"\s+)?((?:Uncaught\s+)?(?:[A-Za-z_][\w.]*(?:Error|Exception|Panic|AssertionError|Failure|Fault)))\s*[:-]\s*(.*)$/;
  const match = firstLine.match(errorRegex);
  
  if (match) {
    const [, errorType, errorMessage] = match;
    return {
      errorInfo: {
        errorType: errorType.trim(),
        errorMessage: errorMessage.trim() || undefined,
        raw: firstLine,
      },
      startIndex: 1,
    };
  }
  
  // If no clear error pattern, but looks like a simple "Type: message" format
  const simpleErrorRegex = /^(Error|[A-Za-z_][\w.]*(?:Error|Exception|Panic|AssertionError|Failure|Fault)):\s*(.+)$/;
  const simpleMatch = firstLine.match(simpleErrorRegex);
  
  if (simpleMatch) {
    const [, errorType, errorMessage] = simpleMatch;
    return {
      errorInfo: {
        errorType: errorType.trim(),
        errorMessage: errorMessage.trim(),
        raw: firstLine,
      },
      startIndex: 1,
    };
  }
  
  // If no clear error pattern, treat first line as generic error
  return {
    errorInfo: {
      errorMessage: firstLine,
      raw: firstLine,
    },
    startIndex: 1,
  };
}

/**
 * Main stack trace parser function
 */
export function parseStackTrace(text: string): StackTrace {
  if (!text || !text.trim()) {
    return {
      language: 'unknown',
      errorInfo: { raw: '' },
      frames: [],
    };
  }
  
  const lines = text.split('\n');
  const language = detectLanguage(text);
  
  // Parse error info
  const { errorInfo, startIndex } = parseErrorInfo(lines);
  
  const frames: StackFrame[] = [];
  let causedBy: StackTrace | undefined;
  
  // Parse frames
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) continue;
    
    // Check for "Caused by" in Java traces
    if (trimmed.startsWith('Caused by:')) {
      // Parse the rest as a nested stack trace
      const remainingLines = lines.slice(i);
      const nestedText = remainingLines.join('\n');
      causedBy = parseStackTrace(nestedText.replace(/^Caused by:\s*/, ''));
      break;
    }
    
    // Check for "... X more" pattern in Java
    if (trimmed.match(/^\.\.\.\s*\d+\s+more$/)) {
      // This indicates truncated frames, just add as a special frame
      frames.push({
        id: `frame-${i}`,
        raw: line,
        methodName: trimmed,
        isLibraryFrame: true,
        language,
      });
      continue;
    }
    
    // Try to parse as a frame based on detected language
    let frame: StackFrame | null = null;
    let skipNext = false;
    
    switch (language) {
      case 'java':
        frame = parseJavaFrame(line, i);
        break;
      case 'javascript':
        frame = parseJavaScriptFrame(line, i);
        break;
      case 'python':
        frame = parsePythonFrame(line, i);
        break;
      case 'go':
        const nextLine = i + 1 < lines.length ? lines[i + 1] : undefined;
        frame = parseGoFrame(line, i, nextLine);
        // If we merged the next line, skip it in the next iteration
        if (frame && nextLine && nextLine.trim().match(/^\s*\/.*\.go:\d+\s+\+0x[0-9a-fA-F]+$/)) {
          skipNext = true;
        }
        break;
      default:
        // Try all parsers for unknown language
        const nextLineDefault = i + 1 < lines.length ? lines[i + 1] : undefined;
        frame = parseJavaFrame(line, i) ||
                parseJavaScriptFrame(line, i) ||
                parsePythonFrame(line, i) ||
                parseGoFrame(line, i, nextLineDefault);
        if (frame && frame.language === 'go' && nextLineDefault && nextLineDefault.trim().match(/^\s*\/.*\.go:\d+\s+\+0x[0-9a-fA-F]+$/)) {
          skipNext = true;
        }
        break;
    }
    
    if (frame) {
      frames.push(frame);
      // Skip the next line if we merged it
      if (skipNext) {
        i++; // Skip the next iteration
      }
    } else if (trimmed.length > 0 && isLikelyStackFrame(trimmed)) {
      // Add unparseable lines as generic frames only if they look like stack frames
      frames.push({
        id: `frame-${i}`,
        raw: line,
        methodName: trimmed,
        isLibraryFrame: false,
        language: 'unknown',
      });
    }
  }
  
  return {
    language,
    errorInfo,
    frames,
    causedBy,
  };
}

/**
 * Reconstruct stack trace text from parsed data
 * Useful for copying cleaned traces
 */
export function reconstructStackTrace(
  stackTrace: StackTrace,
  options: {
    includeLibraryFrames?: boolean;
    searchFilter?: string;
  } = {}
): string {
  const { includeLibraryFrames = true, searchFilter = '' } = options;
  
  const lines: string[] = [];
  
  // Add error info
  if (stackTrace.errorInfo.raw) {
    lines.push(stackTrace.errorInfo.raw);
  }
  
  // Filter and add frames
  const filteredFrames = stackTrace.frames.filter(frame => {
    if (!includeLibraryFrames && frame.isLibraryFrame) {
      return false;
    }
    
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase();
      const frameText = `${frame.methodName || ''} ${frame.filePath || ''} ${frame.raw}`.toLowerCase();
      if (!frameText.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });
  
  filteredFrames.forEach(frame => {
    lines.push(frame.raw);
  });
  
  // Add caused by section
  if (stackTrace.causedBy) {
    lines.push(''); // Empty line for separation
    const causedByText = reconstructStackTrace(stackTrace.causedBy, options);
    lines.push(causedByText);
  }
  
  return lines.join('\n');
}

/**
 * Get a summary of the stack trace for display
 */
export function getStackTraceSummary(stackTrace: StackTrace): {
  totalFrames: number;
  libraryFrames: number;
  userFrames: number;
  languages: string[];
} {
  const allFrames = getAllFrames(stackTrace);
  const libraryFrames = allFrames.filter(f => f.isLibraryFrame).length;
  const languages = [...new Set(allFrames.map(f => f.language))];
  
  return {
    totalFrames: allFrames.length,
    libraryFrames,
    userFrames: allFrames.length - libraryFrames,
    languages,
  };
}

/**
 * Get all frames including from nested "caused by" traces
 */
function getAllFrames(stackTrace: StackTrace): StackFrame[] {
  const frames = [...stackTrace.frames];
  
  if (stackTrace.causedBy) {
    frames.push(...getAllFrames(stackTrace.causedBy));
  }
  
  return frames;
}